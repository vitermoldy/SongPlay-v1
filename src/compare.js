const W = 1200;
const H = 900;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Painted stand-in of the hero set, shown until the 3D still is ready or when WebGL is missing.
export function paintStandIn() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rand = rng(7);

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2232b8');
  sky.addColorStop(0.4, '#4a5fe4');
  sky.addColorStop(0.6, '#8d9cf2');
  sky.addColorStop(0.74, '#f1bfa6');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const sun = g.createRadialGradient(W * 0.85, H * 0.72, 0, W * 0.85, H * 0.72, W * 0.4);
  sun.addColorStop(0, 'rgba(255, 196, 140, 0.7)');
  sun.addColorStop(1, 'rgba(255, 196, 140, 0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

