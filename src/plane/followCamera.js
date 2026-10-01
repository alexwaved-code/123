import * as THREE from "three";

/** Agent A. */
export function createFollowCamera(camera, plane) {
  const offset = new THREE.Vector3(0, 4.5, 12);
  const look = new THREE.Vector3();

  return function updateCamera() {
    const worldOffset = offset.clone().applyQuaternion(plane.quaternion);
    camera.position.copy(plane.position).add(worldOffset);
    look.copy(plane.position);
    look.y += 0.8;
    camera.lookAt(look);
  };
}
