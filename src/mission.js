import { commands, hydrogen, level, missionSpec } from './config.js';
import { actor, nearest, spawnEnemy, summonUnit, updateAllies, updateEnemies } from './units.js';
import { clampToArena, distanceSquared, updatePlayer } from './player.js';
import { tickActor, strike } from './combat.js';
import { elements, unitSpec, unitHp } from './elements.js';

export function createMission(levelId, profile = {}) {
  const map = missionSpec({ levelId });
  const state = {
    elapsed: 0, nextSpawn: 2.4, spawnIndex: 0, energy: map.initialEnergy,
    rank: 0, defeated: 0, order: 'defend', moveTarget: { x: 0, z: 0 },
    player: actor('player', 0, 0, 4.8, map.playerHp),
    core: actor('core', 1, 0, 0, map.coreHp),
    nextId: 2, allies: [], enemies: [], effects: [], result: null
  };
  if (levelId !== undefined) {
    Object.assign(state, {
      levelId, traits: [...(profile.traits ?? [])], roster: Math.max(1, profile.completed?.length ?? 0),
      element: 1, selected: [], drops: [], captureHold: 0,
      territory: map.capture ? { ...map.capture } : null, chill: 0, bossSpawned: false,
      revives: 1, invulnerable: 0, basicCooldown: 0
    });
    if (state.traits.includes('reserve')) state.energy += 24;
  }
  return state;
}

export function selectUnit(state, point) {
  const unit = nearest(point, state.allies, 1.35);
  if (!unit) {
    state.selected.length = 0;
    return false;
  }
  const index = state.selected.indexOf(unit.id);
  if (index < 0) state.selected.push(unit.id);
  else state.selected.splice(index, 1);
  return true;
}

function applyOrder(state, action, point) {
  let destination;
  if (action === 'move') {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return { key: 'chooseMove', ok: false };
    destination = clampToArena(point.x, point.z, missionSpec(state));
    state.moveTarget = destination;
  }
  if (!state.selected?.length) {
    state.order = action;
    for (const unit of state.allies) {
      delete unit.order;
      delete unit.destination;
    }
  } else {
    for (const unit of state.allies) {
      if (!state.selected.includes(unit.id)) continue;
      unit.order = action;
      if (destination) unit.destination = destination;
    }
  }
  return { key: action, ok: true };
}

export function act(state, action, point) {
  if (state.result) return { key: 'inactive', ok: false };
  if (commands.includes(action)) return applyOrder(state, action, point);
  const map = missionSpec(state);
  const element = elements[(state.element ?? 1) - 1];
  if (action === 'strike') {
    if (state.basicCooldown > 0) return { key: 'pulseCharging', ok: false };
    const enemy = nearest(state.player, state.enemies, 4.15);
    if (!enemy) return { key: 'noTarget', ok: false };
    strike(state, { ...state.player, kind: 'ally', cooldown: 0 }, enemy, 22 + state.rank * 3, 0);
    state.basicCooldown = 0.43;
    return { key: 'strike', ok: true };
  }
  if (action === 'chill' && map.capture && distanceSquared(state.player, map.capture) < 7 ** 2) {
    state.chill = 18;
    return { key: 'chill', ok: true };
  }

  let cost;
  if (action === 'summon') {
    if (state.allies.length >= (map.unitCap ?? hydrogen.cap)) return { key: 'squadFull', ok: false };
    cost = element.cost;
  } else if (action === 'pulse') {
    if (state.player.cooldown > 0) return { key: 'pulseCharging', ok: false };
    cost = map.pulse.cost;
  } else if (action === 'upgrade') {
    const nextRank = hydrogen.ranks[state.rank + 1];
    if (!nextRank) return { key: 'maxRank', ok: false };
    cost = nextRank.cost;
  } else {
    return { key: 'inactive', ok: false };
  }
  if (state.energy < cost) return { key: 'needEnergy', ok: false, cost };
  state.energy -= cost;

  if (action === 'summon') summonUnit(state, element);
  if (action === 'upgrade') {
    state.rank += 1;
    for (const ally of state.allies) {
      const maxHp = unitHp(unitSpec(ally), state.rank, state.traits);
      ally.hp += maxHp - ally.maxHp;
      ally.maxHp = maxHp;
    }
    return { key: action, ok: true, rank: state.rank + 1 };
  }
  if (action === 'pulse') {
    let hits = 0;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distanceSquared(state.player, enemy) > map.pulse.range ** 2) continue;
      enemy.hp = Math.max(0, enemy.hp - map.pulse.damage);
      enemy.flash = 0.23;
      hits += 1;
    }
    state.player.cooldown = map.pulse.cooldown;
    state.effects.push({ kind: 'pulse', x: state.player.x, z: state.player.z, life: 0.44 });
    return { key: action, ok: true, hits };
  }
  return { key: action, ok: true };
}

