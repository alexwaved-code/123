import * as THREE from "three";
import { overlapsRunway, SPAWN } from "../shared/constants.js";
import { registerCollider, resetColliders, unregisterCollider } from "./colliders.js";
import { CHUNK_SIZE, chunkCoord, chunkHash, getGroundHeight, terrainType } from "./terrain.js";

const RADIUS = 2;
const loaded = new Map();
let cityRoot = null;
let lastCx = Number.NaN;
let lastCz = Number.NaN;

const geos = new Map();
const mats = new Map();

function geo(kind, a, b, c) {
  const key = `${kind}:${a}:${b}:${c ?? ""}`;
  let geometry = geos.get(key);
  if (!geometry) {
    geometry = kind === "box"
      ? new THREE.BoxGeometry(a, b, c)
      : kind === "plane"
        ? new THREE.PlaneGeometry(a, b)
        : kind === "trunk"
          ? new THREE.CylinderGeometry(0.5, 0.7, 4, 5)
          : new THREE.CylinderGeometry(0, 3.2, 7, 6);
    geos.set(key, geometry);
  }
  return geometry;
}

function mat(color, roughness = 0.8) {
  const key = `${color}:${roughness}`;
  let material = mats.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
    mats.set(key, material);
  }
  return material;
}

function addGround(group, ox, oz, color) {
  const mesh = new THREE.Mesh(geo("plane", CHUNK_SIZE, CHUNK_SIZE), mat(color, 1));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(ox + CHUNK_SIZE / 2, 0, oz + CHUNK_SIZE / 2);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addRoad(group, x, z, width, length, alongX, color, y = 0.03) {
  const mesh = new THREE.Mesh(
    geo("plane", alongX ? length : width, alongX ? width : length),
    mat(color, 0.95),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addSolid(group, w, h, d, x, y, z, color) {
  if (overlapsRunway(x, z, w, d)) return null;
  const mesh = new THREE.Mesh(geo("box", w, h, d), mat(color, 0.72));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  registerCollider(mesh);
  group.add(mesh);
  return mesh;
}

function addTree(group, x, z) {
  if (overlapsRunway(x, z, 8, 8)) return;
  const trunk = new THREE.Mesh(geo("trunk"), mat(0x6b4a32, 0.9));
  trunk.position.set(x, 2, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(geo("crown"), mat(0x3f7a45, 0.85));
  crown.position.set(x, 7, z);
  crown.castShadow = true;
  group.add(trunk, crown);
}

function release(group) {
  group.traverse((object3d) => {
    if (object3d.userData.solid) unregisterCollider(object3d);
  });
  group.removeFromParent();
}

function unloadAll() {
  for (const group of loaded.values()) release(group);
  loaded.clear();
}

function buildDowntown(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x8aa37a);
  for (let i = 0; i < 4; i += 1) {
    const at = 40 + i * 58;
    addRoad(group, ox + at, oz + CHUNK_SIZE / 2, 12, CHUNK_SIZE - 8, false, 0x4a4f55);
    addRoad(group, ox + CHUNK_SIZE / 2, oz + at, 12, CHUNK_SIZE - 8, true, 0x4a4f55, 0.04);
  }

  const colors = [0xd8c7b0, 0xb9c4ce, 0xc9b8a6, 0x9aa7b2];
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      const x = ox + 28 + i * 46;
      const z = oz + 28 + j * 46;
      if (cx === 0 && cz === 0 && nearLandmark(x, z)) continue;
      const n = chunkHash(cx, cz, i * 5 + j + 3);
      const w = 14 + (n % 5) * 2;
      const d = 12 + ((n >> 3) % 4) * 2;
      const h = 18 + (n % 7) * 8;
      addSolid(group, w, h, d, x, h / 2, z, colors[n % colors.length]);
    }
  }

  if (cx === 0 && cz === 0) addOriginLandmarks(group);
}

function nearLandmark(x, z) {
  const spots = [[22, 22], [64, 48], [48, 96]];
  return spots.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 30);
}

function addOriginLandmarks(group) {
  addSolid(group, 16, 48, 16, 22, 24, 22, 0x6e8ca0);
  addSolid(group, 10, 26, 10, 22, 61, 22, 0x8eacbf);
  addSolid(group, 5, 18, 5, 22, 83, 22, 0xd5e4ee);
  addSolid(group, 22, 14, 16, 64, 7, 48, 0xc47b5a);
  addSolid(group, 8, 96, 8, 48, 48, 96, 0x44525c);
  addSolid(group, 2, 14, 2, 48, 103, 96, 0xe8eef2);
}

