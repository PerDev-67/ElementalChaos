export function tickActor(actor, dt) {
  actor.cooldown = Math.max(0, actor.cooldown - dt);
  actor.flash = Math.max(0, actor.flash - dt);
}

export function strike(state, attacker, target, damage, cooldown) {
  if (attacker.cooldown > 0 || target.hp <= 0) return;
  attacker.cooldown = cooldown;
  target.hp = Math.max(0, target.hp - damage);
  target.flash = 0.19;
  if (state.effects.length < 80) {
    state.effects.push({ kind: 'strike', x: attacker.x, z: attacker.z, toX: target.x, toZ: target.z, life: 0.16, friendly: attacker.kind === 'ally' });
  }
}
