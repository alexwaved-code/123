import * as THREE from "three";

const colliders = [];

/** Agent B. Call after a building is placed. */
export function registerCollider(object3d) {
  object3d.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object3d);
  colliders.push(box);
}

/** Agent A reads this. Return world-space boxes. */
export function getCityColliders() {
  return colliders;
}
