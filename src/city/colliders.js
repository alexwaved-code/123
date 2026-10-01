import * as THREE from "three";

const solids = [];

/** Agent B. Drop previous boxes before rebuilding the city. */
export function resetColliders() {
  solids.length = 0;
}

/** Agent B. Register a building mesh. Ground and roads stay out. */
export function registerCollider(object3d) {
  solids.push(object3d);
}

/** Agent A reads this. Fresh world-space boxes, safe to mutate. */
export function getCityColliders() {
  return solids.map((object3d) => {
    object3d.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(object3d);
  });
}
