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
