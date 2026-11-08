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
