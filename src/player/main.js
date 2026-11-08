import '@fontsource-variable/nunito-sans/wght.css';
import '../styles.css';
import './player.css';
import { describeError, fetchInfo, loadYouTubeApi, parseYouTube } from './youtube.js';
import { createAmbience } from './ambience.js';

const STORE_KEY = 'songlearn.queue.v1';
const THEME_KEY = 'songlearn.theme';
const THEME_NAMES = ['dusk', 'night', 'sunset', 'dawn'];
const SEASON_KEY = 'songlearn.season';
const SOUND_KEY = 'songlearn.sound';
const VOLUME_KEY = 'songlearn.volume';
const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter', 'rain'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector) => document.querySelector(selector);

const ui = {
  stage: $('[data-stage]'),
  canvas: $('[data-scene]'),
  video: $('[data-tv-video]'),
  now: $('[data-now]'),
  announce: $('[data-announce]'),
  form: $('[data-add]'),
  input: $('#song-link'),
  error: $('#song-link-error'),
  prev: $('[data-prev]'),
  toggle: $('[data-toggle]'),
  next: $('[data-next]'),
  queueToggle: $('[data-queue-toggle]'),
  queuePanel: $('[data-queue-panel]'),
  queueList: $('[data-queue-list]'),
  queueEmpty: $('[data-queue-empty]'),
  queueCount: $('[data-queue-count]'),
  clear: $('[data-queue-clear]'),
  sceneToggle: $('[data-scene-toggle]'),
  sceneLabel: $('[data-scene-label]'),
  themes: $('[data-themes]'),
  seasons: $('[data-seasons]'),
  pickers: $('[data-pickers]'),
  deck: $('.deck'),
  sound: $('[data-sound-toggle]'),
};

// ---------- Time of day and season (per-browser preferences) ----------

function saved(key, names, fallback) {
  try {
    const name = localStorage.getItem(key);
    return names.includes(name) ? name : fallback;
  } catch {
    return fallback;
  }
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice simply resets on the next visit.
  }
}

let theme = saved(THEME_KEY, THEME_NAMES, 'dusk');
let season = saved(SEASON_KEY, SEASON_NAMES, 'summer');
ui.stage.dataset.theme = theme;
ui.stage.dataset.season = season;
ui.themes.querySelector(`input[value="${theme}"]`).checked = true;
ui.seasons.querySelector(`input[value="${season}"]`).checked = true;

ui.themes.addEventListener('change', (event) => {
  const name = event.target.value;
  if (!THEME_NAMES.includes(name) || name === theme) return;
  theme = name;
  ui.stage.dataset.theme = name;
  scene?.setTheme(name);
  ambience?.setScene(theme, season);
  remember(THEME_KEY, name);
});

ui.seasons.addEventListener('change', (event) => {
  const name = event.target.value;
  if (!SEASON_NAMES.includes(name) || name === season) return;
  season = name;
  ui.stage.dataset.season = name;
  scene?.setSeason(name);
  ambience?.setScene(theme, season);
  remember(SEASON_KEY, name);
});

// ---------- Ambient sound for the scene (off until asked for) ----------

// The speaker button in the header opens a small panel: an on/off switch and the volume.
let ambience = null;
let soundOn = saved(SOUND_KEY, ['on', 'off'], 'off') === 'on';
let volume = (() => {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 100 ? v : 70;
  } catch {
    return 70;
  }
})();

const soundPanel = $('[data-sound-panel]');
const soundSwitch = $('[data-sound-switch]');
