import { Color } from 'three';

// Times of day: the sky, the sun (or the moon), the light. Colours are sRGB hex; `sunDir`
// points at the sun and also sets which side of the grass catches the rim light. Grass and
// ground here are the summer colours as each light shows them; seasons repaint them (below).
// `light.particles` tints a season's falling things (snow, petals, leaves) for this light.
export const THEMES = {
  dusk: {
    label: 'Dusk',
    sky: { top: '#1226c4', mid: '#2f4ae8', low: '#6a80f2', horizon: '#f0ae9c', sun: '#ff9f6a' },
    sunDir: [0.85, 0.04, -1],
    stars: 0,
    haze: '#6874c8',
    clouds: { lit: '#e9ecff', shade: '#f6b4a8', opacity: 1 },
    mountains: { farTop: '#5866bb', farLow: '#8892d6', nearTop: '#2f3c8a', nearLow: '#5f6cbc' },
    grass: { base: '#0b1209', mid: '#24320f', tip: '#6f7a2c', tipGold: '#a98f3c', back: '#ffb455' },
    ground: { dark: '#0d1409', lit: '#202c10' },
    light: { sun: '#ffbe8a', sky: '#6d7cf0', particles: '#ffffff' },
    lamps: { hemiSky: '#6f80ff', hemiGround: '#1c2612', hemi: 0.55, sun: '#ffb57e', sunI: 0.6, fill: '#8a98ff', fillI: 0.35 },
    particles: { color: '#dfe5ff', color2: '#dfe5ff', opacity: 1, fall: 1, size: 1 },
    exposure: 1,
  },
  night: {
    label: 'Night',
    sky: { top: '#03061c', mid: '#081040', low: '#16225e', horizon: '#2b3a78', sun: '#b9c8ff' },
    sunDir: [-0.36, 0.2, -1],
    stars: 1,
    haze: '#141c46',
    clouds: { lit: '#3f4d8c', shade: '#1f2858', opacity: 0.55 },
    mountains: { farTop: '#161f4c', farLow: '#1f2a5e', nearTop: '#0b1134', nearLow: '#141d4a' },
    grass: { base: '#03070a', mid: '#0b1818', tip: '#24403c', tipGold: '#3c5a4c', back: '#8ea6ff' },
    ground: { dark: '#04080a', lit: '#0b1614' },
    light: { sun: '#8ea4ff', sky: '#26368a', particles: '#8494c4' },
    lamps: { hemiSky: '#3a4aa0', hemiGround: '#05080a', hemi: 0.4, sun: '#b8c8ff', sunI: 0.5, fill: '#4050a0', fillI: 0.2 },
    particles: { color: '#ffcf6e', color2: '#ffcf6e', opacity: 1, fall: 1, size: 1 },
    exposure: 1,
  },
  sunset: {
    label: 'Sunset',
    sky: { top: '#24379a', mid: '#d0607a', low: '#ff9058', horizon: '#ffd07a', sun: '#ff8a3a' },
    sunDir: [0.55, 0.05, -1],
    stars: 0,
    haze: '#c98476',
    clouds: { lit: '#ffd3a2', shade: '#b8546a', opacity: 1 },
    mountains: { farTop: '#7a4a7e', farLow: '#b8727e', nearTop: '#4a2e5e', nearLow: '#86567a' },
    grass: { base: '#140d05', mid: '#3a2a0c', tip: '#9a7426', tipGold: '#dca03c', back: '#ffa53a' },
    ground: { dark: '#130c05', lit: '#2e1f0e' },
    light: { sun: '#ffae6c', sky: '#d47a72', particles: '#ffdcbc' },
    lamps: { hemiSky: '#e09080', hemiGround: '#2a1a0e', hemi: 0.6, sun: '#ffa050', sunI: 1, fill: '#9a6aa0', fillI: 0.25 },
    particles: { color: '#ffe2b8', color2: '#ffe2b8', opacity: 0.9, fall: 1, size: 1 },
    exposure: 1,
  },
  dawn: {
    label: 'Dawn',
    sky: { top: '#3f6fd8', mid: '#86aff0', low: '#c6dbf6', horizon: '#ffe2cc', sun: '#fff0c4' },
    sunDir: [-0.8, 0.08, -1],
    stars: 0,
    haze: '#b4c6e8',
    clouds: { lit: '#ffffff', shade: '#f1c9c6', opacity: 0.9 },
    mountains: { farTop: '#8aa0d0', farLow: '#b2c6ea', nearTop: '#5874ae', nearLow: '#8aa4d6' },
    grass: { base: '#0a1607', mid: '#284812', tip: '#66962c', tipGold: '#a6b646', back: '#fff2a6' },
    ground: { dark: '#0c1a08', lit: '#243f18' },
    light: { sun: '#fff0d2', sky: '#9ac0f0', particles: '#ffffff' },
    lamps: { hemiSky: '#b0d0ff', hemiGround: '#20301a', hemi: 0.9, sun: '#fff0d0', sunI: 1, fill: '#c0d8ff', fillI: 0.4 },
    particles: { color: '#ffffff', color2: '#ffffff', opacity: 0.6, fall: 1, size: 1 },
    exposure: 1,
  },
};

