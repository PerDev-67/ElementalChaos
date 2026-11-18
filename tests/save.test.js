import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMission, stepMission, act } from '../src/mission.js';
import { readSave, writeSave } from '../src/save.js';

function memoryStorage() {
  let snapshot;
  return {
    getItem: () => snapshot,
    setItem: (_, value) => { snapshot = value; }
  };
}

test('checkpoint round-trips live mission state, quality, and the unlock', () => {
  const storage = memoryStorage();
  const save = readSave(storage);
  const state = createMission();
  act(state, 'summon');
  act(state, 'move', { x: 2, z: 3 });
  for (let i = 0; i < 180; i += 1) stepMission(state, { x: 0, z: 0 }, 1 / 30);
  act(state, 'pulse');
  save.quality = 'battery';
  save.unlocked = true;
  assert.equal(writeSave(storage, save, state), true);
  const restored = readSave(storage);
  assert.equal(restored.quality, 'battery');
  assert.equal(restored.unlocked, true);
  assert.deepEqual(restored.mission, { ...state, effects: [] });
  assert.notEqual(restored.mission.allies[0], state.allies[0]);
  stepMission(restored.mission, { x: 1, z: 0 }, 1 / 30);
  assert.ok(restored.mission.player.x > state.player.x);
  writeSave(storage, restored, null);
  assert.equal(readSave(storage).mission, null);
  assert.equal(readSave(storage).unlocked, true);
});

test('bad checkpoints cannot load and valid settings survive malformed mission data', () => {
  const storage = memoryStorage();
  storage.setItem('', 'broken JSON');
  assert.equal(readSave(storage).mission, null);
  storage.setItem('', JSON.stringify({ version: 99, unlocked: true }));
  assert.equal(readSave(storage).unlocked, false);
  const state = createMission();
  act(state, 'summon');
  state.allies[0].id = state.player.id;
  storage.setItem('', JSON.stringify({ version: 1, unlocked: true, quality: 'battery', mission: state }));
  const save = readSave(storage);
  assert.equal(save.mission, null);
  assert.equal(save.quality, 'battery');
  assert.equal(save.unlocked, true);
});

test('unavailable local storage falls back to a session checkpoint', () => {
  const storage = {
    getItem() { throw new Error('Blocked'); },
    setItem() { throw new Error('Blocked'); }
  };
  const save = readSave(storage);
  assert.equal(save.unlocked, false);
  assert.equal(writeSave(storage, save, createMission()), false);
  assert.equal(save.mission.elapsed, 0);
});
