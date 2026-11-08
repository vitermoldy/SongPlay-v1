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
    parallax: [0.1, 0.04],
    clearFront: true,
    framesScreen: true,
  },
};

// The player's camera stands PLAYER_DISTANCE from the TV's glass on every screen: a wide shot
// with plenty of hill and sky, the same composition at any window size (the set scales with the
// window instead of the camera moving in). It only stands further back when the set would
// otherwise run into the page's controls (`frameArea`). The video covers VIDEO_FILL of the
// glass; the thin rim left round it is the tube's dark edge, so it reads as sitting inside.
const PLAYER_DISTANCE = 5.2;
// How far the player's eye stands above the middle of the glass: the earlier, higher point of
// view the owner wants back, which keeps the mountains in sight over the crest.
const CAMERA_RISE = 0.4;
const VIDEO_FILL = 0.97;
const POWER_DELAY = 0.5;
const POWER_TIME = 1.5;
const THEME_TIME = 1.4;
const SCREEN_LEVEL = { idle: 1, video: 0.22, paused: 0.18 };

// The current time of day and season as live Color objects and uniforms every material shares.
function createLive(time, season) {
  const look = compose(time, season);
  return {
    time: THEMES[time] ? time : 'dusk',
    season: SEASONS[season] ? season : 'summer',
    shape: look.shape,
    color: (path) => look.colors.get(path),
    numbers: look.numbers,
    sunDir: new Vector3(...look.sunDir).normalize(),
    u: {
      time: { value: 0 },
      drift: { value: 0 },
      stars: { value: look.numbers.stars },
      cloudOpacity: { value: look.numbers['clouds.opacity'] },
      particleOpacity: { value: look.numbers['particles.opacity'] },
      particleSize: { value: look.numbers['particles.size'] },
      particleShape: { value: look.shape },
    },
  };
}

export function createScene(
  canvas,
  {
    variant = 'hero',
    theme = 'dusk',
    season = 'summer',
