// ============================================================
// weapons.js
// Handles everything related to weapons:
// - Loading the gun model (or showing a placeholder box)
// - Shooting with recoil effect
// - Auto-fire when holding left click
// - Reloading
// - Muzzle flash effect
// - Bullet hit effect
// - Ammo HUD update
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── WEAPON STATE ───────────────────────────────────────────
let shootCooldown  = 0;      // timer between shots
let isMouseHeld    = false;  // true when left click is held
let recoilAmount   = 0;      // current recoil offset
let recoilRecovery = 0;      // how fast recoil recovers

const SHOOT_DELAY    = 0.09; // seconds between auto-fire shots
const MAG_SIZE       = 30;   // bullets per magazine
const RECOIL_KICK    = 0.012; // how much camera kicks up per shot
const RECOIL_MAX     = 0.15;  // max recoil before it stops increasing
const RECOIL_RECOVER = 0.04;  // how fast recoil recovers per frame


// ============================================================
// FUNCTION: createWeapons
// Called once at game start
// Loads gun model, attaches to camera
// Sets up mouse hold detection for auto-fire
// ============================================================
export function createWeapons(camera, scene) {

  const loader = new GLTFLoader();

  // ── Weapon Holder ──
  const weaponHolder = new THREE.Group();
  camera.add(weaponHolder);
  scene.add(camera);
  weaponHolder.position.set(0.3, -0.3, -0.5);

  // ── Load Gun Model ──
  loader.load(
    '/models/weapons/ak47.glb',
    (gltf) => {
      const gun = gltf.scene;
      gun.scale.set(0.1, 0.1, 0.1);
      weaponHolder.add(gun);
      console.log('✅ Gun model loaded!');
    },
    undefined,
    () => {
      console.warn('⚠️ No gun model — using placeholder');
      const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
      );
      weaponHolder.add(gun);
    }
  );

  // ── Mouse Hold Detection ──
  // Track if left mouse button is being held for auto-fire
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) isMouseHeld = true;
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      isMouseHeld = false;
      recoilRecovery = 0; // start recovering when mouse released
    }
  });

  return {
    weaponHolder,
    camera,                  // stored so recoil can move camera
    bulletsLeft: MAG_SIZE,
    totalAmmo:   150,        // ← updated to 150 reserve ammo
  };
}


// ============================================================
// FUNCTION: updateWeapons
// Called every frame
// Handles auto-fire, shoot cooldown, and recoil recovery
// ============================================================
export function updateWeapons(weapons, delta, scene, camera, enemies) {

  // ── Count down shoot cooldown ──
  if (shootCooldown > 0) shootCooldown -= delta;

  // ── Auto-fire while mouse is held ──
  if (isMouseHeld && document.pointerLockElement === document.body) {
    if (shootCooldown <= 0 && weapons.bulletsLeft > 0) {
      shoot(weapons, camera, scene, enemies);
    }
  }

  // ── Recoil Recovery ──
  // Camera slowly returns to original position after shooting
  if (recoilAmount > 0) {
    const recovery = RECOIL_RECOVER * (1 + recoilRecovery);
    recoilAmount = Math.max(0, recoilAmount - recovery);
    camera.rotation.x = Math.max(
      -Math.PI / 2.5,
      camera.rotation.x - recovery
    );
  }
}


