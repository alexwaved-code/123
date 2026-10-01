import * as THREE from "three";

function mat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.48, ...extras });
}

/** Agent A. Visual child holds bank/pitch so city colliders stay axis-aligned on the root. */
export function createPlane() {
  const root = new THREE.Group();
  root.name = "plane";

  const visual = new THREE.Group();
  visual.name = "planeVisual";

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 5.1), mat(0xf4f6f8));
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.1), mat(0x1d2228));
  nose.position.set(0, -0.02, -2.85);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 1.2), mat(0x79c4e8, { roughness: 0.2, metalness: 0.35 }));
  canopy.position.set(0, 0.48, -0.55);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 1.55), mat(0xc43b3b));
  wing.position.set(0, -0.02, 0.15);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.85), mat(0xc43b3b));
  tailWing.position.set(0, 0.18, 2.15);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.9), mat(0xc43b3b));
  fin.position.set(0, 0.75, 2.2);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.18), mat(0x2a2e33));
  prop.position.set(0, 0, -3.45);

  for (const mesh of [body, nose, canopy, wing, tailWing, fin, prop]) {
    mesh.castShadow = true;
    visual.add(mesh);
  }

  root.add(visual);
  root.userData.speed = 28;
  root.userData.hit = false;
  root.userData.visual = visual;
  root.userData.prop = prop;
  return root;
}
