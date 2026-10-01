import * as THREE from "three";
import { getCityColliders } from "../city/colliders.js";
import { nearestRoadPoint, roadRoute } from "../city/roads.js";
import { getGroundHeight } from "../city/terrain.js";
import { setFlightAudible } from "../plane/audio.js";
import { setFlightInput, updateAbandonedPlane } from "../plane/flight.js";
import { needsTaxi, nearRide, taxiDropoff, tryBoardNear } from "../plane/fleet.js";
import { setWalkBanner } from "../plane/hud.js";
import { getSettings, hasStarted, isPaused } from "../ui/settings.js";

const SKY_CLEARANCE = 12;
const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});
window.addEventListener("blur", () => keys.clear());

function held(code) {
  return keys.has(code) ? 1 : 0;
}

function part(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.62 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function buildDriver() {
  const root = new THREE.Group();
  root.name = "driver";
  const hips = new THREE.Group();
  hips.position.y = 0.95;

  const torso = part(0.52, 0.62, 0.3, 0xff4fa3, 0, 0.42, 0);
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.82;
  const head = part(0.48, 0.48, 0.42, 0xffd2a8, 0, 0.22, 0);
  head.add(part(0.5, 0.22, 0.28, 0x5a3318, 0, 0.16, -0.1));
  head.add(part(0.1, 0.08, 0.12, 0xe0a080, 0, 0.02, 0.24));
  head.add(part(0.08, 0.1, 0.04, 0x161616, -0.12, 0.08, 0.22));
  head.add(part(0.08, 0.1, 0.04, 0x161616, 0.12, 0.08, 0.22));
  headPivot.add(head);

  function leg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, -0.02, 0);
    pivot.add(part(0.16, 0.78, 0.16, side < 0 ? 0x3d7eff : 0xffe14a, 0, -0.4, 0));
    pivot.add(part(0.24, 0.12, 0.4, 0xff3b3b, 0, -0.82, 0.08));
    return pivot;
  }

  function arm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 0.55, 0);
    pivot.add(part(0.12, 0.58, 0.12, 0x7cff6b, 0, -0.26, 0));
    return pivot;
  }

  const legL = leg(-1);
  const legR = leg(1);
  const armL = arm(-1);
  const armR = arm(1);
  hips.add(torso, headPivot, legL, legR, armL, armR);

  const chute = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 1.15, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.45 }),
  );
  canopy.position.y = 3.15;
  canopy.castShadow = true;
  chute.add(canopy);
  for (const [x, z] of [[-0.45, 0], [0.45, 0], [0, -0.35], [0, 0.35]]) {
    chute.add(part(0.03, 2.1, 0.03, 0xf7f7f7, x, 2.05, z));
  }

  root.add(hips, chute);
  return { root, hips, head: headPivot, legL, legR, armL, armR, chute };
}

function forwardOf(yaw, target) {
  return target.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

function rightOf(yaw, target) {
  return target.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

function isRunning() {
  return keys.has("ShiftRight");
}

function buildTaxi() {
  const root = new THREE.Group();
  root.name = "taxi";
  const paint = new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), paint);
  body.position.y = 0.7;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.1), dark);
  cabin.position.set(0, 1.25, -0.2);
  cabin.castShadow = true;
  root.add(body, cabin);
  for (const [x, z] of [[-0.8, 1.3], [0.8, 1.3], [-0.8, -1.3], [0.8, -1.3]]) {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.45), dark);
    wheel.position.set(x, 0.28, z);
    root.add(wheel);
  }
  root.visible = false;
  return root;
}

function poseWalk(driver, time, amount) {
  const swing = Math.sin(time * 7);
  const flap = Math.cos(time * 7);
  driver.legL.rotation.x = swing * 0.55 * amount;
  driver.legR.rotation.x = -swing * 0.55 * amount;
  driver.armL.rotation.x = -swing * 0.4 * amount;
  driver.armR.rotation.x = swing * 0.4 * amount;
  driver.armL.rotation.z = 0.08 + flap * 0.12 * amount;
  driver.armR.rotation.z = -0.08 - flap * 0.12 * amount;
  driver.hips.rotation.z = swing * 0.08 * amount;
  driver.hips.rotation.y = swing * 0.04 * amount;
  driver.hips.position.y = 0.95 + Math.abs(swing) * 0.04 * amount;
  driver.head.rotation.z = -swing * 0.05 * amount;
  driver.head.rotation.x = 0.02 * amount;
}

