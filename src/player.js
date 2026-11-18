import { level } from './config.js';

export function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

export function moveToward(actor, destination, speed, dt, stop = 0) {
  const dx = destination.x - actor.x;
  const dz = destination.z - actor.z;
  const length = Math.hypot(dx, dz);
  if (length <= stop) return;
  const step = Math.min(length - stop, speed * dt) / length;
  actor.x += dx * step;
  actor.z += dz * step;
  actor.heading = Math.atan2(dx, dz);
}

export function clampToArena(x, z) {
  return {
    x: Math.max(-level.width / 2 + 0.6, Math.min(level.width / 2 - 0.6, x)),
    z: Math.max(-level.depth / 2 + 0.6, Math.min(level.depth / 2 - 0.6, z))
  };
}

export function updatePlayer(player, input, dt) {
  const length = Math.hypot(input.x, input.z);
  if (!length) return;
  const step = level.playerSpeed * dt / Math.max(length, 1);
  const position = clampToArena(player.x + input.x * step, player.z + input.z * step);
  Object.assign(player, position);
  player.heading = Math.atan2(input.x, input.z);
}
