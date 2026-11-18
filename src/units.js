import { enemyTypes, hydrogen, level } from './config.js';
import { clampToArena, distanceSquared, moveToward } from './player.js';
import { strike, tickActor } from './combat.js';

export function actor(kind, id, x, z, hp) {
  return { kind, id, x, z, hp, maxHp: hp, cooldown: 0, flash: 0, heading: 0 };
}

export function summonUnit(state) {
  const angle = state.nextId * 2.39996;
  const position = clampToArena(state.player.x + Math.cos(angle) * 1.6, state.player.z + Math.sin(angle) * 1.6);
  state.allies.push(actor('ally', state.nextId++, position.x, position.z, hydrogen.ranks[state.rank].hp));
}

export function spawnEnemy(state, type) {
  if (state.enemies.length >= level.enemyCap) return;
  const portal = level.portals[state.spawnIndex % level.portals.length];
  const enemy = actor('enemy', state.nextId++, portal.x, portal.z, enemyTypes[type].hp);
  enemy.type = type;
  state.enemies.push(enemy);
}

function nearest(origin, actors, radius) {
  let best = radius * radius;
  let target = null;
  for (const candidate of actors) {
    if (candidate.hp <= 0) continue;
    const distance = distanceSquared(origin, candidate);
    if (distance < best) {
      best = distance;
      target = candidate;
    }
  }
  return target;
}

export function updateAllies(state, dt) {
  const rank = hydrogen.ranks[state.rank];
  const anchor = state.order === 'follow' ? state.player : state.order === 'move' ? state.moveTarget : state.core;
  const leash = state.order === 'attack' ? Infinity : state.order === 'defend' ? 8 : 5;
  for (const ally of state.allies) {
    if (ally.hp <= 0) continue;
    tickActor(ally, dt);
    const enemy = nearest(ally, state.enemies, hydrogen.attackRange);
    if (enemy) strike(state, ally, enemy, rank.damage, rank.cooldown);
    const chase = nearest(anchor, state.enemies, leash);
    if (chase) {
      moveToward(ally, chase, hydrogen.speed, dt, hydrogen.attackRange * 0.76);
    } else {
      const angle = ally.id * 2.39996;
      const radius = (state.order === 'defend' ? 3.1 : 1.35) + (ally.id % 4) * 0.46;
      const destination = clampToArena(anchor.x + Math.cos(angle) * radius, anchor.z + Math.sin(angle) * radius);
      moveToward(ally, destination, hydrogen.speed, dt, 0.12);
    }
  }
}

export function updateEnemies(state, dt) {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    tickActor(enemy, dt);
    const spec = enemyTypes[enemy.type];
    const huntAllies = nearest(enemy, state.allies, spec.behavior === 'hunter' ? 6.4 : 1.9);
    const huntPlayer = state.player.hp > 0 && distanceSquared(enemy, state.player) < (spec.behavior === 'hunter' ? 8 ** 2 : 1.9 ** 2);
    const target = huntPlayer ? state.player : huntAllies ?? state.core;
    if (distanceSquared(enemy, target) <= (spec.range + 0.015) ** 2) {
      strike(state, enemy, target, spec.damage, spec.cooldown);
    } else {
      moveToward(enemy, target, spec.speed, dt, spec.range * 0.94);
    }
  }
}
