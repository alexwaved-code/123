import * as THREE from "three";

const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

/** Agent A. Arcade flight. City code should not call this. */
export function updateFlight(plane, delta) {
  const yaw = (keys.has("KeyA") ? 1 : 0) - (keys.has("KeyD") ? 1 : 0);
  const climb = (keys.has("KeyR") ? 1 : 0) - (keys.has("KeyF") ? 1 : 0);
  const throttle = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);

  plane.userData.speed = THREE.MathUtils.clamp(
    plane.userData.speed + throttle * 18 * delta,
    8,
    70,
  );

  plane.rotation.y += yaw * 1.15 * delta;
  plane.position.y = Math.max(4, plane.position.y + climb * 22 * delta);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(plane.quaternion);
  plane.position.addScaledVector(forward, plane.userData.speed * delta);

  return {
    speed: plane.userData.speed,
    altitude: plane.position.y,
    heading: THREE.MathUtils.radToDeg(plane.rotation.y),
  };
}
