let helpUntil = performance.now() + 9000;

function ensureHud() {
  let el = document.getElementById("plane-hud");
  if (el) return el;

  el = document.createElement("div");
  el.id = "plane-hud";
  el.style.cssText = [
    "position:fixed",
    "left:16px",
    "bottom:16px",
    "z-index:5",
    "min-width:228px",
    "color:#eef6ff",
    "background:rgba(8,16,28,0.55)",
    "padding:10px 12px",
    "border:1px solid rgba(255,255,255,0.18)",
    "border-radius:8px",
    "font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace",
    "letter-spacing:0.02em",
    "pointer-events:none",
    "backdrop-filter:blur(6px)",
  ].join(";");
  document.body.appendChild(el);

  const old = document.getElementById("hud");
  if (old) old.style.display = "none";
  return el;
}

function headingLabel(deg) {
  const wrapped = ((deg % 360) + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${names[Math.round(wrapped / 45) % 8]} ${wrapped.toFixed(0)}`;
}

function bar(value) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * 12);
  return "█".repeat(filled) + "░".repeat(12 - filled);
}

/** Agent A. */
export function updateHud(telemetry) {
  const el = ensureHud();
  const hit = telemetry.hit ? "  • IMPACT" : "";
  el.style.borderColor = telemetry.hit ? "rgba(255,80,80,0.7)" : "rgba(255,255,255,0.18)";
  const help = performance.now() < helpUntil
    ? "<div style='opacity:.7;margin-top:6px'>W/S throttle · A/D turn · R/F climb · EN keyboard</div>"
    : "";
  el.innerHTML = [
    `<div><b>IAS</b> ${telemetry.speed.toFixed(0)} m/s</div>`,
    `<div><b>THR</b> ${bar(telemetry.throttle ?? 0)}</div>`,
    `<div><b>ALT</b> ${telemetry.altitude.toFixed(0)} m</div>`,
    `<div><b>HDG</b> ${headingLabel(telemetry.heading)}${hit}</div>`,
    help,
  ].join("");
}
