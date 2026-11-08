import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// classic: the boxy 4:3 set of the landing page.
// wide: the player's set, a 16:9 tube with a thin bezel so a video fills the glass edge to edge.
export const TV_SHAPES = {
  classic: {
    bodyW: 1.34,
    bodyH: 1.0,
    bezel: [1.24, 0.9],
    screenW: 0.94,
    screenH: 0.72,
    screenX: -0.04,
    corner: 0.12,
    bulge: 0.05,
    led: [0.53, 0.16],
  },
  wide: {
    bodyW: 1.38,
    bodyH: 0.86,
    bezel: [1.32, 0.76],
    screenW: 1.28,
    screenH: 0.72,
    screenX: 0,
    corner: 0.04,
    bulge: 0.012,
    led: [0.6, 0.026],
  },
};

function screenGeometry({ screenW, screenH, bulge }) {
  const g = new PlaneGeometry(screenW, screenH, 28, 22);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / screenW) * 2;
    const v = (pos.getY(i) / screenH) * 2;
    pos.setZ(i, bulge * (1 - u * u * 0.85) * (1 - v * v * 0.85));
  }
  g.computeVertexNormals();
  return g;
}

export function createTV(shapeName = 'classic') {
  const shape = TV_SHAPES[shapeName];
  const { bodyW, bodyH, screenW, screenH, screenX } = shape;
  const midY = bodyH / 2;
  const group = new Group();

  const shell = new MeshPhysicalMaterial({
    color: '#1830d8',
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.32,
  });
  const face = new MeshStandardMaterial({ color: '#030308', roughness: 0.6, envMapIntensity: 0.12 });
  const dark = new MeshStandardMaterial({ color: '#08090f', roughness: 0.5, metalness: 0.2, envMapIntensity: 0.25 });

  const body = new Mesh(new RoundedBoxGeometry(bodyW, bodyH, 0.92, 5, 0.12), shell);
  body.position.y = midY;
  group.add(body);

  const back = new Mesh(new RoundedBoxGeometry(bodyW * 0.75, bodyH * 0.76, 0.5, 4, 0.1), shell);
  back.position.set(0, midY, -0.56);
  group.add(back);

  const bezel = new Mesh(new RoundedBoxGeometry(shape.bezel[0], shape.bezel[1], 0.06, 4, 0.05), face);
  bezel.position.set(screenX, midY, 0.445);
  group.add(bezel);

  const screenMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOn: { value: 0 },
      uLevel: { value: 1 },
      uAspect: { value: screenW / screenH },
      uCorner: { value: shape.corner },
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
      uniform float uOn;
      uniform float uLevel;
      uniform float uAspect;
      uniform float uCorner;
      varying vec2 vUv;
      float sdRoundRect(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
