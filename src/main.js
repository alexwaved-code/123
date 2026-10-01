import * as THREE from "three";
import { createCity, updateCity } from "./city/createCity.js";
import { createAirport } from "./plane/airport.js";
import { resetPlane } from "./plane/crash.js";
import { createFollowCamera } from "./plane/followCamera.js";
import { createPlane } from "./plane/createPlane.js";
import { updateFlight } from "./plane/flight.js";
import { attachFlightJuice } from "./plane/juice.js";
import { RUNWAY, SPAWN } from "./shared/constants.js";
import { createGameMenu } from "./ui/menu.js";
import { hasStarted, isPaused } from "./ui/settings.js";
import { createPilot } from "./pilot/driver.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);
scene.fog = new THREE.Fog(0x7ec8e3, 180, 620);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x6b7a4e, 1.05);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4d6, 1.15);
sun.position.set(80, 140, 40);
sun.castShadow = true;
scene.add(sun);

const city = createCity();
scene.add(city);
scene.add(createAirport());

const plane = createPlane();
plane.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
plane.rotation.y = RUNWAY.heading;
scene.add(plane);
camera.position.set(SPAWN.x, SPAWN.y + 2.4, SPAWN.z - 8.5);
camera.lookAt(SPAWN.x, SPAWN.y + 0.4, SPAWN.z + 6);

const updateCamera = createFollowCamera(camera, plane);
const updateJuice = attachFlightJuice(scene, plane);
const clock = new THREE.Clock();

const pilot = createPilot(scene, plane);
const menu = createGameMenu({
  scene,
  renderer,
  sun,
  onRestart: () => {
    resetPlane(plane);
    pilot.board();
  },
});

function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!hasStarted() || isPaused()) {
    renderer.render(scene, camera);
    return;
  }
  if (pilot.isAboard()) {
    const telemetry = updateFlight(plane, delta);
    updateCity(city, plane.position);
    updateCamera(delta, telemetry);
    updateJuice(delta, telemetry);
  } else {
    pilot.update(delta);
    updateCity(city, pilot.worldPosition());
    pilot.updateCamera(camera, delta);
  }
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  menu.applyGraphics();
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    renderer.dispose();
    renderer.domElement.remove();
    document.getElementById("plane-hud")?.remove();
    document.getElementById("crash-banner")?.remove();
    document.getElementById("flight-overlay")?.remove();
    document.getElementById("game-menu-root")?.remove();
    document.getElementById("game-menu-open")?.remove();
    document.getElementById("game-menu-style")?.remove();
    document.getElementById("game-start-root")?.remove();
    scene.clear();
  });
}

frame();
