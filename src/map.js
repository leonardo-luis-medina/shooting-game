import * as THREE from 'three';

export function createMap(scene) {

  const textureLoader = new THREE.TextureLoader();

  // Materials
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xc2b280 }); // sand
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });  // brown
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x6B6B6B });  // grey

  // ─── FLOOR ───
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ─── HELPER: make a wall ───
  function makeWall(w, h, d, x, y, z, mat) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isWall = true; // used for collision later
    scene.add(mesh);
    return mesh;
  }

  // ─── OUTER WALLS (border of the map) ───
  const wallH = 5;
  makeWall(100, wallH, 1,   0,   wallH/2,  -50, wallMat); // north
  makeWall(100, wallH, 1,   0,   wallH/2,   50, wallMat); // south
  makeWall(1,   wallH, 100, -50, wallH/2,   0,  wallMat); // west
  makeWall(1,   wallH, 100,  50, wallH/2,   0,  wallMat); // east

  // ─── INNER WALLS (like de_dust2 style) ───

  // Center building
  makeWall(12, wallH, 1,  0, wallH/2, -8, wallMat);
  makeWall(12, wallH, 1,  0, wallH/2,  8, wallMat);
  makeWall(1,  wallH, 16, -6, wallH/2, 0, wallMat);
  makeWall(1,  wallH, 16,  6, wallH/2, 0, wallMat);

  // Left corridor walls
  makeWall(1, wallH, 20, -20, wallH/2, -5, wallMat);
  makeWall(1, wallH, 20, -20, wallH/2,  5, wallMat);

  // Right corridor walls
  makeWall(1, wallH, 20, 20, wallH/2, -5, wallMat);
  makeWall(1, wallH, 20, 20, wallH/2,  5, wallMat);

  // Cover boxes (like crates in CS2)
  makeCrate(scene, -10, 0,  -15);
  makeCrate(scene,  10, 0,  -15);
  makeCrate(scene,  -5, 0,   15);
  makeCrate(scene,   5, 0,   15);
  makeCrate(scene,   0, 0,  -25);
  makeCrate(scene, -15, 0,    0);
  makeCrate(scene,  15, 0,    0);
}

// ─── CRATE (cover object) ───
function makeCrate(scene, x, y, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    mat
  );
  crate.position.set(x, 1, z);
  crate.castShadow = true;
  crate.receiveShadow = true;
  crate.userData.isWall = true;
  scene.add(crate);
}