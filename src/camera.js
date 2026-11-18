import * as THREE from '../vendor/three.module.min.js';

export class FollowCamera {
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 130);
  focus = new THREE.Vector3();
  zoom = 1;
  aspect = 1;

  resize(width, height) {
    this.aspect = width / Math.max(1, height);
    this.project();
  }

  adjust(factor) {
    this.zoom = THREE.MathUtils.clamp(this.zoom * factor, 0.75, 1.65);
    this.project();
  }

  project() {
    const halfHeight = Math.max(15, 15 / this.aspect) / this.zoom;
    this.camera.left = -halfHeight * this.aspect;
    this.camera.right = halfHeight * this.aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  follow(player, dt, snap = false) {
    const smoothing = snap ? 1 : 1 - Math.exp(-dt * 5.5);
    this.focus.x += (player.x * 0.78 - this.focus.x) * smoothing;
    this.focus.z += (player.z * 0.78 - 2.4 - this.focus.z) * smoothing;
    this.camera.position.set(this.focus.x, 36, this.focus.z + 35);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
  }
}
