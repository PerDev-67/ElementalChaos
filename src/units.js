import { enemyTypes, missionSpec } from './config.js';
import { phaseOf, unitHp, unitSpec } from './elements.js';
import { clampToArena, distanceSquared, moveToward } from './player.js';
import { strike, tickActor } from './combat.js';

export function actor(kind, id, x, z, hp) {
  return { kind, id, x, z, hp, maxHp: hp, cooldown: 0, flash: 0, heading: 0 };
}

export function summonUnit(state, element) {
  const angle = state.nextId * 2.39996;
  const position = clampToArena(state.player.x + Math.cos(angle) * 1.6, state.player.z + Math.sin(angle) * 1.6, missionSpec(state));
  const unit = actor('ally', state.nextId++, position.x, position.z, unitHp(element, state.rank, state.traits));
  unit.element = element.atomicNumber;
  if (state.levelId) {
    unit.temperature = 293;
    unit.phase = phaseOf(element, unit.temperature);
  }
  state.allies.push(unit);
}

export function spawnEnemy(state, type, index = state.spawnIndex) {
  const map = missionSpec(state);
  if (state.enemies.length >= map.enemyCap) return false;
  const portal = map.portals[index % map.portals.length];
  const enemy = actor('enemy', state.nextId++, portal.x, portal.z, enemyTypes[type].hp);
  enemy.type = type;
  state.enemies.push(enemy);
  return true;
}

export function nearest(origin, actors, radius) {
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

function useAbility(ally, enemy, state) {
  if (ally.element === 2) {
    const friend = state.allies.find(unit => unit.hp > 0 && unit.hp < unit.maxHp && distanceSquared(ally, unit) < 4 ** 2);
    if (friend) friend.hp = Math.min(friend.maxHp, friend.hp + 3 + state.rank);
  }
  if (ally.element === 3 && enemy) {
    for (const target of state.enemies) {
      if (target !== enemy && target.hp > 0 && distanceSquared(enemy, target) < 2.5 ** 2) {
        target.hp = Math.max(0, target.hp - 7 - state.rank * 3);
        target.flash = 0.12;
      }
    }
  }
}

export function updateAllies(state, dt) {
  const map = missionSpec(state);
  for (const ally of state.allies) {
    if (ally.hp <= 0) continue;
    tickActor(ally, dt);
    const spec = unitSpec(ally);
    const rank = spec.ranks[state.rank];
    const order = ally.order ?? state.order;
    const anchor = order === 'follow' ? state.player : order === 'move' ? ally.destination ?? state.moveTarget : state.core;
    const leash = order === 'attack' ? Infinity : order === 'defend' ? 9 : 5;
    if (state.levelId) {
      const chilled = state.chill > 0 && map.capture && distanceSquared(ally, map.capture) < 6 ** 2;
      ally.temperature = chilled ? 18 : 293;
      ally.phase = phaseOf(spec, ally.temperature);
    }
    const enemy = nearest(ally, state.enemies, spec.attackRange);
    if (enemy && ally.cooldown === 0) {
      strike(state, ally, enemy, rank.damage, rank.cooldown);
      useAbility(ally, enemy, state);
    } else if (!enemy && ally.element === 2 && ally.cooldown === 0) {
      ally.cooldown = rank.cooldown;
      useAbility(ally, null, state);
    }
    const chase = nearest(order === 'attack' ? ally : anchor, state.enemies, leash);
    const speed = spec.speed * (ally.temperature === 18 && ally.element === 1 ? 0.64 : 1);
    if (chase) {
      moveToward(ally, chase, speed, dt, spec.attackRange * 0.76, map);
    } else {
      const angle = ally.id * 2.39996;
      const radius = (order === 'defend' ? 2.4 : 1.15) + (ally.id % 4) * 0.37;
      const destination = clampToArena(anchor.x + Math.cos(angle) * radius, anchor.z + Math.sin(angle) * radius, map);
      moveToward(ally, destination, speed, dt, 0.12, map);
    }
  }
}

export function updateEnemies(state, dt) {
  const map = missionSpec(state);
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    tickActor(enemy, dt);
    const spec = enemyTypes[enemy.type];
    const alertRange = spec.behavior === 'hunter' ? 8.0 : spec.behavior === 'ranged' ? spec.range + 0.5 : 1.9;
    const huntAlly = nearest(enemy, state.allies, alertRange);
    const huntPlayer = state.player.hp > 0 && !state.invulnerable && distanceSquared(enemy, state.player) < alertRange ** 2;
    const territory = map.capture && state.captureHold < map.capture.time && enemy.id % 3 !== 0 ? state.territory : null;
    const target = huntPlayer ? state.player : huntAlly ?? territory ?? state.core;
    if (distanceSquared(enemy, target) <= (spec.range + 0.015) ** 2) {
      const protectedActor = state.allies.some(unit => unit.element === 4 && unit.hp > 0 && distanceSquared(unit, target) < 4 ** 2);
      if (target !== territory) strike(state, enemy, target, protectedActor ? Math.ceil(spec.damage * .7) : spec.damage, spec.cooldown);
    } else {
      moveToward(enemy, target, spec.speed, dt, spec.range * 0.94, map);
    }
  }
}
