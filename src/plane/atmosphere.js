import * as THREE from "three";

function cloudMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
}

function placeCloud(mesh, around, index) {
  const angle = index * 2.4;
  const radius = 80 + (index % 7) * 55;
  mesh.position.set(
    around.x + Math.cos(angle) * radius,
    70 + (index % 5) * 18,
    around.z + Math.sin(angle) * radius,
  );
  mesh.userData.drift = 2 + (index % 4);
}

/** Agent A sky + nearby clouds. Follows the plane so the horizon never ends. */
export function createAtmosphere(scene) {
  scene.background = new THREE.Color(0x87cceb);
  scene.fog = new THREE.Fog(0x9ad0e6, 140, 780);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1100, 28, 18),
    new THREE.MeshBasicMaterial({ color: 0x7ec8e8, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.name = "skyDome";
  scene.add(sky);

  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(420, 20, 12),
    new THREE.MeshBasicMaterial({
      color: 0xd7eef8,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.18,
      fog: false,
      depthWrite: false,
    }),
  );
  scene.add(haze);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1c2, fog: false }),
  );
  sun.position.set(220, 260, 80);
  scene.add(sun);

  const clouds = new THREE.Group();
  clouds.name = "clouds";
  const puff = new THREE.SphereGeometry(12, 8, 6);
  const mat = cloudMaterial();
  for (let i = 0; i < 26; i += 1) {
    const cloud = new THREE.Group();
    const a = new THREE.Mesh(puff, mat);
    const b = new THREE.Mesh(puff, mat);
    b.position.set(10, 2, -4);
    b.scale.setScalar(0.75);
    const c = new THREE.Mesh(puff, mat);
    c.position.set(-8, 1, 5);
    c.scale.setScalar(0.65);
    cloud.add(a, b, c);
    cloud.scale.setScalar(0.8 + (i % 5) * 0.18);
    placeCloud(cloud, { x: 0, z: 200 }, i);
    clouds.add(cloud);
  }
  scene.add(clouds);

  return { sky, haze, sun, clouds };
}

export function updateAtmosphere(parts, plane, delta) {
  const { sky, haze, sun, clouds } = parts;
  sky.position.set(plane.position.x, 0, plane.position.z);
  haze.position.set(plane.position.x, 40, plane.position.z);
  sun.position.set(plane.position.x + 220, 260, plane.position.z + 80);

  const altT = THREE.MathUtils.clamp(plane.position.y / 140, 0, 1);
  if (plane.parent?.fog) {
    plane.parent.fog.near = 120 + altT * 80;
    plane.parent.fog.far = 640 + altT * 220;
    plane.parent.fog.color.setHSL(0.55, 0.38, 0.72 + altT * 0.08);
  }

  for (const cloud of clouds.children) {
    cloud.position.x += cloud.userData.drift * delta;
    const dx = cloud.position.x - plane.position.x;
    const dz = cloud.position.z - plane.position.z;
    if (dx * dx + dz * dz > 420 * 420) {
      placeCloud(cloud, plane.position, Math.floor(Math.random() * 20));
      cloud.position.x = plane.position.x - Math.sin(plane.rotation.y) * 280;
      cloud.position.z = plane.position.z - Math.cos(plane.rotation.y) * 280;
    }
  }
}
