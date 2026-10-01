import * as THREE from "three";

const MAX = 160;
const tail = new THREE.Vector3();

export function createContrail(plane) {
  const positions = new Float32Array(MAX * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = "contrail";
  let cursor = 0;

  return function updateContrail(delta, telemetry) {
    if (!points.parent && plane.parent) plane.parent.add(points);
    const show = telemetry.speed > 38 && telemetry.altitude > 14;
    material.opacity = THREE.MathUtils.lerp(material.opacity, show ? 0.32 : 0.02, 1 - Math.pow(0.02, delta));
    tail.set(0, 0.15, 2.5).applyMatrix4(plane.matrixWorld);
    positions[cursor * 3] = tail.x;
    positions[cursor * 3 + 1] = tail.y;
    positions[cursor * 3 + 2] = tail.z;
    cursor = (cursor + 1) % MAX;
    geometry.getAttribute("position").needsUpdate = true;
  };
}

export function pulseHit(plane) {
  const visual = plane.userData.visual;
  if (!visual) return;
  visual.userData.punch = 0.18;
}

export function updatePlaneFx(plane, delta, telemetry, time) {
  const visual = plane.userData.visual;
  if (visual?.userData.punch) {
    visual.userData.punch *= Math.pow(0.0008, delta);
    visual.position.y = Math.sin(time * 40) * visual.userData.punch;
  }

  if (plane.userData.prop) {
    plane.userData.prop.rotation.z += (8 + plane.userData.speed * 1.1) * delta;
    plane.userData.prop.visible = plane.userData.speed < 34;
  }
  if (plane.userData.propDisc) {
    const spin = THREE.MathUtils.clamp((plane.userData.speed - 18) / 30, 0, 1);
    plane.userData.propDisc.material.opacity = spin * 0.42;
    plane.userData.propDisc.rotation.z += plane.userData.speed * 0.8 * delta;
  }

  const blink = time % 1.05 < 0.08;
  for (const strobe of plane.userData.strobes ?? []) {
    strobe.material.emissiveIntensity = blink ? 4 : 0.15;
  }
  if (plane.userData.landing) {
    plane.userData.landing.intensity = telemetry.altitude < 28 ? 6.5 : 0;
  }
}
