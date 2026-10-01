import { FPM, FT, KT } from "../shared/constants.js";
import { updateMinimap } from "./minimap.js";

function injectStyle() {
  let style = document.getElementById("pfd-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "pfd-style";
    document.head.appendChild(style);
  }
  style.textContent = `
    #hud { display: none !important; }
    #plane-hud.pfd {
      position: fixed;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      color: #86f59a;
      font: 13px/1 "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
      text-shadow: 0 0 10px rgba(70, 220, 120, 0.28);
      letter-spacing: 0.04em;
    }
    .hud-hdg {
      position: absolute;
      top: 28px;
      left: 50%;
      width: 280px;
      height: 36px;
      margin-left: -140px;
      overflow: hidden;
      border-bottom: 1px solid rgba(134,245,154,0.35);
    }
    .hud-hdg i {
      position: absolute;
      top: 4px;
      width: 2px;
      height: 7px;
      margin-left: -1px;
      background: #86f59a;
      font-style: normal;
      font-size: 11px;
    }
    .hud-hdg i.maj {
      height: 12px;
    }
    .hud-hdg i.maj:after {
      content: attr(data-h);
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
    }
    .hud-hdg-caret {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 0;
      height: 0;
      margin-left: -5px;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 6px solid #86f59a;
    }
    .hud-box {
      position: absolute;
      top: 42%;
      min-width: 72px;
      padding: 6px 8px 8px;
      border: 1px solid rgba(134,245,154,0.45);
      background: rgba(0, 12, 8, 0.18);
    }
    .hud-ias { left: calc(50% - 250px); text-align: right; }
    .hud-alt { left: calc(50% + 178px); }
    .hud-box .hud-lab {
      font-size: 10px;
      letter-spacing: 0.16em;
      opacity: 0.7;
    }
    .hud-box .hud-read {
      font-size: 28px;
      font-weight: 600;
      margin-top: 2px;
    }
    .hud-box .hud-sub { font-size: 11px; opacity: 0.75; margin-top: 3px; }
    .hud-amber { color: #ffd36a; text-shadow: 0 0 10px rgba(255,180,40,0.35); }
    .hud-red { color: #ff6b6b; text-shadow: 0 0 10px rgba(255,80,80,0.4); }
    .hud-adi {
      position: absolute;
      left: 50%;
      top: 46%;
      width: 220px;
      height: 168px;
      margin: -84px 0 0 -110px;
      overflow: hidden;
    }
    .hud-ladder {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 160px;
      height: 520px;
      margin: -260px 0 0 -80px;
      transform-origin: 50% 50%;
    }
    .hud-hz {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: #86f59a;
    }
    .hud-tick {
      position: absolute;
      left: 50%;
      width: 46px;
      margin-left: -23px;
      height: 1px;
      background: #86f59a;
      font-size: 10px;
    }
    .hud-tick[data-side="l"] { margin-left: -52px; }
    .hud-tick[data-side="r"] { margin-left: 6px; }
    .hud-tick span {
      position: absolute;
      top: -6px;
      width: 22px;
    }
    .hud-tick[data-side="l"] span { right: 50px; text-align: right; }
    .hud-tick[data-side="r"] span { left: 50px; }
    .hud-wings {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 86px;
      height: 2px;
      margin: -1px 0 0 -43px;
      background: #ffe27a;
      box-shadow: -34px 0 0 #ffe27a, 34px 0 0 #ffe27a;
      z-index: 2;
    }
    .hud-wings:after {
      content: "";
      position: absolute;
      left: 50%;
      top: -5px;
      width: 8px;
      height: 8px;
      margin-left: -5px;
      border: 2px solid #ffe27a;
      border-radius: 50%;
    }
    .hud-status {
      position: absolute;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%);
      display: flex;
      gap: 22px;
      font-size: 12px;
      letter-spacing: 0.12em;
      opacity: 0.92;
    }
    .hud-warn {
      position: absolute;
      left: 50%;
      bottom: 54px;
      transform: translateX(-50%);
      min-height: 16px;
      color: #ffd36a;
      letter-spacing: 0.2em;
      font-weight: 700;
      font-size: 13px;
    }
    .hud-help {
      position: absolute;
      right: 18px;
      bottom: 16px;
      font-size: 10px;
      letter-spacing: 0.08em;
      opacity: 0.38;
      text-align: right;
    }
    .hud-map {
      position: absolute;
      left: 16px;
      top: 18px;
      width: 168px;
      padding: 6px 6px 8px;
      border: 1px solid rgba(134,245,154,0.4);
      background: rgba(4, 10, 14, 0.55);
    }
    .hud-map-lab {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      letter-spacing: 0.12em;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .hud-map-canvas {
      display: block;
      width: 168px;
      height: 168px;
    }
    #crash-banner {
      position: fixed;
      inset: 0;
      z-index: 6;
      display: none;
      place-items: center;
      text-align: center;
      color: #f4efe6;
      font: 600 22px/1.4 ui-sans-serif, system-ui, sans-serif;
      background: rgba(6, 4, 4, 0.42);
      pointer-events: none;
    }
  `;
}

