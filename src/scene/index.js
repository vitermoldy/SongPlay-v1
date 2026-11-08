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
    const below = (t) => o.y + d.y * t < heightAt(o.x + d.x * t, o.z + d.z * t) + 0.4;
    let prev = 0.2;
    for (let t = 0.2; t < 90; t += t < 12 ? 0.12 : 0.5) {
      if (below(t)) {
        let a = prev;
        let b = t;
        for (let i = 0; i < 8; i++) {
          const m = (a + b) / 2;
          if (below(m)) b = m;
          else a = m;
        }
        return new Vector3(o.x + d.x * b, o.y + d.y * b, o.z + d.z * b);
      }
      prev = t;
    }
    return null;
  }

  const onPointer = (event) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    if (event.pointerType === 'touch' || !cursorAllowed()) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let hit = null;
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      hit = hitGround(raycaster.ray);
    }
    cursorWanted = hit ? 1 : 0;
    if (hit) cursorTarget.copy(hit);
    // A paused scene still answers the cursor, one frame per move.
    if (visible && !playing) kick();
  };
  const onLeave = () => {
    cursorWanted = 0;
    if (visible && !playing) kick();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);

  const projected = new Vector3();
  function updateFocus(cam) {
    projected.copy(screenWorld).project(cam);
    post.setFocus(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    post.setSize(width, height, pixelRatio);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect >= 1 ? 35 : 35 + (1 - aspect) * 10;
    camera.updateProjectionMatrix();
    if (setup.framesScreen) {
      // Fit the whole set (its front, the side panel the angle shows, a little air) into the
      // free part of the stage between the pickers and the deck, then centre it there.
      // `avoid` lists page controls floating over the stage; only those the set would actually
      // run into push the free area's top down.
      const area = { top: 0, bottom: height, left: 0, right: width, avoid: [], ...frameArea?.() };
      const setW = tv.shape.bodyW * Math.cos(setup.tvYaw) + 0.92 * Math.abs(Math.sin(setup.tvYaw)) + 0.06;
      const setH = tv.shape.bodyH + 0.08;
      const tan = Math.tan(MathUtils.degToRad(camera.fov / 2));
      const shotPerUnit = height / (2 * PLAYER_DISTANCE * tan);
      let perUnit = 1;
      let cx = width / 2;
      let cy = height / 2;
      for (let pass = 0; pass < 3; pass++) {
        const freeW = Math.max(120, area.right - area.left);
        const freeH = Math.max(120, area.bottom - area.top);
        perUnit = Math.min(freeW / setW, freeH / setH, shotPerUnit);
        const half = { w: (setW * perUnit) / 2, h: (setH * perUnit) / 2 };
        // The middle of the window, as the original framing had it (horizon behind the set,
        // sky above); moved only as far as it takes to stay clear of the controls.
        cx = MathUtils.clamp(width / 2, area.left + half.w, area.right - half.w);
        cy = MathUtils.clamp(height / 2, area.top + half.h, area.bottom - half.h);
        const hits = area.avoid.filter(
          (r) => r.left < cx + half.w && r.right > cx - half.w && r.top < cy + half.h && r.bottom > cy - half.h,
        );
        if (!hits.length) break;
        area.top = Math.max(area.top, ...hits.map((r) => r.bottom + 14));
      }
      const dist = MathUtils.clamp(height / (perUnit * 2 * tan), 2.2, 10);
      const shiftX = (cx - width / 2) / perUnit;
      const shiftY = (cy - height / 2) / perUnit;
      // The eye stays a little above the set, looking down onto the hill, so the horizon and the
      // mountains show behind the TV. Placing the set higher or lower in the frame tilts the view
      // a touch instead of lowering the eye, which would hide the mountains behind the crest.
      base.set(screenWorld.x - shiftX, screenWorld.y + CAMERA_RISE, screenWorld.z + dist);
      look.set(screenWorld.x - shiftX, screenWorld.y + shiftY, screenWorld.z);
    } else {
      base.copy(setup.camera);
      look.copy(setup.look);
    }
    camera.position.set(base.x + eased.x * setup.parallax[0], base.y - eased.y * setup.parallax[1], base.z);
    camera.lookAt(look);
    particles.material.uniforms.uProj.value =
      (height * pixelRatio) / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    updateFocus(camera);
    css?.renderer.setSize(width, height);
    kick();
  }

  const power = (now) =>
    still ? 1 : MathUtils.clamp(((now - started) / 1000 - POWER_DELAY) / POWER_TIME, 0, 1);

  function render(now) {
    const raw = last ? (now - last) / 1000 : 0;
    const dt = Math.min(raw, 0.05);
    last = now;
    if (playing) {
      time += dt;
      live.u.drift.value += dt * live.numbers['particles.fall'];
    }
    // With no time step (a single frame for a paused scene) everything lands where it is going.
    const ease = (rate) => (dt > 0 ? 1 - Math.exp(-dt * rate) : 1);

    // Watch the first frames once; a machine that cannot hold ~15 fps gets the still frame.
    if (playing && raw > 0 && sampled < 45) {
      sampled++;
      if (raw > 0.066) slowFrames++;
      if (sampled === 45 && slowFrames > 30) {
        slow = true;
        cursorWanted = 0;
        onSlow?.();
      }
    }

    stepTheme(dt);

    const on = power(now);
    screenLevel += (screenTarget - screenLevel) * ease(4);
    const flicker = screenMode === 'video' ? 0.9 + 0.1 * Math.sin(time * 13.1) * Math.sin(time * 7.3) : 1;
    const glow = MathUtils.smoothstep(on, 0.2, 1);
    live.u.time.value = time;
    shared.uTvPower.value = glow * (0.55 + 0.45 * screenLevel) * flicker;
    tv.screenMaterial.uniforms.uTime.value = time;
    tv.screenMaterial.uniforms.uOn.value = on;
    tv.screenMaterial.uniforms.uLevel.value = screenLevel;

    const cursorPos = shared.uCursorPos.value;
    if (shared.uCursorPower.value < 0.02) cursorPos.copy(cursorTarget);
    else cursorPos.lerp(cursorTarget, ease(12));
    shared.uCursorPower.value += (cursorWanted - shared.uCursorPower.value) * ease(6);

    if (playing) {
      eased.lerp(pointer, ease(2.5));
      camera.position.set(base.x + eased.x * setup.parallax[0], base.y - eased.y * setup.parallax[1], base.z);
      camera.lookAt(look);
      updateFocus(camera);
    }

    post.setTime(time);
    post.composer.render(dt);
    css?.renderer.render(css.scene, camera);

    if (pendingCapture && on >= 1) capture();
    if (!readyFired) {
      readyFired = true;
      onReady?.();
    }
  }

  function shouldRun() {
    const settling =
      Boolean(themeShift) ||
      Math.abs(screenTarget - screenLevel) > 0.01 ||
      Math.abs(cursorWanted - shared.uCursorPower.value) > 0.01;
    return Boolean(pendingCapture) || (visible && (playing || settling || power(performance.now()) < 1));
  }

  function loop(now) {
    raf = 0;
    render(now);
    if (shouldRun()) raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  // A still for the before/after frame: a closer, home-video framing of the same set,
  // cropped to 4:3 from the canvas right after it is drawn.
  function capture() {
    const resolve = pendingCapture;
    pendingCapture = null;
    const w = canvas.width;
    const h = canvas.height;
    const aspect = w / h;
    const shot = new PerspectiveCamera(30, aspect, 0.1, 1200);
    if (aspect < 4 / 3) {
      const half = Math.tan(MathUtils.degToRad(15)) * (4 / 3);
      shot.fov = MathUtils.radToDeg(2 * Math.atan(half / aspect));
    }
    shot.updateProjectionMatrix();
    shot.position.set(-1.7, 0.25, 4.5);
    shot.lookAt(-0.15, 0.62, 0);

    const cursorPower = shared.uCursorPower.value;
    shared.uCursorPower.value = 0;
    post.renderPass.camera = shot;
    updateFocus(shot);
    post.composer.render(0);

    let cw = w;
    let ch = w * 0.75;
    if (ch > h) {
      ch = h;
      cw = h * (4 / 3);
    }
    const out = document.createElement('canvas');
    out.width = 1200;
    out.height = 900;
    out.getContext('2d').drawImage(canvas, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, 1200, 900);

    shared.uCursorPower.value = cursorPower;
    post.renderPass.camera = camera;
    updateFocus(camera);
    post.composer.render(0);
    resolve(out);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    onLost?.();
  });

  resize();

  return {
    startsStill: still,
    setPlaying(next) {
      playing = next;
      kick();
    },
    setVisible(next) {
      visible = next;
      if (next) kick();
    },
    setTheme,
    setSeason,
    // Re-fit the set when the page's own layout changes (the deck grows a line, say).
    relayout: resize,
    captureStill() {
      return new Promise((resolve) => {
        pendingCapture = resolve;
        kick();
      });
    },
    // Lays an HTML element (the video player) over the TV's whole glass, in the scene's
    // perspective. `width`/`height` are the element's own CSS pixels, in the glass's proportions.
    mountScreen(element, container, { width = 640 } = {}) {
      const height = Math.round((width * tv.shape.screenH) / tv.shape.screenW);
      const cssRenderer = new CSS3DRenderer();
      cssRenderer.domElement.classList.add('screen-layer');
