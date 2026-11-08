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