function buildLadder(root) {
  const hz = document.createElement("div");
  hz.className = "hud-hz";
  root.appendChild(hz);
  for (const deg of [-20, -15, -10, -5, 5, 10, 15, 20]) {
    const y = -deg * 8;
    for (const side of ["l", "r"]) {
      const tick = document.createElement("div");
      tick.className = "hud-tick";
      tick.dataset.side = side;
      tick.style.top = `calc(50% + ${y}px)`;
      tick.innerHTML = `<span>${Math.abs(deg)}</span>`;
      root.appendChild(tick);
    }
  }
}

function ensureHud() {
  injectStyle();
  let el = document.getElementById("plane-hud");
  if (el && el.dataset.pfd === "3") return el;
  el?.remove();
  el = document.createElement("div");
  el.id = "plane-hud";
  el.className = "pfd";
  el.dataset.pfd = "3";
  el.innerHTML = `
    <div class="hud-hdg" id="pfd-hdg-tape"><b class="hud-hdg-caret"></b></div>
    <div class="hud-box hud-ias">
      <div class="hud-lab">IAS</div>
      <div class="hud-read" id="pfd-ias">0</div>
      <div class="hud-sub" id="pfd-vspeeds">KT</div>
    </div>
    <div class="hud-box hud-alt">
      <div class="hud-lab">ALT</div>
      <div class="hud-read" id="pfd-alt">0</div>
      <div class="hud-sub" id="pfd-vs">VS +0</div>
    </div>
    <div class="hud-adi">
      <div class="hud-ladder" id="pfd-horizon"></div>
      <div class="hud-wings"></div>
    </div>
    <div class="hud-warn" id="pfd-warn"></div>
    <div class="hud-status">
      <span id="pfd-phase">HOLD</span>
      <span id="pfd-hdg">HDG 180</span>
      <span id="pfd-thr">THR 0</span>
      <span id="pfd-gear">GEAR DN</span>
      <span id="pfd-rwy">RWY 18</span>
    </div>
    <div class="hud-help" id="pfd-help">W/S THR   A/D HDG   UP/DN PITCH   G GEAR</div>
    <div class="hud-map" id="hud-map">
      <div class="hud-map-lab"><span>ND</span><span>1.4 KM</span></div>
    </div>
  `;
  document.body.appendChild(el);
  buildLadder(document.getElementById("pfd-horizon"));
  return el;
}

function ensureBanner() {
  let el = document.getElementById("crash-banner");
  if (el) return el;
  el = document.createElement("div");
  el.id = "crash-banner";
  document.body.appendChild(el);
  return el;
}