function removeDefeated(state, map) {
  let surviving = 0;
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      state.enemies[surviving++] = enemy;
    } else {
      state.defeated += 1;
      state.energy = Math.min(map.maxEnergy, state.energy + map.killEnergy);
      if (state.drops && state.defeated % 4 === 0 && state.drops.length < 14) {
        state.drops.push({ x: enemy.x, z: enemy.z });
      }
    }
  }
  state.enemies.length = surviving;
  surviving = 0;
  for (const ally of state.allies) {
    if (ally.hp > 0) {
      state.allies[surviving++] = ally;
    } else {
      const selection = state.selected?.indexOf(ally.id) ?? -1;
      if (selection !== -1) state.selected.splice(selection, 1);
    }
  }
  state.allies.length = surviving;
}

export function phaseAt(seconds, map = level) {
  return map.phases.findLastIndex(phase => seconds >= phase.start);
}

function updateObjectives(state, map, dt) {
  if (map.capture && state.captureHold < map.capture.time) {
    const inside = actor => actor.hp > 0 && distanceSquared(actor, map.capture) < map.capture.radius ** 2;
    if ((inside(state.player) || state.allies.some(inside)) && !state.enemies.some(inside)) {
      state.captureHold = Math.min(map.capture.time, state.captureHold + dt);
    }
  }
  if (state.drops) {
    let uncollected = 0;
    for (const drop of state.drops) {
      if (distanceSquared(drop, state.player) < 1.5 ** 2) {
        state.energy = Math.min(map.maxEnergy, state.energy + 9);
      } else {
        state.drops[uncollected++] = drop;
      }
    }
    state.drops.length = uncollected;
  }
}

export function stepMission(state, input, dt, training = false) {
  if (state.result) return;
  const map = missionSpec(state);
  updatePlayer(state.player, input, dt, map, state.traits);
  tickActor(state.player, dt);
  tickActor(state.core, dt);
  if (state.levelId) {
    state.chill = Math.max(0, state.chill - dt);
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.basicCooldown = Math.max(0, state.basicCooldown - dt);
  }
  state.energy = Math.min(map.maxEnergy, state.energy + map.energyPerSecond * dt);
  if (!training) {
    state.elapsed = Math.min(map.duration, state.elapsed + dt);
    if (map.bossAt && !state.bossSpawned && state.elapsed >= map.bossAt) {
      state.bossSpawned = spawnEnemy(state, 'guardian', 0);
    }
    if (state.elapsed >= state.nextSpawn && (!state.levelId || state.elapsed < map.duration - 1e-8)) {
      const phase = map.phases[phaseAt(state.elapsed, map)];
      spawnEnemy(state, phase.pattern[state.spawnIndex % phase.pattern.length]);
      state.spawnIndex += 1;
      state.nextSpawn += phase.interval;
    }
  }
  updateAllies(state, dt);
  updateEnemies(state, dt);
  removeDefeated(state, map);
  updateObjectives(state, map, dt);
  let visible = 0;
  for (const effect of state.effects) {
    effect.life -= dt;
    if (effect.life > 0) state.effects[visible++] = effect;
  }
  state.effects.length = visible;
  if (state.player.hp <= 0 && state.revives > 0 && state.core.hp > 0) {
    state.revives--;
    Object.assign(state.player, { x: 0, z: 4.8, hp: state.player.maxHp });
    state.invulnerable = 4;
  }
  if (state.core.hp <= 0) state.result = 'coreLost';
  else if (state.player.hp <= 0) state.result = 'playerLost';
  else if (state.elapsed >= map.duration - 1e-8 &&
      (!state.levelId || (state.enemies.length === 0 && (!map.bossAt || state.bossSpawned))) &&
      (!map.capture || state.captureHold >= map.capture.time)) {
    state.elapsed = map.duration;
    state.result = 'victory';
  }
}
