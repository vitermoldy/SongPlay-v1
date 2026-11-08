// A warm pool of light that follows a mouse over the page, the 2D cousin of the lamp the
// cursor holds over the grass in the 3D scenes. Areas listed in `skip` (the scene itself,
// which lights its own grass) turn it off. Touch and pen get nothing: there is no hover.
export function initCursorLight({ skip = [] } = {}) {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const light = document.createElement('div');
  light.className = 'cursor-light';
  light.setAttribute('aria-hidden', 'true');
  document.body.append(light);

  let x = -1000;
  let y = -1000;
  let queued = false;
  const place = () => {
    queued = false;
    light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const overSkipped = (px, py) =>
    skip.some((el) => {
      const r = el.getBoundingClientRect();
      return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
    });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse' || !fine.matches) return;
      x = event.clientX;
      y = event.clientY;
      const target = event.target instanceof Element ? event.target : null;
      light.classList.toggle('is-on', !overSkipped(x, y));
      light.classList.toggle('is-paper', Boolean(target?.closest('.on-light')));
      if (!queued) {
        queued = true;
        requestAnimationFrame(place);
      }
    },
    { passive: true },
  );

  // Scrolling moves the page under a still cursor: re-check whether it now sits over a scene.
  window.addEventListener(
    'scroll',
    () => {
      if (x < 0) return;
      light.classList.toggle('is-on', !overSkipped(x, y));
      const under = document.elementFromPoint(x, y);
