import * as THREE from "three";
import { SPAWN } from "./shared/constants.js";
import { createPlane } from "./plane/createPlane.js";
import { updateFlight } from "./plane/flight.js";
import { createFollowCamera } from "./plane/followCamera.js";
import { attachFlightJuice } from "./plane/juice.js";
import { createCity } from "./city/createCity.js";

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

scene.add(createCity());

const plane = createPlane();
plane.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
scene.add(plane);

const updateCamera = createFollowCamera(camera, plane);
const updateJuice = attachFlightJuice(scene, plane);
const clock = new THREE.Clock();

function frame() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const telemetry = updateFlight(plane, delta);
  updateCamera(delta, telemetry);
  updateJuice(delta, telemetry);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

frame();
