import { createGuideVisual, updateGuideVisual, disposeGuideVisual } from './astral-guide.js';
import { guideId } from './campaign.js';
import * as THREE from '../vendor/three.module.min.js';
import { worldHeight, missionSpec, sanctuary } from './config.js';
import { elements } from './elements.js';
import { FollowCamera } from './camera.js';
import { createTerrain } from './terrain.js';

const standard = color => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true });
const basic = color => new THREE.MeshBasicMaterial({ color });
const sphere = new THREE.IcosahedronGeometry(1, 1);
const box = new THREE.BoxGeometry(1, 1, 1);
const crystal = new THREE.OctahedronGeometry(1);
const plane = new THREE.PlaneGeometry(1, 1);
const circle = new THREE.CircleGeometry(1, 18);
const ring = new THREE.TorusGeometry(1, 0.045, 5, 36);
const torusRanger = new THREE.TorusGeometry(.73, .07, 5, 12);
const gray = standard('#243845');
const ivory = standard('#e2eaf0');
const skin = standard('#dbad8a');
const aqua = standard('#4acfc4');
const red = standard('#dc5f69');
const orange = standard('#eaa350');
const purple = standard('#ad73d5');
const gold = standard('#f4d289');
const slate = standard('#294659');
const hair = standard('#202536');
const colors = elements.map(spec => standard(spec.color));
const cloth = standard('#176575');
const charcoaled = standard('#1a303d');
const actorsCapsule = new THREE.CapsuleGeometry(.5, .45, 3, 8);
const white = basic('#edffff');
const mint = basic('#7ceacf');
const blue = basic('#75d7f2');
const alert = basic('#f38d83');
const barBackground = basic('#141e28');
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: '#0a151a', transparent: true, opacity: 0.31, depthWrite: false
});

function mesh(group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(x, y, z);
  result.scale.set(sx, sy, sz);
  group.add(result);
  return result;
}

function humanoid(body, outfit, scarfColor, height = 1) {
  const figure = new THREE.Group();
  body.add(figure);
  figure.scale.setScalar(height);
  const legs = [-1, 1].map(side => {
    const leg = new THREE.Group();
    leg.position.set(side * .17, .96, 0);
    mesh(leg, actorsCapsule, charcoaled, 0, -.38, 0, .23, .64, .25);
    mesh(leg, box, gray, 0, -.81, .09, .24, .25, .38);
    figure.add(leg);
    return leg;
  });
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * .36, 1.6, 0);
    arm.rotation.z = side * .12;
    mesh(arm, actorsCapsule, outfit, 0, -.26, 0, .21, .46, .23);
    mesh(arm, sphere, skin, 0, -.59, .025, .104, .112, .1);
    figure.add(arm);
    return arm;
  });
  const torso = mesh(figure, actorsCapsule, outfit, 0, 1.35, 0, .60, .63, .41);
  mesh(figure, box, ivory, 0, 1.66, .125, .34, .14, .34);
  mesh(figure, sphere, skin, 0, 1.95, .025, .226, .25, .205);
  mesh(figure, sphere, hair, 0, 2.036, -.052, .235, .20, .222);
  mesh(figure, box, hair, -.068, 2.075, .127, .24, .10, .14).rotation.z = -.3;
  for (const side of [-1, 1]) mesh(figure, box, hair, side * .08, 1.966, .217, .046, .025, .022);
  mesh(figure, box, slate, 0, 1.12, 0, .61, .1, .43);
  mesh(figure, box, gold, 0, 1.13, .23, .13, .11, .057);
  const scarf = mesh(figure, box, scarfColor, .20, 1.62, -.25, .2, .12, .56);
  scarf.rotation.x = .26;
  return { torso, legs, arms, scarf };
}

