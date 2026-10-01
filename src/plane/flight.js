import * as THREE from "three";
import { resolveCollisions } from "./collision.js";
import { updateHud } from "./hud.js";

const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function held(...codes) {
  return codes.some((code) => keys.has(code)) ? 1 : 0;
}

/** Agent A. Arcade flight. City code should not call this. */
export function updateFlight(plane, delta) {
  const yaw = held("KeyA", "ArrowLeft") - held("KeyD", "ArrowRight");
  const climb = held("KeyR", "Space", "ArrowUp") - held("KeyF", "ControlLeft", "ControlRight", "ArrowDown");
  const throttle = held("KeyW") - held("KeyS");

  plane.userData.speed = THREE.MathUtils.clamp(
    plane.userData.speed + throttle * 22 * delta,
    8,
    78,
  );

  plane.rotation.y += yaw * 1.35 * delta;
  plane.position.y += climb * 24 * delta;

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
  plane.position.addScaledVector(forward, plane.userData.speed * delta);

  const visual = plane.userData.visual;
  if (visual) {
    visual.rotation.z = THREE.MathUtils.lerp(visual.rotation.z, yaw * 0.45, 1 - Math.pow(0.001, delta));
    visual.rotation.x = THREE.MathUtils.lerp(visual.rotation.x, climb * -0.22, 1 - Math.pow(0.001, delta));
  }
  if (plane.userData.prop) {
    plane.userData.prop.rotation.z += plane.userData.speed * 0.35 * delta;
  }

  const hit = resolveCollisions(plane);
  const telemetry = {
    speed: plane.userData.speed,
    altitude: plane.position.y,
    heading: THREE.MathUtils.radToDeg(plane.rotation.y),
    hit,
  };
  updateHud(telemetry);
  return telemetry;
}
