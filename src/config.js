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
