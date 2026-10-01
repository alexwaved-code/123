import * as THREE from "three";
import { getGroundHeight } from "../city/createCity.js";
import { GEAR_HEIGHT, GRAVITY, VREF, VR, VS } from "../shared/constants.js";
import { onRunway, runwayAlign } from "./airport.js";
import { resolveCollisions } from "./collision.js";
import { crashPlane, resetPlane, updateWreck } from "./crash.js";
import { updateHud } from "./hud.js";
import { handleContact } from "./landing.js";
import { ensureSplash, isWater, trickleSplash, updateSplash } from "./water.js";

const keys = new Set();
const just = new Set();
let inputLive = true;

const CLIMB = ["ArrowUp", "Numpad8"];
const DESCEND = ["ArrowDown", "Numpad2"];
const LEFT = ["KeyA", "ArrowLeft", "Numpad4"];
const RIGHT = ["KeyD", "ArrowRight", "Numpad6"];
const THROTTLE_UP = ["KeyW"];
const THROTTLE_DOWN = ["KeyS"];
const BLOCK = new Set([
  ...CLIMB,
  ...DESCEND,
  ...LEFT,
  ...RIGHT,
  ...THROTTLE_UP,
  ...THROTTLE_DOWN,
  "KeyG",
  "Enter",
  "NumpadEnter",
]);

export function setFlightInput(on) {
  inputLive = Boolean(on);
  if (!on) clearKeys();
}

function onKeyDown(event) {
  if (!inputLive) return;
  if (event.isComposing || event.keyCode === 229) return;
  if (!BLOCK.has(event.code)) return;
  event.preventDefault();
  if (!keys.has(event.code)) just.add(event.code);
  keys.add(event.code);
}

function onKeyUp(event) {
  keys.delete(event.code);
}

function clearKeys() {
  keys.clear();
  just.clear();
}

window.addEventListener("keydown", onKeyDown, { capture: true });
window.addEventListener("keyup", onKeyUp, { capture: true });
window.addEventListener("blur", clearKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearKeys();
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("keyup", onKeyUp, { capture: true });
    window.removeEventListener("blur", clearKeys);
    clearKeys();
  });
}

function held(codes) {
  return codes.some((code) => keys.has(code)) ? 1 : 0;
}

