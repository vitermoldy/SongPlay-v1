import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial } from 'three';
import { mulberry32 } from './shared.js';

// What drifts through the air. uShape 0: motes, some round, some soft five-point stars (dust,
// or fireflies at night); 1: round snowflakes; 2: petals or leaves, spinning as they fall;
// 3: rain streaks.
// The near ones are larger and blurrier, like out-of-focus light.
// uDrift is the fall distance so far, added up frame by frame, so a change of speed between
// seasons never makes the flakes jump.
export function createParticles(count, live) {
  const rand = mulberry32(42);
