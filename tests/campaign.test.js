import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaign, missionSpec } from '../src/config.js';
import { availableLevel, buyUpgrade, completeLevel } from '../src/campaign.js';
import { createMission, selectUnit, act, stepMission } from '../src/mission.js';
import { elements, phaseOf } from '../src/elements.js';
import { readProfile, newProfile, writeProfile } from '../src/profile.js';
import { writeSave, readSave } from '../src/save.js';
import { moveToward, distanceSquared } from '../src/player.js';

const dt = 1 / 30;
const idle = { x: 0, z: 0 };

function driveBattle(id, profile) {
  const map = campaign[id - 1];
  const state = createMission(id, profile);
  let sawBoss = false;
  for (let i = 0; !state.result && i < (map.duration + 75) * 30; i++) {
    if (i % 30 === 0) {
      if (state.allies.length < 6 || state.rank === 2) {
        state.element = state.allies.length < 3 ? 1 : 1 + i / 30 % state.roster;
        act(state, 'summon');
      } else act(state, 'upgrade');
      const orderCapture = map.capture && state.captureHold < map.capture.time && state.allies.length >= 5;
      act(state, orderCapture ? 'move' : 'defend', orderCapture ? map.capture : undefined);
      if (state.enemies.some(enemy => distanceSquared(enemy, state.player) < 16)) act(state, 'pulse');
    }
    stepMission(state, { x: 0, z: i < 18 ? -1 : 0 }, dt);
    if (state.enemies.some(enemy => enemy.type === 'guardian')) sawBoss = true;
    assert.ok(state.energy >= 0 && state.energy <= map.maxEnergy);
  }
  return { state, sawBoss };
}

function storage() {
  const records = new Map();
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
}

test('a fresh campaign clears exactly four missions in order and awards each unlock once', () => {
  const store = storage();
  let profile = newProfile();
  assert.equal(availableLevel(profile, 2), false);
  assert.equal(completeLevel(profile, 2), 0);
  for (const map of campaign) {
    assert.equal(availableLevel(profile, map.id), true);
    const { state, sawBoss } = driveBattle(map.id, profile);
    assert.equal(state.result, 'victory', map.title);
    assert.equal(state.enemies.length, 0);
    assert.equal(state.rank, 2);
    if (map.capture) assert.equal(state.captureHold, map.capture.time);
    if (map.bossAt) assert.equal(sawBoss, true);
    assert.equal(completeLevel(profile, map.id), map.reward);
    assert.equal(completeLevel(profile, map.id), 0);
    if (map.id === 1) assert.equal(buyUpgrade(profile, 'reserve'), true);
    writeProfile(store, profile, null);
    profile = readProfile(store);
  }
  assert.equal(availableLevel(profile, 5), false);
  assert.deepEqual(profile.completed, [1, 2, 3, 4]);
  assert.equal(profile.coins, 407);
  const replay = createMission(1, profile);
  assert.equal(replay.roster, 4);
  replay.element = 4;
  assert.equal(act(replay, 'summon').ok, true);
  assert.equal(replay.allies[0].element, 4);
});

test('capture requires uncontested presence and is required for victory', () => {
  const profile = { completed: [1, 2] };
  const state = createMission(3, profile);
  const map = missionSpec(state);
  state.elapsed = map.duration;
  state.nextSpawn = map.duration + 1;
  for (let i = 0; i < 30; i++) stepMission(state, idle, dt);
  assert.equal(state.result, null);
  Object.assign(state.player, { x: map.capture.x, z: map.capture.z });
  for (let i = 0; i < 30 * (map.capture.time + 1); i++) stepMission(state, idle, dt);
  assert.equal(state.result, 'victory');
});

test('selection applies commands to the chosen units only and upgrades mixed squads', () => {
  const profile = { completed: [1, 2, 3], traits: ['vigor'] };
  const state = createMission(4, profile);
  assert.equal(act(state, 'summon').ok, true);
  state.element = 2;
  assert.equal(act(state, 'summon').ok, true);
  assert.ok(selectUnit(state, state.allies[0]));
  assert.equal(act(state, 'move', { x: 6, z: 8 }).ok, true);
  assert.equal(state.allies[0].order, 'move');
  assert.equal(state.allies[1].order, undefined);
  assert.equal(state.order, 'defend');
  state.energy = missionSpec(state).maxEnergy;
  act(state, 'upgrade');
  assert.equal(state.allies[0].maxHp, 95);
  assert.equal(state.allies[1].maxHp, 72);
});

test('field recovery, cooling and energy pickup operate in a campaign mission', () => {
  const state = createMission(3, { completed: [1, 2] });
  const map = missionSpec(state);
  state.player.hp = 0;
  stepMission(state, idle, dt);
  assert.equal(state.revives, 0);
  assert.equal(state.invulnerable, 4);
  Object.assign(state.player, { x: map.capture.x, z: map.capture.z });
  const before = state.energy;
  state.drops.push({ x: state.player.x, z: state.player.z });
  state.energy = 100;
  assert.equal(act(state, 'summon').ok, true);
  assert.equal(act(state, 'chill').ok, true);
  const postSummon = state.energy;
  stepMission(state, idle, dt);
  assert.equal(state.drops.length, 0);
  assert.ok(state.energy >= postSummon + 9 && before < state.energy);
  assert.equal(state.allies[0].temperature, 18);
  assert.equal(state.allies[0].phase, 'liquid');
  assert.equal(phaseOf(elements[1], 18), 'gas');
  state.player.hp = 0;
  stepMission(state, idle, dt);
  assert.equal(state.result, 'playerLost');
});

test('bots steer around a blocking boulder', () => {
  const map = missionSpec(createMission(3));
  const obstacle = map.obstacles[0];
  const actor = { id: 5, x: obstacle.x - 4, z: obstacle.z };
  const goal = { x: obstacle.x + 4, z: obstacle.z };
  for (let i = 0; i < 120; i++) moveToward(actor, goal, 5, dt, .15, map);
  assert.ok(distanceSquared(actor, goal) < .2);
});

test('v1 saves migrate and v2 resumes the same campaign battle with valid settings', () => {
  const store = storage();
  const old = readSave(store);
  old.unlocked = true;
  old.quality = 'battery';
  const legacy = createMission();
  act(legacy, 'summon');
  assert.equal(writeSave(store, old, legacy), true);
  let profile = readProfile(store);
  assert.deepEqual(profile.completed, [1]);
  assert.equal(profile.settings.quality, 'low');
  assert.ok(profile.settings.limit);
  assert.equal(profile.mission.allies.length, 1);
  profile.settings.locale = 'ja';
  profile.settings.display = 'adventurers';
  assert.equal(writeProfile(store, profile), true);
  profile = readProfile(store);
  assert.equal(profile.settings.locale, 'ja');
  assert.equal(profile.settings.display, 'adventurers');
  assert.equal(profile.mission.allies[0].phase, 'gas');
  assert.equal(profile.mission.levelId, 1);
});

test('purchases are one-time, respect balance, and apply to future missions', () => {
  const profile = newProfile();
  assert.equal(buyUpgrade(profile, 'reserve'), false);
  completeLevel(profile, 1);
  assert.equal(buyUpgrade(profile, 'reserve'), true);
  assert.equal(buyUpgrade(profile, 'reserve'), false);
  assert.equal(profile.coins, 17);
  assert.equal(createMission(2, profile).energy, campaign[1].initialEnergy + 24);
});
