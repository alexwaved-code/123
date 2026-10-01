import * as THREE from "three";

/** Agent A. */
export function createFollowCamera(camera, plane) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  let snapped = false;
  let shake = 0;

  return function updateCamera(delta = 0.016, telemetry = {}) {
    if (plane.userData.snapCamera) {
      snapped = false;
      plane.userData.snapCamera = false;
    }

    const speed = plane.userData.speed ?? 0;
    const grounded = !plane.userData.airborne;
    const back = grounded ? 8.5 : 10.5 + speed * 0.07;
    const height = grounded ? 2.4 : 3.4 + speed * 0.025;
    const yaw = plane.rotation.y;
    desired.set(
      plane.position.x + Math.sin(yaw) * back,
      plane.position.y + height,
      plane.position.z + Math.cos(yaw) * back,
    );

    if (telemetry.crashed) shake = Math.max(shake, 0.9);
    else if (telemetry.hit) shake = 0.62;
    else if (telemetry.altitude < 8 && plane.userData.airborne) shake = Math.max(shake, 0.06);
    shake *= Math.pow(0.02, delta);

    if (!snapped || (grounded && speed < 1)) {
      camera.position.copy(desired);
      snapped = true;
    } else {
      camera.position.lerp(desired, 1 - Math.pow(0.0008, delta));
    }
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;

    const pitch = plane.userData.pitch ?? 0;
    look.set(
      plane.position.x - Math.sin(yaw) * 6,
      plane.position.y + 0.35 + pitch * 10,
      plane.position.z - Math.cos(yaw) * 6,
    );
    camera.lookAt(look);
    if (!telemetry.crashed) {
      camera.rotateZ(-(plane.userData.visual?.rotation.z ?? 0) * 0.55);
    }

    const wantFov = telemetry.crashed ? 62 : 67 + speed * 0.24;
    camera.fov += (wantFov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
  };
}
