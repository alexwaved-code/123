import * as THREE from "three";

/** Agent A. */
export function createFollowCamera(camera, plane) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();

  return function updateCamera() {
    const back = 11 + plane.userData.speed * 0.06;
    const height = 3.8 + plane.userData.speed * 0.02;
    const yaw = plane.rotation.y;
    desired.set(
      plane.position.x + Math.sin(yaw) * back,
      plane.position.y + height,
      plane.position.z + Math.cos(yaw) * back,
    );
    camera.position.lerp(desired, 0.14);
    look.set(plane.position.x, plane.position.y + 0.6, plane.position.z);
    camera.lookAt(look);
  };
}
