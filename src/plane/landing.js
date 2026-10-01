import { GEAR_HEIGHT, RUNWAY } from "../shared/constants.js";
import { crashPlane } from "./crash.js";
import { burstSplash, isWater } from "./water.js";

function settle(plane, deck) {
  plane.userData.airborne = false;
  plane.userData.vs = 0;
  plane.userData.pitchAtt = Math.min(0.03, Math.max(-0.02, plane.userData.pitchAtt));
  plane.position.y = deck;
}

/** Gear-down landings roll out. Only a real impact wrecks the airframe. */
export function handleContact(plane, groundY, rwy, align) {
  const sink = Math.max(0, -plane.userData.vs);
  const speed = plane.userData.speed;
  const water = isWater(plane.position.x, plane.position.z);
  const gear = plane.userData.gearDown;
  const deck = groundY + (gear ? GEAR_HEIGHT : 0.42);

  if (water) {
    burstSplash(plane.position, Math.max(speed, sink * 2.4));
    if (sink > 10 || speed > 42) {
      crashPlane(plane, "water impact");
      return;
    }
    plane.userData.speed = Math.max(0, speed * 0.28);
    settle(plane, groundY + 0.35);
    return;
  }

  if (sink > 14) {
    crashPlane(plane, "hard landing");
    return;
  }

  if (sink > 7) {
    plane.userData.vs = sink * 0.3;
    plane.userData.speed *= 0.84;
    plane.position.y = deck + 0.45;
    return;
  }

  if (!gear) {
    if (speed > 16 || sink > 2.4) {
      crashPlane(plane, "gear-up landing");
      return;
    }
    plane.userData.speed *= 0.4;
    settle(plane, groundY + 0.42);
    crashPlane(plane, "belly scrape");
    return;
  }

  const onStrip = rwy || Math.abs(plane.position.x - RUNWAY.x) < 80;
  if (onStrip && align > 1.05 && speed > 30) {
    crashPlane(plane, "runway excursion");
    return;
  }

  plane.userData.speed *= sink > 3.2 ? 0.72 : onStrip ? 0.94 : 0.58;
  settle(plane, deck);
}
