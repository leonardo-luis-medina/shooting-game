// ============================================================
// enemies.js
// Handles enemy AI bots:
// - Spawns 3 enemies on T side
// - Enemies patrol between waypoints
// - Enemies SHOOT BACK at the player
// - Enemies take damage and die when health = 0
// - Enemies CANNOT walk through walls
// ============================================================

import * as THREE from 'three';

// ─── ENEMY SETTINGS ─────────────────────────────────────────
const ENEMY_SPEED       = 2;
const ENEMY_HEALTH      = 100;
const WAYPOINT_RADIUS   = 1.5;
const SHOOT_RANGE       = 30;
const ENEMY_SHOOT_DELAY = 2;
const ENEMY_DAMAGE      = 10;

// ─── PATROL WAYPOINTS ───────────────────────────────────────
const WAYPOINTS = [
  new THREE.Vector3( 50, 0,   0),
  new THREE.Vector3( 30, 0, -15),
  new THREE.Vector3( 15, 0, -20),
  new THREE.Vector3(  0, 0,   0),
  new THREE.Vector3( 15, 0,  20),
  new THREE.Vector3( 30, 0,  15),
];

// ─── ENEMY LIST ─────────────────────────────────────────────
const enemies = [];


// ============================================================
// FUNCTION: createEnemies
// Spawns 3 enemies at T side positions
// ============================================================
export function createEnemies(scene) {
  const startPositions = [
    { pos: new THREE.Vector3(50, 0,  0),  wp: 0 },
    { pos: new THREE.Vector3(40, 0, -10), wp: 1 },
    { pos: new THREE.Vector3(40, 0,  10), wp: 5 },
  ];

  for (let i = 0; i < 3; i++) {
    const enemy = spawnEnemy(scene, startPositions[i].pos, startPositions[i].wp);
    enemies.push(enemy);
  }

  return enemies;
}


// ============================================================
// FUNCTION: spawnEnemy
// Creates one enemy with body, head, health bar
// Tags every child with enemyRef so hit detection works
// ============================================================
function spawnEnemy(scene, position, waypointIndex) {

  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.isEnemy = true;

  // ── Body ──
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xcc2222 })
  );
  body.position.y = 0.6;
  body.castShadow = true;
  body.userData.isEnemy  = true;
  body.userData.enemyRef = group; // ← KEY FIX: points back to group
  group.add(body);

  // ── Head ──
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xffcc99 })
  );
  head.position.y = 1.5;
  head.castShadow = true;
  head.userData.isEnemy  = true;
  head.userData.enemyRef = group; // ← KEY FIX: points back to group
  group.add(head);

  // ── Health Bar Background ──
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false })
  );
  hpBg.position.y = 2.2;
  hpBg.renderOrder = 1;
  group.add(hpBg);

  // ── Health Bar Fill ──
  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false })
  );
  hpBar.position.y = 2.2;
  hpBar.position.z = 0.01;
  hpBar.renderOrder = 2;
  group.add(hpBar);

  group.userData.hpBar = hpBar;
  group.userData.hpBg  = hpBg;

  scene.add(group);

  // ── Enemy Object ──
  const enemyObj = {
    group,
    waypointIndex,
    health:      ENEMY_HEALTH,
    alive:       true,
    shootTimer:  Math.random() * ENEMY_SHOOT_DELAY,
  };

  // ── Store enemy reference on group too ──
  group.userData.enemyObj = enemyObj;

  return enemyObj;
}