function modelFor(actor, presentation) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  let height = 1.6;
  let highlight;
  let shadowRadius = 0.67;
  let figure;
  let selection;
  if (actor.kind === 'player') {
    figure = humanoid(body, slate, cloth);
    highlight = figure.torso;
    selection = mesh(root, ring, blue, 0, .045, 0, .78, .78, .78);
    selection.rotation.x = -Math.PI / 2;
    height = 2.45;
  } else if (actor.kind === 'npc') {
    const coat = actor.npc === 'mira' ? ivory : actor.npc === 'tess' ? red : actor.npc === 'lumi' ? gold : slate;
    figure = humanoid(body, coat, cloth, actor.npc === 'mira' ? .93 : 1);
    highlight = figure.torso;
    mesh(root, crystal, mint, 0, 2.64, 0, .16, .22, .16);
    height = 2.7;
  } else if (actor.kind === 'core') {
    mesh(body, box, gray, 0, 0.68, 0, 1.7, 0.46, 1.7);
    mesh(body, box, aqua, 0, 0.96, 0, 1.22, 0.14, 1.22);
    highlight = mesh(body, crystal, aqua, 0, 2, 0, 0.89, 1.15, 0.89);
    mesh(body, ring, mint, 0, 1.45, 0, 1.3, 1.3, 1.3).rotation.x = -Math.PI / 2;
    height = 3.55;
    shadowRadius = 1.3;
  } else if (actor.kind === 'ally') {
    const material = colors[(actor.element ?? 1) - 1];
    if (presentation === 'adventurers') {
      figure = humanoid(body, material, cloth, .87);
      highlight = figure.torso;
      height = 2.15;
    } else {
      const radius = actor.element === 4 ? .69 : .53;
      highlight = mesh(body, sphere, material, 0, .73, 0, radius, radius, radius);
      mesh(body, ring, material, 0, .69, 0, radius * 1.16, radius * 1.16, radius * 1.16).rotation.x = -Math.PI / 2;
    }
    selection = mesh(root, ring, mint, 0, .050, 0, .85, .85, .85);
    selection.rotation.x = -Math.PI / 2;
  } else if (actor.type === 'guardian') {
    highlight = mesh(body, crystal, purple, 0, 1.8, 0, 1.7, 2.1, 1.5);
    mesh(body, crystal, gold, 0, 2.14, .89, .58, .8, .42);
    mesh(body, ring, alert, 0, 1.41, 0, 2.25, 2.25, 2.25).rotation.x = -Math.PI / 2;
    height = 4.2;
    shadowRadius = 1.7;
  } else if (actor.type === 'ranger') {
    highlight = mesh(body, crystal, red, 0, 1.04, 0, .6, 1.12, .61);
    mesh(body, torusRanger, orange, 0, .81, 0).rotation.x = -Math.PI / 2;
    height = 2.46;
  } else if (actor.type === 'skirmisher') {
    highlight = mesh(body, crystal, orange, 0, 0.65, 0, 0.54, 0.49, 1.02);
    mesh(body, box, gray, 0, 0.77, 0, 0.36, 0.12, 0.62);
  } else if (actor.type === 'brute') {
    highlight = mesh(body, box, purple, 0, 0.88, 0, 1.29, 1.42, 1.25);
    mesh(body, box, gray, -0.77, 0.78, 0, 0.4, 0.8, 1);
    mesh(body, box, gray, 0.77, 0.78, 0, 0.4, 0.8, 1);
    height = 1.97;
    shadowRadius = 1;
  } else {
    highlight = mesh(body, box, red, 0, 0.66, 0, 0.88, 0.99, 0.86);
    mesh(body, box, gray, 0, 0.64, 0.45, 0.53, 0.16, 0.09);
  }

  const shadow = mesh(root, circle, shadowMaterial, 0, 0.03, 0, shadowRadius, shadowRadius, 1);
  shadow.rotation.x = -Math.PI / 2;
  const bar = new THREE.Group();
  bar.position.y = height;
  root.add(bar);
  const width = actor.kind === 'core' ? 2.35 : 1.16;
  mesh(bar, plane, barBackground, 0, 0, 0, width, 0.15, 1);
  const fill = mesh(bar, plane, actor.kind === 'enemy' ? alert : mint, 0, 0, 0.008, width, 0.095, 1);
  return { root, body, highlight, originalMaterial: highlight.material, bar, fill, width, figure, selection, seen: 0 };
}

