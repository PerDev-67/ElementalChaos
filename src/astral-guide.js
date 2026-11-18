import * as THREE from '../vendor/three.module.min.js';

export const guideArtwork = './art/astra.webp';
const geometry = new THREE.PlaneGeometry(1, 1, 28, 40);
const sealGeometry = new THREE.RingGeometry(.81, .85, 36);
const moteGeometry = new THREE.OctahedronGeometry(1);
const shadowGeometry = new THREE.CircleGeometry(.78, 22);
const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x1b1236, transparent: true, opacity: .42, depthWrite: false });
const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xb4c8ff });
let texture;

export function createGuideVisual(loader) {
  if (!texture) {
    texture = new THREE.TextureLoader().load(guideArtwork, loader);
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  const time = { value: 0 };
  const greeting = { value: 0 };
  const orb = { value: new THREE.Vector2(.81, .86) };
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .04, depthWrite: false, toneMapped: false });
  material.onBeforeCompile = shader => {
    shader.uniforms.guideTime = time;
    shader.uniforms.guideGreeting = greeting;
    shader.uniforms.guideOrb = orb;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float guideTime;\nuniform float guideGreeting;')
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec2 p = uv;
        // Keep the face and staff steady while trailing hair and skirt respond to the breeze.
        float hair = (1.0 - smoothstep(.18, .47, p.x)) * smoothstep(.40, .56, p.y) * (1.0 - smoothstep(.79, .91, p.y));
        float hems = smoothstep(.14, .27, p.y) * (1.0 - smoothstep(.40, .61, p.y)) * smoothstep(.12, .36, abs(p.x - .49));
        float sway = hair + .75 * hems;
        transformed.x += sway * (.018 * sin(guideTime * 2.1 + p.y * 9.0) + .019 * guideGreeting);
        transformed.y += sway * .013 * sin(guideTime * 2.35 + p.x * 10.0);
        transformed.y += smoothstep(.15, .87, p.y) * .003 * sin(guideTime * 2.65);
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float guideTime;\nuniform float guideGreeting;\nuniform vec2 guideOrb;')
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        float staffGlow = 1.0 - smoothstep(.018, .105, length((vMapUv - guideOrb) * vec2(1.0, 1.3)));
        diffuseColor.rgb += vec3(.24, .37, .66) * staffGlow *
          (.25 + .14 * sin(guideTime * 3.0) + .60 * guideGreeting);
      `);
  };

  const root = new THREE.Group();
  const sprite = new THREE.Mesh(geometry, material);
  sprite.scale.set(3.15, 4.2, 1);
  sprite.frustumCulled = false;
  root.add(sprite);
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .025;
  root.add(shadow);
  const seal = new THREE.Mesh(sealGeometry, new THREE.MeshBasicMaterial({
    color: 0xb6a4ff, transparent: true, opacity: .56, depthWrite: false
  }));
  seal.rotation.x = -Math.PI / 2;
  seal.position.y = .05;
  root.add(seal);
  const motes = [];
  for (let i = 0; i < 7; i++) {
    const mote = new THREE.Mesh(moteGeometry, moteMaterial);
    root.add(mote);
    motes.push(mote);
  }
  return { root, sprite, seal, motes, time, greeting, seen: 0 };
}

export function updateGuideVisual(model, camera, time, greeting, reducedMotion) {
  const t = reducedMotion ? 0 : time;
  const response = reducedMotion ? 0 : greeting;
  model.time.value = t;
  model.greeting.value = response;
  model.sprite.position.y = 1.46 + Math.sin(t * 2.4) * .035 + response * .11;
  model.sprite.quaternion.copy(camera.quaternion);
  model.sprite.rotateZ(Math.sin(t * 1.16) * .012 + response * .023);
  model.seal.scale.setScalar(1 + response * .3);
  model.seal.material.opacity = .46 + Math.sin(t * 2.5) * .08 + response * .25;
  for (const [i, mote] of model.motes.entries()) {
    const angle = t * (.48 + (i % 2) * .15) + i * Math.PI * 2 / model.motes.length;
    const radius = 1.0 + response * .28;
    mote.position.set(Math.cos(angle) * radius, .54 + i * .33 + Math.sin(t * 2.1 + i) * .17, Math.sin(angle) * radius);
    mote.rotation.set(t + i, t * .7, angle);
    mote.scale.setScalar(.031 + .022 * (1 + Math.sin(t * 3 + i)) + response * .022);
  }
}

export function disposeGuideVisual(model) {
  model.sprite.material.dispose();
  model.seal.material.dispose();
}
