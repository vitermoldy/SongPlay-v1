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
const soundVolume = $('[data-sound-volume]');
const soundValue = $('[data-sound-value]');

function syncSound() {
  ui.sound.dataset.on = String(soundOn);
  ui.sound.title = `Ambient sound: ${soundOn ? `on, ${volume}%` : 'off'}`;
  soundSwitch.setAttribute('aria-pressed', String(soundOn));
  soundVolume.value = String(volume);
  soundVolume.setAttribute('aria-valuetext', `${volume} percent`);
  soundValue.textContent = `${volume}%`;
}

async function setSound(on) {
  soundOn = on;
  syncSound();
  remember(SOUND_KEY, on ? 'on' : 'off');
  if (!on) {
    ambience?.setEnabled(false);
    return;
  }
  try {
    ambience ??= createAmbience();
    ambience.setScene(theme, season);
    ambience.setVolume(volume / 100);
    ambience.setDucked(state.status === 'playing');
    ambience.setHidden(document.hidden);
    await ambience.setEnabled(true);
  } catch (error) {
    console.warn('Ambient sound could not start.', error);
    soundOn = false;
    syncSound();
    say('Ambient sound could not start in this browser.');
  }
}

function setSoundPanel(open) {
  ui.sound.setAttribute('aria-expanded', String(open));
  soundPanel.hidden = !open;
}

ui.sound.addEventListener('click', () => setSoundPanel(soundPanel.hidden));
soundSwitch.addEventListener('click', () => setSound(!soundOn));

soundVolume.addEventListener('input', () => {
  volume = Number(soundVolume.value);
  remember(VOLUME_KEY, String(volume));
  // Turning the volume up from silence is a way of asking for sound.
  if (volume > 0 && (!soundOn || !ambience?.running)) setSound(true);
  else {
    ambience?.setVolume(volume / 100);
    syncSound();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !soundPanel.hidden) {
    setSoundPanel(false);
    ui.sound.focus();
  }
});
document.addEventListener('pointerdown', (event) => {
  if (!soundPanel.hidden && !event.target.closest('[data-sound]')) setSoundPanel(false);
});
syncSound();

// Sound left on last visit starts with the first touch of the page: browsers allow sound only
// after a gesture. The switch and the slider act for themselves.
if (soundOn) {
  const startOnFirstGesture = (event) => {
    if (event.target.closest?.('[data-sound-switch], [data-sound-volume]')) return;
    document.removeEventListener('pointerdown', startOnFirstGesture);
    document.removeEventListener('keydown', startOnFirstGesture);
    if (soundOn && !ambience?.running) setSound(true);
  };
  document.addEventListener('pointerdown', startOnFirstGesture);
  document.addEventListener('keydown', startOnFirstGesture);
}

document.addEventListener('visibilitychange', () => ambience?.setHidden(document.hidden));

// The free part of the stage the TV must fit in: under the header, over the deck, inside the
// viewfinder frame, in the stage's own pixels. The pickers (when they hang under the header)
// and the scene button are listed to avoid: the scene moves the set below them only if it
// would run into them.
function frameArea() {
  const stage = ui.stage.getBoundingClientRect();
  const local = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - stage.left, right: r.right - stage.left, top: r.top - stage.top, bottom: r.bottom - stage.top };
  };
  const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame')) || 12;
  const header = document.querySelector('.site-header').getBoundingClientRect().bottom - stage.top;
  // A dropdown open above the deck (phones) takes its room from the TV while it is open.
  const panelAbove = !ui.queuePanel.hidden && ui.queuePanel.dataset.place === 'above';
  const floor = (panelAbove ? ui.queuePanel : ui.deck).getBoundingClientRect().top;
  return {
    top: header + 18,
    bottom: floor - stage.top - 18,
    left: edge + 6,
    right: stage.width - edge - 6,
    avoid: [ui.pickers, ui.sceneToggle].filter((el) => el && !el.hidden).map(local),
  };
}

// ---------- Queue state ----------

const ACTIVE = new Set(['loading', 'playing', 'paused']);
const state = {
  items: loadQueue(),
  current: -1,
  status: 'idle', // idle | loading | playing | paused | ended | error
  message: '',
  videoTitle: '',
};

function isValid(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.kind === 'video') return /^[\w-]{11}$/.test(item.id);
  return item.kind === 'playlist' && /^[\w-]{12,}$/.test(item.list);
}

function loadQueue() {
  try {
    const items = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(items) ? items.filter(isValid) : [];
  } catch {
    return [];
  }
}

function saveQueue() {
  try {
    const keep = state.items.map(({ uid, kind, id, list, index, title, author, thumb, problem }) => ({
      uid,
      kind,
      id,
      list,
      index,
      title,
      author,
      thumb,
      problem,
    }));
    localStorage.setItem(STORE_KEY, JSON.stringify(keep));
  } catch {
    // Private windows and blocked storage: the queue simply lasts for this visit.
  }
}

