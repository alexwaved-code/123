import * as THREE from "three";

const solids = new Set();

/** Agent B. Drop every loaded solid. */
export function resetColliders() {
  solids.clear();
}

/** Agent B. Register a building, bridge, or dock. Ground, roads, water, and trees stay out. */
export function registerCollider(object3d) {
  object3d.userData.solid = true;
  solids.add(object3d);
}

/** Agent B. Call when a chunk leaves the loaded set. */
export function unregisterCollider(object3d) {
  solids.delete(object3d);
}

/** Agent A reads this. Fresh world-space boxes for loaded solids only. */
export function getCityColliders() {
  const boxes = [];
  for (const object3d of solids) {
    object3d.updateWorldMatrix(true, false);
    boxes.push(new THREE.Box3().setFromObject(object3d));
  }
  return boxes;
}
