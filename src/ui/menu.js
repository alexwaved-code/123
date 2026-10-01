import { getSettings, hasStarted, isPaused, markStarted, setPaused, updateSettings } from "./settings.js";
import { setFlightAudible, setMasterVolume } from "../plane/audio.js";

let graphics = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function field(labelText, control) {
  const wrap = el("label", "menu-field");
  wrap.append(el("span", "", labelText), control);
  return wrap;
}

function applyHud() {
  const show = getSettings().hud;
  for (const id of ["hud", "plane-hud"]) {
    const node = document.getElementById(id);
    if (node) node.style.display = show ? "" : "none";
  }
}

export function applyGraphics() {
  if (!graphics) return;
  const { scene, renderer, sun } = graphics;
  const { viewDistance, shadows, quality } = getSettings();
  if (scene.fog) {
    scene.fog.near = Math.max(40, viewDistance * 0.28);
    scene.fog.far = viewDistance;
  }
  if (sun) sun.castShadow = shadows;
  renderer.shadowMap.enabled = shadows;
  const ratio = Math.min(window.devicePixelRatio || 1, 2) * quality;
  if (Math.abs(renderer.getPixelRatio() - ratio) > 0.01) {
    renderer.setPixelRatio(ratio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  applyHud();
}

/**
 * Pause menu. Esc or the Menu button stops the simulation.
 * onRestart should put the plane back at spawn.
 */
export function createGameMenu({ scene, renderer, sun, onRestart }) {
  document.getElementById("game-menu-style")?.remove();
  document.getElementById("game-menu-open")?.remove();
  document.getElementById("game-menu-root")?.remove();
  document.getElementById("game-start-root")?.remove();

  graphics = { scene, renderer, sun };
  const settings = getSettings();

  const style = document.createElement("style");
  style.id = "game-menu-style";
  style.textContent = `
    .game-menu-button, .game-menu {
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #eef6ff;
    }
    .game-menu-button {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 20;
      border: 1px solid rgba(255,255,255,0.28);
      background: rgba(8,16,28,0.72);
      color: #eef6ff;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 14px;
      cursor: pointer;
    }
    .game-menu {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(6,12,20,0.46);
    }
    .game-menu.open { display: flex; }
    .game-menu-panel {
      width: min(380px, calc(100vw - 32px));
      background: rgba(8,16,28,0.92);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      padding: 18px 18px 14px;
      box-shadow: 0 16px 50px rgba(0,0,0,0.28);
    }
    .game-menu-panel h2 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 650;
    }
    .game-menu-note {
      margin: 0 0 14px;
      color: rgba(238,246,255,0.72);
      font-size: 13px;
    }
    .menu-actions, .menu-field {
      display: flex;
      gap: 8px;
    }
    .menu-actions { margin-bottom: 14px; }
    .menu-actions button, .game-menu-button:focus-visible, .menu-field input:focus-visible {
      outline: 2px solid #9fd0ff;
      outline-offset: 2px;
    }
    .menu-actions button {
      flex: 1;
      border: 0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      cursor: pointer;
    }
    .menu-resume { background: #d7ecff; color: #102033; }
    .menu-restart { background: rgba(255,255,255,0.12); color: #eef6ff; }
    .menu-field {
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 10px 0;
      font-size: 14px;
    }
    .menu-field > span { flex: 1; }
    .menu-field input[type="range"] { width: 140px; }
    .menu-field select {
      min-width: 110px;
      color: #102033;
      background: #eef6ff;
      border: 0;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .menu-hint { margin: 8px 0 0; font-size: 12px; color: rgba(238,246,255,0.62); }
    .game-start {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(6,14,24,0.55);
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #eef6ff;
    }
    .game-start[hidden] { display: none; }
    .game-start-panel {
      width: min(440px, calc(100vw - 32px));
      background: rgba(8,16,28,0.94);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 14px;
      padding: 28px 26px 22px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
    }
    .game-start-panel h1 {
      margin: 0;
      font-size: 36px;
      letter-spacing: -0.03em;
    }
    .game-start-panel .eyebrow {
      margin: 0 0 6px;
      letter-spacing: 0.16em;
      font-size: 12px;
      color: rgba(238,246,255,0.62);
    }
    .game-start-panel p { margin: 10px 0 0; color: rgba(238,246,255,0.78); line-height: 1.45; }
    .game-start-panel ul { margin: 14px 0 18px; padding-left: 18px; line-height: 1.6; }
    .game-start-panel button {
      width: 100%;
      border: 0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 16px;
      background: #d7ecff;
      color: #102033;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const openButton = el("button", "game-menu-button", "Menu");
  openButton.id = "game-menu-open";
  openButton.type = "button";
  openButton.hidden = !hasStarted();

  const root = el("div", "game-menu");
  root.id = "game-menu-root";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Flight menu");

  const panel = el("div", "game-menu-panel");
  const title = el("h2", "", "Flight paused");
  const note = el("p", "game-menu-note", "The plane is stopped. Change settings, then resume.");
  const actions = el("div", "menu-actions");
  const resume = el("button", "menu-resume", "Resume");
  const restart = el("button", "menu-restart", "Restart at spawn");
  resume.type = "button";
  restart.type = "button";
  actions.append(resume, restart);

  const view = document.createElement("input");
  view.type = "range";
  view.min = "280";
  view.max = "1600";
  view.step = "20";
  view.value = String(settings.viewDistance);

  const shadows = document.createElement("input");
  shadows.type = "checkbox";
  shadows.checked = settings.shadows;

  const quality = document.createElement("select");
  for (const [value, label] of [["0.65", "Low"], ["1", "Medium"], ["1.35", "High"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    quality.append(option);
  }
  quality.value = String(settings.quality);

  const hud = document.createElement("input");
  hud.type = "checkbox";
  hud.checked = settings.hud;

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = "0";
  volume.max = "1";
  volume.step = "0.05";
  volume.value = String(settings.volume);

  panel.append(
    title,
    note,
    actions,
    field("View distance", view),
    field("Shadows", shadows),
    field("Quality", quality),
    field("Show HUD", hud),
    field("Volume", volume),
    el("p", "menu-hint", "Esc opens and closes this menu."),
  );
  root.append(panel);

  const start = el("div", "game-start");
  start.id = "game-start-root";
  if (hasStarted()) start.hidden = true;
  const startPanel = el("div", "game-start-panel");
  const startButton = el("button", "", "Start flight");
  startButton.type = "button";
  startPanel.append(
    el("p", "eyebrow", "RUNWAY 18"),
    el("h1", "", "City plane"),
    el("p", "", "Take off from the runway, fly the city, or step out and walk."),
    Object.assign(document.createElement("ul"), {
      innerHTML: "<li>W / S throttle</li><li>A / D turn</li><li>Up / Down pitch and brake</li><li>G gear</li><li>F leave the plane</li><li>On foot: WASD walks, arrows look</li><li>Right Shift run, Space jump</li><li>Hold H if the plane flies away</li>",
    }),
    startButton,
  );
  start.append(startPanel);
  document.body.append(openButton, root, start);

  function begin() {
    if (hasStarted()) return;
    markStarted();
    start.hidden = true;
    openButton.hidden = false;
    setMasterVolume(getSettings().volume);
  }

  function syncPause(next) {
    setPaused(next);
    root.classList.toggle("open", next);
    openButton.textContent = next ? "Paused" : "Menu";
    setFlightAudible(!next);
    if (!next) setMasterVolume(getSettings().volume);
    applyGraphics();
  }

  function toggle() {
    syncPause(!isPaused());
  }

  openButton.addEventListener("click", toggle);
  startButton.addEventListener("click", begin);
  resume.addEventListener("click", () => syncPause(false));
  restart.addEventListener("click", () => {
    onRestart();
    syncPause(false);
  });
  view.addEventListener("input", () => {
    updateSettings({ viewDistance: Number(view.value) });
    applyGraphics();
  });
  shadows.addEventListener("change", () => {
    updateSettings({ shadows: shadows.checked });
    applyGraphics();
  });
  quality.addEventListener("change", () => {
    updateSettings({ quality: Number(quality.value) });
    applyGraphics();
  });
  hud.addEventListener("change", () => {
    updateSettings({ hud: hud.checked });
    applyHud();
  });
  volume.addEventListener("input", () => {
    updateSettings({ volume: Number(volume.value) });
    setMasterVolume(getSettings().volume);
  });

  window.addEventListener("keydown", (event) => {
    if (!hasStarted() || event.code !== "Escape" || event.repeat) return;
    event.preventDefault();
    toggle();
  });

  setMasterVolume(settings.volume);
  applyGraphics();
  return { applyGraphics };
}
