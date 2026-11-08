import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial } from 'three';
import { mulberry32 } from './shared.js';

// What drifts through the air. uShape 0: motes, some round, some soft five-point stars (dust,
// or fireflies at night); 1: round snowflakes; 2: petals or leaves, spinning as they fall;
// 3: rain streaks.
// The near ones are larger and blurrier, like out-of-focus light.
// uDrift is the fall distance so far, added up frame by frame, so a change of speed between
// seasons never makes the flakes jump.
export function createParticles(count, live) {
  const rand = mulberry32(42);
  const positions = new Float32Array(count * 3);
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -22 + rand() * 44;
    positions[i * 3 + 1] = -1 + rand() * 12;
    positions[i * 3 + 2] = -22 + rand() * 25;
    data[i * 4] = 0.05 + Math.pow(rand(), 2.2) * 0.16;
    data[i * 4 + 1] = rand();
    data[i * 4 + 2] = rand() < 0.45 ? 1 : 0;
    data[i * 4 + 3] = 0.35 + rand() * 0.65;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aData', new BufferAttribute(data, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: live.u.time,
      uDrift: live.u.drift,
      uShape: live.u.particleShape,
      uSize: live.u.particleSize,
      uProj: { value: 800 },
      uColor: { value: live.color('particles.color') },
      uColor2: { value: live.color('particles.color2') },
      uOpacity: live.u.particleOpacity,
    },
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      uniform float uTime;
      uniform float uDrift;
      uniform float uShape;
      uniform float uSize;
      uniform float uProj;
      varying float vSeed;
      varying float vStar;
      varying float vAlpha;
      varying float vBlur;
      varying float vSpin;
      void main() {
        vec3 p = position;
        float seed = aData.y;
        p.y = mod(p.y + 1.0 - uDrift * (0.06 + seed * 0.08), 12.0) - 1.0;
        float sway = uShape > 2.5 ? 0.04 : (uShape > 1.5 ? 0.9 : 0.5);
        p.x += sin(uTime * (0.25 + seed * 0.3) + seed * 6.2831) * sway;
        p.z += cos(uTime * 0.2 + seed * 4.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float depth = -mv.z;
        gl_PointSize = clamp(aData.x * uSize * uProj / depth, 1.5, 72.0);
        vSeed = seed;
        vStar = aData.z;
        vAlpha = aData.w * smoothstep(1.5, 4.0, depth);
        vBlur = 1.0 - smoothstep(3.0, 12.0, depth);
        vSpin = uTime * (0.6 + seed * 1.4) + seed * 6.2831;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uOpacity;
      uniform float uShape;
      varying float vSeed;
      varying float vStar;
      varying float vAlpha;
      varying float vBlur;
      varying float vSpin;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float soft = mix(0.16, 0.34, vBlur);
        float alpha;
        if (uShape < 0.5) {
          float a = atan(c.y, c.x);
          float star = 0.3 + 0.14 * cos(a * 5.0 + vSeed * 6.2831);
          float edge = mix(0.46, star, vStar);
          alpha = 1.0 - smoothstep(edge - soft, edge, length(c));
          alpha *= 0.75;
        } else if (uShape < 1.5) {
          alpha = 1.0 - smoothstep(0.46 - soft, 0.46, length(c));
          alpha *= 0.9;
        } else if (uShape > 2.5) {
          // Rain: a thin streak, slanted a little by the wind.
          float x = c.x + c.y * 0.18;
          alpha = 1.0 - smoothstep(0.016, 0.05 + vBlur * 0.06, abs(x));
