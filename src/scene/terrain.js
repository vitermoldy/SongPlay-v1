import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { NOISE_GLSL } from './shared.js';

// One height function feeds both the ground mesh and the grass scatter, so blades sit on the ground.
