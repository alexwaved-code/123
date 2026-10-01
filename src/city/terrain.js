import * as THREE from "three";

export const CHUNK_SIZE = 256;
const TYPES = ["downtown", "suburb", "park", "industrial", "water"];

function hash(cx, cz) {
  let n = Math.imul(cx, 374761393) + Math.imul(cz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

/** Same (cx, cz) always picks the same terrain. Origin stays downtown. */
export function terrainType(cx, cz) {
  if (cx === 0 && cz === 0) return "downtown";
  return TYPES[hash(cx, cz) % TYPES.length];
}

export function chunkCoord(value) {
  return Math.floor(value / CHUNK_SIZE);
}

/**
 * Meters. Land and the water surface are flat at y = 0.
 * Hills can replace this later; callers should use the return value.
 */
/** Flat land and water surface, in meters. Hills can replace this later. */
export function getGroundHeight(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
  return 0;
}

export function chunkHash(cx, cz, salt = 0) {
  return hash(cx + salt * 17, cz - salt * 13);
}
