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

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

/** Agent A. Arcade flight with a little inertia. City code should not call this. */
export function updateFlight(plane, delta) {
  const yawIn = held("KeyA", "ArrowLeft") - held("KeyD", "ArrowRight");
  const climbIn = held("KeyR", "Space", "ArrowUp") - held("KeyF", "ControlLeft", "ControlRight", "ArrowDown");
  const throttleIn = held("KeyW") - held("KeyS");

  plane.userData.throttle = THREE.MathUtils.clamp(
    (plane.userData.throttle ?? 0.32) + throttleIn * 0.55 * delta,
    0,
    1,
  );

  const wantSpeed = 9 + plane.userData.throttle * 69;
  plane.userData.speed = damp(plane.userData.speed, wantSpeed, 1.8, delta);

  const turnScale = THREE.MathUtils.lerp(1.7, 0.85, THREE.MathUtils.clamp((plane.userData.speed - 10) / 60, 0, 1));
  plane.userData.yawRate = damp(plane.userData.yawRate ?? 0, yawIn * turnScale, 7, delta);
  plane.userData.climbRate = damp(plane.userData.climbRate ?? 0, climbIn * 26, 6, delta);

  plane.rotation.y += plane.userData.yawRate * delta;
  plane.position.y += plane.userData.climbRate * delta;

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
  plane.position.addScaledVector(forward, plane.userData.speed * delta);

  const visual = plane.userData.visual;
  if (visual) {
    const pitch = THREE.MathUtils.clamp(plane.userData.climbRate * 0.02, -0.55, 0.55);
    visual.rotation.x = damp(visual.rotation.x, pitch, 8, delta);
    visual.rotation.z = damp(visual.rotation.z, plane.userData.yawRate * 0.38, 8, delta);
  }
  plane.userData.pitch = visual?.rotation.x ?? 0;

  const hit = resolveCollisions(plane);
  const telemetry = {
    speed: plane.userData.speed,
    altitude: plane.position.y,
    heading: THREE.MathUtils.radToDeg(plane.rotation.y),
    throttle: plane.userData.throttle,
    hit,
  };
  updateHud(telemetry);
  return telemetry;
}
