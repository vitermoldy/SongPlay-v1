import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { NOISE_GLSL } from './shared.js';

// One height function feeds both the ground mesh and the grass scatter, so blades sit on the ground.
export function heightAt(x, z) {
  const crest = 1.7 * Math.exp(-(x * x) / 20 - (z * z) / 9) - 1.7;
  const leftRise = 1.25 * Math.exp(-((x + 6.4) ** 2) / 8 - ((z - 5.2) ** 2) / 7);
  const rightFar = 1.3 * Math.exp(-((x - 13) ** 2) / 34 - ((z + 16) ** 2) / 26);
  const leftFar = 1.7 * Math.exp(-((x + 16) ** 2) / 50 - ((z + 22) ** 2) / 40);
  const roll = 0.07 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.72) + 0.035 * Math.sin(x * 1.7 + z * 1.1);
  return crest + leftRise + rightFar + leftFar + roll;
}

export function createTerrain(uniforms) {
  const geometry = new PlaneGeometry(110, 80, 220, 160);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -28);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geometry.computeVertexNormals();

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyColor;
      uniform vec3 uGround;
      uniform vec3 uGroundLit;
      uniform vec3 uFogColor;
      uniform vec3 uTvPos;
      uniform vec3 uTvColor;
      uniform float uTvPower;
      uniform vec3 uCursorPos;
      uniform vec3 uCursorColor;
      uniform float uCursorPower;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${NOISE_GLSL}
      void main() {
        vec3 n = normalize(vNormal);
        float k = vnoise(vWorld.xz * 1.4) * 0.6 + vnoise(vWorld.xz * 5.0) * 0.4;
        vec3 base = mix(uGround, uGroundLit, k * 0.7);
        float sun = max(dot(n, uSunDir), 0.0);
        vec3 c = base * (uSunColor * (0.25 + sun * 0.9) + uSkyColor * (0.28 + 0.2 * n.y));
        float d = distance(vWorld, uTvPos);
        c += uTvColor * uTvPower * exp(-d * d / 1.4) * 0.35;
        float cd = distance(vWorld, uCursorPos);
        c += uCursorColor * uCursorPower * exp(-cd * cd / 1.3) * 0.45;
        float dist = distance(cameraPosition, vWorld);
        float fog = smoothstep(uFogNear, uFogFar, dist);
        c = mix(c, uFogColor, fog);
        gl_FragColor = vec4(c, 1.0);
