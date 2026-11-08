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
    frameArea,
    lowPower = false,
    reducedMotion = false,
    onReady,
    onLost,
    onSlow,
  } = {},
) {
  const setup = VARIANTS[variant];
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    stencil: false,
    powerPreference: 'high-performance',
  });

  // Without a GPU the browser draws WebGL on the CPU; an animated scene would then hold the
  // main thread for hundreds of milliseconds a frame. Such a machine gets the still frame.
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|software|basic render/i.test(rendererName);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = NeutralToneMapping;

  const live = createLive(theme, season);
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 1200);
  const base = setup.camera.clone();
  const look = setup.look.clone();
  camera.position.copy(base);
  camera.lookAt(look);

  // Glossy surfaces reflect a plain version of the current sky, rebuilt when the theme settles.
  const pmrem = new PMREMGenerator(renderer);
  const envScene = new Scene();
  envScene.add(createSky(live, { forReflections: true }));
  let envTarget = null;
  function refreshEnvironment() {
    const next = pmrem.fromScene(envScene, 0.03, 0.1, 1000);
    scene.environment = next.texture;
    envTarget?.dispose();
    envTarget = next;
  }
  refreshEnvironment();

  scene.add(createSky(live));
  createClouds(live).forEach((cloud) => scene.add(cloud));
  createMountains(live).forEach((ridge) => scene.add(ridge));

  const tv = createTV(setup.tv);
  tv.group.position.set(0, heightAt(0, 0) - 0.1, 0);
  tv.group.rotation.y = setup.tvYaw;
  scene.add(tv.group);
  tv.group.updateMatrixWorld(true);
  const screenWorld = tv.screenCenter.clone().applyMatrix4(tv.group.matrixWorld);
  const glowWorld = new Vector3(tv.shape.screenX, 0.3, 0.95).applyMatrix4(tv.group.matrixWorld);

  const shared = {
    uTime: live.u.time,
    uWindDir: { value: new Vector2(0.92, 0.38).normalize() },
    uWind: { value: 0.55 },
    uSunDir: { value: live.sunDir },
    uSunColor: { value: live.color('light.sun') },
    uSkyColor: { value: live.color('light.sky') },
    uGround: { value: live.color('ground.dark') },
    uGroundLit: { value: live.color('ground.lit') },
    uBase: { value: live.color('grass.base') },
    uMid: { value: live.color('grass.mid') },
    uTip: { value: live.color('grass.tip') },
    uTipGold: { value: live.color('grass.tipGold') },
    uBack: { value: live.color('grass.back') },
    uTvPos: { value: glowWorld },
    uTvColor: { value: col(PALETTE.tv) },
    uTvPower: { value: 0 },
    uCursorPos: { value: new Vector3(0, -50, 0) },
    uCursorColor: { value: col(PALETTE.cursor) },
    uCursorPower: { value: 0 },
    uFogColor: { value: live.color('haze') },
    uFogNear: { value: 22 },
    uFogFar: { value: 140 },
  };

  scene.add(createTerrain(shared));
  scene.add(
    createGrass({
      count: lowPower ? 30000 : 80000,
      heightAt,
      tv: { x: 0, z: 0, yaw: setup.tvYaw, halfW: tv.shape.bodyW / 2 - 0.05, halfD: 0.5 },
      camera: setup.camera,
      clearFront: setup.clearFront,
      uniforms: shared,
    }),
  );

  const particles = createParticles(lowPower ? 260 : 520, live);
  particles.setShape(live.shape);
  scene.add(particles.points);

  const hemi = new HemisphereLight();
  hemi.color = live.color('lamps.hemiSky');
  hemi.groundColor = live.color('lamps.hemiGround');
  scene.add(hemi);
  const sun = new DirectionalLight();
  sun.color = live.color('lamps.sun');
  scene.add(sun);
  const fill = new DirectionalLight();
  fill.color = live.color('lamps.fill');
  fill.position.set(-5, 4, 6);
  scene.add(fill);

  function applyNumbers() {
    const n = live.numbers;
    live.u.stars.value = n.stars;
    live.u.cloudOpacity.value = n['clouds.opacity'];
    live.u.particleOpacity.value = n['particles.opacity'];
    live.u.particleSize.value = n['particles.size'];
    hemi.intensity = n['lamps.hemi'];
    sun.intensity = n['lamps.sunI'];
    fill.intensity = n['lamps.fillI'];
    sun.position.copy(live.sunDir).multiplyScalar(30);
    renderer.toneMappingExposure = n.exposure;
  }
  applyNumbers();

  const post = createPost(renderer, scene, camera);

  // ---------- State ----------
  const still = reducedMotion || software;
  let playing = !still;
  let visible = true;
  let raf = 0;
  let time = 0;
  let last = 0;
  let readyFired = false;
  let pendingCapture = null;
  let sampled = 0;
  let slowFrames = 0;
  let slow = false;
  let screenLevel = SCREEN_LEVEL.idle;
  let screenTarget = SCREEN_LEVEL.idle;
  let screenMode = 'idle';
  let css = null;
  let themeShift = null;
  const started = performance.now();

  // ---------- Time of day and season: every colour, light and number eases to the new look ----------
  function retarget() {
    const next = compose(live.time, live.season);
    // What falls changes form at once (snow, petals, leaves); its colour and speed ease over.
    live.shape = next.shape;
    particles.setShape(next.shape);
    themeShift = {
      t: still ? 1 : 0,
      from: new Map(COLOR_PATHS.map((path) => [path, live.color(path).clone()])),
      to: next.colors,
      fromNum: { ...live.numbers },
      toNum: next.numbers,
      fromSun: live.sunDir.clone(),
      toSun: new Vector3(...next.sunDir).normalize(),
    };
    if (still) stepTheme(0);
    kick();
  }

  function setTheme(name) {
    if (!THEMES[name] || name === live.time) return;
    live.time = name;
    retarget();
  }

  function setSeason(name) {
    if (!SEASONS[name] || name === live.season) return;
    live.season = name;
    retarget();
  }

  function stepTheme(dt) {
    if (!themeShift) return;
    const s = themeShift;
    s.t = Math.min(1, s.t + dt / THEME_TIME);
    const k = s.t * s.t * (3 - 2 * s.t);
    for (const path of COLOR_PATHS) live.color(path).lerpColors(s.from.get(path), s.to.get(path), k);
    for (const path of NUMBER_PATHS) live.numbers[path] = MathUtils.lerp(s.fromNum[path], s.toNum[path], k);
    live.sunDir.lerpVectors(s.fromSun, s.toSun, k).normalize();
    applyNumbers();
    if (s.t >= 1) {
      themeShift = null;
      refreshEnvironment();
    }
  }

  // ---------- Pointer: camera drift and the cursor's light on the grass ----------
  const pointer = new Vector2();
  const eased = new Vector2();
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const cursorTarget = new Vector3(0, -50, 0);
  let cursorWanted = 0;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cursorAllowed = () => finePointer.matches && !software && !slow;

  // March along the ray until it drops under the blade tips (the tallest blades stand ~0.45
  // over the ground; stopping lower lets the light land behind the blades you see), then refine.
  function hitGround(ray) {
    const o = ray.origin;
    const d = ray.direction;