// Seasons paint the grass and the ground, and choose what falls through the air. Their colours
// are given as they would look in the dusk light; each time of day then relights them.
// particles.shape: 1 = round snowflakes, 2 = spinning petals or leaves, 3 = rain. No particles: the
// time of day keeps its own motes (dust, or fireflies at night).
export const SEASONS = {
  spring: {
    label: 'Spring',
    grass: { base: '#0f1a0a', mid: '#2f5214', tip: '#7aa83a', tipGold: '#ec9cbc' },
    ground: { dark: '#101c0a', lit: '#28401a' },
    particles: { shape: 2, color: '#ffb6cf', color2: '#ffe3ee', opacity: 0.95, fall: 0.6, size: 1.35 },
  },
  summer: {
    label: 'Summer',
    grass: THEMES.dusk.grass,
    ground: THEMES.dusk.ground,
    particles: null,
  },
  autumn: {
    label: 'Autumn',
    grass: { base: '#1a0e06', mid: '#4a2a0e', tip: '#b8642a', tipGold: '#d89a3a' },
    ground: { dark: '#160c06', lit: '#3a2410' },
    particles: { shape: 2, color: '#e0702a', color2: '#a63a18', opacity: 1, fall: 1.1, size: 1.8 },
  },
  winter: {
    label: 'Winter',
    grass: { base: '#8a96a8', mid: '#c4cedb', tip: '#eef3f8', tipGold: '#ffffff' },
    ground: { dark: '#a6b2c2', lit: '#dde4ec' },
    particles: { shape: 1, color: '#ffffff', color2: '#e2eaff', opacity: 1, fall: 1.7, size: 1.1 },
  },
  // The rainy season also clouds the sky over: `overcast` greys whatever the time of day shows.
  rain: {
    label: 'Rain',
    grass: { base: '#08130a', mid: '#1a3416', tip: '#3f6a34', tipGold: '#5c8048' },
    ground: { dark: '#0a120a', lit: '#1a2a16' },
    overcast: { tint: '#5c6678', amount: 0.62 },
    particles: { shape: 3, color: '#d8e6ff', color2: '#aabedf', opacity: 1, fall: 30, size: 3 },
  },
};

export const THEME_NAMES = Object.keys(THEMES);
export const SEASON_NAMES = Object.keys(SEASONS);

// The colours the scene eases between, as paths into a theme.
export const COLOR_PATHS = [
  'sky.top',
  'sky.mid',
  'sky.low',
  'sky.horizon',
  'sky.sun',
  'haze',
  'clouds.lit',
  'clouds.shade',
  'mountains.farTop',
  'mountains.farLow',
  'mountains.nearTop',
