// ============================================================
// map.js
// de_inferno style map — medium size
// CT BASE (west) vs T BASE (east)
// Two paths: Alley A (north) and Alley B (south)
// Mid connects both paths
// Two bomb sites: A (north-east) and B (south-east)
// ============================================================

import * as THREE from 'three';

// ─── COLORS ─────────────────────────────────────────────────
const COLORS = {
  floor:  0xc2a06e,  // sandy ground
  wall:   0xa0522d,  // terracotta brown
  crate:  0x8B6914,  // wooden crate
  barrel: 0x555555,  // metal barrel
  ctBase: 0x4444ff,  // blue = CT spawn
  tBase:  0xff4444,  // red = T spawn
  siteA:  0xffff00,  // yellow = bomb site A
  siteB:  0xff8800,  // orange = bomb site B
};

const WALL_H = 4;    // wall height
const W = 2;         // standard wall thickness


// ============================================================
// FUNCTION: createMap
// Called from main.js — builds the entire map
// ============================================================
export function createMap(scene) {
  buildFloor(scene);
  buildOuterWalls(scene);
  buildCTBase(scene);
  buildTBase(scene);
  buildAlleyA(scene);
  buildAlleyB(scene);
  buildMid(scene);
  buildSiteA(scene);
  buildSiteB(scene);
  buildCover(scene);
  buildSpawnMarkers(scene);
}


// ============================================================
// HELPER: makeWall
// w=width h=height d=depth x/y/z=position
// All walls are marked isWall=true for collision
// ============================================================
function makeWall(scene, w, h, d, x, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isWall = true;
  scene.add(mesh);
  return mesh;
}


// ============================================================
// HELPER: makeCrate
// Wooden crate for cover — size is width/height/depth
// ============================================================
function makeCrate(scene, x, z, size = 2) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshLambertMaterial({ color: COLORS.crate })
  );
  mesh.position.set(x, size / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isWall = true;
  scene.add(mesh);
}


// ============================================================
// HELPER: makeBarrel
// Metal barrel for cover
// ============================================================
function makeBarrel(scene, x, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.4, 8),
    new THREE.MeshLambertMaterial({ color: COLORS.barrel })
  );
  mesh.position.set(x, 0.7, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isWall = true;
  scene.add(mesh);
}


// ============================================================
// HELPER: makeFloorPanel
// Colored transparent floor to mark zones
// ============================================================
function makeFloorPanel(scene, w, d, x, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.35 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  scene.add(mesh);
}


// ============================================================
// SECTION: Floor
// One big sandy ground plane
// ============================================================
function buildFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: COLORS.floor })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}


// ============================================================
// SECTION: Outer Walls
// Border walls around the whole map — 120x120 units
// ============================================================
function buildOuterWalls(scene) {
  makeWall(scene, 120, WALL_H, W,  0,  -60, COLORS.wall); // north
  makeWall(scene, 120, WALL_H, W,  0,   60, COLORS.wall); // south
  makeWall(scene, W, WALL_H,  120, -60,   0, COLORS.wall); // west
  makeWall(scene, W, WALL_H,  120,  60,   0, COLORS.wall); // east
}


// ============================================================
// SECTION: CT Base
// West side — player starts here (blue floor)
// Wide open area with two exits (north to A, south to B)
// ============================================================
function buildCTBase(scene) {
  // Floor marker
  makeFloorPanel(scene, 25, 40, -45, 0, COLORS.ctBase);

  // Back wall (far west)
  makeWall(scene, W, WALL_H, 40, -57, 0, COLORS.wall);

  // Divider between CT base and mid — has TWO gaps (exits)
  // North wall segment (above gap to alley A)
  makeWall(scene, W, WALL_H, 12, -30, -24, COLORS.wall);
  // South wall segment (below gap to alley B)
  makeWall(scene, W, WALL_H, 12, -30,  24, COLORS.wall);
  // tiny center piece
  makeWall(scene, W, WALL_H,  6, -30,   0, COLORS.wall);
}


// ============================================================
// SECTION: T Base
// East side — enemy spawn (red floor)
// Mirror of CT base
// ============================================================
function buildTBase(scene) {
  // Floor marker
  makeFloorPanel(scene, 25, 40, 45, 0, COLORS.tBase);

  // Back wall (far east)
  makeWall(scene, W, WALL_H, 40, 57, 0, COLORS.wall);

  // Divider between T base and sites
  makeWall(scene, W, WALL_H, 12, 30, -24, COLORS.wall);
  makeWall(scene, W, WALL_H, 12, 30,  24, COLORS.wall);
  makeWall(scene, W, WALL_H,  6, 30,   0, COLORS.wall);
}