export class Battlefield {
  scene = new THREE.Scene();
  view = new FollowCamera();
  models = new Map();
  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  hit = new THREE.Vector3();
  screenPoint = new THREE.Vector3();
  ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  frame = 0;
  lastRender = 0;
  snap = true;
  quality = 'high';
  presentation = 'simple';
  environments = new Map();
  map = sanctuary;
  drops = [];
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  height(x, z) {
    return worldHeight(x, z, this.map);
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    this.scene.background = new THREE.Color('#182630');
    this.scene.fog = new THREE.FogExp2('#182630', 0.012);
    this.scene.add(new THREE.HemisphereLight('#c7eaf8', '#4c5b73', 2.1));
    const sunlight = new THREE.DirectionalLight('#fff4d9', 2.25);
    sunlight.position.set(-17, 27, 12);
    this.scene.add(sunlight);
    this.setWorld(sanctuary);
    this.objectiveRing = mesh(this.scene, ring, mint, 0, .12, 0);
    this.objectiveRing.rotation.x = -Math.PI / 2;
    this.objectiveRing.visible = false;
    this.beacon = mesh(this.scene, crystal, blue, 0, .6, 0, .47, .63, .47);
    this.beacon.visible = false;
    this.marker = mesh(this.scene, ring, mint, 0, 0.12, 0, 0.88, 0.88, 0.88);
    this.marker.rotation.x = -Math.PI / 2;
    this.pulse = mesh(this.scene, ring, blue, 0, 0.2, 0);
    this.pulse.rotation.x = -Math.PI / 2;
    this.commandsLine = new Float32Array(80 * 6);
    this.strikeColors = new Float32Array(80 * 6);
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', new THREE.BufferAttribute(this.commandsLine, 3).setUsage(THREE.DynamicDrawUsage));
    lines.setAttribute('color', new THREE.BufferAttribute(this.strikeColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.strikes = new THREE.LineSegments(lines, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.strikes.frustumCulled = false;
    this.scene.add(this.strikes);
    this.setSettings({ quality: 'high', limit: false, display: 'simple' });
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.view.resize(width, height);
    this.lastRender = -Infinity;
  }

  setSettings(settings) {
    this.quality = settings.quality;
    this.limit = settings.limit;
    if (this.presentation !== settings.display) {
      this.presentation = settings.display;
      this.reset();
    }
    const cap = { low: .85, medium: 1.15, high: 1.5, ultra: 2 }[settings.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.lastRender = -Infinity;
  }

  setWorld(map) {
    if (this.environment) this.scene.remove(this.environment.group);
    this.map = map;
    let environment = this.environments.get(map.id);
    if (!environment) {
      const group = new THREE.Group();
      environment = { group, floor: createTerrain(group, map) };
      this.environments.set(map.id, environment);
    }
    this.environment = environment;
    this.floor = environment.floor;
    this.scene.add(environment.group);
    this.scene.background.set(map.mist ?? '#182630');
    this.scene.fog.color.set(map.mist ?? '#182630');
    this.reset();
  }

  projectToGround(clientX, clientY) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, 1 - (clientY - bounds.top) / bounds.height * 2);
    this.ray.setFromCamera(this.pointer, this.view.camera);
    const target = this.ray.intersectObject(this.floor)[0]?.point ?? this.ray.ray.intersectPlane(this.ground, this.hit);
    return target && { x: target.x, z: target.z };
  }

  pickAlly(allies, clientX, clientY) {
    const bounds = this.canvas.getBoundingClientRect();
    let closest = 26 ** 2;
    let picked = null;
    for (const ally of allies) {
      const center = this.presentation === 'simple' ? .73 : 1.08;
      this.screenPoint.set(ally.x, this.height(ally.x, ally.z) + center, ally.z).project(this.view.camera);
      const x = bounds.left + (1 + this.screenPoint.x) * bounds.width / 2;
      const y = bounds.top + (1 - this.screenPoint.y) * bounds.height / 2;
      const sq = (x - clientX) ** 2 + (y - clientY) ** 2;
      if (sq < closest) {
        closest = sq;
        picked = ally;
      }
    }
    return picked;
  }

  reset() {
    for (const model of this.models.values()) this.removeModel(model);
    this.models.clear();
    this.snap = true;
    this.lastRender = -Infinity;
  }

  removeModel(model) {
    this.scene.remove(model.root);
    if (model.sprite) disposeGuideVisual(model);
  }

  drawActor(actor, elapsed, state) {
    let model = this.models.get(actor.id);
    if (!model) {
      model = actor.npc === guideId
        ? createGuideVisual(() => { this.lastRender = -Infinity; })
        : modelFor(actor, this.presentation);
      this.scene.add(model.root);
      this.models.set(actor.id, model);
    }
    model.seen = this.frame;
    model.root.position.set(actor.x, this.height(actor.x, actor.z), actor.z);
    if (model.sprite) {
      const sinceGreeting = elapsed - (actor.greetAt ?? -Infinity);
      const progress = Math.max(0, Math.min(1, sinceGreeting / 1.24));
      updateGuideVisual(model, this.view.camera, elapsed, Math.sin(progress * Math.PI), this.reducedMotion.matches);
      return;
    }
    model.body.rotation.y = actor.kind === 'core' ? elapsed * 0.9 : actor.heading;
    model.highlight.material = actor.flash > 0 ? white : model.originalMaterial;
    const gentle = this.quality !== 'low';
    model.body.position.y = gentle && actor.kind === 'ally' && !model.figure ? Math.sin(elapsed * 5 + actor.id) * .10 : 0;
    if (model.figure) {
      const moving = actor.kind === 'player' ? actor.moving : actor.kind === 'ally' && model.lastX !== undefined &&
        Math.hypot(actor.x - model.lastX, actor.z - model.lastZ) > .025;
      const stride = moving ? Math.sin(elapsed * 13 + actor.id) * .49 : 0;
      for (let i = 0; i < 2; i++) {
        model.figure.legs[i].rotation.x = i === 0 ? stride : -stride;
        model.figure.arms[i].rotation.x = i === 0 ? -stride * .63 : stride * .63;
      }
      if (actor.kind === 'player' && state.basicCooldown > .26) model.figure.arms[1].rotation.x = -1.26;
      model.figure.scarf.rotation.y = moving ? Math.sin(elapsed * 7) * .23 : 0;
    }
    model.lastX = actor.x;
    model.lastZ = actor.z;
    if (model.selection && actor.kind === 'ally') model.selection.visible = state.selected.includes(actor.id);
    model.bar.quaternion.copy(this.view.camera.quaternion);
    const portion = Math.max(0, actor.hp / actor.maxHp);
    model.fill.scale.x = model.width * portion;
    model.fill.position.x = (portion - 1) * model.width / 2;
    model.bar.visible = actor.kind !== 'npc' && (actor.kind === 'core' || actor.kind === 'player' || portion < 1);
  }

  drawEffects(effects) {
    let index = 0;
    this.pulse.visible = false;
    for (const effect of effects) {
      const { x, z } = effect;
      if (effect.kind === 'pulse') {
        const scale = Math.max(0.3, (1 - effect.life / 0.44) * level.pulse.range);
        this.pulse.visible = true;
        this.pulse.position.set(x, this.height(x, z) + 0.24, z);
        this.pulse.scale.set(scale, scale, 1);
      } else {
        this.commandsLine[index] = x;
        this.commandsLine[index + 1] = this.height(x, z) + 0.76;
        this.commandsLine[index + 2] = z;
        this.commandsLine[index + 3] = effect.toX;
        this.commandsLine[index + 4] = this.height(effect.toX, effect.toZ) + 0.92;
        this.commandsLine[index + 5] = effect.toZ;
        const color = effect.friendly ? blue.color : alert.color;
        color.toArray(this.strikeColors, index);
        color.toArray(this.strikeColors, index + 3);
        index += 6;
      }
    }
    this.strikes.geometry.attributes.position.needsUpdate = true;
    this.strikes.geometry.attributes.color.needsUpdate = true;
    this.strikes.geometry.setDrawRange(0, index / 3);
  }

  draw(state, clock, active) {
    const elapsedMs = clock - this.lastRender;
    if (elapsedMs < (this.limit ? 31 : 14)) return;
    if (!active && this.lastRender !== -Infinity) return;
    this.lastRender = clock;
    this.frame += 1;
    this.view.follow(state.player, Math.min(0.1, elapsedMs / 1000), this.snap);
    this.snap = false;
    const elapsed = clock / 1000;
    if (state.levelId !== 0) this.drawActor(state.core, elapsed, state);
    this.drawActor(state.player, elapsed, state);
    for (const obstruction of this.environment.group.userData.obstructions) {
      const distanceZ = obstruction.position.z - state.player.z;
      const blocked = distanceZ > 0 && distanceZ < 2.2 && Math.abs(obstruction.position.x - state.player.x) < 1.6;
      if (blocked !== obstruction.material.transparent) {
        obstruction.material.transparent = blocked;
        obstruction.material.opacity = blocked ? .29 : 1;
        obstruction.material.depthWrite = !blocked;
        obstruction.material.needsUpdate = true;
      }
    }
    for (const ally of state.allies) this.drawActor(ally, elapsed, state);
    for (const enemy of state.enemies) this.drawActor(enemy, elapsed, state);
    for (const npc of state.npcs ?? []) this.drawActor(npc, elapsed, state);
    for (const [id, model] of this.models) {
      if (model.seen === this.frame) continue;
      this.removeModel(model);
      this.models.delete(id);
    }
    this.marker.visible = state.order === 'move' || state.allies.some(unit => unit.order === 'move');
    this.marker.position.set(state.moveTarget.x, this.height(state.moveTarget.x, state.moveTarget.z) + 0.12, state.moveTarget.z);
    const capture = this.map.capture;
    this.objectiveRing.visible = Boolean(capture);
    this.beacon.visible = Boolean(capture);
    if (capture) {
      this.objectiveRing.scale.set(capture.radius, capture.radius, .8);
      this.objectiveRing.position.set(capture.x, this.height(capture.x, capture.z) + .10, capture.z);
      this.beacon.position.set(capture.x, this.height(capture.x, capture.z) + .72, capture.z);
      this.beacon.rotation.y = elapsed;
      this.beacon.material = state.chill > 0 ? white : blue;
    }
    for (let i = 0; i < 14; i++) {
      const drop = state.drops?.[i];
      let model = this.drops[i];
      if (drop && !model) {
        model = mesh(this.scene, crystal, gold, 0, 0, 0, .21, .32, .21);
        this.drops[i] = model;
      }
      if (!model) continue;
      model.visible = Boolean(drop);
      if (drop) {
        model.position.set(drop.x, this.height(drop.x, drop.z) + .32, drop.z);
        model.rotation.y = elapsed * 2;
      }
    }
    this.drawEffects(state.effects);
    this.renderer.render(this.scene, this.view.camera);
  }
}
