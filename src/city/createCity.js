import * as THREE from "three";
import { overlapsRunway, SPAWN } from "../shared/constants.js";
import { registerCollider, resetColliders, unregisterCollider } from "./colliders.js";
import { blockLots, chunkRoads } from "./roads.js";
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

function paintRoads(group, cx, cz, color) {
  for (const seg of chunkRoads(cx, cz)) {
    const vertical = Math.abs(seg.x1 - seg.x2) < 0.1;
    const length = vertical ? Math.abs(seg.z2 - seg.z1) : Math.abs(seg.x2 - seg.x1);
    addRoad(
      group,
      (seg.x1 + seg.x2) / 2,
      (seg.z1 + seg.z2) / 2,
      seg.width,
      length,
      !vertical,
      color,
      vertical ? 0.03 : 0.04,
    );
  }
}

function placeInLot(group, lot, w, h, d, color) {
  const roomW = lot.spanX - 7;
  const roomD = lot.spanZ - 7;
  if (w > roomW || d > roomD || roomW < 8 || roomD < 8) return null;
  return addSolid(group, w, h, d, lot.cx, h / 2, lot.cz, color);
}

function buildDowntown(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x8aa37a);
  paintRoads(group, cx, cz, 0x4a4f55);
  const lots = blockLots(cx, cz);
  const reserved = new Set();
  if (cx === 0 && cz === 0) addOriginLandmarks(group, lots, reserved);

  const colors = [0xd8c7b0, 0xb9c4ce, 0xc9b8a6, 0x9aa7b2];
  lots.forEach((lot, index) => {
    if (reserved.has(index)) return;
    const n = chunkHash(cx, cz, index + 3);
    const roomW = lot.spanX - 7;
    const roomD = lot.spanZ - 7;
    const w = Math.min(roomW, 12 + (n % 5) * 3);
    const d = Math.min(roomD, 12 + ((n >> 3) % 4) * 3);
    const h = 18 + (n % 7) * 8;
    placeInLot(group, lot, w, h, d, colors[n % colors.length]);
  });
}

function nearestLot(lots, x, z, used, minSpan) {
  let best = -1;
  let bestD = Infinity;
  lots.forEach((lot, index) => {
    if (used.has(index) || lot.spanX < minSpan || lot.spanZ < minSpan) return;
    const d = (lot.cx - x) ** 2 + (lot.cz - z) ** 2;
    if (d >= bestD) return;
    bestD = d;
    best = index;
  });
  return best;
}

function addOriginLandmarks(group, lots, reserved) {
  const spire = nearestLot(lots, 22, 22, reserved, 20);
  const hall = nearestLot(lots, 69, 69, reserved, 28);
  const needle = nearestLot(lots, 127, 127, reserved, 20);
  if (spire >= 0) {
    reserved.add(spire);
    const lot = lots[spire];
    addSolid(group, 16, 48, 16, lot.cx, 24, lot.cz, 0x6e8ca0);
    addSolid(group, 10, 26, 10, lot.cx, 61, lot.cz, 0x8eacbf);
    addSolid(group, 5, 18, 5, lot.cx, 83, lot.cz, 0xd5e4ee);
  }
  if (hall >= 0) {
    reserved.add(hall);
    const lot = lots[hall];
    addSolid(group, 22, 14, 16, lot.cx, 7, lot.cz, 0xc47b5a);
  }
  if (needle >= 0) {
    reserved.add(needle);
    const lot = lots[needle];
    addSolid(group, 8, 96, 8, lot.cx, 48, lot.cz, 0x44525c);
    addSolid(group, 2, 14, 2, lot.cx, 103, lot.cz, 0xe8eef2);
  }
}

function buildSuburb(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x9cba78);
  paintRoads(group, cx, cz, 0x6a6258);
  blockLots(cx, cz).forEach((lot, index) => {
    const n = chunkHash(cx, cz, index + 1);
    if ((n % 5) === 0) {
      addTree(group, lot.cx, lot.cz);
      return;
    }
    const roomW = lot.spanX - 8;
    const roomD = lot.spanZ - 8;
    const w = Math.min(roomW, 10 + (n % 3) * 2);
    const d = Math.min(roomD, 8 + ((n >> 2) % 3) * 2);
    const h = 6 + (n % 4) * 2;
    placeInLot(group, lot, w, h, d, n % 2 === 0 ? 0xd7c4a3 : 0xc9b7a0);
    if ((n % 3) === 0) {
      const treeX = lot.cx + Math.min(6, lot.spanX * 0.2);
      if (treeX < lot.x1 - 3) addTree(group, treeX, lot.cz);
    }
  });
}

function buildPark(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x6f9a55);
  paintRoads(group, cx, cz, 0xc2b48a);
  const lots = blockLots(cx, cz);
  lots.forEach((lot, index) => {
    const roomX = Math.max(8, Math.floor(lot.spanX - 12));
    const roomZ = Math.max(8, Math.floor(lot.spanZ - 12));
    for (let i = 0; i < 3; i += 1) {
      const n = chunkHash(cx, cz, index * 5 + i + 9);
      const x = lot.x0 + 6 + (n % roomX);
      const z = lot.z0 + 6 + ((n >> 4) % roomZ);
      addTree(group, x, z);
    }
  });
  const shelter = lots.find((lot) => lot.spanX > 30 && lot.spanZ > 30);
  if (shelter) addSolid(group, 10, 5, 10, shelter.cx, 2.5, shelter.cz, 0xefe6d6);
}

function buildIndustrial(group, cx, cz, ox, oz) {
  addGround(group, ox, oz, 0x8d9286);
  paintRoads(group, cx, cz, 0x3e4450);
  blockLots(cx, cz).forEach((lot, index) => {
    const n = chunkHash(cx, cz, index + 4);
    const w = Math.min(lot.spanX - 12, (lot.spanX - 12) * 0.86);
    const d = Math.min(lot.spanZ - 12, (lot.spanZ - 12) * 0.7);
    const h = 8 + (n % 5) * 2;
    const mesh = placeInLot(group, lot, w, h, d, 0x5c646b);
    if (mesh) addSolid(group, Math.max(6, w - 8), 2, Math.max(6, d - 4), lot.cx, h + 1, lot.cz, 0x3a4046);
  });
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
