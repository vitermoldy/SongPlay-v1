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
