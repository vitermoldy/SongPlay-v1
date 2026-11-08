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
