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
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 12; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.85 + i * 0.1, 8, 6), mat.clone());
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
      const t = performance.now() * 0.001 + i * 0.35;
      const rise = plane.userData.wreckImpact ? 1 : 0.35;
      puff.position.set(
        plane.position.x + Math.sin(t * 1.2 + i) * (1.1 + i * 0.08),
        plane.position.y + 0.8 + ((t * 0.9 * rise + i) % 7),
        plane.position.z + Math.cos(t * 1.05 + i) * (1.1 + i * 0.08),
      );
      puff.material.opacity = plane.userData.wreckImpact ? 0.38 : 0.16;
      puff.scale.setScalar(1.1 + ((t + i) % 5) * 0.28);
    });
  };
}

export function createWreckFx(plane) {
  const debris = [];
  const flames = [];
  const dust = [];
  let launched = false;
  let dusted = false;

  for (let i = 0; i < 10; i += 1) {
    const bit = new THREE.Mesh(
      new THREE.BoxGeometry(0.22 + (i % 3) * 0.08, 0.08, 0.35),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xc43b3b : 0xd8dce0, roughness: 0.7 }),
    );
    bit.visible = false;
    debris.push({ mesh: bit, vx: 0, vy: 0, vz: 0, spin: 0 });
  }
  for (let i = 0; i < 5; i += 1) {
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.45 + i * 0.12, 7, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff6a1a : 0xffc43a, transparent: true, opacity: 0, depthWrite: false }),
    );
    flame.visible = false;
    flames.push(flame);
  }
  for (let i = 0; i < 8; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xc4b89a, transparent: true, opacity: 0, depthWrite: false }),
    );
    puff.visible = false;
    dust.push({ mesh: puff, age: 99, vx: 0, vz: 0 });
  }

  function attach() {
    if (!plane.parent || debris[0].mesh.parent) return;
    for (const bit of debris) plane.parent.add(bit.mesh);
    for (const flame of flames) plane.parent.add(flame);
    for (const puff of dust) plane.parent.add(puff.mesh);
  }

  return function updateWreckFx(delta) {
    attach();
    const crashed = plane.userData.crashed;
    if (!crashed) {
      launched = false;
      dusted = false;
      for (const bit of debris) bit.mesh.visible = false;
      for (const flame of flames) {
        flame.visible = false;
        flame.material.opacity = 0;
      }
      for (const puff of dust) puff.mesh.visible = false;
      return;
    }

    if (!launched) {
      launched = true;
      debris.forEach((bit, i) => {
        const a = (i / debris.length) * Math.PI * 2;
        bit.vx = Math.cos(a) * (6 + (plane.userData.speed ?? 0) * 0.15);
        bit.vy = 5 + (i % 4);
        bit.vz = Math.sin(a) * (6 + (plane.userData.speed ?? 0) * 0.15);
        bit.spin = 4 + i;
        bit.mesh.position.copy(plane.position);
        bit.mesh.position.y += 0.6;
        bit.mesh.visible = true;
      });
    }

    if (plane.userData.wreckImpact && !dusted) {
      dusted = true;
      dust.forEach((puff, i) => {
        const a = (i / dust.length) * Math.PI * 2;
        puff.age = 0;
        puff.vx = Math.cos(a) * 7;
        puff.vz = Math.sin(a) * 7;
        puff.mesh.position.set(plane.position.x, 0.4, plane.position.z);
        puff.mesh.visible = true;
        puff.mesh.material.opacity = 0.45;
        puff.mesh.scale.setScalar(1);
      });
    }

    for (const bit of debris) {
      if (!bit.mesh.visible) continue;
      bit.vy -= 18 * delta;
      bit.mesh.position.x += bit.vx * delta;
      bit.mesh.position.y += bit.vy * delta;
      bit.mesh.position.z += bit.vz * delta;
      bit.mesh.rotation.x += bit.spin * delta;
      bit.mesh.rotation.z += bit.spin * 0.7 * delta;
      if (bit.mesh.position.y < 0.12) {
        bit.mesh.position.y = 0.12;
        bit.vy *= -0.25;
        bit.vx *= 0.7;
        bit.vz *= 0.7;
      }
    }

    const fireOn = plane.userData.wreckImpact;
    flames.forEach((flame, i) => {
      flame.visible = fireOn;
      if (!fireOn) return;
      const t = performance.now() * 0.001 + i;
      flame.position.set(
        plane.position.x + Math.sin(t * 9 + i) * 0.25,
        plane.position.y + 0.35 + Math.abs(Math.sin(t * 11 + i)) * 0.7,
        plane.position.z + Math.cos(t * 8 + i) * 0.25,
      );
      flame.material.opacity = 0.45 + Math.sin(t * 14 + i) * 0.2;
      flame.scale.setScalar(0.8 + Math.abs(Math.sin(t * 9 + i)) * 0.55);
    });

    for (const puff of dust) {
      if (puff.age > 0.9) {
        puff.mesh.visible = false;
        continue;
      }
      puff.age += delta;
      puff.mesh.position.x += puff.vx * delta;
      puff.mesh.position.z += puff.vz * delta;
      puff.mesh.position.y += 0.8 * delta;
      puff.vx *= 1 - 2 * delta;
      puff.vz *= 1 - 2 * delta;
      puff.mesh.material.opacity = Math.max(0, 0.45 - puff.age * 0.5);
      puff.mesh.scale.setScalar(1 + puff.age * 2.2);
    }
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
