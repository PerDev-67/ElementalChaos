import { availableLevel, upgrades } from './campaign.js';
import { missionSpec, commands, enemyTypes } from './config.js';
import { readSave } from './save.js';
import { createMission } from './mission.js';
import { elements, unitHp } from './elements.js';

const key = 'elemental-chaos.campaign';
export const qualities = ['low', 'medium', 'high', 'ultra'];
export const defaults = {
  quality: 'high', limit: false, music: 0.25, effects: 0.55, movement: 'stick',
  display: 'simple', locale: 'en'
};

function finite(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function newProfile(settings = {}) {
  return { version: 2, started: false, completed: [], coins: 0, traits: [], tutorial: false, settings: { ...defaults, ...settings }, mission: null };
}

function validCheckpoint(state, profile) {
  if (!state || !availableLevel(profile, state.levelId) || state.result !== null) return false;
  const map = missionSpec(state);
  const position = p => p && finite(p.x, -map.width / 2, map.width / 2) && finite(p.z, -map.depth / 2, map.depth / 2);
  const actor = (a, kind) => position(a) && a.kind === kind && Number.isSafeInteger(a.id) &&
    finite(a.hp, 0, a.maxHp) && finite(a.maxHp, 1, 10000) && finite(a.cooldown, 0, 12) &&
    finite(a.flash, 0, 1) && finite(a.heading, -Math.PI, Math.PI);
  if (!actor(state.player, 'player') || !actor(state.core, 'core') ||
      state.player.id !== 0 || state.core.id !== 1 || state.player.hp <= 0 || state.core.hp <= 0 ||
      state.player.maxHp !== map.playerHp || state.core.maxHp !== map.coreHp ||
      !Number.isSafeInteger(state.nextId) || state.nextId < 2 ||
      !Number.isSafeInteger(state.spawnIndex) || state.spawnIndex < 0 ||
      !Number.isSafeInteger(state.defeated) || state.defeated < 0 ||
      !finite(state.elapsed, 0, map.duration) || !finite(state.nextSpawn, 0, map.duration + 6) ||
      !finite(state.energy, 0, map.maxEnergy) || !Number.isInteger(state.rank) || !finite(state.rank, 0, 2) ||
      !Number.isInteger(state.roster) || !finite(state.roster, 1, Math.max(1, profile.completed.length)) ||
      !Number.isInteger(state.element) || !finite(state.element, 1, state.roster) ||
      !Array.isArray(state.traits) || !state.traits.every(id => profile.traits.includes(id)) ||
      !commands.includes(state.order) || !position(state.moveTarget) ||
      !Array.isArray(state.allies) || state.allies.length > map.unitCap ||
      !Array.isArray(state.enemies) || state.enemies.length > map.enemyCap ||
      !Array.isArray(state.selected) || !Array.isArray(state.drops) || state.drops.length > 14 ||
      !state.drops.every(position) || !finite(state.captureHold, 0, map.capture?.time ?? 0) ||
      (map.capture ? !position(state.territory) : state.territory !== null) ||
      !finite(state.chill, 0, 18) || !finite(state.invulnerable, 0, 4) ||
      !finite(state.basicCooldown, 0, 1) || typeof state.bossSpawned !== 'boolean' ||
      ![0, 1].includes(state.revives)) return false;
  for (const ally of state.allies) {
    if (!actor(ally, 'ally') || !Number.isInteger(ally.element) || !finite(ally.element, 1, state.roster) ||
        ally.maxHp !== unitHp(elements[ally.element - 1], state.rank, state.traits) ||
        (ally.order && !commands.includes(ally.order)) ||
        (ally.order === 'move' && !position(ally.destination))) return false;
  }
  for (const enemy of state.enemies) {
    if (!actor(enemy, 'enemy') || !Object.hasOwn(enemyTypes, enemy.type) ||
        enemy.maxHp !== enemyTypes[enemy.type].hp) return false;
  }
  const ids = [0, 1, ...state.allies.map(a => a.id), ...state.enemies.map(e => e.id)];
  return new Set(ids).size === ids.length && ids.every(id => id >= 0 && id < state.nextId) &&
    state.selected.every(id => state.allies.some(unit => unit.id === id));
}

export function readProfile(storage) {
  try {
    const raw = JSON.parse(storage.getItem(key));
    if (raw?.version === 2) {
      const profile = newProfile();
      profile.started = raw.started === true;
      profile.tutorial = raw.tutorial === true;
      while (profile.completed.length < 4 && raw.completed?.[profile.completed.length] === profile.completed.length + 1) {
        profile.completed.push(profile.completed.length + 1);
      }
      profile.coins = Number.isSafeInteger(raw.coins) && raw.coins >= 0 ? raw.coins : 0;
      profile.traits = upgrades.map(x => x.id).filter(id => Array.isArray(raw.traits) && raw.traits.includes(id));
      const s = raw.settings ?? {};
      if (qualities.includes(s.quality)) profile.settings.quality = s.quality;
      profile.settings.limit = s.limit === true;
      if (finite(s.music, 0, 1)) profile.settings.music = s.music;
      if (finite(s.effects, 0, 1)) profile.settings.effects = s.effects;
      if (s.movement === 'pad') profile.settings.movement = 'pad';
      if (s.display === 'adventurers') profile.settings.display = 'adventurers';
      if (['en', 'zh-Hant', 'ja'].includes(s.locale)) profile.settings.locale = s.locale;
      if (validCheckpoint(raw.mission, profile)) profile.mission = { ...raw.mission, effects: [] };
      return profile;
    }
    const old = readSave(storage);
    const profile = newProfile(old.quality === 'battery' ? { quality: 'low', limit: true } : {});
    if (old.unlocked) {
      profile.completed = [1];
      profile.coins = 65;
    }
    profile.started = Boolean(old.unlocked || old.mission);
    if (old.mission) {
      const state = createMission(1, profile);
      const map = missionSpec(state);
      const { elapsed, nextSpawn, core, allies, ...saved } = old.mission;
      Object.assign(state, saved, {
        elapsed: elapsed * map.duration / 100,
        nextSpawn: nextSpawn * map.duration / 100,
        core: { ...core, hp: core.hp / core.maxHp * map.coreHp, maxHp: map.coreHp },
        allies: allies.map(a => ({ ...a, element: a.element ?? 1, temperature: 293, phase: 'gas' })), effects: []
      });
      profile.mission = state;
    }
    return profile;
  } catch {
    return newProfile();
  }
}

export function writeProfile(storage, profile, mission = profile.mission) {
  profile.mission = mission ? JSON.parse(JSON.stringify({ ...mission, effects: [] })) : null;
  try {
    storage.setItem(key, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
