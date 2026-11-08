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
