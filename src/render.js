import * as THREE from '../vendor/three.module.min.js';
import { terrainHeight, level } from './config.js';
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
const gray = standard('#243845');
const ivory = standard('#e2eaf0');
const skin = standard('#dbad8a');
const aqua = standard('#4acfc4');
const ice = standard('#70dfee');
const red = standard('#dc5f69');
const orange = standard('#eaa350');
const purple = standard('#ad73d5');
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

function modelFor(actor) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  let height = 1.6;
  let highlight;
  let shadowRadius = 0.67;
  if (actor.kind === 'player') {
    mesh(body, box, gray, -0.18, 0.3, 0, 0.23, 0.59, 0.33);
    mesh(body, box, gray, 0.18, 0.3, 0, 0.23, 0.59, 0.33);
    highlight = mesh(body, box, ivory, 0, 0.95, 0, 0.66, 0.75, 0.46);
    mesh(body, sphere, skin, 0, 1.61, 0, 0.24, 0.25, 0.23);
    mesh(body, box, ice, 0, 1.67, 0.18, 0.37, 0.11, 0.09);
    mesh(body, box, aqua, 0.49, 0.96, 0.28, 0.2, 0.21, 0.62);
    mesh(body, box, gray, -0.44, 0.9, 0, 0.2, 0.62, 0.27);
    const selection = mesh(root, ring, blue, 0, 0.04, 0, 0.98, 0.98, 0.98);
    selection.rotation.x = -Math.PI / 2;
    height = 2.18;
  } else if (actor.kind === 'core') {
    mesh(body, box, gray, 0, 0.68, 0, 1.7, 0.46, 1.7);
    mesh(body, box, aqua, 0, 0.96, 0, 1.22, 0.14, 1.22);
    highlight = mesh(body, crystal, aqua, 0, 2, 0, 0.89, 1.15, 0.89);
    mesh(body, ring, mint, 0, 1.45, 0, 1.3, 1.3, 1.3).rotation.x = -Math.PI / 2;
    height = 3.55;
    shadowRadius = 1.3;
  } else if (actor.kind === 'ally') {
    highlight = mesh(body, sphere, ice, 0, 0.72, 0, 0.56, 0.56, 0.56);
    mesh(body, ring, blue, 0, 0.69, 0, 0.62, 0.62, 0.62).rotation.x = -Math.PI / 2;
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
  return { root, body, highlight, originalMaterial: highlight.material, bar, fill, width, seen: 0 };
}

export class Battlefield {
  scene = new THREE.Scene();
  view = new FollowCamera();
  models = new Map();
  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  hit = new THREE.Vector3();
  ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  frame = 0;
  lastRender = 0;
  snap = true;
  quality = 'standard';

  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    this.scene.background = new THREE.Color('#182630');
    this.scene.fog = new THREE.FogExp2('#182630', 0.012);
    this.scene.add(new THREE.HemisphereLight('#c7eaf8', '#4c5b73', 2.1));
    const sunlight = new THREE.DirectionalLight('#fff4d9', 2.25);
    sunlight.position.set(-17, 27, 12);
    this.scene.add(sunlight);
    this.floor = createTerrain(this.scene);
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
    this.setQuality('standard');
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

  setQuality(quality) {
    this.quality = quality;
    const scale = quality === 'battery' ? 1 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, scale));
    this.lastRender = -Infinity;
  }

  projectToGround(clientX, clientY) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, 1 - (clientY - bounds.top) / bounds.height * 2);
    this.ray.setFromCamera(this.pointer, this.view.camera);
    const target = this.ray.intersectObject(this.floor)[0]?.point ?? this.ray.ray.intersectPlane(this.ground, this.hit);
    return target && { x: target.x, z: target.z };
  }

  reset() {
    for (const model of this.models.values()) this.scene.remove(model.root);
    this.models.clear();
    this.snap = true;
    this.lastRender = -Infinity;
  }

  drawActor(actor, elapsed) {
    let model = this.models.get(actor.id);
    if (!model) {
      model = modelFor(actor);
      this.scene.add(model.root);
      this.models.set(actor.id, model);
    }
    model.seen = this.frame;
    model.root.position.set(actor.x, terrainHeight(actor.x, actor.z), actor.z);
    model.body.rotation.y = actor.kind === 'core' ? elapsed * 0.9 : actor.heading;
    model.highlight.material = actor.flash > 0 ? white : model.originalMaterial;
    if (actor.kind === 'ally' && this.quality === 'standard') {
      model.body.position.y = Math.sin(elapsed * 5 + actor.id) * 0.11;
    } else {
      model.body.position.y = 0;
    }
    model.bar.quaternion.copy(this.view.camera.quaternion);
    const portion = Math.max(0, actor.hp / actor.maxHp);
    model.fill.scale.x = model.width * portion;
    model.fill.position.x = (portion - 1) * model.width / 2;
    model.bar.visible = actor.kind === 'core' || actor.kind === 'player' || portion < 1;
  }

  drawEffects(effects) {
    let index = 0;
    this.pulse.visible = false;
    for (const effect of effects) {
      const { x, z } = effect;
      if (effect.kind === 'pulse') {
        const scale = Math.max(0.3, (1 - effect.life / 0.44) * level.pulse.range);
        this.pulse.visible = true;
        this.pulse.position.set(x, terrainHeight(x, z) + 0.24, z);
        this.pulse.scale.set(scale, scale, 1);
      } else {
        this.commandsLine[index] = x;
        this.commandsLine[index + 1] = terrainHeight(x, z) + 0.76;
        this.commandsLine[index + 2] = z;
        this.commandsLine[index + 3] = effect.toX;
        this.commandsLine[index + 4] = terrainHeight(effect.toX, effect.toZ) + 0.92;
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
    if (elapsedMs < (this.quality === 'battery' ? 31 : 14)) return;
    if (!active && this.lastRender !== -Infinity) return;
    this.lastRender = clock;
    this.frame += 1;
    this.view.follow(state.player, Math.min(0.1, elapsedMs / 1000), this.snap);
    this.snap = false;
    this.drawActor(state.core, state.elapsed);
    this.drawActor(state.player, state.elapsed);
    for (const ally of state.allies) this.drawActor(ally, state.elapsed);
    for (const enemy of state.enemies) this.drawActor(enemy, state.elapsed);
    for (const [id, model] of this.models) {
      if (model.seen === this.frame) continue;
      this.scene.remove(model.root);
      this.models.delete(id);
    }
    this.marker.visible = state.order === 'move';
    this.marker.position.set(state.moveTarget.x, terrainHeight(state.moveTarget.x, state.moveTarget.z) + 0.12, state.moveTarget.z);
    this.drawEffects(state.effects);
    this.renderer.render(this.scene, this.view.camera);
  }
}
