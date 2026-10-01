import * as THREE from "three";
import { getGroundHeight } from "../city/createCity.js";
import { GEAR_HEIGHT, GRAVITY, RUNWAY, VREF, VR, VS } from "../shared/constants.js";
import { onRunway, runwayAlign } from "./airport.js";
import { resolveCollisions } from "./collision.js";
import { crashPlane, resetPlane } from "./crash.js";
import { updateHud } from "./hud.js";

const keys = new Set();
const just = new Set();
const keyAt = new Map();

const CLIMB = ["KeyR", "Space", "ArrowUp", "Numpad8", "PageUp", "Equal", "NumpadAdd"];
const DESCEND = ["KeyF", "KeyC", "ArrowDown", "Numpad2", "PageDown", "Minus", "NumpadSubtract"];
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

function onKeyDown(event) {
  if (event.isComposing || event.keyCode === 229) return;
  if (!BLOCK.has(event.code)) return;
  event.preventDefault();
  if (!keys.has(event.code)) just.add(event.code);
  keys.add(event.code);
  keyAt.set(event.code, performance.now());
}

function onKeyUp(event) {
  keys.delete(event.code);
  keyAt.delete(event.code);
}

function clearKeys() {
  keys.clear();
  just.clear();
  keyAt.clear();
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
  const now = performance.now();
  return codes.some((code) => keys.has(code) && now - (keyAt.get(code) ?? 0) < 140) ? 1 : 0;
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

function phaseOf(plane, agl, rwy, align) {
  if (plane.userData.crashed) return "CRASH";
  if (!plane.userData.airborne && plane.userData.speed < 2) return "HOLD";
  if (!plane.userData.airborne && plane.userData.speed < VR) return "TAKEOFF ROLL";
  if (!plane.userData.airborne) return "ROTATE";
  if (agl > 80) return "CRUISE";
  if (plane.userData.vs < -1.2 && agl < 70) return "APPROACH";
  if (agl < 12 && plane.userData.vs < 0) return "FLARE";
  if (rwy && align < 0.4) return "CLIMB";
  return "CLIMB";
}

function touchDown(plane, aglFloor, rwy, align) {
  const sink = -plane.userData.vs;
  if (!plane.userData.gearDown) {
    crashPlane(plane, "gear-up landing");
    return;
  }
  if (!rwy && plane.userData.speed > 10) {
    crashPlane(plane, "off-runway landing");
    return;
  }
  if (sink > 9) {
    crashPlane(plane, "hard landing");
    return;
  }
  if (rwy && align > 0.55 && plane.userData.speed > 16) {
    crashPlane(plane, "runway excursion");
    return;
  }
  plane.userData.airborne = false;
  plane.userData.vs = 0;
  plane.userData.pitchAtt = 0;
  plane.position.y = aglFloor;
  if (sink > 5) plane.userData.speed *= 0.72;
}

/** Agent A. Takeoff, flight, landing, crash. */
export function updateFlight(plane, delta) {
  if (tapped("Enter") || tapped("NumpadEnter")) {
    resetPlane(plane);
  }
  if (tapped("KeyG") && !plane.userData.crashed && plane.userData.airborne) {
    plane.userData.gearDown = !plane.userData.gearDown;
    if (plane.userData.gear) plane.userData.gear.visible = plane.userData.gearDown;
  }

  const yawIn = held(LEFT) - held(RIGHT);
  const climbIn = held(CLIMB) - held(DESCEND);
  const throttleIn = held(THROTTLE_UP) - held(THROTTLE_DOWN);
  const groundY = getGroundHeight(plane.position.x, plane.position.z);
  const deck = groundY + (plane.userData.gearDown ? GEAR_HEIGHT : 0.55);
  const rwy = onRunway(plane.position.x, plane.position.z);
  const align = runwayAlign(plane.rotation.y);

  if (plane.userData.crashed) {
    plane.userData.speed = damp(plane.userData.speed, 0, 4, delta);
    const telemetry = readTelemetry(plane, rwy, align, 0);
    updateHud(telemetry);
    just.clear();
    return telemetry;
  }

  plane.userData.throttle = THREE.MathUtils.clamp(
    (plane.userData.throttle ?? 0) + throttleIn * 0.45 * delta,
    0,
    1,
  );

  if (!plane.userData.airborne) {
    const brake = held(DESCEND) * 16;
    const roll = plane.userData.throttle * 36 - plane.userData.speed * 0.55 - brake;
    plane.userData.speed = Math.max(0, plane.userData.speed + roll * delta);
    const taxiTurn = THREE.MathUtils.lerp(1.05, 0.28, THREE.MathUtils.clamp(plane.userData.speed / 40, 0, 1));
    plane.userData.yawRate = damp(plane.userData.yawRate, yawIn * taxiTurn, 8, delta);
    plane.rotation.y += plane.userData.yawRate * delta;

    const canRotate = plane.userData.speed >= VR && rwy;
    plane.userData.pitchAtt = damp(plane.userData.pitchAtt, canRotate ? Math.max(0, climbIn) * 0.22 : 0, 8, delta);
    if (canRotate && climbIn > 0 && plane.userData.pitchAtt > 0.08) {
      plane.userData.airborne = true;
      plane.userData.vs = 1.8;
    } else {
      plane.position.y = deck;
      plane.userData.vs = 0;
    }
  } else {
    const turnScale = THREE.MathUtils.lerp(1.55, 0.8, THREE.MathUtils.clamp((plane.userData.speed - 12) / 55, 0, 1));
    plane.userData.yawRate = damp(plane.userData.yawRate, yawIn * turnScale, 7, delta);
    plane.rotation.y += plane.userData.yawRate * delta;
    plane.userData.pitchAtt = THREE.MathUtils.clamp(
      damp(plane.userData.pitchAtt, climbIn * 0.32, 10, delta),
      -0.42,
      0.48,
    );

    const stall = Math.max(0, (VS - plane.userData.speed) / VS);
    const lift = (plane.userData.speed / VS) ** 2 * (0.2 + plane.userData.pitchAtt * 1.45);
    const accelY = lift * GRAVITY - GRAVITY - stall * 16;
    plane.userData.vs += accelY * delta;
    plane.userData.vs *= 1 - 0.35 * delta;
    plane.position.y += plane.userData.vs * delta;

    const drag = 0.42 + Math.abs(plane.userData.pitchAtt) * 0.25 + (plane.userData.gearDown ? 0.12 : 0);
    plane.userData.speed += (plane.userData.throttle * 40 - drag * plane.userData.speed) * delta;
    plane.userData.speed = THREE.MathUtils.clamp(plane.userData.speed, 6, 82);

    if (plane.position.y <= deck + 0.04 && plane.userData.vs <= 0.4) {
      touchDown(plane, deck, rwy, align);
    }
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
  plane.position.addScaledVector(forward, plane.userData.speed * delta);

  const visual = plane.userData.visual;
  if (visual) {
    visual.rotation.x = damp(visual.rotation.x, plane.userData.pitchAtt, 8, delta);
    visual.rotation.z = damp(visual.rotation.z, plane.userData.yawRate * 0.38, 8, delta);
  }
  plane.userData.pitch = visual?.rotation.x ?? 0;
  plane.userData.climbRate = plane.userData.vs;

  resolveCollisions(plane);
  if (!plane.userData.airborne && !plane.userData.crashed) {
    plane.position.y = getGroundHeight(plane.position.x, plane.position.z) + GEAR_HEIGHT;
  }
  const telemetry = readTelemetry(plane, rwy, align, climbIn);
  updateHud(telemetry);
  just.clear();
  return telemetry;
}

function readTelemetry(plane, rwy, align, climbIn) {
  return {
    speed: plane.userData.speed,
    altitude: Math.max(0, plane.position.y - getGroundHeight(plane.position.x, plane.position.z)),
    heading: wrapHeading(plane.rotation.y),
    throttle: plane.userData.throttle,
    vs: plane.userData.vs ?? 0,
    gearDown: plane.userData.gearDown,
    airborne: plane.userData.airborne,
    onRunway: rwy,
    align,
    phase: phaseOf(plane, plane.position.y - getGroundHeight(plane.position.x, plane.position.z), rwy, align),
    crashed: plane.userData.crashed,
    crashReason: plane.userData.crashReason,
    hit: plane.userData.hit || plane.userData.crashed,
    vr: VR,
    vsStall: VS,
    vref: VREF,
    rotateHint: !plane.userData.airborne && plane.userData.speed >= VR && climbIn >= 0,
  };
}
