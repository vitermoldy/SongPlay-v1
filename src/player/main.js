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
