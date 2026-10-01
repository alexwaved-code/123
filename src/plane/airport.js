import * as THREE from "three";
import { registerCollider } from "../city/colliders.js";
import { onRunway, RUNWAY } from "../shared/constants.js";

function mat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.04, ...extras });
}

function paint(w, d, y, x, z, color) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function solid(w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { roughness: 0.7 }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  registerCollider(mesh);
  return mesh;
}

export { onRunway };

export function runwayAlign(headingRad) {
  const h = ((headingRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const a = Math.abs(Math.atan2(Math.sin(h - RUNWAY.heading), Math.cos(h - RUNWAY.heading)));
  const b = Math.abs(Math.atan2(Math.sin(h - 0), Math.cos(h - 0)));
  return Math.min(a, b);
}

/** Agent A. Flight facility sitting west of downtown. */
export function createAirport() {
  const root = new THREE.Group();
  root.name = "airport";

  const midZ = (RUNWAY.z0 + RUNWAY.z1) / 2;
  const length = RUNWAY.z1 - RUNWAY.z0;

  root.add(paint(220, length + 80, 0.01, RUNWAY.x - 20, midZ, 0x6f8a52));
  root.add(paint(RUNWAY.width, length, 0.04, RUNWAY.x, midZ, 0x3a3f46));
  root.add(paint(1.1, length - 20, 0.05, RUNWAY.x - RUNWAY.width * 0.48, midZ, 0xf4f0e4));
  root.add(paint(1.1, length - 20, 0.05, RUNWAY.x + RUNWAY.width * 0.48, midZ, 0xf4f0e4));

  for (let z = RUNWAY.z0 + 30; z < RUNWAY.z1 - 30; z += 28) {
    root.add(paint(0.7, 12, 0.055, RUNWAY.x, z, 0xf4f0e4));
  }

  for (const endZ of [RUNWAY.z0 + 18, RUNWAY.z1 - 18]) {
    for (let i = -3; i <= 3; i += 1) {
      root.add(paint(1.2, 14, 0.056, RUNWAY.x + i * 3.4, endZ, 0xf4f0e4));
    }
  }

  root.add(paint(18, 160, 0.035, RUNWAY.x - 38, -520, 0x4a4f55));
  root.add(paint(70, 90, 0.03, RUNWAY.x - 78, -520, 0x555b63));

  root.add(solid(48, 10, 22, RUNWAY.x - 88, 5, -500, 0xc5c1b6));
  root.add(solid(8, 28, 8, RUNWAY.x - 58, 14, -470, 0x8b93a0));
  root.add(solid(12, 6, 10, RUNWAY.x - 58, 31, -470, 0xd7dde4));

  for (let i = 0; i < 4; i += 1) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 1.2),
      new THREE.MeshStandardMaterial({
        color: i < 2 ? 0xff2a2a : 0xf7f7f2,
        emissive: i < 2 ? 0xff2200 : 0xfff6d0,
        emissiveIntensity: 1.8,
      }),
    );
    light.position.set(RUNWAY.x + 24, 0.4, -240 - i * 8);
    root.add(light);
  }

  return root;
}
