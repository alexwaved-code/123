import * as THREE from "three";

/** Agent A. */
export function createFollowCamera(camera, plane) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  let snapped = false;
  let shake = 0;

  return function updateCamera(delta = 0.016, telemetry = {}) {
    const speed = plane.userData.speed ?? 28;
    const back = 10.5 + speed * 0.07;
    const height = 3.4 + speed * 0.025;
    const yaw = plane.rotation.y;
    desired.set(
      plane.position.x + Math.sin(yaw) * back,
      plane.position.y + height,
      plane.position.z + Math.cos(yaw) * back,
    );

    if (telemetry.hit) shake = 0.62;
    if (telemetry.altitude < 16) shake = Math.max(shake, 0.08);
    shake *= Math.pow(0.02, delta);

    if (!snapped) {
      camera.position.copy(desired);
      snapped = true;
    } else {
      camera.position.lerp(desired, 1 - Math.pow(0.0008, delta));
    }
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;

    look.set(
      plane.position.x - Math.sin(yaw) * 6,
      plane.position.y + 0.35,
      plane.position.z - Math.cos(yaw) * 6,
    );
    camera.lookAt(look);
    camera.rotateZ(-(plane.userData.visual?.rotation.z ?? 0) * 0.55);

    const wantFov = 67 + speed * 0.24;
    camera.fov += (wantFov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
  };
}
