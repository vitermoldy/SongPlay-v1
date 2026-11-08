// A warm pool of light that follows a mouse over the page, the 2D cousin of the lamp the
// cursor holds over the grass in the 3D scenes. Areas listed in `skip` (the scene itself,
// which lights its own grass) turn it off. Touch and pen get nothing: there is no hover.
export function initCursorLight({ skip = [] } = {}) {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
