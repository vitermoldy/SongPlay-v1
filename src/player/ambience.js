// Ambient sound for the player's scene, made in the browser with the Web Audio API: no audio
// files, nothing downloaded. Layers: wind, rain (with thunder now and then), crickets, birds,
// rustling leaves. Each time of day and season sets how loud each layer is; changes fade over.
// The AudioContext is only made from a click (browsers allow sound after a user gesture).

const LAYERS = ['wind', 'rain', 'crickets', 'birds', 'leaves'];
// The volume slider runs 0 to 1; a curve makes its middle sound like the middle.
const MAX_GAIN = 0.8;
const loudness = (volume) => MAX_GAIN * Math.max(0, Math.min(1, volume)) ** 1.6;
const DUCKED = 0.4;

function levelsFor(time, season) {
  const L = { wind: 0.22, rain: 0, crickets: 0, birds: 0, leaves: 0, thunder: 0 };
  if (time === 'night') {
    L.crickets = 0.55;
    L.wind = 0.16;
  } else if (time === 'dusk') {
    L.crickets = 0.22;
    L.birds = 0.06;
  } else if (time === 'sunset') {
    L.birds = 0.2;
    L.crickets = 0.08;
  } else if (time === 'dawn') {
    L.birds = 0.5;
  }

  if (season === 'spring') {
    if (time !== 'night') L.birds = Math.min(0.75, Math.max(L.birds, 0.28) * 1.4);
  } else if (season === 'autumn') {
    L.leaves = 0.4;
    L.wind = 0.27;
    L.birds *= 0.5;
  } else if (season === 'winter') {
    L.wind = 0.32;
    L.crickets = 0;
    L.birds *= 0.25;
  } else if (season === 'rain') {
    L.rain = 1;
    L.wind = 0.16;
    L.crickets *= 0.15;
    L.birds = 0;
    L.thunder = time === 'night' ? 0.9 : 0.55;
  }
  return L;
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

export function createAmbience() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const sr = ctx.sampleRate;
  const rand = rng(2026);

  const buffer = (seconds) => ctx.createBuffer(1, Math.round(sr * seconds), sr);

  // ---------- Sources, made once ----------

  function pinkNoise(seconds) {
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return b;
  }

  // Brown noise for wind and thunder, with its drift taken out so the loop meets itself.
  function brownNoise(seconds) {
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (rand() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const drift = d[d.length - 1] - d[0];
    for (let i = 0; i < d.length; i++) d[i] -= (drift * i) / (d.length - 1);
    return b;
  }

  // Raindrops: many tiny, quickly fading pings at random pitches.
  function droplets(seconds) {
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    const count = Math.round(seconds * 260);
    const len = Math.round(sr * 0.012);
    for (let n = 0; n < count; n++) {
      const start = Math.floor(rand() * (d.length - len));
      const f = 1400 + rand() * 4200;
      const amp = 0.03 + rand() * 0.16;
      for (let k = 0; k < len; k++) {
        d[start + k] += amp * Math.exp(-k / (len * 0.18)) * Math.sin((2 * Math.PI * f * k) / sr);
      }
    }
    return b;
  }

  // Three crickets with their own pitch and rhythm; 2.4 s holds a whole number of each cycle.
  function crickets() {
    const seconds = 2.4;
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    const voices = [
      { f: 4300, period: 0.6, offset: 0.05, amp: 0.2 },
      { f: 4750, period: 0.8, offset: 0.33, amp: 0.14 },
      { f: 5150, period: 1.2, offset: 0.71, amp: 0.1 },
    ];
    const pulse = Math.round(sr * 0.026);
    for (const v of voices) {
      for (let t0 = v.offset; t0 < seconds - 0.2; t0 += v.period) {
        for (let p = 0; p < 3; p++) {
          const start = Math.round((t0 + p / 22) * sr);
          for (let k = 0; k < pulse && start + k < d.length; k++) {
            const env = Math.sin((Math.PI * k) / pulse) ** 2;
            d[start + k] += v.amp * env * Math.sin((2 * Math.PI * v.f * (start + k)) / sr);
          }
        }
      }
    }
    return b;
  }

  // A few birds: trills, falling whistles and two-note calls, scattered over eight seconds.
  function birds() {
    const seconds = 8;
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    const note = (start, dur, f1, f2, amp) => {
      const s = Math.round(start * sr);
      const n = Math.round(dur * sr);
      let phase = 0;
      for (let k = 0; k < n && s + k < d.length; k++) {
        const t = k / n;
        const f = f1 + (f2 - f1) * t + Math.sin(k / sr * 2 * Math.PI * 28) * 60;
        phase += (2 * Math.PI * f) / sr;
        const env = Math.min(1, t * 12) * Math.min(1, (1 - t) * 6);
        d[s + k] += amp * env * Math.sin(phase);
      }
    };
    const starts = [0.3, 1.5, 2.4, 3.6, 4.7, 5.5, 6.6];
    for (const t0 of starts) {
      const kind = rand();
      const amp = 0.08 + rand() * 0.1;
      if (kind < 0.35) {
        const f = 3600 + rand() * 1400;
        const notes = 6 + Math.floor(rand() * 5);
        for (let i = 0; i < notes; i++) note(t0 + i * 0.065, 0.045, f, f + 300, amp);
      } else if (kind < 0.7) {
        for (let i = 0; i < 2; i++) note(t0 + i * 0.2, 0.16, 4600 - rand() * 400, 2600, amp);
      } else {
        note(t0, 0.1, 2900, 3400, amp);
        note(t0 + 0.14, 0.12, 3800, 4300, amp);
      }
    }
    return b;
  }

  // Dry leaves: short bursts of noise, crackly inside, at random.
  function rustle() {
    const seconds = 6;
    const b = buffer(seconds);
    const d = b.getChannelData(0);
    for (let n = 0; n < 34; n++) {
      const start = Math.floor(rand() * (d.length - sr * 0.4));
      const len = Math.round(sr * (0.05 + rand() * 0.3));
      const amp = 0.2 + rand() * 0.5;
      for (let k = 0; k < len; k++) {
        const t = k / len;
        const env = Math.min(1, t * 20) * (1 - t) ** 2;
        const crackle = rand() < 0.02 ? 3 : 1;
        d[start + k] += amp * env * crackle * (rand() * 2 - 1);
      }
    }
    return b;
  }

  // ---------- The graph ----------

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  compressor.connect(ctx.destination);
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(compressor);

  const layers = {};
  for (const name of LAYERS) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    layers[name] = g;
  }

  const loop = (buf, ...chain) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    let node = src;
    for (const next of chain) {
      node.connect(next);
      node = next;
    }
    src.start(0, rand() * buf.duration);
    return src;
  };
  const filter = (type, frequency, Q = 0.7) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = Q;
    return f;
  };
  const lfo = (rate, depth, target) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    osc.connect(g).connect(target);
    osc.start();
  };
  const pan = (value) => {
    const p = ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  };

  // Wind: brown noise through a low-pass that opens and closes, with slow gusts.
  const windTone = filter('lowpass', 480);
  const gust = ctx.createGain();
  gust.gain.value = 0.75;
  lfo(0.05, 260, windTone.frequency);
  lfo(0.13, 0.3, gust.gain);
  loop(brownNoise(9), windTone, gust, layers.wind);

  // Rain: a hiss bed and the patter of drops.
  const bed = ctx.createGain();
  bed.gain.value = 0.7;
  loop(pinkNoise(5), filter('highpass', 350), filter('lowpass', 6500), bed, layers.rain);
