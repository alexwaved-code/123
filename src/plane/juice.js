import { createAtmosphere, updateAtmosphere } from "./atmosphere.js";
import { createContrail, createCrashSmoke, createWreckFx, pulseHit, updatePlaneFx } from "./fx.js";
import { updateOverlay } from "./overlay.js";
import { playHitThump, resumeFlightAudio, updateFlightAudio } from "./audio.js";

/** Agent A. Scene extras the city should not own. */
export function attachFlightJuice(scene, plane) {
  const atmosphere = createAtmosphere(scene);
  const updateContrail = createContrail(plane);
  const updateSmoke = createCrashSmoke(plane);
  const updateWreckFx = createWreckFx(plane);
  let wasHit = false;
  let wasCrash = false;
  let wasImpact = false;
  const clock = { t: 0 };

  window.addEventListener("pointerdown", resumeFlightAudio, { once: true });
  window.addEventListener("keydown", resumeFlightAudio, { once: true });

  return function updateJuice(delta, telemetry) {
    clock.t += delta;
    updateAtmosphere(atmosphere, plane, delta);
    updatePlaneFx(plane, delta, telemetry, clock.t);
    updateContrail(delta, telemetry);
    updateSmoke();
    updateWreckFx(delta);
    updateOverlay(telemetry);
    updateFlightAudio(telemetry);
    if (telemetry.hit && !wasHit) {
      pulseHit(plane);
      playHitThump();
    }
    if (telemetry.crashed && !wasCrash) playHitThump();
    if (plane.userData.wreckImpact && !wasImpact) playHitThump();
    wasHit = telemetry.hit;
    wasCrash = telemetry.crashed;
    wasImpact = Boolean(plane.userData.wreckImpact);
  };
}
