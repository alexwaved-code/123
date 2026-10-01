import * as THREE from "three";
import { GEAR_HEIGHT, GRAVITY, RUNWAY, SPAWN } from "../shared/constants.js";

export function resetPlane(plane) {
  plane.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
  plane.rotation.set(0, RUNWAY.heading, 0);
  const visual = plane.userData.visual;
  if (visual) {
    visual.rotation.set(0, 0, 0);
    visual.position.set(0, 0, 0);
  }
  plane.userData.speed = 0;
  plane.userData.throttle = 0;
  plane.userData.yawRate = 0;
  plane.userData.climbRate = 0;
  plane.userData.vs = 0;
  plane.userData.pitchAtt = 0;
  plane.userData.pitch = 0;
  plane.userData.airborne = false;
  plane.userData.gearDown = true;
  plane.userData.crashed = false;
  plane.userData.crashReason = "";
  plane.userData.crashAge = 0;
  plane.userData.wreckImpact = false;
  plane.userData.wreckSettled = false;
  plane.userData.hit = false;
  plane.userData.snapCamera = true;
  plane.userData.wreckSpin = { x: 0, y: 0, z: 0 };
  if (plane.userData.gear) {
    plane.userData.gear.visible = true;
    plane.userData.gear.userData.retract = 0;
    plane.userData.gear.rotation.x = 0;
    plane.userData.gear.position.y = 0;
  }
  plane.userData.gearAuto = false;
}

export function crashPlane(plane, reason) {
  if (plane.userData.crashed) return;
  plane.userData.crashed = true;
  plane.userData.crashReason = reason;
  plane.userData.crashAge = 0;
  plane.userData.wreckImpact = false;
  plane.userData.wreckSettled = false;
  plane.userData.throttle = 0;
  plane.userData.hit = true;
  const speed = plane.userData.speed ?? 0;
  plane.userData.wreckSpin = {
    x: 1.4 + speed * 0.05,
    y: 0.55,
    z: 2.1 + speed * 0.06,
  };
  const visual = plane.userData.visual;
  if (visual) visual.userData.punch = 0.4;
}

/** Falling wreck: tumble, slam, then settle. */
export function updateWreck(plane, delta, deck, water) {
  plane.userData.crashAge = (plane.userData.crashAge ?? 0) + delta;
  const visual = plane.userData.visual;
  const spin = plane.userData.wreckSpin ?? { x: 0, y: 0, z: 0 };
  const airborne = plane.position.y > deck + 0.12;

  if (airborne) {
    plane.userData.vs = (plane.userData.vs ?? 0) - GRAVITY * delta;
    plane.position.y += plane.userData.vs * delta;
    plane.userData.speed = Math.max(0, (plane.userData.speed ?? 0) * (1 - 0.12 * delta));
    plane.userData.airborne = true;
    if (visual) {
      visual.rotation.x += spin.x * delta;
      visual.rotation.y += spin.y * delta;
      visual.rotation.z += spin.z * delta;
    }
    plane.rotation.y += spin.y * 0.35 * delta;
  } else {
    if (!plane.userData.wreckImpact) {
      plane.userData.wreckImpact = true;
      const sink = Math.max(0, -(plane.userData.vs ?? 0));
      plane.userData.vs = sink > 8 ? sink * 0.22 : 0;
      plane.userData.speed *= 0.28;
      if (visual) {
        visual.rotation.x = 0.42;
        visual.rotation.z = 1.25;
        visual.position.y = water ? -0.05 : -0.32;
      }
    } else {
      plane.userData.vs *= 0.35;
      plane.userData.speed = THREE.MathUtils.damp(plane.userData.speed ?? 0, 0, 3.2, delta);
      if (Math.abs(plane.userData.vs) < 0.4) {
        plane.userData.vs = 0;
        plane.userData.wreckSettled = true;
      }
    }
    plane.position.y = water ? deck : Math.min(plane.position.y, deck * 0.7 + 0.15);
    plane.userData.airborne = false;
    spin.x *= Math.pow(0.08, delta);
    spin.y *= Math.pow(0.08, delta);
    spin.z *= Math.pow(0.08, delta);
    if (visual && plane.userData.wreckSettled) {
      visual.rotation.x = THREE.MathUtils.damp(visual.rotation.x, 0.38, 4, delta);
      visual.rotation.z = THREE.MathUtils.damp(visual.rotation.z, 1.18, 4, delta);
    }
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y);
  plane.position.addScaledVector(forward, (plane.userData.speed ?? 0) * delta);
  plane.userData.pitch = visual?.rotation.x ?? 0;
  plane.userData.climbRate = plane.userData.vs ?? 0;
}
