// ============================================================
// weapons.js
// Handles everything related to weapons:
// - Loading the gun model (or showing a placeholder box)
// - Shooting (raycasting, hit detection)
// - Reloading
// - Muzzle flash effect
// - Bullet hit effect
// - Ammo HUD update
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── WEAPON STATE ───────────────────────────────────────────
let currentWeapon = null;  // the 3D gun model currently visible
let shootCooldown = 0;     // timer to prevent shooting too fast
const SHOOT_DELAY = 0.1;   // seconds between each shot (10 shots/sec max)
const MAG_SIZE = 30;       // bullets per magazine


// ============================================================
// FUNCTION: createWeapons
// Called once when the game starts.
// Loads the gun model and attaches it to the camera.
// Returns a "weapons" object used by shoot() and reload().
// ============================================================
export function createWeapons(camera, scene) {

  // GLTFLoader loads .glb / .gltf 3D model files
  const loader = new GLTFLoader();

  // ── Weapon Holder ──
  // This is an invisible group attached to the camera.
  // Whatever we put inside it will always appear in front of the player.
  const weaponHolder = new THREE.Group();
  camera.add(weaponHolder);  // attach to camera so gun moves with player view
  scene.add(camera);         // camera must be in the scene for this to work

  // Position the gun: right (0.3), down (-0.3), in front (-0.5)
  // Adjust these numbers to move the gun on screen
  weaponHolder.position.set(0.3, -0.3, -0.5);

  // ── Load Gun Model ──
  // Tries to load your ak47.glb from the public/models/weapons/ folder
  loader.load(
    '/models/weapons/ak47.glb',  // path to your gun model

    // SUCCESS: model loaded correctly
    (gltf) => {
      currentWeapon = gltf.scene;
      currentWeapon.scale.set(0.1, 0.1, 0.1); // scale down — adjust if gun looks too big/small
      weaponHolder.add(currentWeapon);
      console.log('✅ Gun model loaded successfully!');
    },

    // PROGRESS: loading in progress (we ignore this)
    undefined,

    // ERROR: model file not found — show a grey box as placeholder
    () => {
      console.warn('⚠️ No gun model found at /models/weapons/ak47.glb — using placeholder box');
      const gunGeo = new THREE.BoxGeometry(0.05, 0.05, 0.3);
      const gunMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      currentWeapon = new THREE.Mesh(gunGeo, gunMat);
      weaponHolder.add(currentWeapon);
    }
  );

  // ── Return Weapons Object ──
  // This object is passed around to shoot(), reload(), updateWeapons()
  return {
    weaponHolder,          // the group holding the gun model
    bulletsLeft: MAG_SIZE, // current bullets in magazine (starts full)
    totalAmmo: 90,         // total reserve ammo (not in magazine)
  };
}


// ============================================================
// FUNCTION: updateWeapons
// Called every frame in the game loop (main.js).
// Counts down the shoot cooldown timer so player can shoot again.
// ============================================================
export function updateWeapons(weapons, delta, scene, camera) {
  // delta = time since last frame (in seconds)
  // Subtract from cooldown so shooting is time-based, not frame-rate-based
  if (shootCooldown > 0) {
    shootCooldown -= delta;
  }
}


