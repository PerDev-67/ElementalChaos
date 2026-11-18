import * as THREE from '../vendor/three.module.min.js';
import { worldHeight } from './config.js';

const flat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.86, flatShading: true });
const glow = color => new THREE.MeshBasicMaterial({ color });
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);

function piece(group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  group.add(mesh);
  return mesh;
}

function makeFloor(scene, map) {
  const { width, depth } = map;
  const terrainHeight = (x, z) => worldHeight(x, z, map);
  const geometry = new THREE.PlaneGeometry(width, depth, 48, 36);
  geometry.rotateX(-Math.PI / 2);
  const points = geometry.getAttribute('position');
  const colors = [];
  const shade = new THREE.Color();
  const base = new THREE.Color(map.color ?? '#364752');
  for (let i = 0; i < points.count; i += 1) {
    const x = points.getX(i);
    const z = points.getZ(i);
    points.setY(i, terrainHeight(x, z));
    const variation = 0.89 + 0.13 * Math.sin(x * 3.9 + z * 7.3) + 0.045 * Math.cos(z * 0.6);
    shade.copy(base).multiplyScalar(variation);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const floor = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.98, flatShading: true, side: THREE.DoubleSide
  }));
  const lines = [];
  for (let x = -width / 2; x <= width / 2; x += 3) {
    for (let z = -depth / 2; z < depth / 2; z += 1) {
      lines.push(x, terrainHeight(x, z) + 0.024, z, x, terrainHeight(x, z + 1) + 0.024, z + 1);
    }
  }
  for (let z = -depth / 2; z <= depth / 2; z += 3) {
    for (let x = -width / 2; x < width / 2; x += 1) {
      lines.push(x, terrainHeight(x, z) + 0.024, z, x + 1, terrainHeight(x + 1, z) + 0.024, z);
    }
  }
  const grid = new THREE.BufferGeometry();
  grid.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  scene.add(floor, new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: '#53636b', transparent: true, opacity: 0.52 })));
  piece(scene, box, flat('#182631'), 0, -1.2, 0, width + 0.4, 1.76, depth + 0.4);
  return floor;
}

function addTerrainDetails(scene, map) {
  const terrainHeight = (x, z) => worldHeight(x, z, map);
  const dark = flat('#26343d');
  const edge = flat('#758996');
  const amber = glow('#e7a35f');
  const aqua = glow('#81ebe5');
  const padMaterial = flat('#3f5861');

  piece(scene, cylinder, dark, 0, 0.1, 0, 3.55, 0.42, 3.55);
  piece(scene, cylinder, padMaterial, 0, 0.34, 0, 3.3, 0.12, 3.3);
  const ring = new THREE.TorusGeometry(3.17, 0.044, 6, 48);
  piece(scene, ring, aqua, 0, 0.42, 0).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const tile = piece(scene, box, i % 3 === 0 ? aqua : edge, Math.cos(angle) * 3.82, 0.16, Math.sin(angle) * 3.82, 0.42, 0.08, 0.13);
    tile.rotation.y = -angle;
  }

  for (const portal of map.portals) {
    const angle = Math.atan2(portal.x, portal.z);
    for (let i = 1; i <= 9; i += 1) {
      const portion = i / 11;
      const x = portal.x * portion;
      const z = portal.z * portion;
      if (Math.hypot(x, z) < 4) continue;
      const mark = piece(scene, box, edge, x, terrainHeight(x, z) + 0.032, z, 0.6, 0.025, 0.12);
      mark.rotation.y = angle;
    }

    const frame = new THREE.Group();
    frame.position.set(portal.x, terrainHeight(portal.x, portal.z), portal.z);
    frame.rotation.y = angle;
    scene.add(frame);
    piece(frame, cylinder, dark, 0, 0.09, 0, 1.87, 0.29, 1.87);
    piece(frame, cylinder, padMaterial, 0, 0.24, 0, 1.61, 0.1, 1.61);
    piece(frame, new THREE.TorusGeometry(1.28, 0.2, 6, 12), dark, 0, 1.53, 0);
    piece(frame, new THREE.TorusGeometry(1.13, 0.055, 6, 24), amber, 0, 1.53, 0.12);
    piece(frame, new THREE.CircleGeometry(1.09, 24), new THREE.MeshBasicMaterial({
      color: '#f17861', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false
    }), 0, 1.53, 0.01);
    for (const side of [-1, 1]) {
      piece(frame, box, edge, side * 1.38, 0.61, 0, 0.46, 1.1, 0.51);
      piece(frame, box, amber, side * 1.38, 1.2, 0, 0.32, 0.075, 0.35);
    }
  }

  for (const x of [-23, 23]) {
    for (const z of [-16.5, -8, 0, 8, 16.5]) {
      const height = terrainHeight(x, z);
      piece(scene, box, dark, x, height + 0.33, z, 0.85, 0.71, 0.85);
      piece(scene, box, edge, x, height + 0.73, z, 0.66, 0.12, 0.66);
      piece(scene, box, aqua, x, height + 0.82, z, 0.45, 0.055, 0.45);
    }
  }
  for (const x of [-20, -14, -8, 8, 14, 20]) {
    for (const z of [-17, 17]) {
      piece(scene, box, edge, x, terrainHeight(x, z) + 0.1, z, 2.2, 0.24, 0.32);
    }
  }
}

