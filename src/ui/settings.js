const STORAGE_KEY = "city-plane-settings";

const defaults = {
  viewDistance: 620,
  shadows: true,
  quality: 1,
  hud: true,
  volume: 0.8,
};

let paused = false;
let started = false;
let settings = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      viewDistance: clamp(saved.viewDistance, 280, 1600, defaults.viewDistance),
      shadows: saved.shadows !== false,
      quality: saved.quality === 0.65 || saved.quality === 1.35 ? saved.quality : 1,
      hud: saved.hud !== false,
      volume: clamp(saved.volume, 0, 1, defaults.volume),
    };
  } catch {
    return { ...defaults };
  }
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getSettings() {
  return settings;
}

export function updateSettings(partial) {
  settings = { ...settings, ...partial };
  if (partial.viewDistance != null) settings.viewDistance = clamp(partial.viewDistance, 280, 1600, defaults.viewDistance);
  if (partial.volume != null) settings.volume = clamp(partial.volume, 0, 1, defaults.volume);
  persist();
  return settings;
}

export function hasStarted() {
  return started;
}

export function markStarted() {
  started = true;
  return started;
}

export function isPaused() {
  return paused;
}

export function setPaused(next) {
  paused = Boolean(next);
  return paused;
}
