import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three';
import { NOISE_GLSL, mulberry32 } from './shared.js';

// Every function here takes `live`: the theme's colours as Color objects (live.color(path)),
// a few shared uniforms (live.u) and the sun direction. Materials hold those same objects, so a
// theme change only has to update them.

// `forReflections` drops the warm horizon, the sun and the stars, so glossy surfaces mirror
// plain sky (the TV's side panel stays blue) instead of a peach band.
export function createSky(live, { forReflections = false } = {}) {
  const material = new ShaderMaterial({
    side: BackSide,