function iasClass(speed, vsStall, vr, airborne) {
  if (!airborne) return speed >= vr ? "hud-read" : speed > 2 ? "hud-read hud-amber" : "hud-read";
  if (speed < vsStall) return "hud-read hud-red";
  if (speed < vr) return "hud-read hud-amber";
  return "hud-read";
}

function updateHdgTape(hdg) {
  const tape = document.getElementById("pfd-hdg-tape");
  if (!tape) return;
  const start = Math.floor((hdg - 40) / 5) * 5;
  const bits = ['<b class="hud-hdg-caret"></b>'];
  for (let a = start; a <= hdg + 40; a += 5) {
    const norm = ((a % 360) + 360) % 360;
    const x = 140 + (a - hdg) * 3.4;
    const major = norm % 10 === 0;
    bits.push(`<i class="${major ? "maj" : ""}" data-h="${String(norm).padStart(3, "0")}" style="left:${x.toFixed(1)}px"></i>`);
  }
  tape.innerHTML = bits.join("");
}

/** Agent A. Head-up flight display. */
export function updateHud(telemetry) {
  const root = ensureHud();
  const banner = ensureBanner();
  const ias = Math.round((telemetry.speed ?? 0) * KT);
  const alt = Math.round((telemetry.altitude ?? 0) * FT);
  const vs = Math.round((telemetry.vs ?? 0) * FPM);
  const hdg = ((telemetry.heading % 360) + 360) % 360;
  const pitch = telemetry.pitch ?? 0;
  const bank = telemetry.bank ?? 0;

  const iasEl = document.getElementById("pfd-ias");
  iasEl.textContent = String(ias);
  iasEl.className = iasClass(telemetry.speed, telemetry.vsStall ?? 14, telemetry.vr ?? 18, telemetry.airborne);
  document.getElementById("pfd-vspeeds").textContent = `VR ${Math.round((telemetry.vr ?? 18) * KT)}  VS ${Math.round((telemetry.vsStall ?? 14) * KT)}`;
  document.getElementById("pfd-alt").textContent = String(alt);
  document.getElementById("pfd-vs").textContent = `VS ${vs >= 0 ? "+" : ""}${vs} FPM`;
  document.getElementById("pfd-phase").textContent = telemetry.phase ?? "";
  document.getElementById("pfd-hdg").textContent = `HDG ${hdg.toFixed(0).padStart(3, "0")}`;
  document.getElementById("pfd-thr").textContent = `THR ${Math.round((telemetry.throttle ?? 0) * 100)}`;
  document.getElementById("pfd-gear").textContent = telemetry.gearDown ? "GEAR DN" : "GEAR UP";
  document.getElementById("pfd-rwy").textContent = telemetry.water
    ? "WATER"
    : telemetry.onRunway
      ? "LOC RWY 18"
      : "OFF FIELD";
  document.getElementById("pfd-warn").textContent = (telemetry.warns ?? []).join("   ");
  document.getElementById("pfd-help").textContent = telemetry.airborne
    ? "W/S THR   A/D TURN   UP/DN PITCH   G GEAR   F EXIT"
    : "W TO VR   UP ROTATE   DN BRAKE   G GEAR";

  updateHdgTape(hdg);
  updateMinimap(telemetry);
  const horizon = document.getElementById("pfd-horizon");
  const pitchPx = Math.max(-90, Math.min(90, pitch * 183));
  horizon.style.transform = `rotate(${(-bank * 57.3).toFixed(1)}deg) translateY(${pitchPx.toFixed(1)}px)`;

  const crashed = telemetry.crashed;
  root.style.filter = crashed ? "grayscale(0.35)" : "none";
  banner.style.display = crashed ? "grid" : "none";
  banner.innerHTML = crashed
    ? `<div>${(telemetry.crashReason || "aircraft destroyed").toUpperCase()}<br><span style="font:14px/1.5 ui-sans-serif,system-ui;font-weight:500;opacity:.8">ENTER — runway 18</span></div>`
    : "";
}

injectStyle();

