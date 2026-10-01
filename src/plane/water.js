import * as THREE from "three";
import { chunkCoord, terrainType } from "../city/terrain.js";
import { overlapsRunway } from "../shared/constants.js";

const spray = [];
let trickleAt = 0;

export function isWater(x, z) {
  if (overlapsRunway(x, z, 12, 12)) return false;
  return terrainType(chunkCoord(x), chunkCoord(z)) === "water";
}

export function ensureSplash(scene) {
  if (spray.length) return;
  for (let i = 0; i < 18; i += 1) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xd8eef8, transparent: true, opacity: 0, depthWrite: false }),
    );
    drop.visible = false;
    scene.add(drop);
    spray.push({ mesh: drop, age: 99, vx: 0, vy: 0, vz: 0 });
  }
}

export function burstSplash(origin, speed) {
  spray.forEach((drop, i) => {
    const a = (i / spray.length) * Math.PI * 2;
    const throw_ = 3.2 + speed * 0.14;
    drop.age = 0;
    drop.vx = Math.cos(a) * throw_;
    drop.vy = 5.5 + (i % 5) * 1.2;
    drop.vz = Math.sin(a) * throw_;
    drop.mesh.position.copy(origin);
    drop.mesh.position.y = 0.35;
    drop.mesh.visible = true;
    drop.mesh.material.opacity = 0.72;
  });
}

export function trickleSplash(origin, speed) {
  const now = performance.now();
  if (now - trickleAt < 70) return;
  trickleAt = now;
  const n = Math.min(5, spray.length);
  for (let i = 0; i < n; i += 1) {
    const drop = spray[(Math.floor(now / 70) + i) % spray.length];
    if (drop.age < 0.35) continue;
    const a = Math.random() * Math.PI * 2;
    drop.age = 0.15;
    drop.vx = Math.cos(a) * (1.2 + speed * 0.08);
    drop.vy = 2.4 + Math.random() * 2;
    drop.vz = Math.sin(a) * (1.2 + speed * 0.08);
    drop.mesh.position.set(origin.x, 0.25, origin.z);
    drop.mesh.visible = true;
    drop.mesh.material.opacity = 0.45;
  }
}

export function updateSplash(delta) {
  for (const drop of spray) {
    if (drop.age > 1.15) {
      drop.mesh.visible = false;
      continue;
    }
    drop.age += delta;
    drop.vy -= 18 * delta;
    drop.mesh.position.x += drop.vx * delta;
    drop.mesh.position.y += drop.vy * delta;
    drop.mesh.position.z += drop.vz * delta;
    drop.mesh.material.opacity = Math.max(0, 0.7 - drop.age * 0.65);
  }
}
