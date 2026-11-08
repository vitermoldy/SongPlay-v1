import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { NOISE_GLSL } from './shared.js';

// One height function feeds both the ground mesh and the grass scatter, so blades sit on the ground.
export function heightAt(x, z) {
  const crest = 1.7 * Math.exp(-(x * x) / 20 - (z * z) / 9) - 1.7;
  const leftRise = 1.25 * Math.exp(-((x + 6.4) ** 2) / 8 - ((z - 5.2) ** 2) / 7);
  const rightFar = 1.3 * Math.exp(-((x - 13) ** 2) / 34 - ((z + 16) ** 2) / 26);
