import { CHUNK_SIZE, terrainType } from "./terrain.js";

/** Axis-aligned road centerlines for one chunk. Same layout the city meshes use. */
export function chunkRoads(cx, cz) {
  const type = terrainType(cx, cz);
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const end = CHUNK_SIZE;
  const roads = [];
  const vertical = (at, width) => roads.push({ x1: ox + at, z1: oz, x2: ox + at, z2: oz + end, width });
  const horizontal = (at, width) => roads.push({ x1: ox, z1: oz + at, x2: ox + end, z2: oz + at, width });

  if (type === "downtown") {
    for (const at of [40, 98, 156, 214]) {
      vertical(at, 12);
      horizontal(at, 12);
    }
  } else if (type === "suburb") {
    for (const at of [80, 176]) horizontal(at, 10);
    for (const at of [64, 192]) vertical(at, 10);
  } else if (type === "park") {
    horizontal(128, 8);
    vertical(128, 8);
  } else if (type === "industrial") {
    horizontal(128, 18);
    vertical(128, 14);
  }
  return roads;
}

export function segmentsAround(x, z, radius = 2) {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const segs = [];
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) segs.push(...chunkRoads(cx + dx, cz + dz));
  }
  return segs;
}

function project(x, z, seg) {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const len2 = dx * dx + dz * dz;
  let t = len2 < 1e-6 ? 0 : ((x - seg.x1) * dx + (z - seg.z1) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + dx * t, z: seg.z1 + dz * t, t, seg };
}

function onSegment(x, z, seg, extra = 0.4) {
  const hit = project(x, z, seg);
  return Math.hypot(hit.x - x, hit.z - z) <= seg.width * 0.5 + extra;
}

/**
 * Short steps along roads that pass under (x, z).
 * A step past the end of the asphalt is left out, so the road edge is not a stop.
 */
