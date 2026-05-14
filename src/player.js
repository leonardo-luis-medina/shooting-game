import * as THREE from 'three';

export function createPlayer(camera, scene) {
  const player = {
    camera,
    speed: 8,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    health: 100,
    ammo: 30,
    keys: {},
    objects: scene.children, // for collision
  };

  // ─── KEYBOARD ───
  document.addEventListener('keydown', (e) => {
    player.keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    player.keys[e.code] = false;
  });

  // ─── MOUSE LOOK ───
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body) return;

    player.yaw   -= e.movementX * 0.002;
    player.pitch -= e.movementY * 0.002;

    // Clamp pitch so you can't flip upside down
    player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, player.pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  });

  return player;
}

export function updatePlayer(player, delta, scene) {
  if (document.pointerLockElement !== document.body) return;

  const { camera, keys } = player;

  // ─── MOVEMENT DIRECTION ───
  const moveDir = new THREE.Vector3();

  if (keys['KeyW'])               moveDir.z -= 1; // forward
  if (keys['KeyS'])               moveDir.z += 1; // backward
  if (keys['KeyA'])               moveDir.x -= 1; // left
  if (keys['KeyD'])               moveDir.x += 1; // right

  moveDir.normalize();

  // Move relative to where camera is facing
  const forward = new THREE.Vector3();
  const right   = new THREE.Vector3();

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

  const move = new THREE.Vector3();
  move.addScaledVector(forward, -moveDir.z);
  move.addScaledVector(right,    moveDir.x);
  move.normalize().multiplyScalar(player.speed * delta);

  // ─── COLLISION DETECTION ───
  const nextPos = camera.position.clone().add(move);
  nextPos.y = camera.position.y; // keep height fixed

  if (!checkCollision(nextPos, scene)) {
    camera.position.add(move);
  }

  // Keep player on the ground
  camera.position.y = 1.7;

  // ─── HUD UPDATE ───
  document.getElementById('health').textContent = player.health;
  document.getElementById('ammo').textContent   = player.ammo;
}

// ─── SIMPLE COLLISION ───
function checkCollision(position, scene) {
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    position,
    new THREE.Vector3(0.8, 1.7, 0.8)
  );

  for (const obj of scene.children) {
    if (!obj.userData.isWall) continue;
    const wallBox = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(wallBox)) return true;
  }

  return false;
}