let uidCount = 0;
const makeUid = () => `${Date.now().toString(36)}${(uidCount++).toString(36)}`;
const titleOf = (item) => item?.title || (item?.kind === 'playlist' ? 'YouTube playlist' : 'YouTube video');
const safeThumb = (url) => (typeof url === 'string' && /^https:\/\/i\d?\.ytimg\.com\//.test(url) ? url : '');

// ---------- Rendering ----------

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function say(text) {
  // Re-set even the same words so a screen reader hears a repeat.
  ui.announce.textContent = '';
  requestAnimationFrame(() => {
    ui.announce.textContent = text;
  });
}

function nowLine() {
  const item = state.items[state.current];
  const title = state.videoTitle || titleOf(item);
  const fromList = item?.kind === 'playlist' && item.title && state.videoTitle ? ` · from ${item.title}` : '';
  switch (state.status) {
    case 'loading':
      return `Tuning in: ${titleOf(item)}`;
    case 'playing':
      return `Now playing: ${title}${fromList}`;
    case 'paused':
      return `Paused: ${title}${fromList}`;
    case 'ended':
    case 'error':
      return state.message;
    default:
      return state.items.length
        ? `${state.items.length} in the queue. Press play to start.`
        : 'Nothing on yet. Paste a YouTube link to put a song on.';
  }
}

function queueRow(item, index) {
  const li = document.createElement('li');
  li.className = 'queue-item';
  const current = index === state.current && state.status !== 'idle';
  li.classList.toggle('is-current', current);
  li.classList.toggle('has-problem', Boolean(item.problem));

  const thumb = document.createElement('img');
  thumb.className = 'queue-thumb';
  thumb.width = 96;
  thumb.height = 54;
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.decoding = 'async';
  const src = safeThumb(item.thumb);
  if (src) thumb.src = src;

  const meta = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'queue-title';
  title.textContent = titleOf(item);
  const sub = document.createElement('p');
  sub.className = 'queue-sub';
  if (current && state.status === 'playing') sub.textContent = 'Now playing';
  else if (current && state.status === 'paused') sub.textContent = 'Paused';
  else if (current && state.status === 'loading') sub.textContent = 'Tuning in';
  else if (item.problem) sub.textContent = `Can’t play: ${item.problem}`;
  else if (item.kind === 'playlist') sub.textContent = item.author ? `Playlist · ${item.author}` : 'Playlist';
  else sub.textContent = item.author || (item.title ? 'YouTube' : 'Getting the title…');
  meta.append(title, sub);

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'icon-btn';
  play.setAttribute('aria-label', `Play ${titleOf(item)}`);
  play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z"/></svg>';
  play.addEventListener('click', () => playIndex(index));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-btn';
  remove.setAttribute('aria-label', `Remove ${titleOf(item)} from the queue`);
  remove.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z"/></svg>';
  remove.addEventListener('click', () => removeAt(index));

  li.append(thumb, meta, play, remove);
  return li;
}

function render() {
  setText(ui.now, nowLine());
  const count = state.items.length;
  setText(ui.queueCount, String(count));
  ui.queueEmpty.hidden = count > 0;
  ui.clear.hidden = count === 0;

  // Rebuilding the list would drop focus from a row button; keep it on the same row if so.
  const focusedRow = ui.queueList.contains(document.activeElement)
    ? [...ui.queueList.children].indexOf(document.activeElement.closest('li'))
    : -1;
  const focusedSlot = focusedRow >= 0 ? [...document.activeElement.closest('li').querySelectorAll('button')].indexOf(document.activeElement) : -1;
  ui.queueList.replaceChildren(...state.items.map(queueRow));
  if (focusedRow >= 0) {
    const row = ui.queueList.children[Math.min(focusedRow, count - 1)];
    (row?.querySelectorAll('button')[focusedSlot] ?? ui.queueToggle).focus();
  }

  const playingNow = state.status === 'playing' || state.status === 'loading';
  ui.toggle.dataset.state = playingNow ? 'playing' : 'paused';
  ui.toggle.setAttribute('aria-label', playingNow ? 'Pause' : 'Play');
  ui.toggle.disabled = count === 0;
  ui.prev.disabled = count === 0 || !ACTIVE.has(state.status);
  ui.next.disabled = count === 0 || !ACTIVE.has(state.status);
  ambience?.setDucked(state.status === 'playing');
}

function bumpCount() {
  ui.queueCount.classList.remove('is-bumped');
  void ui.queueCount.offsetWidth;
  ui.queueCount.classList.add('is-bumped');
}

// ---------- The scene ----------

let scene = null;

function webglAvailable() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

async function initScene() {
  if (!webglAvailable()) {
    ui.video.classList.add('is-flat');
    return;
  }
  const lowPower =
    window.matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  let playing = false;
  const sync = () => {
    ui.sceneToggle.dataset.paused = String(!playing);
    ui.sceneLabel.textContent = playing ? 'Pause scene' : 'Play scene';
    scene.setPlaying(playing);
  };
  try {
    const { createScene } = await import('../scene/index.js');
    scene = createScene(ui.canvas, {
      variant: 'player',
      theme,
      season,
      frameArea,
      lowPower,
      reducedMotion: reduceMotion.matches,
      onReady: () => ui.stage.classList.add('is-live'),
      onLost: () => ui.stage.classList.remove('is-live'),
      onSlow: () => {
        playing = false;
        sync();
      },
    });
    scene.mountScreen(ui.video, ui.stage, { width: 640 });
