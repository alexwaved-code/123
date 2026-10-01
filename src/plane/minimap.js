import { CHUNK_SIZE, chunkCoord, terrainType } from "../city/terrain.js";
import { chunkRoads } from "../city/roads.js";
import { RUNWAY } from "../shared/constants.js";

const SIZE = 168;
const RANGE = 1400;
const FILL = {
  downtown: "#4d5c6a",
  suburb: "#4f6148",
  park: "#2f7a4c",
  industrial: "#6d5a44",
  water: "#2a6d92",
};

function project(wx, wz, px, pz, yaw, scale) {
  const dx = wx - px;
  const dz = wz - pz;
  const along = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
  const right = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
  return [SIZE / 2 + right * scale, SIZE / 2 - along * scale];
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function ensure() {
  let canvas = document.getElementById("plane-minimap");
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.id = "plane-minimap";
  canvas.className = "hud-map-canvas";
  const box = document.getElementById("hud-map");
  if (!box) return null;
  box.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  return canvas;
}

/** Agent A. Heading-up nav inset. Terrain from B's chunks and roads. */
export function updateMinimap(telemetry) {
  const canvas = ensure();
  if (!canvas || telemetry.x == null || telemetry.z == null) return;
  const ctx = canvas.getContext("2d");
  const px = telemetry.x;
  const pz = telemetry.z;
  const yaw = ((telemetry.heading ?? 0) * Math.PI) / 180;
  const scale = SIZE / 2 / RANGE;
  const cx0 = chunkCoord(px);
  const cz0 = chunkCoord(pz);
  const span = 3;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SIZE, SIZE);
  ctx.clip();

  for (let cz = cz0 - span; cz <= cz0 + span; cz += 1) {
    for (let cx = cx0 - span; cx <= cx0 + span; cx += 1) {
      const x0 = cx * CHUNK_SIZE;
      const z0 = cz * CHUNK_SIZE;
      const type = terrainType(cx, cz);
      const pts = [
        project(x0, z0, px, pz, yaw, scale),
        project(x0 + CHUNK_SIZE, z0, px, pz, yaw, scale),
        project(x0 + CHUNK_SIZE, z0 + CHUNK_SIZE, px, pz, yaw, scale),
        project(x0, z0 + CHUNK_SIZE, px, pz, yaw, scale),
      ];
      ctx.fillStyle = FILL[type] ?? "#2a3036";
      poly(ctx, pts);
      ctx.fill();

      ctx.strokeStyle = "rgba(210, 220, 214, 0.7)";
      ctx.lineCap = "square";
      for (const road of chunkRoads(cx, cz)) {
        const a = project(road.x1, road.z1, px, pz, yaw, scale);
        const b = project(road.x2, road.z2, px, pz, yaw, scale);
        ctx.lineWidth = Math.max(2, road.width * scale);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
  }

  const a = project(RUNWAY.x, RUNWAY.z0, px, pz, yaw, scale);
  const b = project(RUNWAY.x, RUNWAY.z1, px, pz, yaw, scale);
  ctx.strokeStyle = "#f2eee4";
  ctx.lineWidth = 5;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.fillStyle = "#f2eee4";
  ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.fillText("18", b[0] + 5, b[1] + 3);

  const city = project(22, 22, px, pz, yaw, scale);
  ctx.fillStyle = "#86f59a";
  ctx.fillRect(city[0] - 1.5, city[1] - 1.5, 3, 3);

  ctx.strokeStyle = "rgba(134,245,154,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE * 0.46, 0, Math.PI * 2);
  ctx.stroke();

  const north = project(px, pz - RANGE * 0.82, px, pz, yaw, scale);
  ctx.fillStyle = "#86f59a";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText("N", north[0], north[1] + 3);

  ctx.fillStyle = "#ffe27a";
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, SIZE / 2 - 8);
  ctx.lineTo(SIZE / 2 - 5, SIZE / 2 + 6);
  ctx.lineTo(SIZE / 2, SIZE / 2 + 3);
  ctx.lineTo(SIZE / 2 + 5, SIZE / 2 + 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
