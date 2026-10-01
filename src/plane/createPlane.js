import * as THREE from "three";

function mat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.42, ...extras });
}

function lightBulb(color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

/** Agent A. Visual child holds bank/pitch so city colliders stay axis-aligned on the root. */
export function createPlane() {
  const root = new THREE.Group();
  root.name = "plane";

  const visual = new THREE.Group();
  visual.name = "planeVisual";
  visual.rotation.order = "YXZ";

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 5.1), mat(0xf4f6f8));
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.1), mat(0x1d2228));
  nose.position.set(0, -0.02, -2.85);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.38, 1.2),
    mat(0x79c4e8, { roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.88 }),
  );
  canopy.position.set(0, 0.48, -0.55);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 1.55), mat(0xc43b3b));
  wing.position.set(0, -0.02, 0.15);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.85), mat(0xc43b3b));
  tailWing.position.set(0, 0.18, 2.15);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.9), mat(0xc43b3b));
  fin.position.set(0, 0.75, 2.2);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.18), mat(0x2a2e33));
  prop.position.set(0, 0, -3.45);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    new THREE.MeshBasicMaterial({
      color: 0xc9d0d6,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  disc.position.set(0, 0, -3.45);

  const strobeL = lightBulb(0xfff4cc, -4.15, 0.08, 0.15);
  const strobeR = lightBulb(0xfff4cc, 4.15, 0.08, 0.15);
  const navL = lightBulb(0xff2a2a, -4.2, 0.02, 0.55);
  const navR = lightBulb(0x2aff6a, 4.2, 0.02, 0.55);
  const tailLight = lightBulb(0xffffff, 0, 0.35, 2.55);

  const landing = new THREE.SpotLight(0xfff2d0, 0, 90, 0.32, 0.45, 1);
  landing.position.set(0, -0.15, -2.2);
  landing.target.position.set(0, -8, -28);
  visual.add(landing.target);

  for (const mesh of [body, nose, canopy, wing, tailWing, fin, prop, disc, strobeL, strobeR, navL, navR, tailLight]) {
    mesh.castShadow = true;
    visual.add(mesh);
  }
  visual.add(landing);

  const gear = new THREE.Group();
  gear.name = "gear";
  const wheelMat = mat(0x1a1a1a, { roughness: 0.9 });
  const wheels = [
    [0, -0.62, -1.6],
    [-0.85, -0.62, 0.9],
    [0.85, -0.62, 0.9],
  ];
  for (const [x, y, z] of wheels) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    gear.add(wheel);
  }
  visual.add(gear);

  root.add(visual);
  root.userData.speed = 0;
  root.userData.throttle = 0;
  root.userData.vs = 0;
  root.userData.pitchAtt = 0;
  root.userData.hit = false;
  root.userData.airborne = false;
  root.userData.gearDown = true;
  root.userData.crashed = false;
  root.userData.visual = visual;
  root.userData.prop = prop;
  root.userData.propDisc = disc;
  root.userData.strobes = [strobeL, strobeR];
  root.userData.landing = landing;
  root.userData.gear = gear;
  root.userData.yawRate = 0;
  root.userData.climbRate = 0;
  return root;
}
