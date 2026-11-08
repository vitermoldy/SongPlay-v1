import {
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { createTerrain, heightAt } from './terrain.js';
import { createGrass } from './grass.js';
import { createTV } from './tv.js';
import { createClouds, createMountains, createSky } from './sky.js';
import { createParticles } from './particles.js';
import { createPost } from './post.js';
import { col, PALETTE } from './shared.js';
import { COLOR_PATHS, NUMBER_PATHS, SEASONS, THEMES, compose } from './themes.js';

// hero: the landing page, a low wide view with room for the headline above a classic 4:3 set.
// player: a 16:9 set, close enough that the video on its glass stays at least 200px tall.
const VARIANTS = {
  hero: {
    tv: 'classic',
    camera: new Vector3(0, -0.3, 7.6),
    look: new Vector3(0, 0.95, 0),
    tvYaw: -0.36,
    parallax: [0.35, 0.12],
    clearFront: false,
    framesScreen: false,
  },
  player: {
    tv: 'wide',
    camera: new Vector3(0, 0.6, 5),
    look: new Vector3(0, 0.43, 0),
    tvYaw: -0.2,
