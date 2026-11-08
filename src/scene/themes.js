import { Color } from 'three';

// Times of day: the sky, the sun (or the moon), the light. Colours are sRGB hex; `sunDir`
// points at the sun and also sets which side of the grass catches the rim light. Grass and
// ground here are the summer colours as each light shows them; seasons repaint them (below).
// `light.particles` tints a season's falling things (snow, petals, leaves) for this light.
