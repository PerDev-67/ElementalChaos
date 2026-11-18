import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hydrogen, level } from '../src/config.js';
import { act, createMission, phaseAt, stepMission } from '../src/mission.js';
import { actor, spawnEnemy } from '../src/units.js';

const idle = { x: 0, z: 0 };
const step = 1 / 30;

function advance(state, seconds, input = idle, training = false) {
  for (let i = 0; i < seconds * 30 && !state.result; i += 1) {
    stepMission(state, input, step, training);
  }
}

test('training allows normalized movement without spawning or counting down', () => {
  const state = createMission();
  advance(state, 1, { x: 1, z: -1 }, true);
  assert.ok(Math.abs(Math.hypot(state.player.x, state.player.z - 4.8) - level.playerSpeed) < 1e-8);
  advance(state, 20, { x: 1, z: -1 }, true);
  assert.equal(state.elapsed, 0);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.player.x, level.width / 2 - 0.6);
  assert.equal(state.player.z, -level.depth / 2 + 0.6);
  assert.ok(state.energy <= level.maxEnergy);
});

test('summoning requires energy, respects the squad cap, and removes defeated units', () => {
  const state = createMission();
  for (let i = 0; i < hydrogen.cap; i += 1) {
    state.energy = hydrogen.cost;
    assert.equal(act(state, 'summon').ok, true);
    assert.equal(state.energy, 0);
  }
  assert.equal(act(state, 'summon').key, 'squadFull');
  state.allies[0].hp = 0;
  advance(state, step);
  assert.equal(state.allies.length, hydrogen.cap - 1);
  assert.equal(act(state, 'summon').key, 'needEnergy');
});

test('rank upgrades preserve damage and apply to new summons', () => {
  const state = createMission();
  act(state, 'summon');
  const unit = state.allies[0];
  unit.hp -= 10;
  assert.equal(act(state, 'upgrade').rank, 2);
  assert.equal(unit.hp, hydrogen.ranks[1].hp - 10);
  state.energy = level.maxEnergy;
  assert.equal(act(state, 'upgrade').rank, 3);
  assert.equal(act(state, 'upgrade').key, 'maxRank');
  act(state, 'summon');
  assert.equal(state.allies[1].hp, hydrogen.ranks[2].hp);
});

test('follow, defend, attack and move drive squad movement', () => {
  const state = createMission();
  act(state, 'summon');
  advance(state, 1, idle, true);
  const ally = state.allies[0];
  assert.ok(Math.hypot(ally.x, ally.z) < 5);
  state.player.x = 11;
  act(state, 'follow');
  advance(state, 3, idle, true);
  assert.ok(Math.hypot(ally.x - 11, ally.z - state.player.z) < 4);
  assert.equal(act(state, 'move', { x: NaN, z: 0 }).ok, false);
  assert.equal(act(state, 'move', { x: 90, z: -10 }).ok, true);
  assert.ok(state.moveTarget.x < level.width / 2);
  advance(state, 3, idle, true);
  assert.ok(Math.hypot(ally.x - state.moveTarget.x, ally.z - state.moveTarget.z) < 4);
  spawnEnemy(state, 'raider');
  act(state, 'attack');
  advance(state, 10, idle, true);
  assert.equal(state.defeated, 1);
});

test('pulse enforces its cooldown, hits in range and awards defeat energy', () => {
  const state = createMission();
  const near = actor('enemy', state.nextId++, state.player.x, state.player.z + 1, 45);
  const far = actor('enemy', state.nextId++, state.player.x, state.player.z - 7, 45);
  near.type = far.type = 'raider';
  state.enemies.push(near, far);
  assert.equal(act(state, 'pulse').hits, 1);
  assert.equal(act(state, 'pulse').key, 'pulseCharging');
  assert.equal(far.hp, 45);
  advance(state, step, idle, true);
  assert.equal(state.defeated, 1);
  assert.ok(state.energy >= level.initialEnergy - level.pulse.cost + level.killEnergy);
});

test('hunters seek the commander and siege enemies can attack the squad or core', () => {
  const state = createMission();
  const hunter = actor('enemy', state.nextId++, 0, 7, 32);
  const sieger = actor('enemy', state.nextId++, 1, 0, 45);
  hunter.type = 'skirmisher';
  sieger.type = 'raider';
  state.enemies.push(hunter, sieger);
  advance(state, step, idle, true);
  assert.ok(state.player.hp < level.playerHp);
  assert.ok(state.core.hp < level.coreHp);
  act(state, 'summon');
  const ally = state.allies[0];
  ally.x = sieger.x + 0.75;
  ally.z = sieger.z;
  sieger.cooldown = 0;
  advance(state, step, idle, true);
  assert.ok(ally.hp < ally.maxHp);
});

test('both loss conditions terminate the mission and take priority at timeout', () => {
  for (const [target, outcome] of [['core', 'coreLost'], ['player', 'playerLost']]) {
    const state = createMission();
    state.elapsed = level.duration - step / 2;
    state[target].hp = 0;
    advance(state, step);
    assert.equal(state.result, outcome);
    assert.equal(act(state, 'summon').ok, false);
  }
});

test('an undefended run loses, while an active defense reaches all three waves and wins', () => {
  const unattended = createMission();
  advance(unattended, level.duration);
  assert.equal(unattended.result, 'playerLost');

  const defended = createMission();
  const phases = new Set();
  for (let i = 0; i < level.duration * 30 && !defended.result; i += 1) {
    if (i % 30 === 0) {
      if (defended.allies.length < 5 || defended.rank === 2) act(defended, 'summon');
      else act(defended, 'upgrade');
    }
    stepMission(defended, idle, step);
    phases.add(phaseAt(defended.elapsed));
  }
  assert.equal(defended.result, 'victory');
  assert.equal(defended.elapsed, level.duration);
  assert.deepEqual([...phases], [0, 1, 2]);
  assert.ok(defended.defeated > 25);
});