function poseChute(driver, time) {
  const swing = Math.sin(time * 3.2);
  driver.legL.rotation.x = 0.25 + swing * 0.18;
  driver.legR.rotation.x = 0.25 - swing * 0.18;
  driver.armL.rotation.set(-2.2, 0, 0.12);
  driver.armR.rotation.set(-2.2, 0, -0.12);
  driver.hips.rotation.set(0.08, 0, swing * 0.1);
  driver.hips.position.y = 0.95;
  driver.head.rotation.set(0.08, 0, swing * 0.08);
  driver.chute.rotation.z = swing * 0.06;
}

/** On-foot driver. F leaves the plane. E gets back in when standing next to it. */
export function createPilot(scene, plane) {
  const driver = buildDriver();
  scene.add(driver.root);
  driver.root.visible = false;

  let mode = "aboard";
  let lookYaw = 0;
  let lookPitch = 0;
  let bodyYaw = 0;
  let clock = 0;
  let vy = 0;
  let grounded = true;
  let hail = 0;
  let ride = "none";
  let pointerHail = false;
  const HAIL_TIME = 1.35;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const body = new THREE.Box3();
  const size = new THREE.Vector3(0.7, 1.7, 0.7);
  const center = new THREE.Vector3();
  const drop = new THREE.Vector3();
  let taxiVx = 0;
  let taxiVz = 0;
  let taxiYaw = 0;
  let taxiLeaving = false;
  let roadPath = [];
  let roadCursor = 0;
  let roadTimer = 0;
  const taxi = buildTaxi();
  scene.add(taxi);

  const hailButton = document.createElement("button");
  hailButton.id = "hail-taxi";
  hailButton.type = "button";
  hailButton.textContent = "Hold to hail a taxi";
  hailButton.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:28px",
    "transform:translateX(-50%)",
    "z-index:18",
    "display:none",
    "border:0",
    "border-radius:8px",
    "padding:10px 16px",
    "background:#f0c020",
    "color:#1b1400",
    "font:600 15px ui-sans-serif,system-ui,sans-serif",
    "cursor:pointer",
  ].join(";");
  document.body.append(hailButton);
  hailButton.addEventListener("pointerdown", (event) => {
    pointerHail = true;
    event.preventDefault();
  });
  window.addEventListener("pointerup", () => {
    pointerHail = false;
  });

  function showHud() {
    if (!getSettings().hud) {
      setWalkBanner("");
      return;
    }
    if (mode === "chute") {
      setWalkBanner("<div><b>CHUTE</b></div><div>WASD drift · arrows look</div>");
      return;
    }
    if (ride === "dropoff") {
      setWalkBanner("<div><b>TAXI</b></div><div>Riding to the airport ramp</div>");
      return;
    }
    const near = nearRide(plane, driver.root.position.x, driver.root.position.z);
    const pace = isRunning() ? "run" : "walk";
    const away = needsTaxi(plane, driver.root.position.x, driver.root.position.z);
    const hailNote = ride === "pickup"
      ? " · hand up, taxi coming"
      : ride === "dropoff"
        ? ""
        : away
          ? " · hold H to hail a taxi"
          : "";
    setWalkBanner(`<div><b>ON FOOT</b></div><div>WASD ${pace} · arrows look · Right Shift run · Space jump${near ? " · E board" : ""}${hailNote}</div>`);
  }

  function shoveOutOfBuildings() {
    center.set(driver.root.position.x, driver.root.position.y + 0.9, driver.root.position.z);
    body.setFromCenterAndSize(center, size);
    for (const building of getCityColliders()) {
      if (!body.intersectsBox(building)) continue;
      building.getCenter(center);
      const push = new THREE.Vector3(
        driver.root.position.x - center.x,
        0,
        driver.root.position.z - center.z,
      );
      if (push.lengthSq() < 0.0001) push.set(1, 0, 0);
      driver.root.position.add(push.normalize().multiplyScalar(0.2));
    }
  }

  function coastPlane(delta) {
    updateAbandonedPlane(plane, delta);
  }

  function exit() {
    if (mode !== "aboard") return;
    const ground = getGroundHeight(plane.position.x, plane.position.z);
    const inSky = plane.position.y > ground + SKY_CLEARANCE;
    lookYaw = plane.rotation.y;
    lookPitch = 0;
    bodyYaw = lookYaw;
    driver.root.visible = true;
    driver.root.rotation.y = bodyYaw + Math.PI;
    driver.chute.visible = inSky;
    if (inSky) {
      mode = "chute";
      driver.root.position.set(plane.position.x, plane.position.y - 1.2, plane.position.z);
    } else {
      mode = "walk";
      driver.root.position.set(
        plane.position.x + Math.cos(lookYaw) * 3.2,
        ground,
        plane.position.z + Math.sin(lookYaw) * 3.2,
      );
    }
    setFlightAudible(false);
    setFlightInput(false);
    showHud();
  }

  function board() {
    mode = "aboard";
    driver.root.visible = false;
    driver.chute.visible = false;
    ride = "none";
    hail = 0;
    pointerHail = false;
    taxi.visible = false;
    hailButton.style.display = "none";
    setFlightAudible(true);
    setFlightInput(true);
    setWalkBanner("");
  }

  function updateLook(delta) {
    lookYaw += (held("ArrowLeft") - held("ArrowRight")) * 1.7 * delta;
    lookPitch += (held("ArrowUp") - held("ArrowDown")) * 1.15 * delta;
    lookPitch = Math.max(-0.65, Math.min(0.9, lookPitch));
  }

  function applyHeadLook() {
    let diff = lookYaw - bodyYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    driver.head.rotation.y = Math.max(-1.15, Math.min(1.15, diff));
    driver.head.rotation.x = -lookPitch;
  }

  function updateChute(delta) {
    clock += delta;
    updateLook(delta);
    const ground = getGroundHeight(driver.root.position.x, driver.root.position.z);
    const drift = held("KeyW") - held("KeyS");
    const strafe = held("KeyD") - held("KeyA");
    forwardOf(lookYaw, forward);
    rightOf(lookYaw, right);
    driver.root.position.addScaledVector(forward, drift * 7 * delta);
    driver.root.position.addScaledVector(right, strafe * 5 * delta);
    driver.root.position.y -= 8 * delta;
    bodyYaw = lookYaw;
    driver.root.rotation.y = bodyYaw + Math.PI;
    poseChute(driver, clock);
    applyHeadLook();
    if (driver.root.position.y > ground + 1.15) return;
    driver.root.position.y = ground;
    mode = "walk";
    driver.chute.visible = false;
    vy = 0;
    grounded = true;
  }

  function updateWalk(delta) {
    updateLook(delta);
    const fwd = held("KeyW") - held("KeyS");
    const side = held("KeyD") - held("KeyA");
    const mag = Math.hypot(fwd, side);
    const run = isRunning() && mag > 0;
    clock += delta * (mag === 0 ? 0 : run ? 1.45 : 1);
    forwardOf(lookYaw, forward);
    rightOf(lookYaw, right);
    if (mag > 0) {
      const scale = (run ? 10.5 : 5.2) * delta / mag;
      driver.root.position.addScaledVector(forward, fwd * scale);
      driver.root.position.addScaledVector(right, side * scale);
      const wx = forward.x * fwd + right.x * side;
      const wz = forward.z * fwd + right.z * side;
      let target = Math.atan2(-wx, -wz);
      let diff = target - bodyYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      bodyYaw += diff * Math.min(1, 10 * delta);
    } else {
      let diff = lookYaw - bodyYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      bodyYaw += diff * Math.min(1, 8 * delta);
    }
    const ground = getGroundHeight(driver.root.position.x, driver.root.position.z);
    if (grounded) driver.root.position.y = ground;
    driver.root.rotation.y = bodyYaw + Math.PI;
    poseWalk(driver, clock, mag > 0 ? 1 : 0);
    applyHeadLook();
    shoveOutOfBuildings();
    const landed = getGroundHeight(driver.root.position.x, driver.root.position.z);
    if (!grounded) {
      vy -= 20 * delta;
      driver.root.position.y += vy * delta;
    }
    if (driver.root.position.y <= landed) {
      driver.root.position.y = landed;
      vy = 0;
      grounded = true;
    }
  }

  function tryJump() {
    if (mode !== "walk" || !grounded || ride === "dropoff") return;
    vy = 8;
    grounded = false;
  }

  function raiseHand() {
    if (ride !== "pickup" && hail < HAIL_TIME * 0.35) return;
    driver.armR.rotation.x = -2.55;
    driver.armR.rotation.z = 0.2;
  }

  function blockedAt(x, z) {
    for (const building of getCityColliders()) {
      if (x <= building.min.x - 0.85 || x >= building.max.x + 0.85) continue;
      if (z <= building.min.z - 0.85 || z >= building.max.z + 0.85) continue;
      return true;
    }
    return false;
  }

  function pathClear(x0, z0, x1, z1) {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const pieces = Math.max(1, Math.ceil(dist / 1.1));
    for (let i = 1; i <= pieces; i += 1) {
      const t = i / pieces;
      if (blockedAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
    }
    return true;
  }

  function wrapAngle(rad) {
    let angle = rad;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function moveTaxi(delta, speed, aimX, aimZ, gentle, holdCenter) {
    const dx = aimX - taxi.position.x;
    const dz = aimZ - taxi.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) return dist;
    const desired = Math.atan2(-dx, -dz);
    const diff = wrapAngle(desired - taxiYaw);
    const turning = Math.abs(diff) > 0.22;
    const rate = (gentle ? 0.85 : turning ? 1.15 : 2.3) * delta;
    taxiYaw += Math.max(-rate, Math.min(rate, diff));
    const grip = gentle ? 1.7 : turning ? 2.15 : 8;
    const blend = Math.min(1, grip * delta);
    const pace = speed * (0.4 + 0.6 * Math.min(1, dist / 12));
    const fwdX = -Math.sin(taxiYaw);
    const fwdZ = -Math.cos(taxiYaw);
    taxiVx += (fwdX * pace - taxiVx) * blend;
    taxiVz += (fwdZ * pace - taxiVz) * blend;
    let nx = taxi.position.x + taxiVx * delta;
    let nz = taxi.position.z + taxiVz * delta;
    if (holdCenter && !turning && !gentle) {
      const mid = nearestRoadPoint(nx, nz);
      if (mid && mid.dist < mid.seg.width * 0.55) {
        const pull = Math.min(1, 5 * delta);
        nx += (mid.x - nx) * pull;
        nz += (mid.z - nz) * pull;
      }
    }
    if (!pathClear(taxi.position.x, taxi.position.z, nx, nz)) {
      const clearX = pathClear(taxi.position.x, taxi.position.z, nx, taxi.position.z);
      const clearZ = pathClear(taxi.position.x, taxi.position.z, taxi.position.x, nz);
      if (clearX) nz = taxi.position.z;
      else if (clearZ) nx = taxi.position.x;
      else {
        taxiVx = 0;
        taxiVz = 0;
        return dist;
      }
      if (!clearX) taxiVz *= 0.15;
      if (!clearZ) taxiVx *= 0.15;
    }
    taxi.position.x = nx;
    taxi.position.z = nz;
    taxi.position.y = getGroundHeight(nx, nz);
    taxi.rotation.y = taxiYaw + Math.PI;
    return Math.hypot(aimX - nx, aimZ - nz);
  }

  function followRoad(aimX, aimZ, delta, speed) {
    const distAim = Math.hypot(taxi.position.x - aimX, taxi.position.z - aimZ);
    if (distAim < 7) {
      roadPath = [];
      const left = moveTaxi(delta, Math.min(speed, 9), aimX, aimZ, false, true);
      if (left < 2.2) {
        taxiVx *= 0.4;
        taxiVz *= 0.4;
      }
      return left;
    }
    roadTimer -= delta;
    const stale = roadPath.length === 0 || roadTimer <= 0;
    if (stale) {
      roadTimer = 0.8;
      roadPath = roadRoute(taxi.position.x, taxi.position.z, aimX, aimZ);
      roadCursor = 0;
      while (roadCursor < roadPath.length - 1) {
        const point = roadPath[roadCursor];
        if (Math.hypot(point.x - taxi.position.x, point.z - taxi.position.z) > 4) break;
        roadCursor += 1;
      }
    }
    while (roadCursor < roadPath.length - 1) {
      const point = roadPath[roadCursor];
      if (Math.hypot(point.x - taxi.position.x, point.z - taxi.position.z) > 3.2) break;
      roadCursor += 1;
    }
    const point = roadPath[roadCursor] || { x: aimX, z: aimZ };
    return moveTaxi(delta, speed, point.x, point.z, false, true);
  }

  function goalOnRoad(goal) {
    const approach = nearestRoadPoint(goal.x, goal.z);
    if (!approach) return { approach: null, onRoad: false };
    const onRoad = approach.dist <= approach.seg.width * 0.5 + 1.2;
    return { approach, onRoad };
  }

  function driveTaxi(goal, delta, speed, forPlane) {
    const { approach, onRoad } = goalOnRoad(goal);
    const distGoal = Math.hypot(taxi.position.x - goal.x, taxi.position.z - goal.z);
    const closeEnough = forPlane ? distGoal < 18 : distGoal < 12;
    const reachedRoad = approach && Math.hypot(taxi.position.x - approach.x, taxi.position.z - approach.z) < 4;
    const leave = !onRoad && (forPlane ? closeEnough : closeEnough || reachedRoad);
    if (!taxiLeaving && !leave) {
      if (!approach) return moveTaxi(delta, speed, goal.x, goal.z, true, false);
      const aim = onRoad ? goal : approach;
      return followRoad(aim.x, aim.z, delta, speed);
    }
    taxiLeaving = true;
    roadPath = [];
    return moveTaxi(delta, speed, goal.x, goal.z, true, false);
  }

  function callTaxi() {
    ride = "pickup";
    taxiLeaving = false;
    roadPath = [];
    roadCursor = 0;
    roadTimer = 0;
    taxiVx = 0;
    taxiVz = 0;
    const near = nearestRoadPoint(driver.root.position.x, driver.root.position.z);
    let spawnX = driver.root.position.x - Math.sin(lookYaw) * 42;
    let spawnZ = driver.root.position.z - Math.cos(lookYaw) * 42;
    if (near) {
      const dx = near.seg.x2 - near.seg.x1;
      const dz = near.seg.z2 - near.seg.z1;
      const len = Math.hypot(dx, dz) || 1;
      const sign = (near.x - driver.root.position.x) * dx + (near.z - driver.root.position.z) * dz >= 0 ? 1 : -1;
      if (Math.abs(dx) >= Math.abs(dz)) {
        spawnX = THREE.MathUtils.clamp(
          near.x + (dx / len) * sign * 36,
          Math.min(near.seg.x1, near.seg.x2),
          Math.max(near.seg.x1, near.seg.x2),
        );
        spawnZ = near.z;
      } else {
        spawnX = near.x;
        spawnZ = THREE.MathUtils.clamp(
          near.z + (dz / len) * sign * 36,
          Math.min(near.seg.z1, near.seg.z2),
          Math.max(near.seg.z1, near.seg.z2),
        );
      }
    }
    if (blockedAt(spawnX, spawnZ) && near) {
      spawnX = near.x;
      spawnZ = near.z;
    }
    taxi.position.set(spawnX, getGroundHeight(spawnX, spawnZ), spawnZ);
    taxiYaw = Math.atan2(-(driver.root.position.x - spawnX), -(driver.root.position.z - spawnZ));
    taxi.rotation.y = taxiYaw + Math.PI;
    taxi.visible = true;
  }

  function updateHail(delta) {
    const away = mode === "walk" && ride === "none" && needsTaxi(plane, driver.root.position.x, driver.root.position.z);
    const holding = away && (keys.has("KeyH") || pointerHail);
    if (holding) hail = Math.min(HAIL_TIME, hail + delta);
    else if (ride === "none") hail = Math.max(0, hail - delta * 1.6);
    if (ride === "none" && hail >= HAIL_TIME) callTaxi();
    raiseHand();
  }

  function rememberDropoff() {
    const ramp = taxiDropoff(plane);
    if (ramp) {
      drop.set(ramp.x, 0, ramp.z);
      return;
    }
    for (const extra of [0, 0.9, -0.9, 1.7, -1.7, Math.PI]) {
      const angle = plane.rotation.y + extra;
      const x = plane.position.x + Math.cos(angle) * 6;
      const z = plane.position.z + Math.sin(angle) * 6;
      if (blockedAt(x, z)) continue;
      drop.set(x, 0, z);
      return;
    }
    drop.set(plane.position.x + 6, 0, plane.position.z);
  }

  function updateTaxi(delta) {
    updateLook(delta);
    if (ride === "pickup") {
      driveTaxi(driver.root.position, delta, 18);
      raiseHand();
      const dist = Math.hypot(
        taxi.position.x - driver.root.position.x,
        taxi.position.z - driver.root.position.z,
      );
      const midBlocked = blockedAt(
        (taxi.position.x + driver.root.position.x) / 2,
        (taxi.position.z + driver.root.position.z) / 2,
      );
      if (dist < 4.2 || (dist < 8 && midBlocked)) {
        ride = "dropoff";
        taxiLeaving = false;
        roadPath = [];
        roadTimer = 0;
        driver.root.visible = false;
      }
      return;
    }
    if (ride !== "dropoff") return;
    const dest = taxiDropoff(plane) ?? plane.position;
    const spot = goalOnRoad(dest);
    const distGoal = Math.hypot(taxi.position.x - dest.x, taxi.position.z - dest.z);
    if (!taxiLeaving && distGoal < 18 && !spot.onRoad) {
      taxiLeaving = true;
      roadPath = [];
      rememberDropoff();
    }
    if (!taxiLeaving) {
      if (spot.onRoad && distGoal < 6) {
        rememberDropoff();
        driver.root.visible = true;
        driver.root.position.set(drop.x, getGroundHeight(drop.x, drop.z), drop.z);
        taxi.visible = false;
        ride = "none";
        taxiVx = 0;
        taxiVz = 0;
        hail = 0;
        vy = 0;
        grounded = true;
        return;
      }
      if (!spot.approach) moveTaxi(delta, 22, dest.x, dest.z, true, false);
      else {
        const aim = spot.onRoad ? dest : spot.approach;
        followRoad(aim.x, aim.z, delta, 22);
      }
      return;
    }
    moveTaxi(delta, 16, drop.x, drop.z, true, false);
    const dist = Math.hypot(taxi.position.x - drop.x, taxi.position.z - drop.z);
    if (dist > 3.6) return;
    driver.root.visible = true;
    driver.root.position.set(drop.x, getGroundHeight(drop.x, drop.z), drop.z);
    taxi.visible = false;
    ride = "none";
    taxiLeaving = false;
    roadPath = [];
    taxiVx = 0;
    taxiVz = 0;
    hail = 0;
    vy = 0;
    grounded = true;
  }

  function syncHailButton() {
    const show = mode === "walk" && ride !== "dropoff" && needsTaxi(plane, driver.root.position.x, driver.root.position.z);
    hailButton.style.display = show ? "block" : "none";
    if (!show) return;
    if (ride === "pickup") hailButton.textContent = "Taxi is coming";
    else hailButton.textContent = hail > 0.05
      ? `Hailing ${Math.round((hail / HAIL_TIME) * 100)}%`
      : "Hold to hail a taxi";
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat || !hasStarted() || isPaused() || event.isComposing) return;
    if (event.code === "KeyF" && mode === "aboard") exit();
    if (event.code === "Space" && mode === "walk") {
      event.preventDefault();
      tryJump();
    }
    if (event.code === "KeyE" && mode === "walk" && ride !== "dropoff" && tryBoardNear(plane, driver.root.position.x, driver.root.position.z)) {
      board();
    }
  });

  return {
    isAboard: () => mode === "aboard",
    board,
    update(delta) {
      if (mode === "aboard") return;
      coastPlane(delta);
      if (mode === "chute") updateChute(delta);
      else if (ride === "dropoff") updateTaxi(delta);
      else {
        updateWalk(delta);
        updateHail(delta);
        if (ride === "pickup") updateTaxi(delta);
      }
      syncHailButton();
      showHud();
    },
    updateCamera(camera, delta) {
      const subject = ride === "dropoff" ? taxi : driver.root;
      const back = mode === "chute" ? 8 : ride === "dropoff" ? 9 : 5.2;
      const hold = mode === "chute" ? 2.2 : 1.55;
      const desired = new THREE.Vector3(
        subject.position.x + Math.sin(lookYaw) * back,
        subject.position.y + hold,
        subject.position.z + Math.cos(lookYaw) * back,
      );
      camera.position.lerp(desired, 1 - Math.pow(0.0012, delta));
      const lookDist = 9;
      const cosPitch = Math.cos(lookPitch);
      camera.lookAt(
        subject.position.x - Math.sin(lookYaw) * lookDist * cosPitch,
        subject.position.y + 1.35 + Math.sin(lookPitch) * lookDist,
        subject.position.z - Math.cos(lookYaw) * lookDist * cosPitch,
      );
      camera.fov += (64 - camera.fov) * 0.12;
      camera.updateProjectionMatrix();
    },
    worldPosition: () => {
      if (mode !== "aboard" && ride === "dropoff") return taxi.position;
      return mode === "aboard" ? plane.position : driver.root.position;
    },
  };
}
