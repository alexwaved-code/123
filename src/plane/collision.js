import * as THREE from "three";
import { getCityColliders } from "../city/colliders.js";

const planeSize = new THREE.Vector3(2.6, 1.5, 5.2);
const planeBox = new THREE.Box3();
const center = new THREE.Vector3();

function smallestPush(plane, building) {
  const overlapX = Math.min(planeBox.max.x - building.min.x, building.max.x - planeBox.min.x);
  const overlapY = Math.min(planeBox.max.y - building.min.y, building.max.y - planeBox.min.y);
  const overlapZ = Math.min(planeBox.max.z - building.min.z, building.max.z - planeBox.min.z);
  building.getCenter(center);

  if (overlapX <= overlapY && overlapX <= overlapZ) {
    plane.position.x += plane.position.x < center.x ? -overlapX : overlapX;
    return;
  }
  if (overlapY <= overlapZ) {
    plane.position.y += plane.position.y < center.y ? -overlapY : overlapY;
    return;
  }
  plane.position.z += plane.position.z < center.z ? -overlapZ : overlapZ;
}

/** Agent A. Reads Agent B's `getCityColliders()`. */
export function resolveCollisions(plane) {
  plane.updateMatrixWorld(true);
  planeBox.setFromCenterAndSize(plane.position, planeSize);

  let hit = false;
  for (const building of getCityColliders()) {
    if (!planeBox.intersectsBox(building)) continue;
    hit = true;
    smallestPush(plane, building);
    planeBox.setFromCenterAndSize(plane.position, planeSize);
    plane.userData.speed *= 0.62;
  }

  if (plane.position.y < 4) {
    plane.position.y = 4;
    if (plane.userData.speed > 20) plane.userData.speed *= 0.92;
  }

  plane.userData.hit = hit;
  return hit;
}
