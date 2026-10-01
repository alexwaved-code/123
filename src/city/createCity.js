import * as THREE from "three";
import { registerCollider, resetColliders } from "./colliders.js";

const BLOCK = 46;

function solid(w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.05 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  registerCollider(mesh);
  return mesh;
}

function block(w, h, d, x, z, color) {
  return solid(w, h, d, x, h / 2, z, color);
}

function tree(x, z) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.9 }),
  );
  trunk.position.set(x, 2, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 3.2, 7, 7),
    new THREE.MeshStandardMaterial({ color: 0x3f7a45, roughness: 0.85 }),
  );
  crown.position.set(x, 7, z);
  crown.castShadow = true;
  group.add(trunk, crown);
  return group;
}

/** Agent B. City around the origin. Colliders are buildings only. */
export function createCity() {
  resetColliders();
  const root = new THREE.Group();
  root.name = "city";

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x8aa37a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 72),
    new THREE.MeshStandardMaterial({ color: 0xc8c2b4, roughness: 1 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.015;
  plaza.receiveShadow = true;
  root.add(plaza);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.95 });
  for (let i = -3; i <= 3; i += 1) {
    const at = i * BLOCK;
    const width = i === 0 ? 16 : 10;
    const northSouth = new THREE.Mesh(new THREE.PlaneGeometry(width, 700), roadMat);
    northSouth.rotation.x = -Math.PI / 2;
    northSouth.position.set(at, 0.02, 0);
    northSouth.receiveShadow = true;
    root.add(northSouth);

    const eastWest = new THREE.Mesh(new THREE.PlaneGeometry(700, width), roadMat);
    eastWest.rotation.x = -Math.PI / 2;
    eastWest.position.set(0, 0.03, at);
    eastWest.receiveShadow = true;
    root.add(eastWest);
  }

  const colors = [0xd8c7b0, 0xb9c4ce, 0xc9b8a6, 0x9aa7b2, 0xc4b7a4];
  const parks = new Set(["2,-3", "-3,1", "-2,3"]);
  for (let i = -3; i <= 3; i += 1) {
    for (let j = -3; j <= 3; j += 1) {
      if (i === 0 && j === 0) continue;
      if (parks.has(`${i},${j}`)) {
        root.add(tree(i * BLOCK, j * BLOCK));
        continue;
      }
      const w = 14 + ((Math.abs(i * 3 + j) % 5) * 2);
      const d = 12 + ((Math.abs(i + j * 2) % 4) * 2);
      const h = 16 + Math.abs(i * j) * 5 + ((Math.abs(i) + 3) % 5) * 7;
      root.add(block(w, h, d, i * BLOCK, j * BLOCK, colors[(i + j + 8) % colors.length]));
    }
  }

  // Spire (22, 22), hall (-18, 18), needle (20, -24). Off the center roads.
  root.add(solid(16, 48, 16, 22, 24, 22, 0x6e8ca0));
  root.add(solid(10, 26, 10, 22, 61, 22, 0x8eacbf));
  root.add(solid(5, 18, 5, 22, 83, 22, 0xd5e4ee));
  root.add(solid(22, 14, 16, -22, 7, 18, 0xc47b5a));
  root.add(solid(8, 96, 8, 20, 48, -24, 0x44525c));
  root.add(solid(2, 14, 2, 20, 103, -24, 0xe8eef2));

  return root;
}
