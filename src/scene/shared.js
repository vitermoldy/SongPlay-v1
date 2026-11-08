import { Color } from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hex colours are written in sRGB; Color converts them to the linear working space.
export const col = (hex) => new Color(hex);

// Colours that stay the same in every theme (the sky's live in themes.js).
export const PALETTE = {
  tv: '#ffbf6e',
