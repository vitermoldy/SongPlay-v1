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

  g.fillStyle = '#5b62a8';
  g.beginPath();
  g.moveTo(0, H * 0.74);
  g.bezierCurveTo(W * 0.3, H * 0.66, W * 0.6, H * 0.76, W, H * 0.68);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();

  const hill = g.createLinearGradient(0, H * 0.7, 0, H);
  hill.addColorStop(0, '#3a4a1c');
  hill.addColorStop(1, '#10170c');
  g.fillStyle = hill;
  g.beginPath();
  g.ellipse(W * 0.5, H * 1.14, W * 0.78, H * 0.42, 0, 0, Math.PI * 2);
  g.fill();

  const tw = W * 0.26;
  const th = tw * 0.75;
  const tx = W * 0.5 - tw / 2;
  const ty = H * 0.72 - th;
  g.strokeStyle = '#14161f';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(W * 0.5, ty);
  g.lineTo(W * 0.42, ty - H * 0.24);
  g.moveTo(W * 0.5, ty);
  g.lineTo(W * 0.56, ty - H * 0.22);
  g.stroke();
  g.fillStyle = '#1c2668';
  g.beginPath();
  g.roundRect(tx, ty, tw, th, 22);
  g.fill();
  g.save();
  g.shadowColor = 'rgba(255, 197, 107, 0.95)';
  g.shadowBlur = 90;
  const screen = g.createRadialGradient(W * 0.5, ty + th / 2, 4, W * 0.5, ty + th / 2, tw * 0.45);
  screen.addColorStop(0, '#fffaf0');
  screen.addColorStop(0.55, '#ffe2a8');
  screen.addColorStop(1, '#ffab4a');
  g.fillStyle = screen;
  g.beginPath();
  g.roundRect(tx + tw * 0.08, ty + th * 0.1, tw * 0.78, th * 0.8, 18);
  g.fill();
  g.restore();

  for (let i = 0; i < 2200; i++) {
    const x = rand() * W;
    const base = H * 0.7 + Math.abs(x - W / 2) * 0.12 + rand() * H * 0.3;
    const len = 12 + rand() * 34;
    const tone = 40 + rand() * 90;
    g.strokeStyle = `rgba(${tone + 60}, ${tone + 50}, ${tone * 0.4}, ${0.35 + rand() * 0.5})`;
    g.lineWidth = 1 + rand() * 1.5;
    g.beginPath();
    g.moveTo(x, base);
    g.lineTo(x + (rand() - 0.3) * 10, base - len);
    g.stroke();
  }
  return c;
}

