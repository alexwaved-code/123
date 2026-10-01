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
  return keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function shoutOhNo() {
  let banner = document.getElementById("oh-no");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "oh-no";
    banner.textContent = "OH NO";
    banner.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:18%",
      "transform:translateX(-50%)",
      "z-index:25",
      "margin:0",
      "color:#fff7ea",
      "font:800 64px/1 ui-sans-serif,system-ui,sans-serif",
      "letter-spacing:0.04em",
      "text-shadow:0 6px 24px rgba(0,0,0,0.45)",
      "pointer-events:none",
    ].join(";");
    document.body.append(banner);
  }
  banner.hidden = false;
  clearTimeout(shoutOhNo.timer);
  shoutOhNo.timer = setTimeout(() => {
    banner.hidden = true;
  }, 1600);

  const volume = getSettings().volume;
  if (volume <= 0 || !window.speechSynthesis) return;
  const line = new SpeechSynthesisUtterance("Oh no!");
  line.rate = 1.15;
  line.pitch = 1.5;
  line.volume = volume;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(line);
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
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const body = new THREE.Box3();
  const size = new THREE.Vector3(0.7, 1.7, 0.7);
  const center = new THREE.Vector3();

  function showHud() {
    const el = document.getElementById("plane-hud");
    if (!el || !getSettings().hud) return;
    el.style.display = "";
    el.style.borderColor = "rgba(255,255,255,0.18)";
    if (mode === "chute") {
      el.innerHTML = "<div><b>CHUTE</b></div><div>A/D slide the way you face</div>";
      return;
    }
    const near = driver.root.position.distanceTo(plane.position) < 8;
    const pace = isRunning() ? "run" : "walk";
    el.innerHTML = `<div><b>ON FOOT</b></div><div>WASD ${pace} · Shift run${near ? " · E get back in" : ""}</div>`;
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
    if ((plane.userData.airborne || (plane.userData.speed ?? 0) > 8)) shoutOhNo();
    showHud();
  }

  function board() {
    mode = "aboard";
    driver.root.visible = false;
    driver.chute.visible = false;
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
    driver.root.position.y = ground;
    driver.root.rotation.y = yaw + Math.PI;
    poseWalk(driver, clock, Math.abs(move) > 0 ? 1 : 0);
    shoveOutOfBuildings();
    driver.root.position.y = getGroundHeight(driver.root.position.x, driver.root.position.z);
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat || !hasStarted() || isPaused() || event.isComposing) return;
    if (event.code === "KeyF" && mode === "aboard") exit();
    if (event.code === "KeyE" && mode === "walk" && driver.root.position.distanceTo(plane.position) < 8) board();
  });

  return {
    isAboard: () => mode === "aboard",
    board,
    update(delta) {
      if (mode === "aboard") return;
      coastPlane(delta);
      if (mode === "chute") updateChute(delta);
      else updateWalk(delta);
      showHud();
    },
    updateCamera(camera, delta) {
      const back = mode === "chute" ? 8 : 5.2;
      const lift = mode === "chute" ? 4.2 : 2.4;
      const desired = new THREE.Vector3(
        driver.root.position.x + Math.sin(yaw) * back,
        driver.root.position.y + lift,
        driver.root.position.z + Math.cos(yaw) * back,
      );
      camera.position.lerp(desired, 1 - Math.pow(0.0012, delta));
      camera.lookAt(driver.root.position.x, driver.root.position.y + 1.2, driver.root.position.z);
      camera.fov += (64 - camera.fov) * 0.12;
      camera.updateProjectionMatrix();
    },
    worldPosition: () => (mode === "aboard" ? plane.position : driver.root.position),
  };
}
