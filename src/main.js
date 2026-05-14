// ============================================================
// main.js
// Entry point of the game — connects all systems together
//
// Files connected:
//   player.js   → movement and mouse look
//   map.js      → builds the level
//   weapons.js  → shooting and reloading
//   enemies.js  → enemy bots and AI
// ============================================================

import * as THREE from 'three';
import { createPlayer, updatePlayer } from './player.js';
import { createMap } from './map.js';
import { createWeapons, updateWeapons, shoot, reload } from './weapons.js';
import { createEnemies, updateEnemies } from './enemies.js';


// ─── SCENE ──────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 10, 100);


// ─── RENDERER ───────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// Canvas sits behind HUD
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top      = '0';
renderer.domElement.style.left     = '0';
renderer.domElement.style.width    = '100%';
renderer.domElement.style.height   = '100%';
renderer.domElement.style.zIndex   = '0';

document.body.appendChild(renderer.domElement);


// ─── CAMERA ─────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-50, 1.7, 0); // CT spawn — west side blue base


// ─── LIGHTING ───────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(50, 80, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width  = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);


// ─── MAP ────────────────────────────────────────────────────
createMap(scene);


// ─── PLAYER ─────────────────────────────────────────────────
const player = createPlayer(camera, scene);


// ─── WEAPONS ────────────────────────────────────────────────
const weapons = createWeapons(camera, scene);


// ─── ENEMIES ────────────────────────────────────────────────
// Spawns 3 enemy bots on the T side (east)
const enemies = createEnemies(scene);


// ─── WINDOW RESIZE ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// ─── POINTER LOCK ───────────────────────────────────────────
const blocker = document.getElementById('blocker');

blocker.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    blocker.style.display = 'none';
  } else {
    blocker.style.display = 'flex';
  }
});


// ─── SHOOTING — handled inside updateWeapons (auto-fire) ────
// Single click still works via mousedown for quick tap shots
// ─── SHOOTING — Left Click ───────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== document.body) return;
  if (e.button === 0) shoot(weapons, camera, scene, enemies);

  // ── Right Click — Zoom In (ADS) ──
  if (e.button === 2) {
    camera.fov = 30; // zoom in (normal is 75)
    camera.updateProjectionMatrix();

    // Make crosshair smaller when zoomed
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.transform = 'translate(-50%, -50%) scale(0.5)';
  }
});

// ─── ZOOM OUT — Right Click Release ─────────────────────────
document.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    camera.fov = 75; // zoom back out
    camera.updateProjectionMatrix();

    // Restore crosshair size
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
  }
});

// ─── PREVENT RIGHT CLICK MENU ───────────────────────────────
document.addEventListener('contextmenu', (e) => e.preventDefault());


// ─── RELOAD — R Key ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') reload(weapons);
});


// ─── GAME LOOP ───────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updatePlayer(player, delta, scene);
  updateWeapons(weapons, delta, scene, camera, enemies);
  updateEnemies(enemies, delta, scene, camera, player); // move enemy bots every frame

  renderer.render(scene, camera);
}

animate();