// ============================================================
// FUNCTION: shoot
// Called when player left-clicks.
// Fires a ray from the center of the screen forward.
// If it hits something, triggers hit effect or enemy damage.
// ============================================================
export function shoot(weapons, camera, scene) {

  // ── Block shooting if cooldown is active ──
  if (shootCooldown > 0) return;

  // ── Block shooting if magazine is empty ──
  if (weapons.bulletsLeft <= 0) {
    console.log('🔴 Magazine empty! Press R to reload.');
    return;
  }

  // ── Raycasting ──
  // A raycaster shoots an invisible ray from the camera center forward.
  // If it hits an object, we know the player aimed at it.
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); // (0,0) = center of screen

  // Only check walls and enemies for hits (ignore floor, sky, etc.)
  const targets = scene.children.filter(
    obj => obj.userData.isEnemy || obj.userData.isWall
  );

  // Get list of objects the ray hit, sorted by distance (closest first)
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0) {
    const hit = hits[0]; // closest hit object

    // ── Spawn orange flash at the hit point ──
    spawnHitEffect(hit.point, scene);

    // ── Enemy hit detection ──
    // Check if the hit object (or its parent) is an enemy
    if (hit.object.userData.isEnemy || hit.object.parent?.userData.isEnemy) {
      console.log('💥 Enemy hit!');
      // Reduce enemy health by 25 per bullet (4 shots to kill)
      hit.object.userData.health = (hit.object.userData.health || 100) - 25;
    }
  }

  // ── Muzzle Flash ──
  // Briefly adds a point light in front of the gun to simulate flash
  muzzleFlash(weapons.weaponHolder);

  // ── Reduce ammo ──
  weapons.bulletsLeft--;
  shootCooldown = SHOOT_DELAY;

  // ── Update ammo display on screen ──
  const ammoEl = document.getElementById('ammo');
  const totalEl = document.getElementById('total-ammo');
  if (ammoEl) ammoEl.textContent = weapons.bulletsLeft;
  if (totalEl) totalEl.textContent = weapons.totalAmmo;
  console.log('Bullets left:', weapons.bulletsLeft, '/ Total:', weapons.totalAmmo);
}


// ============================================================
// FUNCTION: reload
// Called when player presses R.
// Takes bullets from reserve (totalAmmo) and fills the magazine.
// Example: 10/90 → press R → 30/70
// ============================================================
export function reload(weapons) {

  // ── Don't reload if no reserve ammo ──
  if (weapons.totalAmmo <= 0) {
    console.log('🔴 No reserve ammo left!');
    return;
  }

  // ── Don't reload if magazine already full ──
  if (weapons.bulletsLeft === MAG_SIZE) {
    console.log('🟡 Magazine already full!');
    return;
  }

  // Calculate how many bullets we need to fill the mag
  const needed = MAG_SIZE - weapons.bulletsLeft;

  // Take only what's available from reserve
  const taken = Math.min(needed, weapons.totalAmmo);

  // Fill magazine, reduce reserve
  weapons.bulletsLeft += taken;
  weapons.totalAmmo -= taken;

  console.log(`🔄 Reloaded! Mag: ${weapons.bulletsLeft} | Reserve: ${weapons.totalAmmo}`);

  // ── Update ammo display on screen ──
  updateAmmoHUD(weapons);
}


// ============================================================
// FUNCTION: updateAmmoHUD
// Updates the ammo numbers shown on screen.
// Format: bulletsLeft / totalAmmo  →  example: 30/90
// ============================================================
export function updateAmmoHUD(weapons) {
  document.getElementById('ammo').textContent = weapons.bulletsLeft;
  document.getElementById('total-ammo').textContent = weapons.totalAmmo;
}


// ============================================================
// FUNCTION: spawnHitEffect  (private — only used inside this file)
// Creates a small orange sphere at the point where bullet landed.
// Disappears after 0.5 seconds.
// ============================================================
function spawnHitEffect(point, scene) {
  const geo = new THREE.SphereGeometry(0.05, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 }); // orange
  const flash = new THREE.Mesh(geo, mat);
  flash.position.copy(point); // place it exactly where bullet hit
  scene.add(flash);

  // Auto-remove after 500ms so it doesn't pile up in the scene
  setTimeout(() => scene.remove(flash), 500);
}


// ============================================================
// FUNCTION: muzzleFlash  (private — only used inside this file)
// Adds a brief orange point light in front of the gun
// to simulate the flash of firing.
// Disappears after 50ms.
// ============================================================
function muzzleFlash(weaponHolder) {
  const light = new THREE.PointLight(0xff8800, 5, 3); // orange light, intensity 5, range 3
  light.position.set(0, 0, -0.5); // in front of the gun barrel
  weaponHolder.add(light);

  // Remove the light after 50ms (just a quick flash)
  setTimeout(() => weaponHolder.remove(light), 50);
}