function buildSuburb(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x9cba78);
  addRoad(group, ox + CHUNK_SIZE / 2, oz + 80, 10, CHUNK_SIZE - 16, true, 0x6a6258);
  addRoad(group, ox + CHUNK_SIZE / 2, oz + 176, 10, CHUNK_SIZE - 16, true, 0x6a6258);
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      const n = chunkHash(cx, cz, i * 4 + j + 1);
      const x = ox + 36 + i * 58;
      const z = oz + 36 + j * 58;
      if ((n % 5) === 0) {
        addTree(group, x, z);
        continue;
      }
      const w = 10 + (n % 3) * 2;
      const d = 8 + ((n >> 2) % 3) * 2;
      const h = 6 + (n % 4) * 2;
      addSolid(group, w, h, d, x, h / 2, z, n % 2 === 0 ? 0xd7c4a3 : 0xc9b7a0);
      if ((n % 3) === 0) addTree(group, x + 16, z + 10);
    }
  }
}

function buildPark(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x6f9a55);
  addRoad(group, ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2, 8, CHUNK_SIZE - 20, true, 0xc2b48a, 0.02);
  addRoad(group, ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2, 8, CHUNK_SIZE - 20, false, 0xc2b48a, 0.025);
  for (let i = 0; i < 18; i += 1) {
    const n = chunkHash(cx, cz, i + 9);
    const x = ox + 16 + (n % 220);
    const z = oz + 16 + ((n >> 4) % 220);
    addTree(group, x, z);
  }
  addSolid(group, 10, 5, 10, ox + 128, 2.5, oz + 128, 0xefe6d6);
}

function buildIndustrial(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x8d9286);
  addRoad(group, ox + CHUNK_SIZE / 2, oz + 128, 18, CHUNK_SIZE - 10, true, 0x3e4450);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const n = chunkHash(cx, cz, row * 2 + col + 4);
      const w = 78;
      const d = 26;
      const h = 8 + (n % 5) * 2;
      const x = ox + 58 + col * 120;
      const z = oz + 42 + row * 78;
      addSolid(group, w, h, d, x, h / 2, z, 0x5c646b);
      addSolid(group, w - 8, 2, d - 4, x, h + 1, z, 0x3a4046);
    }
  }
}

function buildWater(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x2f6f8f);
  const surface = new THREE.Mesh(geo("plane", CHUNK_SIZE - 4, CHUNK_SIZE - 4), mat(0x3d8eae, 0.35));
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(ox + CHUNK_SIZE / 2, 0.05, oz + CHUNK_SIZE / 2);
  group.add(surface);
  addSolid(group, CHUNK_SIZE - 16, 2, 14, ox + CHUNK_SIZE / 2, 3, oz + CHUNK_SIZE / 2, 0x8d8478);
  const n = chunkHash(cx, cz, 2);
  for (let i = 0; i < 3; i += 1) {
    const z = oz + 36 + i * 70 + (n % 12);
    addSolid(group, 18, 6, 10, ox + 24, 3, z, 0x6e6258);
    addSolid(group, 4, 14, 4, ox + 24, 10, z, 0x9aa0a6);
  }
}

function buildChunk(cx, cz) {
  const group = new THREE.Group();
  group.name = `chunk:${cx},${cz}`;
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const type = terrainType(cx, cz);
  if (type === "downtown") buildDowntown(group, cx, cz, ox, oz);
  else if (type === "suburb") buildSuburb(group, cx, cz, ox, oz);
  else if (type === "park") buildPark(group, cx, cz, ox, oz);
  else if (type === "industrial") buildIndustrial(group, cx, cz, ox, oz);
  else buildWater(group, cx, cz, ox, oz);
  return group;
}

function ensureChunks(root, cx, cz) {
  const keep = new Set();
  for (let dz = -RADIUS; dz <= RADIUS; dz += 1) {
    for (let dx = -RADIUS; dx <= RADIUS; dx += 1) {
      const x = cx + dx;
      const z = cz + dz;
      const key = `${x},${z}`;
      keep.add(key);
      if (loaded.has(key)) continue;
      const group = buildChunk(x, z);
      loaded.set(key, group);
      root.add(group);
    }
  }
  for (const [key, group] of loaded) {
    if (keep.has(key)) continue;
    release(group);
    loaded.delete(key);
  }
}

/** Agent B. Empty root, then the 5×5 chunks around spawn. */
export function createCity() {
  unloadAll();
  resetColliders();
  cityRoot = null;
  lastCx = Number.NaN;
  lastCz = Number.NaN;
  const root = new THREE.Group();
  root.name = "city";
  updateCity(root, SPAWN);
  return root;
}

/**
 * Agent A calls this with the plane position. Loads a 5×5 of 256 m chunks
 * and drops chunks outside that window, including their colliders.
 * worldPosition: { x, y, z } in meters.
 */
export function updateCity(root, worldPosition) {
  if (root !== cityRoot) {
    unloadAll();
    resetColliders();
    cityRoot = root;
    lastCx = Number.NaN;
    lastCz = Number.NaN;
  }
  const cx = chunkCoord(worldPosition.x);
  const cz = chunkCoord(worldPosition.z);
  if (cx === lastCx && cz === lastCz) return;
  lastCx = cx;
  lastCz = cz;
  ensureChunks(root, cx, cz);
}

export { getGroundHeight };
