import { hydrogen } from './config.js';

export const elements = [
  { ...hydrogen, name: 'Hydrogen', character: 'Hale', age: 19, color: '#83e5ee', melt: 13.99, boil: 20.27, ability: 'Rapid volley' },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', character: 'Lumi', age: 22, color: '#f9cf88',
    cost: 23, speed: 8.2, attackRange: 4.9, melt: null, boil: 4.22, ability: 'Mends nearby allies',
    ranks: [{ hp: 52, damage: 8, cooldown: .81 }, { hp: 72, damage: 11, cooldown: .68 }, { hp: 94, damage: 14, cooldown: .55 }] },
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', character: 'Ione', age: 20, color: '#fa8998',
    cost: 34, speed: 6, attackRange: 3.8, melt: 453.65, boil: 1615, ability: 'Splash damage',
    ranks: [{ hp: 79, damage: 26, cooldown: .9 }, { hp: 108, damage: 35, cooldown: .79 }, { hp: 138, damage: 46, cooldown: .7 }] },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', character: 'Beryl', age: 27, color: '#a9dc91',
    cost: 36, speed: 4.8, attackRange: 3.5, melt: 1560, boil: 2742, ability: 'Guards nearby allies',
    ranks: [{ hp: 138, damage: 15, cooldown: 1 }, { hp: 175, damage: 20, cooldown: .86 }, { hp: 222, damage: 26, cooldown: .76 }] }
];

export function phaseOf(element, kelvin) {
  if (element.melt !== null && kelvin < element.melt) return 'solid';
  return kelvin < element.boil ? 'liquid' : 'gas';
}

export function unitSpec(unit) {
  return elements[(unit.element ?? 1) - 1];
}

export function unitHp(element, rank, traits) {
  return element.ranks[rank].hp + (element.atomicNumber === 1 && traits?.includes('vigor') ? 15 : 0);
}

// Character generation can sample once, then store the result on the profile.
// Existing character ages are authored constants so balances and saves cannot change them.
export function rollCharacterAge(random = Math.random) {
  const common = random() < 0.76;
  const first = common ? 15 : 1;
  const count = common ? 9 : 100;
  return first + Math.floor(random() * count);
}