export function roadSteps(x, z, reach = 8) {
  const segs = segmentsAround(x, z, 1);
  const here = segs.filter((seg) => onSegment(x, z, seg));
  const steps = [];
  const seen = new Set();
  for (const seg of here) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz) || 1;
    for (const sign of [1, -1]) {
      const px = x + (dx / len) * sign * reach;
      const pz = z + (dz / len) * sign * reach;
      if (!segs.some((other) => onSegment(px, pz, other))) continue;
      const key = `${Math.round(px)},${Math.round(pz)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      steps.push({ x: px, z: pz });
    }
  }
  return { steps, onRoad: here.length > 0 };
}

export function nearestRoadPoint(x, z, segs = segmentsAround(x, z)) {
  let best = null;
  let bestD = Infinity;
  for (const seg of segs) {
    const point = project(x, z, seg);
    const d = (point.x - x) ** 2 + (point.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = point;
    }
  }
  if (!best) return null;
  best.dist = Math.sqrt(bestD);
  return best;
}

/**
 * Where to leave the road for an off-road destination.
 * The spot is a little farther from the destination than the closest point on the road,
 * on the side the taxi is coming from, so the turn off the road is shallow.
 */
export function roadExit(goalX, goalZ, fromX, fromZ) {
  const near = nearestRoadPoint(goalX, goalZ);
  if (!near) return null;
  if (near.dist <= near.seg.width * 0.5 + 1) {
    return { x: near.x, z: near.z, offRoad: false };
  }
  const dx = near.seg.x2 - near.seg.x1;
  const dz = near.seg.z2 - near.seg.z1;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const towardTaxi = (fromX - near.x) * ux + (fromZ - near.z) * uz;
  const sign = towardTaxi >= 0 ? 1 : -1;
  const longer = Math.max(near.dist + 3, near.dist * 1.2);
  const along = Math.sqrt(Math.max(0, longer * longer - near.dist * near.dist));
  const segs = segmentsAround(near.x, near.z, 1);
  let x = near.x;
  let z = near.z;
  let walked = 0;
  while (walked + 2 <= along) {
    const nx = x + ux * sign * 2;
    const nz = z + uz * sign * 2;
    if (!segs.some((seg) => onSegment(nx, nz, seg, 0.2))) break;
    x = nx;
    z = nz;
    walked += 2;
  }
  return { x, z, offRoad: true };
}

function onRoad(x, z, segs) {
  return segs.some((seg) => {
    const point = project(x, z, seg);
    return (point.x - x) ** 2 + (point.z - z) ** 2 <= (seg.width * 0.5) ** 2 + 0.01;
  });
}

/** Open rectangles between roads. Buildings belong in these, not on the asphalt. */
export function blockLots(cx, cz) {
  const segs = chunkRoads(cx, cz);
  if (segs.length === 0) return [];
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const xs = new Set([ox, ox + CHUNK_SIZE]);
  const zs = new Set([oz, oz + CHUNK_SIZE]);
  for (const seg of segs) {
    const vertical = Math.abs(seg.x1 - seg.x2) < 0.1;
    if (vertical) {
      xs.add(seg.x1 - seg.width / 2);
      xs.add(seg.x1 + seg.width / 2);
    } else {
      zs.add(seg.z1 - seg.width / 2);
      zs.add(seg.z1 + seg.width / 2);
    }
  }
  const xCuts = [...xs].sort((a, b) => a - b);
  const zCuts = [...zs].sort((a, b) => a - b);
  const lots = [];
  for (let i = 0; i < xCuts.length - 1; i += 1) {
    for (let j = 0; j < zCuts.length - 1; j += 1) {
      const x0 = xCuts[i];
      const x1 = xCuts[i + 1];
      const z0 = zCuts[j];
      const z1 = zCuts[j + 1];
      const spanX = x1 - x0;
      const spanZ = z1 - z0;
      if (spanX < 14 || spanZ < 14) continue;
      const lotCx = (x0 + x1) / 2;
      const lotCz = (z0 + z1) / 2;
      if (onRoad(lotCx, lotCz, segs)) continue;
      lots.push({ x0, x1, z0, z1, cx: lotCx, cz: lotCz, spanX, spanZ });
    }
  }
  return lots;
}

function nodeKey(x, z) {
  return `${Math.round(x)},${Math.round(z)}`;
}

function crossing(a, b) {
  const aV = Math.abs(a.x1 - a.x2) < 0.1;
  const bV = Math.abs(b.x1 - b.x2) < 0.1;
  if (aV === bV) return null;
  const vertical = aV ? a : b;
  const horizontal = aV ? b : a;
  const x = vertical.x1;
  const z = horizontal.z1;
  const minX = Math.min(horizontal.x1, horizontal.x2) - 0.5;
  const maxX = Math.max(horizontal.x1, horizontal.x2) + 0.5;
  const minZ = Math.min(vertical.z1, vertical.z2) - 0.5;
  const maxZ = Math.max(vertical.z1, vertical.z2) + 0.5;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return null;
  const tV = (z - vertical.z1) / ((vertical.z2 - vertical.z1) || 1);
  const tH = (x - horizontal.x1) / ((horizontal.x2 - horizontal.x1) || 1);
  return aV ? { x, z, t1: tV, t2: tH } : { x, z, t1: tH, t2: tV };
}

function buildGraph(segs, extras) {
  const points = segs.map((seg) => [
    { t: 0, x: seg.x1, z: seg.z1 },
    { t: 1, x: seg.x2, z: seg.z2 },
  ]);
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      const hit = crossing(segs[i], segs[j]);
      if (!hit) continue;
      points[i].push({ t: hit.t1, x: hit.x, z: hit.z });
      points[j].push({ t: hit.t2, x: hit.x, z: hit.z });
    }
  }
  for (const extra of extras) {
    if (!extra) continue;
    const index = segs.indexOf(extra.seg);
    if (index < 0) continue;
    points[index].push({ t: extra.t, x: extra.x, z: extra.z });
  }
  const adj = new Map();
  const addNode = (x, z) => {
    const key = nodeKey(x, z);
    if (!adj.has(key)) adj.set(key, { x, z, edges: [] });
    return key;
  };
  const link = (a, b) => {
    const ka = addNode(a.x, a.z);
    const kb = addNode(b.x, b.z);
    if (ka === kb) return;
    const dist = Math.hypot(a.x - b.x, a.z - b.z);
    adj.get(ka).edges.push({ to: kb, dist });
    adj.get(kb).edges.push({ to: ka, dist });
  };
  for (const pts of points) {
    pts.sort((a, b) => a.t - b.t);
    for (let i = 1; i < pts.length; i += 1) link(pts[i - 1], pts[i]);
  }
  return adj;
}

function shortest(adj, startKey, goalKey) {
  if (!adj.has(startKey) || !adj.has(goalKey)) return null;
  const dist = new Map([[startKey, 0]]);
  const prev = new Map();
  const used = new Set();
  while (used.size < adj.size) {
    let best = null;
    let bestD = Infinity;
    for (const [key, value] of dist) {
      if (used.has(key) || value >= bestD) continue;
      bestD = value;
      best = key;
    }
    if (best == null) break;
    if (best === goalKey) break;
    used.add(best);
    for (const edge of adj.get(best).edges) {
      const next = bestD + edge.dist;
      if (next >= (dist.get(edge.to) ?? Infinity)) continue;
      dist.set(edge.to, next);
      prev.set(edge.to, best);
    }
  }
  if (!prev.has(goalKey) && startKey !== goalKey) return null;
  const path = [];
  let key = goalKey;
  const guard = adj.size + 2;
  for (let n = 0; key && n < guard; n += 1) {
    const node = adj.get(key);
    path.push({ x: node.x, z: node.z });
    if (key === startKey) break;
    key = prev.get(key);
  }
  path.reverse();
  return path;
}

/** Road-only polyline from the nearest road to `from` toward the nearest road to `to`. */
export function roadRoute(fromX, fromZ, toX, toZ) {
  const seen = new Set();
  const segs = [];
  const add = (list) => {
    for (const seg of list) {
      const key = `${seg.x1},${seg.z1},${seg.x2},${seg.z2}`;
      if (seen.has(key)) continue;
      seen.add(key);
      segs.push(seg);
    }
  };
  add(segmentsAround((fromX + toX) / 2, (fromZ + toZ) / 2, 2));
  add(segmentsAround(fromX, fromZ, 1));
  add(segmentsAround(toX, toZ, 1));
  const start = nearestRoadPoint(fromX, fromZ, segs);
  const goal = nearestRoadPoint(toX, toZ, segs);
  if (!start || !goal) return [{ x: toX, z: toZ }];
  const adj = buildGraph(segs, [start, goal]);
  const path = shortest(adj, nodeKey(start.x, start.z), nodeKey(goal.x, goal.z));
  if (!path || path.length === 0) return [{ x: start.x, z: start.z }, { x: goal.x, z: goal.z }];
  return path;
}