// ============================================================
// FUNCTION: updateEnemies
// Called every frame — moves enemies, shoots at player
// Also checks wall collision so enemies cant go through walls
// ============================================================
export function updateEnemies(enemies, delta, scene, camera, player) {
  for (const enemy of enemies) {

    if (!enemy.alive) continue;

    const enemyPos   = enemy.group.position.clone();
    const playerPos  = camera.position.clone();
    const distToPlayer = enemyPos.distanceTo(playerPos);
    const canSeePlayer = distToPlayer < SHOOT_RANGE;

    if (canSeePlayer) {
      // ── Face player ──
      const lookDir = new THREE.Vector3();
      lookDir.subVectors(playerPos, enemyPos);
      lookDir.y = 0;
      enemy.group.rotation.y = Math.atan2(lookDir.x, lookDir.z);

      // ── Shoot at player ──
      enemy.shootTimer -= delta;
      if (enemy.shootTimer <= 0) {
        enemyShoot(enemy, camera, player, scene);
        enemy.shootTimer = ENEMY_SHOOT_DELAY;
      }

    } else {
      // ── Patrol ──
      const target    = WAYPOINTS[enemy.waypointIndex];
      const direction = new THREE.Vector3();
      direction.subVectors(target, enemyPos);
      direction.y = 0;
      const distance = direction.length();

      if (distance > WAYPOINT_RADIUS) {
        direction.normalize();

        // ── Wall collision for enemies ──
        // Try moving, check if new position hits a wall
        const moveStep = direction.clone().multiplyScalar(ENEMY_SPEED * delta);
        const nextPos  = enemy.group.position.clone().add(moveStep);
        nextPos.y      = 0;

        if (!checkEnemyWallCollision(nextPos, scene)) {
          // Safe to move
          enemy.group.position.copy(nextPos);
        } else {
          // Hit a wall — try next waypoint
          enemy.waypointIndex = (enemy.waypointIndex + 1) % WAYPOINTS.length;
        }

        enemy.group.rotation.y = Math.atan2(direction.x, direction.z);

      } else {
        // Reached waypoint — go to next
        enemy.waypointIndex = (enemy.waypointIndex + 1) % WAYPOINTS.length;
      }
    }

    // ── Keep on ground ──
    enemy.group.position.y = 0;

    // ── Health bars face camera ──
    const hpBar = enemy.group.userData.hpBar;
    const hpBg  = enemy.group.userData.hpBg;
    if (hpBar) hpBar.lookAt(camera.position);
    if (hpBg)  hpBg.lookAt(camera.position);
  }
}


// ============================================================
// FUNCTION: checkEnemyWallCollision
// Returns true if position overlaps a wall object
// Used to stop enemies walking through walls
// ============================================================
function checkEnemyWallCollision(position, scene) {
  const enemyBox = new THREE.Box3().setFromCenterAndSize(
    position,
    new THREE.Vector3(0.8, 1.5, 0.8) // enemy body size
  );

  for (const obj of scene.children) {
    if (!obj.userData.isWall) continue;
    const wallBox = new THREE.Box3().setFromObject(obj);
    if (enemyBox.intersectsBox(wallBox)) return true;
  }

  return false;
}


// ============================================================
// FUNCTION: damageEnemy
// Called from weapons.js when bullet hits enemy
// Reduces health, updates bar, kills if health = 0
// ============================================================
export function damageEnemy(enemy, damage, scene) {

  if (!enemy || !enemy.alive) return;

  // ── Reduce health ──
  enemy.health -= damage;
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

  // ── Kill if dead ──
  if (enemy.health <= 0 && enemy.alive) {
    enemy.alive = false;
    console.log('☠️ Enemy killed!');

    // Flash white
    enemy.group.children.forEach(child => {
      if (child.material) child.material.color.set(0xffffff);
    });

    setTimeout(() => scene.remove(enemy.group), 300);
  }
}


// ============================================================
// FUNCTION: enemyShoot
// Enemy fires at player — reduces player health
// ============================================================
function enemyShoot(enemy, camera, player, scene) {
  console.log('🔴 Enemy shooting at you!');

  // Flash white when shooting
  enemy.group.children.forEach(child => {
    if (child.material && child.geometry?.type === 'BoxGeometry') {
      const orig = child.material.color.getHex();
      child.material.color.set(0xffffff);
      setTimeout(() => child.material.color.setHex(orig), 100);
    }
  });

  // ── Damage player ──
  if (player) {
    player.health = Math.max(0, player.health - ENEMY_DAMAGE);
    const healthEl = document.getElementById('health');
    if (healthEl) healthEl.textContent = player.health;
    console.log(`❤️ Player health: ${player.health}`);

    if (player.health <= 0) {
      console.log('💀 You died!');
      showDeathScreen();
    }
  }

  // ── Bullet tracer ──
  showBulletTracer(enemy.group.position, camera.position, scene);
}


// ============================================================
// FUNCTION: showBulletTracer
// Yellow line from enemy to player showing bullet path
// ============================================================
function showBulletTracer(from, to, scene) {
  const points = [
    new THREE.Vector3(from.x, from.y + 1.2, from.z),
    to.clone()
  ];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 })
  );
  scene.add(line);
  setTimeout(() => scene.remove(line), 100);
}


// ============================================================
// FUNCTION: showDeathScreen
// Red YOU DIED overlay when player health = 0
// ============================================================
function showDeathScreen() {
  const death = document.createElement('div');
  death.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(255,0,0,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 72px;
    font-weight: bold;
    z-index: 9999;
  `;
  death.innerHTML = `YOU DIED<div style="font-size:24px;margin-top:20px">Press F5 to respawn</div>`;
  document.body.appendChild(death);
  document.exitPointerLock();
}


// ============================================================
// FUNCTION: getEnemies
// Returns the full enemy list
// ============================================================
export function getEnemies() {
  return enemies;
}