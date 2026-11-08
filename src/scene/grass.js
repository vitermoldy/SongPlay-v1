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

