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
