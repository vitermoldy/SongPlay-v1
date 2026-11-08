import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three';
import { NOISE_GLSL, mulberry32 } from './shared.js';

// Every function here takes `live`: the theme's colours as Color objects (live.color(path)),
// a few shared uniforms (live.u) and the sun direction. Materials hold those same objects, so a
// theme change only has to update them.

// `forReflections` drops the warm horizon, the sun and the stars, so glossy surfaces mirror
// plain sky (the TV's side panel stays blue) instead of a peach band.
export function createSky(live, { forReflections = false } = {}) {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: live.color('sky.top') },
      uMid: { value: live.color('sky.mid') },
      uLow: { value: live.color('sky.low') },
      uHorizon: { value: live.color(forReflections ? 'sky.low' : 'sky.horizon') },
      uSunColor: { value: forReflections ? new Color(0, 0, 0) : live.color('sky.sun') },
      uSunDir: { value: live.sunDir },
      uStars: forReflections ? { value: 0 } : live.u.stars,
      uTime: live.u.time,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uLow;
      uniform vec3 uHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uStars;
      uniform float uTime;
      varying vec3 vDir;
      float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
      }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = mix(uHorizon, uLow, smoothstep(-0.01, 0.07, y));
        c = mix(c, uMid, smoothstep(0.06, 0.26, y));
        c = mix(c, uTop, smoothstep(0.28, 0.8, y));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        c += uSunColor * (pow(s, 24.0) * 0.32 + pow(s, 220.0) * 0.8);
        // The disc itself: the sun low on the horizon, or the moon at night.
        c += uSunColor * smoothstep(0.99955, 0.9998, s) * 1.6;

        // Stars sit in cells on the sky sphere; large and bright enough to survive the soft
        // focus the background gets, a few of them twinkling.
        if (uStars > 0.001) {
          vec3 g = d * 170.0;
          float h = hash13(floor(g));
          if (h > 0.982) {
            float r = length(fract(g) - 0.5);
            float twinkle = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 80.0);
            float star = smoothstep(0.34, 0.0, r) * twinkle * (0.35 + 0.65 * (h - 0.982) / 0.018);
            c += vec3(0.85, 0.9, 1.0) * star * 4.0 * uStars * smoothstep(0.02, 0.22, y);
          }
        }
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const mesh = new Mesh(new SphereGeometry(500, 48, 24), material);
  mesh.renderOrder = -10;
  return mesh;
}

const CLOUDS = [
  // x, y, z, width, height, seed, opacity
  [5, 7.5, -62, 40, 13, 3.1, 0.9],
  [-32, 13, -78, 50, 12, 8.4, 0.75],
  [38, 4, -70, 48, 11, 1.7, 0.85],
  [26, 20, -86, 40, 9, 5.9, 0.55],
  [-20, 3.5, -66, 34, 8, 11.2, 0.6],
];

export function createClouds(live) {
  return CLOUDS.map(([x, y, z, w, h, seed, opacity]) => {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: live.u.time,
        uSeed: { value: seed },
        uOpacity: { value: opacity },
        uFade: live.u.cloudOpacity,
        uLit: { value: live.color('clouds.lit') },
        uShade: { value: live.color('clouds.shade') },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uSeed;
        uniform float uOpacity;
        uniform float uFade;
        uniform vec3 uLit;
        uniform vec3 uShade;
        varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec2 q = (vUv - 0.5) * vec2(1.0, 1.9);
          float shape = smoothstep(0.56, 0.08, length(q));
          vec2 p = vUv * vec2(4.2, 2.1) + vec2(uSeed, uSeed * 0.37) + vec2(uTime * 0.01, 0.0);
          float warp = fbm(p * 0.7);
          float n = fbm(p + warp * 1.6);
          float dens = smoothstep(0.4, 0.74, n) * shape;
          dens *= smoothstep(0.02, 0.38, vUv.y + (n - 0.5) * 0.3);
          vec3 c = mix(uShade, uLit, smoothstep(0.2, 0.85, vUv.y + (n - 0.5) * 0.6));
          gl_FragColor = vec4(c * 0.92, dens * uOpacity * uFade);
        }
      `,
    });
    const mesh = new Mesh(new PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = -5;
    return mesh;
  });
}

function ridge(seed, width, base, peak) {
  const rand = mulberry32(seed);
  const shape = new Shape();
  shape.moveTo(-width / 2, -30);
  const phases = [rand() * 6, rand() * 6, rand() * 6];
  for (let x = -width / 2; x <= width / 2; x += 1.5) {
    const y =
      base +
