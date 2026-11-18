import { commands, enemyTypes, hydrogen, level } from './config.js';

const KEY = 'elemental-chaos.level-1';
const VERSION = 1;

function between(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function position(value) {
  return value && between(value.x, -level.width / 2, level.width / 2) &&
    between(value.z, -level.depth / 2, level.depth / 2);
}

function validActor(value, kind, maxHp, lastId) {
  return position(value) && value.kind === kind && Number.isInteger(value.id) &&
    between(value.id, 0, lastId) && value.maxHp === maxHp && between(value.hp, 0, maxHp) &&
    between(value.cooldown, 0, 10) && between(value.flash, 0, 1) &&
    between(value.heading, -Math.PI, Math.PI);
}

function validMission(value) {
  if (!value || value.result !== null || !between(value.elapsed, 0, level.duration - 1e-8) ||
    !between(value.nextSpawn, value.elapsed - 1, level.duration + 4) ||
    !Number.isSafeInteger(value.spawnIndex) || !between(value.spawnIndex, 0, 200) ||
    !Number.isSafeInteger(value.nextId) || !between(value.nextId, 2, 1000) ||
    !between(value.energy, 0, level.maxEnergy) || !Number.isInteger(value.rank) ||
    !between(value.rank, 0, hydrogen.ranks.length - 1) ||
    !Number.isInteger(value.defeated) || !between(value.defeated, 0, value.spawnIndex) ||
    !commands.includes(value.order) || !position(value.moveTarget)) return false;
  const lastId = value.nextId - 1;
  if (!validActor(value.player, 'player', level.playerHp, lastId) || value.player.hp === 0 ||
    !validActor(value.core, 'core', level.coreHp, lastId) || value.core.hp === 0 ||
    value.player.id !== 0 || value.core.id !== 1 ||
    !Array.isArray(value.allies) || value.allies.length > hydrogen.cap ||
    !Array.isArray(value.enemies) || value.enemies.length > level.enemyCap) return false;

  const unitsValid = value.allies.every(unit => validActor(unit, 'ally', hydrogen.ranks[value.rank].hp, lastId)) &&
    value.enemies.every(unit => unit && Object.hasOwn(enemyTypes, unit.type) &&
      validActor(unit, 'enemy', enemyTypes[unit.type].hp, lastId));
  if (!unitsValid) return false;
  const ids = [0, 1, ...value.allies.map(unit => unit.id), ...value.enemies.map(unit => unit.id)];
  return new Set(ids).size === ids.length;
}

export function readSave(storage) {
  const defaults = { version: VERSION, unlocked: false, quality: 'standard', mission: null };
  try {
    const value = JSON.parse(storage.getItem(KEY));
    if (value?.version !== VERSION) return defaults;
    return {
      version: VERSION,
      unlocked: value.unlocked === true,
      quality: value.quality === 'battery' ? 'battery' : 'standard',
      mission: validMission(value.mission) ? { ...value.mission, effects: [] } : null
    };
  } catch {
    return defaults;
  }
}

export function writeSave(storage, save, mission) {
  const snapshot = mission ? {
    ...mission,
    player: { ...mission.player },
    core: { ...mission.core },
    moveTarget: { ...mission.moveTarget },
    allies: mission.allies.map(unit => ({ ...unit })),
    enemies: mission.enemies.map(unit => ({ ...unit })),
    effects: []
  } : null;
  save.mission = snapshot;
  try {
    storage.setItem(KEY, JSON.stringify({ ...save, version: VERSION }));
    return true;
  } catch {
    return false;
  }
}
