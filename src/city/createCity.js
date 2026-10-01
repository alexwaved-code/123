import * as THREE from "three";
import { registerCollider } from "./colliders.js";

function box(w, h, d, x, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.05 }),
  );
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.updateMatrixWorld(true);
  registerCollider(mesh);
  return mesh;
}

/** Agent B. Expand this city. Keep colliders registered. */
export function createCity() {
  const root = new THREE.Group();
  root.name = "city";

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x8aa37a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 700),
    new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.95 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  root.add(road);

  const cross = road.clone();
  cross.rotation.z = Math.PI / 2;
  root.add(cross);

  const colors = [0xd8c7b0, 0xb9c4ce, 0xc9b8a6, 0x9aa7b2];
  for (let i = -3; i <= 3; i += 1) {
    for (let j = -3; j <= 3; j += 1) {
      if (Math.abs(i) < 1 && Math.abs(j) < 1) continue;
      const w = 14 + ((i * 3 + j) % 5) * 2;
      const d = 12 + ((i + j * 2) % 4) * 2;
      const h = 16 + Math.abs(i * j) * 6 + ((i + 7) % 5) * 8;
      root.add(box(w, h, d, i * 42, j * 42, colors[(i + j + 8) % colors.length]));
    }
  }

  root.add(box(22, 90, 22, 0, 0, 0x6e8ca0));
  return root;
}
