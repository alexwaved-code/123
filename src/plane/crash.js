import { GEAR_HEIGHT, RUNWAY, SPAWN } from "../shared/constants.js";

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
  plane.userData.hit = false;
  plane.userData.snapCamera = true;
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
  plane.userData.speed *= 0.2;
  plane.userData.vs = 0;
  plane.userData.throttle = 0;
  const visual = plane.userData.visual;
  if (visual) {
    visual.rotation.z = 1.15;
    visual.rotation.x = 0.28;
    visual.position.y = -0.25;
  }
  plane.position.y = Math.max(GEAR_HEIGHT * 0.45, plane.position.y - 0.4);
}
