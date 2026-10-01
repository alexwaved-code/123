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
    "min-width:220px",
    "color:#102033",
    "background:rgba(255,255,255,0.8)",
    "padding:10px 12px",
    "border-radius:8px",
    "font:13px/1.45 ui-sans-serif,system-ui,sans-serif",
    "pointer-events:none",
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

/** Agent A. */
export function updateHud(telemetry) {
  const el = ensureHud();
  const hit = telemetry.hit ? "  HIT" : "";
  el.style.background = telemetry.hit ? "rgba(255,180,180,0.88)" : "rgba(255,255,255,0.8)";
  el.innerHTML = [
    `<b>SPD</b> ${telemetry.speed.toFixed(0)} m/s`,
    `<b>ALT</b> ${telemetry.altitude.toFixed(0)} m`,
    `<b>HDG</b> ${headingLabel(telemetry.heading)}${hit}`,
    "W/S throttle · A/D or arrows turn · R/F or Space/Ctrl climb",
  ].join("<br>");
}
