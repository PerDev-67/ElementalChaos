export const level = {
  id: 1,
  chapter: 1,
  duration: 100,
  width: 48,
  depth: 36,
  coreHp: 340,
  playerHp: 100,
  playerSpeed: 7.6,
  initialEnergy: 64,
  maxEnergy: 100,
  energyPerSecond: 3.2,
  killEnergy: 2,
  pulse: { cost: 18, damage: 56, range: 5, cooldown: 2 },
  portals: [
    { x: -17, z: -11 },
    { x: 17, z: -11 },
    { x: 0, z: 14 }
  ],
  phases: [
    { start: 0, interval: 3.1, pattern: ['raider', 'raider', 'raider', 'skirmisher'] },
    { start: 34, interval: 2.2, pattern: ['raider', 'skirmisher', 'raider', 'brute', 'raider'] },
    { start: 70, interval: 1.55, pattern: ['skirmisher', 'raider', 'brute', 'raider'] }
  ],
  enemyCap: 58
};

export const hydrogen = {
  atomicNumber: 1,
  symbol: 'H',
  cost: 16,
  cap: 16,
  speed: 6.2,
  attackRange: 4.2,
  ranks: [
    { hp: 58, damage: 13, cooldown: 0.82, cost: 0 },
    { hp: 80, damage: 18, cooldown: 0.73, cost: 42 },
    { hp: 104, damage: 23, cooldown: 0.64, cost: 58 }
  ]
};

export const enemyTypes = {
  raider: { hp: 45, speed: 3.65, damage: 9, range: 1.1, cooldown: 1.05, behavior: 'siege' },
  skirmisher: { hp: 32, speed: 5.65, damage: 7, range: 2.9, cooldown: 0.9, behavior: 'hunter' },
  brute: { hp: 116, speed: 2.65, damage: 19, range: 1.65, cooldown: 1.45, behavior: 'siege' }
};

export const commands = ['follow', 'defend', 'attack', 'move'];

export function terrainHeight(x, z) {
  const shoulder = Math.max(0, Math.min(1, (Math.abs(x) - 12) / 8));
  return shoulder * (0.6 + 0.65 * Math.cos(z * 0.16)) + 0.14 * Math.sin(z * 0.32);
}

const missionDefaults = {
  ...level, enemyCap: 30, unitCap: 22, energyPerSecond: 3.0, maxEnergy: 130,
  initialEnergy: 74, killEnergy: 3, pulse: { ...level.pulse },
  width: 54, depth: 42
};

export const campaign = [
  { ...missionDefaults, id: 1, chapter: 1, duration: 83, reward: 65, theme: 'vale',
    title: 'First Awakening', color: '#446760', mist: '#172e34', mode: 'defense',
    coreHp: 390, guide: 'mira', portals: level.portals,
    phases: [
      { start: 0, interval: 4, pattern: ['raider'] },
      { start: 27, interval: 3.3, pattern: ['raider','raider','skirmisher'] },
      { start: 54, interval: 2.65, pattern: ['raider','brute','raider','skirmisher'] }
    ] },
  { ...missionDefaults, id: 2, chapter: 1, duration: 127, reward: 90, theme: 'sky',
    title: 'The Rising Current', color: '#607889', mist: '#25384f', mode: 'defense',
    coreHp: 470, guide: 'tess', portals: [{x:-19,z:-10},{x:17,z:-13},{x:15,z:14}],
    phases: [
      { start: 0, interval: 4, pattern: ['raider','skirmisher'] },
      { start: 39, interval: 3.4, pattern: ['skirmisher','raider','ranger'] },
      { start: 81, interval: 2.7, pattern: ['skirmisher','brute','ranger','skirmisher'] }
    ] },
  { ...missionDefaults, id: 3, chapter: 2, duration: 184, reward: 125, theme: 'frontier',
    title: 'Unstable Frontier', color: '#63566d', mist: '#2e253c', mode: 'capture',
    capture: { x: 10, z: -6, radius: 4.3, time: 22 }, coreHp: 490, guide: 'mira',
    portals: [{x:-16,z:-14},{x:19,z:-13},{x:17,z:15}],
    phases: [
      { start: 0, interval: 4.3, pattern: ['ranger','skirmisher','raider'] },
      { start: 51, interval: 3.5, pattern: ['ranger','brute','raider','skirmisher'] },
      { start: 108, interval: 2.8, pattern: ['ranger','skirmisher','brute'] }
    ] },
  { ...missionDefaults, id: 4, chapter: 2, duration: 244, reward: 175, theme: 'citadel',
    title: 'The Broken Citadel', color: '#5e5967', mist: '#352932', mode: 'boss',
    bossAt: 218, coreHp: 620, guide: 'orin',
    portals: [{x:0,z:-17},{x:-21,z:0},{x:20,z:1},{x:0,z:16}],
    phases: [
      { start: 0, interval: 4.1, pattern: ['raider','skirmisher','ranger'] },
      { start: 62, interval: 3.6, pattern: ['ranger','brute','skirmisher'] },
      { start: 140, interval: 3, pattern: ['brute','ranger','raider','skirmisher'] }
    ] }
];

export const sanctuary = {
  ...missionDefaults, id: 0, title: 'Iris Station', theme: 'hub', color: '#536c63',
  mist: '#1f3238', portals: [], duration: 0
};

Object.assign(enemyTypes, {
  ranger: { hp: 62, speed: 3.1, damage: 12, range: 5.8, cooldown: 1.65, behavior: 'ranged' },
  guardian: { hp: 2350, speed: 2.15, damage: 27, range: 3.8, cooldown: 1.35, behavior: 'ranged' }
});

export function missionSpec(state) {
  if (state.levelId === 0) return sanctuary;
  return campaign[state.levelId - 1] ?? level;
}

export function worldHeight(x, z, map) {
  const base = terrainHeight(x, z);
  if (map.theme === 'sky') return base + Math.max(0, (Math.abs(x) - 8) * .115) + Math.sin(z * .22) * .20;
  if (map.theme === 'frontier') return base + Math.max(0, (Math.abs(x) - 7) * .064) * (1 + Math.sin(z * .27));
  if (map.theme === 'citadel') return base * .35;
  return base;
}

const boulder = (x, z, radius = 1.15) => ({ x, z, radius });
campaign[0].obstacles = [boulder(-12, -10), boulder(12.5, -8)];
campaign[1].obstacles = [boulder(-13, 6), boulder(12, -5)];
campaign[2].obstacles = [boulder(-10, -10), boulder(14.2, 6), boulder(0, -13)];
campaign[3].obstacles = [boulder(-9, -7, 1.45), boulder(9, 7, 1.45), boulder(11, -9, 1.45)];
sanctuary.obstacles = [boulder(-10, -4), boulder(10, -5)];
