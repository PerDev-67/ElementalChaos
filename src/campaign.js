import { campaign } from './config.js';

export const upgrades = [
  { id: 'reserve', cost: 48, name: 'Field Reserve', detail: 'Start battles with 24 extra energy.' },
  { id: 'vigor', cost: 62, name: 'Hydrogen Vigor', detail: 'Hydrogen units gain 15 maximum HP.' },
  { id: 'trail', cost: 75, name: 'Trail Boots', detail: 'Ren moves 15% faster.' },
  { id: 'salvage', cost: 90, name: 'Salvage Charter', detail: 'Earn 25% more on future first clears.' }
];

export const cast = {
  mira: { name: 'Dr. Mira', role: 'Field scientist', x: -6, z: 0, color: '#86d1ad' },
  tess: { name: 'Tess', role: 'Workshop engineer', x: 5.5, z: -5, color: '#fac486' },
  lumi: { name: 'Lumi', role: 'Helium guide', x: -7.5, z: -9, color: '#f4ce7f' },
  orin: { name: 'Captain Orin', role: 'Station warden', x: 8, z: 1, color: '#b1b4e4' }
};

export const briefings = [
  [['mira', 'This is Iris Station, Ren. The relay is reacting to you. Try calling the light inside it.'],
   ['ren', 'It answered. Is that what was moving out beyond the ridge?'],
   ['mira', 'No. Something is opening fractures in the vale. Keep the relay standing and your new allies will do the rest.']],
  [['tess', 'The upper platforms are under attack. Tap allies to select them, then use Move to intercept the fast ones.'],
   ['lumi', 'My current can reach the installation. Hold it until I can cross.']],
  [['mira', 'These deposits point to an old signal beneath the Citadel.'],
   ['ren', 'I’ll send the squad to the survey ring. An Upgrade should help them hold until it’s secure.'],
   ['mira', 'Try the chill beacon near the ring. It uses a simulated 18 kelvin field and can temporarily slow Hydrogen movement.']],
  [['orin', 'The signal is tangled up in the old Citadel guardian. I can hold the gate until you get to the core.'],
   ['ren', 'We’ll break its hold. Keep a route open for the people behind us.']]
];

export const aftermath = [
  'The fractures have gone quiet. Mira traces a current heading above the clouds.',
  'Lumi reaches the station and joins your roster. The signal points toward the mineral frontier.',
  'Ione pulls a damaged map from the survey ring. Its lines lead to the Broken Citadel.',
  'The guardian falls silent. Ren and his allies return to Iris Station with Beryl and a map of the deeper fractures.'
];

export function availableLevel(profile, id) {
  return Number.isInteger(id) && id >= 1 && id <= campaign.length && id <= profile.completed.length + 1;
}

export function completeLevel(profile, id) {
  if (!availableLevel(profile, id) || profile.completed.includes(id)) return 0;
  const reward = Math.round(campaign[id - 1].reward * (profile.traits.includes('salvage') ? 1.25 : 1));
  profile.completed.push(id);
  profile.coins += reward;
  return reward;
}

export function buyUpgrade(profile, id) {
  const upgrade = upgrades.find(item => item.id === id);
  if (!upgrade || profile.traits.includes(id) || profile.coins < upgrade.cost) return false;
  profile.coins -= upgrade.cost;
  profile.traits.push(id);
  return true;
}
