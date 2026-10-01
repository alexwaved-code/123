export const GEAR_HEIGHT = 1.2;

/** Runway 18 / 36. Takeoff heading looks toward downtown (+Z). */
export const RUNWAY = {
  x: -248,
  z0: -900,
  z1: -100,
  width: 36,
  heading: Math.PI,
};

export const SPAWN = { x: RUNWAY.x, y: GEAR_HEIGHT, z: -820 };
export const UP = { x: 0, y: 1, z: 0 };

/** 1 unit = 1 meter. Do not change without an Agent A + Agent B ACK. */
export const METERS = 1;

export const VS = 16;
export const VR = 28;
export const VREF = 22;
export const GRAVITY = 19;

export function onRunway(x, z) {
  return Math.abs(x - RUNWAY.x) <= RUNWAY.width * 0.5 + 1 && z >= RUNWAY.z0 && z <= RUNWAY.z1;
}

/** True if a box centered at x,z would sit on the airport strip. */
export function overlapsRunway(x, z, w = 0, d = 0) {
  const pad = 10;
  const left = RUNWAY.x - RUNWAY.width * 0.5 - pad;
  const right = RUNWAY.x + RUNWAY.width * 0.5 + pad;
  return !(x + w * 0.5 < left || x - w * 0.5 > right || z + d * 0.5 < RUNWAY.z0 || z - d * 0.5 > RUNWAY.z1);
}
