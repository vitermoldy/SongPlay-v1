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

// What a worn tape does to the same frame: soft luma, chroma smeared sideways, faded colour
// with a magenta cast and lifted blacks, noise, dropouts and a torn band at the bottom.
export function vhsify(source, outW = W, outH = H) {
  const w = 640;
  const h = 480;
  const small = makeCanvas(300, h);
  small.getContext('2d').drawImage(source, 0, 0, 300, h);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(small, 0, 0, w, h);

  const image = g.getImageData(0, 0, w, h);
  const d = image.data;
  const src = new Uint8ClampedArray(d);
  const rand = rng(1994);

  for (let y = 0; y < h; y++) {
    const tail = y / h;
    let shift = 0;
    if (tail > 0.9) shift = Math.round((rand() - 0.5) * 10 + (tail - 0.9) * 170);
    else if (rand() < 0.006) shift = Math.round((rand() - 0.5) * 8);
    const wobble = Math.sin(y * 0.05) * 1.2;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const sx = clamp(Math.round(x - shift - wobble), 0, w - 1);
      const sr = clamp(sx - 5, 0, w - 1);
      const sb = clamp(sx + 4, 0, w - 1);
      let r = src[(row + sr) * 4];
      let gg = src[(row + sx) * 4 + 1];
      let b = src[(row + sb) * 4 + 2];
      const l = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = l + (r - l) * 0.6;
      gg = l + (gg - l) * 0.6;
      b = l + (b - l) * 0.6;
      const n = (rand() - 0.5) * 30;
      const i = (row + x) * 4;
      d[i] = r * 0.84 + 36 + n;
      d[i + 1] = gg * 0.8 + 20 + n * 0.9;
      d[i + 2] = b * 0.8 + 42 + n;
    }
  }

  for (let k = 0; k < 18; k++) {
    const y = Math.floor(rand() * h);
    const x0 = Math.floor(rand() * w);
    const len = 8 + Math.floor(rand() * 50);
    for (let x = x0; x < Math.min(w, x0 + len); x++) {
      const i = (y * w + x) * 4;
      const v = 225 + rand() * 30;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    }
  }
  g.putImageData(image, 0, 0);

  g.fillStyle = 'rgba(255, 255, 255, 0.08)';
  g.fillRect(0, h - 10, w, 10);

  g.fillStyle = 'rgba(255, 255, 255, 0.92)';
  g.shadowColor = 'rgba(0, 0, 0, 0.5)';
  g.shadowBlur = 4;
  g.font = '700 22px "Nunito Sans Variable", sans-serif';
  g.fillText('PLAY', 34, 50);
  g.beginPath();
  g.moveTo(98, 32);
  g.lineTo(98, 52);
  g.lineTo(114, 42);
  g.closePath();
  g.fill();
  g.fillText('SP', w - 66, 50);

  const out = makeCanvas(outW, outH);
  const og = out.getContext('2d');
  og.imageSmoothingQuality = 'high';
  og.drawImage(c, 0, 0, outW, outH);
  return out;
}

function cleanCopy(source, outW, outH) {
  const out = makeCanvas(outW, outH);
  const og = out.getContext('2d');
  og.imageSmoothingQuality = 'high';
  og.drawImage(source, 0, 0, outW, outH);
  return out;
}

// Make the pictures as wide as the frame is drawn on this screen, never more than the source.
function outputSize(root) {
  const px = Math.round(root.clientWidth * Math.min(window.devicePixelRatio || 1, 2));
  const w = Math.max(480, Math.min(W, px || W));
  return [w, Math.round((w * 3) / 4)];
}

function toUrl(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.86);
  });
}

function swap(img, url) {
  const old = img.currentSrc || img.src;
  img.src = url;
  if (old && old.startsWith('blob:')) img.addEventListener('load', () => URL.revokeObjectURL(old), { once: true });
}

export function initCompare(root) {
  const before = root.querySelector('[data-before]');
  const after = root.querySelector('[data-after]');
  const range = root.querySelector('[data-compare-range]');
  let dragging = false;

  const set = (value) => {
    const pos = clamp(value, 0, 100);
    root.style.setProperty('--pos', `${pos}%`);
    range.value = String(Math.round(pos));
    range.setAttribute('aria-valuetext', `Divider at ${Math.round(pos)} percent, corrected frame on the right`);
  };

  const fromPointer = (event) => {
    const rect = root.getBoundingClientRect();
    set(((event.clientX - rect.left) / rect.width) * 100);
  };

  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // A click on the "Drag to compare" label focuses the slider; it should not move the line.
    if (event.target.closest('label')) return;
    dragging = true;
    root.setPointerCapture(event.pointerId);
    fromPointer(event);
  });
  root.addEventListener('pointermove', (event) => {
    if (dragging) fromPointer(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, () => {
      dragging = false;
    });
  }
  range.addEventListener('input', () => set(Number(range.value)));
  set(50);

  let version = 0;
  return {
    async setSource(source) {
      const mine = ++version;
      const [w, h] = outputSize(root);
      const [b, a] = await Promise.all([toUrl(vhsify(source, w, h)), toUrl(cleanCopy(source, w, h))]);
