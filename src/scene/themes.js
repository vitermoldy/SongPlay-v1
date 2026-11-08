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
