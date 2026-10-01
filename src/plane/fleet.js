import { GEAR_HEIGHT, RUNWAY } from "../shared/constants.js";
import { clearFlightState } from "./crash.js";
import { applyPlanePaint, createPlane } from "./createPlane.js";

const RAMPS = [
  { id: "blue", x: RUNWAY.x - 52, z: -560, heading: -Math.PI / 2, color: 0x2f6fed },
  { id: "gold", x: RUNWAY.x - 52, z: -534, heading: -Math.PI / 2, color: 0xe6b422 },
  { id: "green", x: RUNWAY.x - 52, z: -508, heading: -Math.PI / 2, color: 0x2fa36b },
];

const stands = [];

export function parkRamp(airportRoot) {
  stands.length = 0;
  for (const spec of RAMPS) {
    const mesh = createPlane({ paint: spec.color, name: `ramp-${spec.id}` });
    mesh.position.set(spec.x, GEAR_HEIGHT, spec.z);
    mesh.rotation.y = spec.heading;
    airportRoot.add(mesh);
    stands.push({ ...spec, mesh, open: true });
  }
}

export function restoreStands() {
  for (const stand of stands) {
    stand.open = true;
    stand.mesh.visible = true;
  }
}

export function standDoor(stand) {
  return { x: stand.x - 8, z: stand.z };
}

export function taxiDropoff(plane) {
  if (!plane.userData.crashed && (plane.position.y ?? 0) < 16) return null;
  const stand = stands.find((item) => item.open) ?? stands[0];
  if (!stand) return null;
  return standDoor(stand);
}

export function nearestOpenStand(x, z, max = 9) {
  let best = null;
  let bestD = max;
  for (const stand of stands) {
    if (!stand.open) continue;
    const d = Math.hypot(stand.x - x, stand.z - z);
    if (d < bestD) {
      best = stand;
      bestD = d;
    }
  }
  return best;
}

export function nearRide(plane, x, z) {
  if (nearestOpenStand(x, z, 9)) return true;
  if (plane.userData.crashed) return false;
  return Math.hypot(plane.position.x - x, plane.position.z - z) < 8;
}

export function claimStand(plane, stand) {
  clearFlightState(plane);
  plane.position.set(stand.x, GEAR_HEIGHT, stand.z);
  plane.rotation.set(0, stand.heading, 0);
  applyPlanePaint(plane, stand.color);
  stand.open = false;
  stand.mesh.visible = false;
  plane.userData.snapCamera = true;
}

export function tryBoardNear(plane, x, z) {
  const stand = nearestOpenStand(x, z, 9);
  if (stand) {
    claimStand(plane, stand);
    return true;
  }
  if (plane.userData.crashed) return false;
  return Math.hypot(plane.position.x - x, plane.position.z - z) < 8;
}

export function needsTaxi(plane, x, z) {
  if (plane.userData.crashed) return true;
  return Math.hypot(plane.position.x - x, plane.position.z - z) > 28;
}
