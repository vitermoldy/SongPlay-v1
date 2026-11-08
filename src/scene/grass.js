import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import { mulberry32 } from './shared.js';

// Grass is one instanced blade. Each instance carries its root position and four numbers
// (yaw, height, width, seed); bending and wind happen in the vertex shader.
export function createGrass({ count, heightAt, tv, camera, clearFront = false, uniforms }) {
  const blade = new PlaneGeometry(1, 1, 1, 5);
  blade.translate(0, 0.5, 0);

  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(blade.getIndex());
  geometry.setAttribute('position', blade.getAttribute('position'));
  geometry.setAttribute('uv', blade.getAttribute('uv'));

  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  const rand = mulberry32(1987);
  const cosY = Math.cos(-tv.yaw);
  const sinY = Math.sin(-tv.yaw);

  let i = 0;
  let guard = 0;
  while (i < count && guard++ < count * 20) {
    const far = rand() < 0.22;
    const x = far ? -34 + rand() * 68 : -14 + rand() * 28;
    const z = far ? -26 + rand() * 22 : -4 + rand() * 12.4;

    // Keep blades out of the television body.
    const lx = (x - tv.x) * cosY - (z - tv.z) * sinY;
    const lz = (x - tv.x) * sinY + (z - tv.z) * cosY;
    if (Math.abs(lx) < (tv.halfW ?? 0.62) && Math.abs(lz) < (tv.halfD ?? 0.5)) continue;

    // Thin out the grass right under the lens so the foreground stays a soft frame.
    const dx = x - camera.x;
    const dz = z - camera.z;
    const dCam = Math.hypot(dx, dz);
    if (dCam < 1.1) continue;
    if (dCam < 3 && rand() > (dCam - 1.1) / 1.9 + (x < -2 ? 0.45 : 0)) continue;

    const y = heightAt(x, z);
    offsets[i * 3] = x;
    offsets[i * 3 + 1] = y - 0.03;
    offsets[i * 3 + 2] = z;

    const nearTv = Math.hypot(x - tv.x, z - tv.z) < 1.6;
    // On the player page the camera looks at the screen from close by: keep the blades just in
    // front of the set short so none of them should cross the video.
    const inFront = clearFront && Math.abs(lx) < 1.3 && lz > 0.4 && lz < 3.4;
    const tall = far ? 1.6 : inFront ? 0.32 : nearTv ? 0.8 : 1;
    params[i * 4] = rand() * Math.PI * 2;
    params[i * 4 + 1] = (0.2 + rand() * 0.26) * tall;
    params[i * 4 + 2] = (0.035 + rand() * 0.03) * (far ? 2.2 : 1);
    params[i * 4 + 3] = rand();
    i++;
  }

  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4));
  geometry.instanceCount = i;

  const material = new ShaderMaterial({
    uniforms,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec4 aParams;
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWind;
      varying float vH;
      varying float vSeed;
      varying vec3 vWorld;
      void main() {
        float h = uv.y;
        float yaw = aParams.x;
        float height = aParams.y;
        float width = aParams.z;
        float seed = aParams.w;

        vec3 p = position;
        p.x *= width * (1.0 - pow(h, 1.35) * 0.92);
        p.y *= height;
        p.z += (0.12 + seed * 0.3) * height * h * h;

        float c = cos(yaw);
        float s = sin(yaw);
        vec3 r = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);

        float phase = dot(aOffset.xz, vec2(0.42, 0.17));
        float gust = sin(phase * 0.6 - uTime * 0.85) * 0.5 + 0.5;
        float sway = sin(phase + uTime * 2.0 + seed * 6.2831) * 0.3 + sin(phase * 2.3 + uTime * 3.4) * 0.12;
        float bend = (sway + gust * 0.8) * uWind * h * h * height;
        r.xz += uWindDir * bend;
        r.y -= abs(bend) * 0.3 * h;

        vec3 world = aOffset + r;
        vH = h;
        vSeed = seed;
        vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uMid;
      uniform vec3 uTip;
      uniform vec3 uTipGold;
      uniform vec3 uBack;
      uniform vec3 uSkyColor;
      uniform vec3 uSunDir;
      uniform vec3 uTvPos;
      uniform vec3 uTvColor;
      uniform float uTvPower;
      uniform vec3 uCursorPos;
      uniform vec3 uCursorColor;
      uniform float uCursorPower;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying float vH;
      varying float vSeed;
      varying vec3 vWorld;
      void main() {
        vec3 tip = mix(uTip, uTipGold, step(0.62, fract(vSeed * 7.31)));
        vec3 c = mix(uBase, uMid, smoothstep(0.0, 0.55, vH));
        c = mix(c, tip, smoothstep(0.4, 1.0, vH) * (0.45 + vSeed * 0.55));
        c *= 0.62 + vSeed * 0.5;

        vec3 v = normalize(vWorld - cameraPosition);
        float back = pow(max(dot(v, uSunDir), 0.0), 14.0);
        c += uBack * back * vH * vH * 1.1;
        c += uSkyColor * 0.08 * vH * (0.5 + vSeed);

        float d = distance(vWorld, uTvPos);
        float lit = exp(-d * d / 1.1) * uTvPower;
        c += uTvColor * lit * (0.15 + vH) * 1.2;

        // The visitor's cursor is a lamp held over the grass: the tips catch most of it.
        float cd = distance(vWorld, uCursorPos);
        float cursor = exp(-cd * cd / 1.3) * uCursorPower;
        c += uCursorColor * cursor * (0.35 + vH * vH * 4.2);

        float fog = smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorld));
        c = mix(c, uFogColor, fog);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
