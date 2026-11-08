import '@fontsource/dancing-script/latin-700.css';
import '@fontsource-variable/nunito-sans/wght.css';
import './styles.css';
import { initCompare, paintStandIn } from './compare.js';
import { initRequestForm } from './form.js';
import { initCursorLight } from './cursor-light.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function initHeader() {
  const header = document.querySelector('[data-header]');
  let queued = false;
  const update = () => {
    queued = false;
    header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.5);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const outside = [document.querySelector('main'), document.querySelector('.site-footer')];
  let open = false;

  function setOpen(next, restoreFocus = true) {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    for (const el of outside) el.inert = open;
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      menu.querySelector('a').focus();
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
      if (restoreFocus) toggle.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false, false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false, false);
  });
}

// In-page links glide to their section and hand it keyboard focus, so the next Tab starts
// there. Done here rather than with CSS smooth scrolling, which also slows every Tab jump.
function initAnchors() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.pushState(null, '', `#${id}`);
  });
}

function webglAvailable() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

async function initScene(compare) {
  const hero = document.querySelector('[data-hero]');
  const canvas = hero.querySelector('[data-scene]');
  const toggle = hero.querySelector('[data-scene-toggle]');
  const label = toggle.querySelector('[data-scene-label]');

  // Without WebGL the painted CSS sky stays as the hero's still.
  if (!webglAvailable()) return;

  const lowPower =
    window.matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

  let scene;
  let playing = false;
  const sync = () => {
    toggle.dataset.paused = String(!playing);
    label.textContent = playing ? 'Pause scene' : 'Play scene';
    scene.setPlaying(playing);
  };

  try {
    const { createScene } = await import('./scene/index.js');
    scene = createScene(canvas, {
      lowPower,
      reducedMotion: reduceMotion.matches,
      onReady: () => hero.classList.add('is-live'),
      onLost: () => hero.classList.remove('is-live'),
      // Too slow to animate smoothly here: settle on the still frame, Play stays one click away.
      onSlow: () => {
        playing = false;
        sync();
      },
    });
  } catch (error) {
    console.warn('The 3D scene could not start; keeping the still sky.', error);
    return;
  }

