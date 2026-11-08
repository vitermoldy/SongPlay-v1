import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial } from 'three';
import { mulberry32 } from './shared.js';

// What drifts through the air. uShape 0: motes, some round, some soft five-point stars (dust,
// or fireflies at night); 1: round snowflakes; 2: petals or leaves, spinning as they fall;
