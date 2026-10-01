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
