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
    "width:260px",
    "color:#e8f2ff",
    "background:rgba(6,12,22,0.72)",
    "padding:12px 14px",
    "border:1px solid rgba(255,255,255,0.16)",
    "border-radius:10px",
    "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
    "pointer-events:none",
    "backdrop-filter:blur(8px)",
  ].join(";");
  document.body.appendChild(el);

  const old = document.getElementById("hud");
  if (old) old.style.display = "none";
  return el;
}

function ensureBanner() {
  let el = document.getElementById("crash-banner");
  if (el) return el;
  el = document.createElement("div");
  el.id = "crash-banner";
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:6",
    "display:none",
    "place-items:center",
    "text-align:center",
    "color:#fff5f5",
    "font:700 28px/1.3 ui-sans-serif,system-ui,sans-serif",
    "background:rgba(18,0,0,0.42)",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(el);
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

function iasColor(speed, vsStall, vr) {
  if (speed < vsStall) return "#ff5a5a";
  if (speed < vr) return "#ffd36a";
  return "#d8ffe6";
}

/** Agent A. */
export function updateHud(telemetry) {
  const el = ensureHud();
  const banner = ensureBanner();
  const crashed = telemetry.crashed;
  el.style.borderColor = crashed ? "rgba(255,70,70,0.85)" : "rgba(255,255,255,0.16)";

  const ias = iasColor(telemetry.speed, telemetry.vsStall ?? 16, telemetry.vr ?? 28);
  const vs = telemetry.vs ?? 0;
  const vsText = `${vs >= 0 ? "+" : ""}${vs.toFixed(1)}`;
  const gear = telemetry.gearDown ? "DN" : "UP";
  const rwy = telemetry.onRunway ? "ON RWY 18" : "OFF FIELD";
  const alignDeg = THREE_TO_DEG(telemetry.align ?? 0);
  const alignOk = (telemetry.align ?? 1) < 0.22;
  const help = telemetry.airborne
    ? "W/S throttle · A/D turn · R/F pitch · G gear"
    : "W throttle · S cut · F brake · R rotate after Vr · EN keys";

  el.innerHTML = [
    `<div style="opacity:.65;letter-spacing:.12em">${telemetry.phase ?? ""}</div>`,
    `<div style="color:${ias}"><b>IAS</b> ${telemetry.speed.toFixed(0)} <span style="opacity:.6">Vr ${telemetry.vr ?? 28}  Vs ${telemetry.vsStall ?? 16}</span></div>`,
    `<div><b>THR</b> ${bar(telemetry.throttle ?? 0)}</div>`,
    `<div><b>AGL</b> ${telemetry.altitude.toFixed(0)} m　　<b>VS</b> ${vsText} m/s</div>`,
    `<div><b>HDG</b> ${headingLabel(telemetry.heading)}　　<b>GEAR</b> ${gear}</div>`,
    `<div>${rwy}　align ${alignDeg.toFixed(0)}° ${alignOk ? "●" : "○"}</div>`,
    `<div style="opacity:.62;margin-top:6px">${help}</div>`,
  ].join("");

  banner.style.display = crashed ? "grid" : "none";
  banner.innerHTML = crashed
    ? `<div>CRASH<br><span style="font:16px/1.5 ui-sans-serif,system-ui;font-weight:500;opacity:.9">${telemetry.crashReason || "aircraft destroyed"}<br>Enter — reset on runway 18</span></div>`
    : "";
}

function THREE_TO_DEG(rad) {
  return Math.abs(rad) * (180 / Math.PI);
}
