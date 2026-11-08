import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { NOISE_GLSL } from './shared.js';

// One height function feeds both the ground mesh and the grass scatter, so blades sit on the ground.
export function heightAt(x, z) {
  const crest = 1.7 * Math.exp(-(x * x) / 20 - (z * z) / 9) - 1.7;
  const leftRise = 1.25 * Math.exp(-((x + 6.4) ** 2) / 8 - ((z - 5.2) ** 2) / 7);
  const rightFar = 1.3 * Math.exp(-((x - 13) ** 2) / 34 - ((z + 16) ** 2) / 26);
  const leftFar = 1.7 * Math.exp(-((x + 16) ** 2) / 50 - ((z + 22) ** 2) / 40);
  const roll = 0.07 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.72) + 0.035 * Math.sin(x * 1.7 + z * 1.1);
  return crest + leftRise + rightFar + leftFar + roll;
}

export function createTerrain(uniforms) {
  const geometry = new PlaneGeometry(110, 80, 220, 160);
  geometry.rotateX(-Math.PI / 2);
