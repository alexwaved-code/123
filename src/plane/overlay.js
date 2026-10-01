function ensure() {
  let layer = document.getElementById("flight-overlay");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.id = "flight-overlay";
  layer.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    "z-index:4",
    "box-shadow:inset 0 0 140px rgba(10,24,40,0.28)",
    "transition:background 80ms linear",
  ].join(";");
  document.body.appendChild(layer);
  return layer;
}

export function updateOverlay(telemetry) {
  const layer = ensure();
  if (telemetry.crashed) {
    layer.style.background = "radial-gradient(ellipse at center, rgba(80,0,0,0.15) 40%, rgba(40,0,0,0.5) 100%)";
    layer.style.boxShadow = "inset 0 0 160px rgba(120,0,0,0.55)";
    layer.style.opacity = "1";
    return;
  }
  const speedT = Math.min(1, Math.max(0, (telemetry.speed - 20) / 55));
  const hit = telemetry.hit ? 0.22 : 0;
  const low = telemetry.altitude < 10 ? 0.1 : 0;
  layer.style.background = `radial-gradient(ellipse at center, rgba(255,255,255,0) 48%, rgba(8,18,32,${0.12 + speedT * 0.22}) 100%)`;
  layer.style.boxShadow = telemetry.hit
    ? "inset 0 0 120px rgba(180,30,30,0.35)"
    : `inset 0 0 ${110 + speedT * 50}px rgba(10,24,40,${0.22 + low})`;
  layer.style.opacity = String(0.85 + hit);
}