// ============================================================
// FUNCTION: shoot
// Fires one bullet — called by auto-fire in updateWeapons
// or directly on single click from main.js
// ============================================================
export function shoot(weapons, camera, scene, enemies = []) {

  // ── Block if cooling down ──
  if (shootCooldown > 0) return;

  // ── Block if magazine empty ──
  if (weapons.bulletsLeft <= 0) {
    console.log('🔴 Empty! Press R to reload.');
    return;
  }

  // ── Raycast from center of screen ──
  // far = 500 means bullets reach anywhere on the map
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0.1;
  raycaster.far  = 500;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  // Check ALL objects in scene recursively for hits
  const hits = raycaster.intersectObjects(scene.children, true);

  if (hits.length > 0) {
    const hit = hits[0];

    // ── Spawn orange flash at hit point ──
    spawnHitEffect(hit.point, scene);

    // ── Walk up object tree to find enemy group ──
    let hitObject = hit.object;
    while (hitObject && !hitObject.userData.isEnemy) {
      hitObject = hitObject.parent;
    }

    if (hitObject && hitObject.userData.isEnemy) {

      // ── KEY FIX: get enemy via enemyRef on the hit child ──
      // hit.object is a child (body/head), enemyRef points to group
      // group.userData.enemyObj points to the actual enemy object
      const enemyGroup = hit.object.userData.enemyRef || hitObject;
      const enemy = enemyGroup?.userData?.enemyObj;

      if (enemy && enemy.alive) {
        // Import and use damageEnemy for clean damage handling
        enemy.health -= 10;
        console.log(`💥 Enemy hit! Health: ${enemy.health}/100`);

        // ── Update health bar ──
        const hpBar = enemy.group.userData.hpBar;
        if (hpBar) {
          const ratio      = Math.max(0, enemy.health / 100);
          hpBar.scale.x    = ratio;
          hpBar.position.x = -(1 - ratio) / 2;
          if (ratio > 0.5)       hpBar.material.color.set(0x00ff00);
          else if (ratio > 0.25) hpBar.material.color.set(0xffff00);
          else                   hpBar.material.color.set(0xff0000);
        }

        // ── Kill if health gone ──
        if (enemy.health <= 0 && enemy.alive) {
          enemy.alive = false;
          console.log('☠️ Enemy killed!');
          enemy.group.children.forEach(child => {
            if (child.material) child.material.color.set(0xffffff);
          });
          setTimeout(() => scene.remove(enemy.group), 300);
        }
      }
    }
  }

  // ── Muzzle Flash ──
  muzzleFlash(weapons.weaponHolder);

  // ── Recoil — kick camera up ──
  if (recoilAmount < RECOIL_MAX) {
    recoilAmount += RECOIL_KICK;
    recoilRecovery += 0.1; // gets harder to control the longer you shoot
  }
  camera.rotation.x = Math.min(
    Math.PI / 2.5,
    camera.rotation.x + RECOIL_KICK
  );

  // ── Reduce ammo and start cooldown ──
  weapons.bulletsLeft--;
  shootCooldown = SHOOT_DELAY;

  // ── Update HUD ──
  updateAmmoHUD(weapons);
}


// ============================================================
// FUNCTION: reload
// Press R — refills magazine from reserve
// Example: 5/150 → R → 30/125
// ============================================================
export function reload(weapons) {

  if (weapons.totalAmmo <= 0) {
    console.log('🔴 No reserve ammo!');
    return;
  }

  if (weapons.bulletsLeft === MAG_SIZE) {
    console.log('🟡 Magazine already full!');
    return;
  }

  const needed = MAG_SIZE - weapons.bulletsLeft;
  const taken  = Math.min(needed, weapons.totalAmmo);

  weapons.bulletsLeft += taken;
  weapons.totalAmmo   -= taken;

  console.log(`🔄 Reloaded! Mag: ${weapons.bulletsLeft} | Reserve: ${weapons.totalAmmo}`);
  updateAmmoHUD(weapons);
}


// ============================================================
// FUNCTION: updateAmmoHUD
// Updates ammo numbers on screen — format: 30/150
// ============================================================
export function updateAmmoHUD(weapons) {
  const ammoEl  = document.getElementById('ammo');
  const totalEl = document.getElementById('total-ammo');
  if (ammoEl)  ammoEl.textContent  = weapons.bulletsLeft;
  if (totalEl) totalEl.textContent = weapons.totalAmmo;
}


// ============================================================
// FUNCTION: spawnHitEffect (private)
// Orange sphere at bullet impact — removed after 500ms
// ============================================================
function spawnHitEffect(point, scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xff4400 })
  );
  mesh.position.copy(point);
  scene.add(mesh);
  setTimeout(() => scene.remove(mesh), 500);
}


// ============================================================
// FUNCTION: muzzleFlash (private)
// Brief orange point light at gun barrel — removed after 50ms
// ============================================================
function muzzleFlash(weaponHolder) {
  const light = new THREE.PointLight(0xff8800, 5, 3);
  light.position.set(0, 0, -0.5);
  weaponHolder.add(light);
  setTimeout(() => weaponHolder.remove(light), 50);
}