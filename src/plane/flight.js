import * as THREE from "three";
import { resolveCollisions } from "./collision.js";
import { updateHud } from "./hud.js";

const keys = new Set();

const CLIMB = ["KeyR", "Space", "ArrowUp", "Numpad8", "PageUp", "Equal", "NumpadAdd"];
const DESCEND = ["KeyF", "KeyC", "ArrowDown", "Numpad2", "PageDown", "Minus", "NumpadSubtract"];
const LEFT = ["KeyA", "ArrowLeft", "Numpad4"];
const RIGHT = ["KeyD", "ArrowRight", "Numpad6"];
const THROTTLE_UP = ["KeyW"];
const THROTTLE_DOWN = ["KeyS"];
const BLOCK = new Set([
  ...CLIMB,
  ...DESCEND,
  ...LEFT,
  ...RIGHT,
  ...THROTTLE_UP,
  ...THROTTLE_DOWN,
]);

function onKeyDown(event) {
  if (event.isComposing || event.keyCode === 229) return;
  if (!BLOCK.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
}

function onKeyUp(event) {
  keys.delete(event.code);
}

function clearKeys() {
  keys.clear();
}

window.addEventListener("keydown", onKeyDown, { capture: true });
window.addEventListener("keyup", onKeyUp, { capture: true });
window.addEventListener("blur", clearKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearKeys();
});

function held(codes) {
  return codes.some((code) => keys.has(code)) ? 1 : 0;
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

/** Agent A. Arcade flight with a little inertia. City code should not call this. */
export function updateFlight(plane, delta) {
  const yawIn = held(LEFT) - held(RIGHT);
  const climbIn = held(CLIMB) - held(DESCEND);
  const throttleIn = held(THROTTLE_UP) - held(THROTTLE_DOWN);

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