function tapped(code) {
  const ok = just.has(code);
  just.delete(code);
  return ok;
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function wrapHeading(rad) {
  return THREE.MathUtils.radToDeg(((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
}

function phaseOf(plane, agl, rwy, water) {
  if (plane.userData.crashed) {
    return plane.userData.crashReason?.includes("water") || plane.userData.crashReason === "ditched" ? "DITCH" : "CRASH";
  }
  if (water && !plane.userData.airborne) return "WATER";
  if (!plane.userData.airborne && plane.userData.speed < 2) return "HOLD";
  if (!plane.userData.airborne && plane.userData.speed < VR) return "T/O ROLL";
  if (!plane.userData.airborne) return "ROTATE";
  if (agl < 16 && plane.userData.vs < 0) return "FLARE";
  if (agl < 90 && plane.userData.vs < -0.6) return "APP";
  if (agl > 140) return "CRZ";
  return "CLB";
}

function updateGearVisual(plane, delta) {
  const gear = plane.userData.gear;
  if (!gear) return;
  const want = plane.userData.gearDown ? 0 : 1;
  gear.userData.retract = damp(gear.userData.retract ?? 0, want, 4.8, delta);
  gear.rotation.x = gear.userData.retract * 1.45;
  gear.position.y = gear.userData.retract * 0.55;
  gear.visible = gear.userData.retract < 0.94;
}

function deckHeight(plane, groundY, water) {
  if (water) return groundY + 0.35;
  return groundY + (plane.userData.gearDown ? GEAR_HEIGHT : 0.42);
}

/** Agent A. Nose sets flight path; stick-center holds altitude. */
export function updateFlight(plane, delta) {
  if (plane.parent) ensureSplash(plane.parent);
  updateSplash(delta);

  if (tapped("Enter") || tapped("NumpadEnter")) resetPlane(plane);

  const yawIn = held(LEFT) - held(RIGHT);
  const climbIn = held(CLIMB) - held(DESCEND);
  const throttleIn = held(THROTTLE_UP) - held(THROTTLE_DOWN);
  const groundY = getGroundHeight(plane.position.x, plane.position.z);
  const water = isWater(plane.position.x, plane.position.z);
  const rwy = onRunway(plane.position.x, plane.position.z);
  const align = runwayAlign(plane.rotation.y);
  const agl = plane.position.y - groundY;
  const deck = deckHeight(plane, groundY, water);

  if (tapped("KeyG") && !plane.userData.crashed) {
    if (plane.userData.airborne) plane.userData.gearDown = !plane.userData.gearDown;
    else if (plane.userData.speed < 1 && plane.userData.gearDown) plane.userData.gearDown = false;
    plane.userData.gearAuto = false;
  }
  if (plane.userData.airborne && agl < 30 && plane.userData.vs < 0 && !plane.userData.gearDown) {
    plane.userData.gearDown = true;
    plane.userData.gearAuto = true;
  }

  if (plane.userData.crashed) {
    updateWreck(plane, delta, deck, water);
    if (water && plane.userData.speed > 1.5) trickleSplash(plane.position, plane.userData.speed);
    updateGearVisual(plane, delta);
    const telemetry = readTelemetry(plane, rwy, align, climbIn, water, Math.max(0, plane.position.y - groundY));
    plane.userData.telemetry = telemetry;
    updateHud(telemetry);
    just.clear();
    return telemetry;
  }

  plane.userData.throttle = THREE.MathUtils.clamp(
    (plane.userData.throttle ?? 0) + throttleIn * 0.38 * delta,
    0,
    1,
  );

  if (!plane.userData.airborne) {
    const brake = held(DESCEND) * 16;
    const surface = water ? 18 : rwy ? 0.35 : 1.4;
    const roll = plane.userData.throttle * 5.4 - plane.userData.speed * 0.14 - brake - surface;
    plane.userData.speed = Math.max(0, plane.userData.speed + roll * delta);
    const taxiTurn = THREE.MathUtils.lerp(1.05, 0.2, THREE.MathUtils.clamp(plane.userData.speed / 42, 0, 1));
    plane.userData.yawRate = damp(plane.userData.yawRate, yawIn * taxiTurn, 8, delta);
    plane.rotation.y += plane.userData.yawRate * delta;
    const canRotate = !water && plane.userData.gearDown && plane.userData.speed >= VR;
    plane.userData.pitchAtt = damp(plane.userData.pitchAtt, canRotate ? Math.max(0, climbIn) * 0.24 : 0, 9, delta);
    if (canRotate && climbIn > 0) {
      plane.userData.airborne = true;
      plane.userData.vs = 2.15;
      plane.userData.pitchAtt = Math.max(plane.userData.pitchAtt, 0.14);
      plane.userData.gearAuto = false;
    } else {
      plane.position.y = deck;
      plane.userData.vs = 0;
    }
    if (water && plane.userData.speed > 2) trickleSplash(plane.position, plane.userData.speed);
  } else {
    const turnScale = THREE.MathUtils.lerp(1.2, 0.62, THREE.MathUtils.clamp((plane.userData.speed - 14) / 48, 0, 1));
    plane.userData.yawRate = damp(plane.userData.yawRate, yawIn * turnScale, 5.2, delta);
    plane.rotation.y += plane.userData.yawRate * delta;
    plane.userData.pitchAtt = THREE.MathUtils.clamp(
      damp(plane.userData.pitchAtt, climbIn * 0.3, 4.4, delta),
      -0.4,
      0.38,
    );

    const stallFrac = THREE.MathUtils.clamp((VS - plane.userData.speed) / 6, 0, 1);
    const path = plane.userData.pitchAtt * (1 - stallFrac * 0.65);
    let targetVs = Math.sin(path) * plane.userData.speed;
    targetVs -= stallFrac * 15;
    targetVs -= Math.abs(plane.userData.yawRate) * 1.05;
    if (agl < 12 && targetVs < 0) {
      targetVs *= 0.42 + (agl / 12) * 0.58;
    }
    plane.userData.vs = damp(plane.userData.vs, targetVs, 2.7, delta);
    plane.position.y += plane.userData.vs * delta;

    const q = plane.userData.speed * plane.userData.speed;
    const drag = 0.0136 * q + Math.abs(plane.userData.pitchAtt) * 8 + (plane.userData.gearDown ? 3.2 : 0.4);
    const thrust = plane.userData.throttle * 22;
    plane.userData.speed += (thrust - drag - plane.userData.vs * 2.4) * delta;
    plane.userData.speed = THREE.MathUtils.clamp(plane.userData.speed, 0, 52);

    if (plane.position.y <= deck + 0.06) {
      if (plane.userData.vs <= 1.55) handleContact(plane, groundY, rwy, align);
      else plane.position.y = deck;
    }
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
  plane.position.addScaledVector(forward, plane.userData.speed * delta);

  const visual = plane.userData.visual;
  if (visual && !plane.userData.crashed) {
    visual.rotation.x = damp(visual.rotation.x, plane.userData.pitchAtt, 6.2, delta);
    visual.rotation.z = damp(visual.rotation.z, plane.userData.yawRate * 0.48, 6.2, delta);
  }
  plane.userData.pitch = visual?.rotation.x ?? 0;
  plane.userData.climbRate = plane.userData.vs;
  updateGearVisual(plane, delta);

  resolveCollisions(plane);
  if (!plane.userData.airborne && !plane.userData.crashed) {
    plane.position.y = deckHeight(plane, getGroundHeight(plane.position.x, plane.position.z), water);
  }

  const telemetry = readTelemetry(plane, rwy, align, climbIn, water, Math.max(0, plane.position.y - groundY));
  plane.userData.telemetry = telemetry;
  updateHud(telemetry);
  just.clear();
  return telemetry;
}

/** Empty airframe after the driver leaves. No lift. Gravity, then a wreck. */
export function updateAbandonedPlane(plane, delta) {
  if (plane.parent) ensureSplash(plane.parent);
  updateSplash(delta);

  const groundY = getGroundHeight(plane.position.x, plane.position.z);
  const water = isWater(plane.position.x, plane.position.z);
  const rwy = onRunway(plane.position.x, plane.position.z);
  const align = runwayAlign(plane.rotation.y);
  const deck = deckHeight(plane, groundY, water);
  plane.userData.throttle = damp(plane.userData.throttle ?? 0, 0, 1.4, delta);

  if (plane.userData.crashed) {
    updateWreck(plane, delta, deck, water);
  } else if (!plane.userData.airborne) {
    const surface = water ? 16 : rwy ? 0.8 : 3.2;
    plane.userData.speed = Math.max(0, (plane.userData.speed ?? 0) - (6 + surface) * delta);
    plane.position.y = deck;
    plane.userData.vs = 0;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
    plane.position.addScaledVector(forward, plane.userData.speed * delta);
    resolveCollisions(plane);
    if (!plane.userData.crashed) {
      plane.position.y = deckHeight(plane, getGroundHeight(plane.position.x, plane.position.z), water);
    }
  } else {
    plane.userData.pitchAtt = damp(plane.userData.pitchAtt ?? 0, -0.42, 1.6, delta);
    plane.userData.vs = (plane.userData.vs ?? 0) - GRAVITY * 1.15 * delta;
    plane.userData.speed = Math.max(0, (plane.userData.speed ?? 0) + (-plane.userData.vs * 0.12 - plane.userData.speed * 0.08) * delta);
    plane.position.y += plane.userData.vs * delta;
    const visual = plane.userData.visual;
    if (visual) {
      visual.rotation.x = damp(visual.rotation.x, plane.userData.pitchAtt, 3.2, delta);
      visual.rotation.z = damp(visual.rotation.z, 0.35, 1.1, delta);
    }
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
    plane.position.addScaledVector(forward, plane.userData.speed * delta);
    if (plane.position.y <= deck + 0.08) {
      const sink = Math.max(0, -plane.userData.vs);
      if (sink > 3.5 || plane.userData.speed > 10) crashPlane(plane, "abandoned");
      else handleContact(plane, groundY, rwy, align);
    } else {
      resolveCollisions(plane);
    }
  }

  updateGearVisual(plane, delta);
  const telemetry = readTelemetry(plane, rwy, align, 0, water, Math.max(0, plane.position.y - groundY));
  plane.userData.telemetry = telemetry;
  return telemetry;
}

function readTelemetry(plane, rwy, align, climbIn, water, agl) {
  const sink = Math.max(0, -(plane.userData.vs ?? 0));
  const warns = [];
  if (plane.userData.speed < VS && plane.userData.airborne) warns.push("STALL");
  if (plane.userData.airborne && agl < 140 && !plane.userData.gearDown && (plane.userData.vs ?? 0) < 0) {
    warns.push("TOO LOW GEAR");
  }
  if (plane.userData.airborne && sink > 8 && agl < 100) warns.push("SINK RATE");
  if (plane.userData.airborne && !rwy && agl < 36 && sink > 3) warns.push("TERRAIN");
  if (water && plane.userData.airborne && agl < 50) warns.push("WATER");
  if (plane.userData.gearAuto) warns.push("GEAR AUTO");
  return {
    speed: plane.userData.speed,
    altitude: Math.max(0, agl - (plane.userData.gearDown ? GEAR_HEIGHT : 0.42)),
    heading: wrapHeading(plane.rotation.y),
    throttle: plane.userData.throttle,
    vs: plane.userData.vs ?? 0,
    pitch: plane.userData.pitchAtt ?? 0,
    bank: plane.userData.visual?.rotation.z ?? 0,
    gearDown: plane.userData.gearDown,
    airborne: plane.userData.airborne,
    onRunway: rwy,
    water,
    align,
    phase: phaseOf(plane, agl, rwy, water),
    crashed: plane.userData.crashed,
    crashReason: plane.userData.crashReason,
    hit: plane.userData.hit || plane.userData.crashed,
    vr: VR,
    vsStall: VS,
    vref: VREF,
    warns,
    rotateHint: !plane.userData.airborne && plane.userData.speed >= VR && climbIn >= 0,
    x: plane.position.x,
    z: plane.position.z,
  };
}
