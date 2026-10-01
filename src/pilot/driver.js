import * as THREE from "three";
import { getCityColliders } from "../city/colliders.js";
import { getGroundHeight } from "../city/terrain.js";
import { resolveCollisions } from "../plane/collision.js";
import { setFlightAudible } from "../plane/audio.js";
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
  return target.set(-Math.cos(yaw), 0, Math.sin(yaw));
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
  let yaw = 0;
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
    const el = document.getElementById("plane-hud");
    if (!el || !getSettings().hud) return;
    el.style.display = "";
    el.style.borderColor = "rgba(255,255,255,0.18)";
    if (mode === "chute") {
      el.innerHTML = "<div><b>CHUTE</b></div><div>A/D slide the way you face</div>";
      return;
    }
    if (ride === "dropoff") {
      el.innerHTML = "<div><b>TAXI</b></div><div>Riding to the plane</div>";
      return;
    }
    const near = driver.root.position.distanceTo(plane.position) < 8;
    const pace = isRunning() ? "run" : "walk";
    const away = driver.root.position.distanceTo(plane.position) > 28;
    const hailNote = ride === "pickup"
      ? " · hand up, taxi coming"
      : ride === "dropoff"
        ? ""
        : away
          ? " · hold H to hail a taxi"
          : "";
    el.innerHTML = `<div><b>ON FOOT</b></div><div>WASD ${pace} · Right Shift run · Space jump${near ? " · E get back in" : ""}${hailNote}</div>`;
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
    const speed = Math.max(0, (plane.userData.speed ?? 0) - 6 * delta);
    plane.userData.speed = speed;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
    plane.position.addScaledVector(forward, speed * delta);
    resolveCollisions(plane);
  }

  function exit() {
    if (mode !== "aboard") return;
    const ground = getGroundHeight(plane.position.x, plane.position.z);
    const inSky = plane.position.y > ground + SKY_CLEARANCE;
    yaw = plane.rotation.y;
    driver.root.visible = true;
    driver.root.rotation.y = yaw + Math.PI;
    driver.chute.visible = inSky;
    if (inSky) {
      mode = "chute";
      driver.root.position.set(plane.position.x, plane.position.y - 1.2, plane.position.z);
    } else {
      mode = "walk";
      driver.root.position.set(
        plane.position.x + Math.cos(yaw) * 3.2,
        ground,
        plane.position.z + Math.sin(yaw) * 3.2,
      );
    }
    setFlightAudible(false);
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
  }

  function updateChute(delta) {
    clock += delta;
    const ground = getGroundHeight(driver.root.position.x, driver.root.position.z);
    const drift = held("KeyW") - held("KeyS");
    const strafe = held("KeyD") - held("KeyA");
    yaw += (held("KeyA") - held("KeyD")) * 1.1 * delta;
    forwardOf(yaw, forward);
    rightOf(yaw, right);
    driver.root.position.addScaledVector(forward, drift * 7 * delta);
    driver.root.position.addScaledVector(right, strafe * 5 * delta);
    driver.root.position.y -= 8 * delta;
    driver.root.rotation.y = yaw + Math.PI;
    poseChute(driver, clock);
    if (driver.root.position.y > ground + 1.15) return;
    driver.root.position.y = ground;
    mode = "walk";
    driver.chute.visible = false;
    vy = 0;
    grounded = true;
  }

  function updateWalk(delta) {
    const move = held("KeyW") - held("KeyS");
    const turn = held("KeyA") - held("KeyD");
    const run = isRunning() && move !== 0;
    yaw += turn * 2.6 * delta;
    clock += delta * (move === 0 ? 0 : run ? 1.45 : 1);
    if (move !== 0) {
      forwardOf(yaw, forward);
      driver.root.position.addScaledVector(forward, move * (run ? 10.5 : 5.2) * delta);
    }
    const ground = getGroundHeight(driver.root.position.x, driver.root.position.z);
    if (grounded) driver.root.position.y = ground;
    driver.root.rotation.y = yaw + Math.PI;
    poseWalk(driver, clock, Math.abs(move) > 0 ? 1 : 0);
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

  function driveToward(target, delta, speed) {
    const dx = target.x - taxi.position.x;
    const dz = target.z - taxi.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return dist;
    const step = Math.min(dist, speed * delta);
    taxi.position.x += (dx / dist) * step;
    taxi.position.z += (dz / dist) * step;
    taxi.position.y = getGroundHeight(taxi.position.x, taxi.position.z);
    taxi.rotation.y = Math.atan2(-dx, -dz) + Math.PI;
    return dist - step;
  }

  function callTaxi() {
    ride = "pickup";
    forwardOf(yaw, forward);
    const spawnX = driver.root.position.x - forward.x * 42;
    const spawnZ = driver.root.position.z - forward.z * 42;
    taxi.position.set(spawnX, getGroundHeight(spawnX, spawnZ), spawnZ);
    taxi.visible = true;
  }

  function updateHail(delta) {
    const away = mode === "walk" && ride === "none" && driver.root.position.distanceTo(plane.position) > 28;
    const holding = away && (keys.has("KeyH") || pointerHail);
    if (holding) hail = Math.min(HAIL_TIME, hail + delta);
    else if (ride === "none") hail = Math.max(0, hail - delta * 1.6);
    if (ride === "none" && hail >= HAIL_TIME) callTaxi();
    raiseHand();
  }

  function rememberDropoff() {
    const side = Math.cos(plane.rotation.y) * 6;
    const sideZ = Math.sin(plane.rotation.y) * 6;
    drop.set(plane.position.x + side, 0, plane.position.z + sideZ);
  }

  function updateTaxi(delta) {
    if (ride === "pickup") {
      const dist = driveToward(driver.root.position, delta, 18);
      raiseHand();
      if (dist < 3) {
        ride = "dropoff";
        driver.root.visible = false;
        rememberDropoff();
      }
      return;
    }
    if (ride !== "dropoff") return;
    if (!plane.userData.airborne) rememberDropoff();
    const dist = driveToward(drop, delta, 24);
    if (dist > 3.2) return;
    driver.root.visible = true;
    driver.root.position.set(drop.x, getGroundHeight(drop.x, drop.z), drop.z);
    taxi.visible = false;
    ride = "none";
    hail = 0;
    vy = 0;
    grounded = true;
  }

  function syncHailButton() {
    const show = mode === "walk" && ride !== "dropoff" && driver.root.position.distanceTo(plane.position) > 28;
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
    if (event.code === "KeyE" && mode === "walk" && ride !== "dropoff" && driver.root.position.distanceTo(plane.position) < 8) board();
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
      const focusYaw = ride === "dropoff" ? taxi.rotation.y + Math.PI : yaw;
      const back = mode === "chute" ? 8 : ride === "dropoff" ? 9 : 5.2;
      const lift = mode === "chute" ? 4.2 : 3.2;
      const desired = new THREE.Vector3(
        subject.position.x + Math.sin(focusYaw) * back,
        subject.position.y + lift,
        subject.position.z + Math.cos(focusYaw) * back,
      );
      camera.position.lerp(desired, 1 - Math.pow(0.0012, delta));
      camera.lookAt(subject.position.x, subject.position.y + 1.2, subject.position.z);
      camera.fov += (64 - camera.fov) * 0.12;
      camera.updateProjectionMatrix();
    },
    worldPosition: () => {
      if (mode !== "aboard" && ride === "dropoff") return taxi.position;
      return mode === "aboard" ? plane.position : driver.root.position;
    },
  };
}
