import * as THREE from "three";

/** Agent A. Simple arcade plane the city can sit under. */
export function createPlane() {
  const root = new THREE.Group();
  root.name = "plane";

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.55, 4.2),
    new THREE.MeshStandardMaterial({ color: 0xf2f4f8, metalness: 0.15, roughness: 0.45 }),
  );
  body.castShadow = true;

  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.12, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xc43b3b, metalness: 0.1, roughness: 0.5 }),
  );
  wing.position.set(0, 0.05, 0.2);
  wing.castShadow = true;

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.1, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc43b3b, metalness: 0.1, roughness: 0.5 }),
  );
  tail.position.set(0, 0.6, 1.7);
  tail.castShadow = true;

  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x22262c }),
  );
  nose.position.set(0, 0, -2.2);

  root.add(body, wing, tail, nose);
  root.userData.speed = 28;
  return root;
}
