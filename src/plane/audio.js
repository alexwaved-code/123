let ctx;
let engine;
let engineGain;
let windGain;
let filter;
let masterVolume = 0.8;
let audible = true;

function noiseSource(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start();
  return source;
}

function ensure() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();

  engine = ctx.createOscillator();
  engine.type = "sawtooth";
  engine.frequency.value = 78;
  filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engine.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(ctx.destination);
  engine.start();

  const wind = noiseSource(ctx);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 900;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  wind.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(ctx.destination);
  return ctx;
}

export function resumeFlightAudio() {
  const audio = ensure();
  if (audio?.state === "suspended") audio.resume();
}

export function setMasterVolume(value) {
  masterVolume = Math.min(1, Math.max(0, Number(value) || 0));
}

export function setFlightAudible(on) {
  audible = Boolean(on);
  if (!audible && engineGain && windGain) {
    engineGain.gain.value = 0;
    windGain.gain.value = 0;
  }
}

export function updateFlightAudio(telemetry) {
  if (!ctx || ctx.state !== "running" || !audible) return;
  if (telemetry.crashed) {
    engineGain.gain.value = 0;
    windGain.gain.value = 0.01 * masterVolume;
    return;
  }
  const speedT = THREE_CLAMP(telemetry.speed / 70);
  const throttle = telemetry.throttle ?? 0;
  engine.frequency.value = 48 + throttle * 130 + speedT * 20;
  filter.frequency.value = 240 + throttle * 520;
  const engineLevel = throttle < 0.02 ? 0.006 : 0.016 + throttle * 0.05;
  engineGain.gain.value = engineLevel * masterVolume;
  windGain.gain.value = (speedT * speedT * 0.055 + (telemetry.altitude < 18 ? 0.02 : 0)) * masterVolume;
}

export function playHitThump() {
  if (!ctx || ctx.state !== "running" || !audible || masterVolume <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 90;
  gain.gain.value = 0.09 * masterVolume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.stop(ctx.currentTime + 0.2);
}

function THREE_CLAMP(value) {
  return Math.min(1, Math.max(0, value));
}
