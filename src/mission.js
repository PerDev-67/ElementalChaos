import { commands, hydrogen, level } from './config.js';
import { actor, spawnEnemy, summonUnit, updateAllies, updateEnemies } from './units.js';
import { clampToArena, distanceSquared, updatePlayer } from './player.js';
import { tickActor } from './combat.js';

export function createMission() {
  return {
    elapsed: 0, nextSpawn: 2.4, spawnIndex: 0, energy: level.initialEnergy,
    rank: 0, defeated: 0, order: 'defend', moveTarget: { x: 0, z: 0 },
    player: actor('player', 0, 0, 4.8, level.playerHp),
    core: actor('core', 1, 0, 0, level.coreHp),
    nextId: 2, allies: [], enemies: [], effects: [], result: null
  };
}

export function act(state, action, point) {
  if (state.result) return { key: 'inactive', ok: false };
  if (commands.includes(action)) {
    if (action === 'move') {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return { key: 'chooseMove', ok: false };
      state.moveTarget = clampToArena(point.x, point.z);
    }
    state.order = action;
    return { key: action, ok: true };
  }

  let cost;
  if (action === 'summon') {
    if (state.allies.length >= hydrogen.cap) return { key: 'squadFull', ok: false };
    cost = hydrogen.cost;
  } else if (action === 'pulse') {
    if (state.player.cooldown > 0) return { key: 'pulseCharging', ok: false };
    cost = level.pulse.cost;
  } else if (action === 'upgrade') {
    const nextRank = hydrogen.ranks[state.rank + 1];
    if (!nextRank) return { key: 'maxRank', ok: false };
    cost = nextRank.cost;
  } else {
    return { key: 'inactive', ok: false };
  }
  if (state.energy < cost) return { key: 'needEnergy', ok: false, cost };
  state.energy -= cost;

  if (action === 'summon') summonUnit(state);
  if (action === 'upgrade') {
    state.rank += 1;
    const maxHp = hydrogen.ranks[state.rank].hp;
    for (const ally of state.allies) {
      ally.hp += maxHp - ally.maxHp;
      ally.maxHp = maxHp;
    }
    return { key: action, ok: true, rank: state.rank + 1 };
  }
  if (action === 'pulse') {
    let hits = 0;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || distanceSquared(state.player, enemy) > level.pulse.range ** 2) continue;
      enemy.hp = Math.max(0, enemy.hp - level.pulse.damage);
      enemy.flash = 0.23;
      hits += 1;
    }
    state.player.cooldown = level.pulse.cooldown;
    state.effects.push({ kind: 'pulse', x: state.player.x, z: state.player.z, life: 0.44 });
    return { key: action, ok: true, hits };
  }
  return { key: action, ok: true };
}

function removeDefeated(state) {
  let surviving = 0;
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      state.enemies[surviving++] = enemy;
    } else {
      state.defeated += 1;
      state.energy = Math.min(level.maxEnergy, state.energy + level.killEnergy);
    }
  }
  state.enemies.length = surviving;
  surviving = 0;
  for (const ally of state.allies) {
    if (ally.hp > 0) state.allies[surviving++] = ally;
  }
  state.allies.length = surviving;
}

export function phaseAt(seconds) {
  return level.phases.findLastIndex(phase => seconds >= phase.start);
}

export function stepMission(state, input, dt, training = false) {
  if (state.result) return;
  updatePlayer(state.player, input, dt);
  tickActor(state.player, dt);
  tickActor(state.core, dt);
  state.energy = Math.min(level.maxEnergy, state.energy + level.energyPerSecond * dt);
  if (!training) {
    state.elapsed = Math.min(level.duration, state.elapsed + dt);
    if (state.elapsed >= state.nextSpawn) {
      const phase = level.phases[phaseAt(state.elapsed)];
      spawnEnemy(state, phase.pattern[state.spawnIndex % phase.pattern.length]);
      state.spawnIndex += 1;
      state.nextSpawn += phase.interval;
    }
  }
  updateAllies(state, dt);
  updateEnemies(state, dt);
  removeDefeated(state);
  let visible = 0;
  for (const effect of state.effects) {
    effect.life -= dt;
    if (effect.life > 0) state.effects[visible++] = effect;
  }
  state.effects.length = visible;
  if (state.core.hp <= 0) state.result = 'coreLost';
  else if (state.player.hp <= 0) state.result = 'playerLost';
  else if (state.elapsed >= level.duration - 1e-8) {
    state.elapsed = level.duration;
    state.result = 'victory';
  }
}
