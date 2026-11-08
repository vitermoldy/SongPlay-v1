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
