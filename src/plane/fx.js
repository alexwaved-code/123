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

export function createCrashSmoke(plane) {
  const puffs = [];
  const mat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 7; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + i * 0.12, 8, 6), mat.clone());
    puff.visible = false;
    puffs.push(puff);
  }
  return function updateSmoke() {
    if (!puffs[0].parent && plane.parent) {
      for (const puff of puffs) plane.parent.add(puff);
    }
    const show = plane.userData.crashed;
    puffs.forEach((puff, i) => {
      puff.visible = show;
      if (!show) {
        puff.material.opacity = 0;
        return;
      }
      const t = performance.now() * 0.001 + i * 0.4;
      puff.position.set(
        plane.position.x + Math.sin(t * 1.4 + i) * 0.8,
        plane.position.y + 1.2 + (t * 0.7 + i) % 5,
        plane.position.z + Math.cos(t * 1.1 + i) * 0.8,
      );
      puff.material.opacity = 0.28;
      puff.scale.setScalar(1 + ((t + i) % 4) * 0.25);
    });
  };
}

export function updatePlaneFx(plane, delta, telemetry, time) {
  const visual = plane.userData.visual;
  if (!telemetry.crashed && visual?.userData.punch) {
    visual.userData.punch *= Math.pow(0.0008, delta);
    visual.position.y = Math.sin(time * 40) * visual.userData.punch;
  }

  if (plane.userData.prop) {
    plane.userData.prop.rotation.z += (2 + plane.userData.throttle * 18 + plane.userData.speed * 0.9) * delta;
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
    const beam = telemetry.gearDown && telemetry.altitude < 40;
    plane.userData.landing.intensity = beam ? 6.5 : 0;
  }
}
