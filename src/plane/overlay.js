function ensure() {
  let layer = document.getElementById("flight-overlay");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.id = "flight-overlay";
  layer.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    "z-index:3",
    "box-shadow:inset 0 90px 120px rgba(0,0,0,0.28), inset 0 -50px 90px rgba(0,0,0,0.2)",
  ].join(";");
  document.body.appendChild(layer);
  return layer;
}

export function updateOverlay(telemetry) {
  const layer = ensure();
  layer.style.boxShadow = telemetry.crashed
    ? "inset 0 0 160px rgba(50,0,0,0.48)"
    : "inset 0 90px 120px rgba(0,0,0,0.28), inset 0 -50px 90px rgba(0,0,0,0.2)";
}
