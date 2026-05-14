// ============================================================
// main.js
// This is the ENTRY POINT of the game.
// It sets up everything and runs the game loop.
// Think of this as the "director" — it connects all other files.
//
// Files it connects:
//   - player.js   → handles movement and mouse look
//   - map.js      → builds the level/map
//   - weapons.js  → handles shooting and reloading
// ============================================================

import * as THREE from 'three';
import { createPlayer, updatePlayer } from './player.js';
import { createMap } from './map.js';
import { createWeapons, updateWeapons, shoot, reload } from './weapons.js';


// ─── SCENE SETUP ────────────────────────────────────────────
// The scene is like the "world container"
// Everything (walls, lights, player, enemies) goes inside it
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue background
scene.fog = new THREE.Fog(0x87ceeb, 10, 80);  // fog starts at 10 units, fully hidden at 80


// ─── RENDERER ───────────────────────────────────────────────
// The renderer draws the 3D scene onto the screen using WebGL
const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias = smoother edges
renderer.setSize(window.innerWidth, window.innerHeight);        // fill the whole screen
renderer.shadowMap.enabled = true;                              // enable shadows

// ── Position the canvas BEHIND the HUD ──
// Without this, the canvas covers the HUD and ammo numbers won't show
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '0'; // z-index 0 = behind HUD (which is 999)

document.body.appendChild(renderer.domElement); // add canvas to the webpage


// ─── CAMERA ─────────────────────────────────────────────────
// The camera is the player's eyes.
// PerspectiveCamera = realistic 3D perspective (like a real camera)
const camera = new THREE.PerspectiveCamera(
  75,                                      // FOV (field of view) — 75 is standard FPS
  window.innerWidth / window.innerHeight,  // aspect ratio (width / height)
  0.1,                                     // near clipping — objects closer than this are hidden
  1000                                     // far clipping — objects farther than this are hidden
);
camera.position.set(0, 1.7, 0); // start position: center of map, eye height (1.7 units = ~170cm)


// ─── LIGHTING ───────────────────────────────────────────────
// Without lights, everything appears black

// Ambient light = soft light that hits everything equally (like a cloudy day)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // white light, 60% intensity
scene.add(ambientLight);

// Directional light = acts like the sun (parallel rays from one direction)
const sunLight = new THREE.DirectionalLight(0xffffff, 1); // white light, full intensity
sunLight.position.set(50, 80, 50);           // position of the "sun"
sunLight.castShadow = true;                  // this light creates shadows
sunLight.shadow.mapSize.width = 2048;        // shadow quality (higher = sharper shadows)
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);


// ─── MAP ────────────────────────────────────────────────────
// Builds all walls, floor, and crates in the scene
// All map geometry is defined in map.js
createMap(scene);


// ─── PLAYER ─────────────────────────────────────────────────
// Sets up keyboard and mouse controls
// Returns a player object used by updatePlayer() every frame
const player = createPlayer(camera, scene);


// ─── WEAPONS ────────────────────────────────────────────────
// Loads the gun model and attaches it to the camera
// Returns a weapons object used by shoot() and reload()
const weapons = createWeapons(camera, scene);


// ─── WINDOW RESIZE ──────────────────────────────────────────
// If the browser window is resized, update camera and renderer
// so the game doesn't look stretched or squished
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// ─── POINTER LOCK ───────────────────────────────────────────
// Pointer lock hides the mouse cursor and lets us use mouse movement
// for looking around (like all FPS games)
const blocker = document.getElementById('blocker'); // the "Click to Play" screen

// Click the blocker screen → lock the mouse → start playing
blocker.addEventListener('click', () => {
  document.body.requestPointerLock();
});

// When pointer lock is activated → hide the blocker screen
// When pointer lock is lost (e.g. pressed Escape) → show blocker screen again
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    blocker.style.display = 'none'; // hide "Click to Play" screen
  } else {
    blocker.style.display = 'flex'; // show "Click to Play" screen
  }
});


// ─── SHOOTING — Left Mouse Click ────────────────────────────
// Listens for mouse clicks while pointer is locked
// Left click (button 0) = shoot
document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== document.body) return; // only shoot when playing
  if (e.button === 0) shoot(weapons, camera, scene);         // left click = shoot
});


// ─── RELOAD — R Key ─────────────────────────────────────────
// Press R to reload the current weapon
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') reload(weapons);
});


// ─── GAME LOOP ───────────────────────────────────────────────
// This runs every frame (about 60 times per second)
// It updates the game state and re-renders the scene
const clock = new THREE.Clock(); // keeps track of time between frames

function animate() {
  requestAnimationFrame(animate); // tell browser to call animate() again next frame

  const delta = clock.getDelta(); // time since last frame (in seconds, e.g. 0.016 for 60fps)

  // Update player movement and collision every frame
  updatePlayer(player, delta, scene);

  // Update weapon cooldown timer every frame
  updateWeapons(weapons, delta, scene, camera);

  // Draw the scene from the camera's point of view
  renderer.render(scene, camera);
}

// Start the game loop!
animate();