// ============================================================
// SECTION: Alley A (North Path)
// Top corridor — 8 units wide so player can move freely
// Connects CT base exit to Bomb Site A
// ============================================================
function buildAlleyA(scene) {
  // North boundary wall of alley A
  makeWall(scene, 70, WALL_H, W, -5, -38, COLORS.wall);

  // South boundary wall of alley A
  // Has a gap at mid entry point (between x=-15 and x=0)
  makeWall(scene, 25, WALL_H, W, -42, -22, COLORS.wall); // CT side
  makeWall(scene, 25, WALL_H, W,  10, -22, COLORS.wall); // site side

  // Cover inside alley A
  makeCrate(scene, -20, -30);
  makeCrate(scene,  -5, -32, 1.5);
  makeBarrel(scene, -35, -30);
}


// ============================================================
// SECTION: Alley B (South Path)
// Bottom corridor — mirror of alley A
// Connects CT base to Bomb Site B
// ============================================================
function buildAlleyB(scene) {
  // South boundary wall
  makeWall(scene, 70, WALL_H, W, -5, 38, COLORS.wall);

  // North boundary wall with gap for mid entry
  makeWall(scene, 25, WALL_H, W, -42, 22, COLORS.wall); // CT side
  makeWall(scene, 25, WALL_H, W,  10, 22, COLORS.wall); // site side

  // Cover inside alley B
  makeCrate(scene, -20, 30);
  makeCrate(scene,  -5, 32, 1.5);
  makeBarrel(scene, -35, 30);
}


// ============================================================
// SECTION: Mid
// Center of the map — connects alley A and alley B
// Has a small building players fight over for control
// ============================================================
function buildMid(scene) {
  // Small mid building — left block
  makeWall(scene, 10, WALL_H, W,  -8, -10, COLORS.wall);
  makeWall(scene, 10, WALL_H, W,  -8,  10, COLORS.wall);
  makeWall(scene, W, WALL_H,  20, -13,   0, COLORS.wall);

  // Small mid building — right block
  makeWall(scene, 10, WALL_H, W,   8, -10, COLORS.wall);
  makeWall(scene, 10, WALL_H, W,   8,  10, COLORS.wall);
  makeWall(scene, W, WALL_H,  20,  13,   0, COLORS.wall);

  // Mid cover — open barrels and crates
  makeBarrel(scene,  0,  0);
  makeBarrel(scene,  0, -4);
  makeCrate(scene,   0,  5);
  makeCrate(scene,  -3, -8, 1.5);
  makeCrate(scene,   3,  8, 1.5);
}


// ============================================================
// SECTION: Bomb Site A (North-East)
// Yellow floor — Ts try to plant bomb here
// Open area with some cover
// ============================================================
function buildSiteA(scene) {
  // Floor marker
  makeFloorPanel(scene, 22, 18, 38, -42, COLORS.siteA);

  // Back wall of site A
  makeWall(scene, 22, WALL_H, W, 38, -52, COLORS.wall);

  // Left wall connecting to alley A
  makeWall(scene, W, WALL_H, 12, 27, -46, COLORS.wall);

  // Cover on site A
  makeCrate(scene, 32, -44, 2.5);
  makeCrate(scene, 44, -40);
  makeBarrel(scene, 35, -38);
  makeBarrel(scene, 38, -36);
}


// ============================================================
// SECTION: Bomb Site B (South-East)
// Orange floor — mirror of site A
// Tighter, more enclosed
// ============================================================
function buildSiteB(scene) {
  // Floor marker
  makeFloorPanel(scene, 22, 18, 38, 42, COLORS.siteB);

  // Back wall of site B
  makeWall(scene, 22, WALL_H, W, 38, 52, COLORS.wall);

  // Left wall connecting to alley B
  makeWall(scene, W, WALL_H, 12, 27, 46, COLORS.wall);

  // Cover on site B
  makeCrate(scene, 32, 44, 2.5);
  makeCrate(scene, 44, 40);
  makeBarrel(scene, 35, 38);
  makeBarrel(scene, 38, 36);
}


// ============================================================
// SECTION: Extra Cover
// Crates and barrels spread across the map
// Gives players places to peek and hide
// ============================================================
function buildCover(scene) {
  // Near CT base exits
  makeCrate(scene, -28, -15);
  makeCrate(scene, -28,  15);

  // Near T base exits
  makeCrate(scene, 28, -15);
  makeCrate(scene, 28,  15);

  // Open areas between mid and sites
  makeBarrel(scene, 15, -15);
  makeBarrel(scene, 15,  15);
  makeCrate(scene,  20,   0);
}


// ============================================================
// SECTION: Spawn Markers
// Tall colored pillars so you can see spawns from far away
// Blue = CT, Red = T
// ============================================================
function buildSpawnMarkers(scene) {
  // CT spawn pillar (blue)
  const ct = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 4, 1.5),
    new THREE.MeshLambertMaterial({ color: COLORS.ctBase })
  );
  ct.position.set(-50, 2, 0);
  scene.add(ct);

  // T spawn pillar (red)
  const t = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 4, 1.5),
    new THREE.MeshLambertMaterial({ color: COLORS.tBase })
  );
  t.position.set(50, 2, 0);
  scene.add(t);
}