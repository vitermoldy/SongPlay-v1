import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import { mulberry32 } from './shared.js';

// Grass is one instanced blade. Each instance carries its root position and four numbers
// (yaw, height, width, seed); bending and wind happen in the vertex shader.
export function createGrass({ count, heightAt, tv, camera, clearFront = false, uniforms }) {
  const blade = new PlaneGeometry(1, 1, 1, 5);
  blade.translate(0, 0.5, 0);

  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(blade.getIndex());
  geometry.setAttribute('position', blade.getAttribute('position'));
  geometry.setAttribute('uv', blade.getAttribute('uv'));

  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  const rand = mulberry32(1987);
  const cosY = Math.cos(-tv.yaw);
  const sinY = Math.sin(-tv.yaw);

  let i = 0;
  let guard = 0;
  while (i < count && guard++ < count * 20) {
    const far = rand() < 0.22;
    const x = far ? -34 + rand() * 68 : -14 + rand() * 28;
    const z = far ? -26 + rand() * 22 : -4 + rand() * 12.4;

    // Keep blades out of the television body.
    const lx = (x - tv.x) * cosY - (z - tv.z) * sinY;