function landscape(scene, map) {
  const grass = flat(map.theme === 'hub' ? '#4f8768' : '#457977');
  const trunk = flat('#6a514a');
  const sandstone = flat(map.theme === 'sky' ? '#9daebc' : '#626579');
  const mineral = glow('#c48ef1');
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const foliage = new THREE.ConeGeometry(1, 2.2, 7);
  const shard = new THREE.OctahedronGeometry(1);
  const obstructions = [];
  for (const obstacle of map.obstacles ?? []) {
    const y = worldHeight(obstacle.x, obstacle.z, map);
    const material = sandstone.clone();
    const model = piece(scene, map.theme === 'citadel' ? box : rock, material,
      obstacle.x, y + .56, obstacle.z, obstacle.radius, 1.35, obstacle.radius);
    model.rotation.y = .46;
    obstructions.push(model);
  }
  scene.userData.obstructions = obstructions;
  for (let i = 0; i < 19; i++) {
    const angle = i * 2.39996;
    const x = Math.cos(angle) * (18 + i % 5);
    const z = Math.sin(angle) * (15 + i % 4);
    const y = worldHeight(x, z, map);
    if (map.portals.some(portal => Math.hypot(x - portal.x, z - portal.z) < 3.3)) continue;
    if (map.theme === 'hub' || map.theme === 'vale') {
      if (i % 3 === 0) piece(scene, rock, sandstone, x, y + .43, z, 1.1, .75, .83);
      else {
        piece(scene, cylinder, trunk, x, y + .67, z, .16, 1.34, .16);
        piece(scene, foliage, grass, x, y + 1.65, z, .88, 1, .88);
      }
    } else if (map.theme === 'frontier') {
      piece(scene, rock, sandstone, x, y + .51, z, 1.4, .9, .9);
      if (i % 2 === 0) piece(scene, shard, mineral, x + .4, y + 1.03, z, .34, .8, .32).rotation.z = -.26;
    } else if (map.theme === 'sky') {
      const platform = piece(scene, cylinder, sandstone, x * 1.47, y + 1 + i % 3, z * 1.42, 1.6, .4, 1.6);
      platform.rotation.z = i % 2 ? .14 : -.13;
      piece(scene, rock, sandstone, platform.position.x, platform.position.y - .8, platform.position.z, 1.37, 1.19, 1.37);
    } else if (map.theme === 'citadel' && (Math.abs(x) > 16 || Math.abs(z) > 14)) {
      piece(scene, box, sandstone, x, y + .94, z, i % 2 ? 1.9 : .8, 1.9, .95).rotation.y = angle;
      if (i % 3 === 0) piece(scene, box, trunk, x + .86, y + .21, z, .8, .4, .6).rotation.y = angle + .8;
    }
  }
}

export function createTerrain(scene, map) {
  const floor = makeFloor(scene, map);
  addTerrainDetails(scene, map);
  landscape(scene, map);
  return floor;
}
