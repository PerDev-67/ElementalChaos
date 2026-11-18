import { level } from './config.js';

export function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function steer(actor, x, z, map, autonomous) {
  for (const obstacle of map.obstacles ?? []) {
    const dx = x - obstacle.x;
    const dz = z - obstacle.z;
    const distance = Math.hypot(dx, dz);
    const clearance = obstacle.radius + 0.3;
    if (distance >= clearance) continue;
    const oldX = actor.x - obstacle.x;
    const oldZ = actor.z - obstacle.z;
    const oldDistance = Math.hypot(oldX, oldZ) || 1;
    if (autonomous && oldDistance > .1) {
      const slide = (x - actor.x) * -oldZ + (z - actor.z) * oldX;
      const direction = Math.abs(slide) > .015 ? Math.sign(slide) : actor.id % 2 ? 1 : -1;
      const angle = Math.atan2(oldZ, oldX) + direction * Math.hypot(x - actor.x, z - actor.z) / clearance;
      x = obstacle.x + Math.cos(angle) * clearance;
      z = obstacle.z + Math.sin(angle) * clearance;
    } else {
      const divisor = distance || oldDistance;
      x = obstacle.x + (distance ? dx : oldX) / divisor * clearance;
      z = obstacle.z + (distance ? dz : oldZ) / divisor * clearance;
    }
  }
  return clampToArena(x, z, map);
}

export function moveToward(actor, destination, speed, dt, stop = 0, map = level) {
  const dx = destination.x - actor.x;
  const dz = destination.z - actor.z;
  const length = Math.hypot(dx, dz);
  if (length <= stop) return;
  const step = Math.min(length - stop, speed * dt) / length;
  Object.assign(actor, steer(actor, actor.x + dx * step, actor.z + dz * step, map, true));
  actor.heading = Math.atan2(dx, dz);
}

export function clampToArena(x, z, map = level) {
  return {
    x: Math.max(-map.width / 2 + 0.6, Math.min(map.width / 2 - 0.6, x)),
    z: Math.max(-map.depth / 2 + 0.6, Math.min(map.depth / 2 - 0.6, z))
  };
}

export function updatePlayer(player, input, dt, map = level, traits = []) {
  const length = Math.hypot(input.x, input.z);
  player.moving = Boolean(length);
  if (!length) return;
  const run = input.run ? 1.32 : 1;
  const boost = traits.includes('trail') ? 1.15 : 1;
  const step = map.playerSpeed * run * boost * dt / Math.max(length, 1);
  const position = steer(player, player.x + input.x * step, player.z + input.z * step, map, false);
  Object.assign(player, position);
  player.heading = Math.atan2(input.x, input.z);
}
