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
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float edge = sdRoundRect(p, vec2(uAspect * 0.5, 0.5), uCorner);
        if (edge > 0.0) discard;

        float r = length((vUv - 0.5) * vec2(1.0, 1.15));
        vec3 hot = vec3(3.0, 2.7, 1.9);
        vec3 warm = vec3(1.9, 0.95, 0.26);
        vec3 c = mix(hot, warm, smoothstep(0.08, 0.72, r));
        c *= 0.95 + 0.05 * sin(vUv.y * 420.0);
        c *= 0.975 + 0.025 * sin(uTime * 31.0) * sin(uTime * 7.0);
        c *= uLevel;

        // Power-on: a bright line grows across, then the picture opens top to bottom.
        float grow = smoothstep(0.0, 0.25, uOn);
        float open = smoothstep(0.22, 1.0, uOn);
        float halfH = mix(0.008, 0.52, open);
        float halfW = mix(0.0, 0.52, grow);
        float mask = step(abs(vUv.y - 0.5), halfH) * step(abs(vUv.x - 0.5), halfW);
        c *= mask * mix(2.2, 1.0, open);

        vec3 glass = vec3(0.012, 0.014, 0.025);
        gl_FragColor = vec4(mix(glass, c, mask), 1.0);
      }
    `,
  });
  const screen = new Mesh(screenGeometry(shape), screenMaterial);
  screen.position.set(screenX, midY, 0.476);
  group.add(screen);

  const led = new Mesh(new SphereGeometry(0.014, 12, 8), new MeshBasicMaterial({ color: '#cfe4ff' }));
  led.position.set(shape.led[0], shape.led[1], 0.475);
  group.add(led);

  const dome = new Mesh(new SphereGeometry(0.085, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  dome.position.set(0.02, bodyH - 0.01, -0.08);
  group.add(dome);

  const ROD = 0.82;
  const rodGeometry = new CylinderGeometry(0.0075, 0.011, ROD, 8);
  rodGeometry.translate(0, ROD / 2, 0);
  const tipGeometry = new SphereGeometry(0.016, 10, 8);
  for (const [tiltZ, tiltX] of [
    [0.4, -0.1],
    [-0.3, -0.06],
  ]) {
    const rod = new Mesh(rodGeometry, dark);
    rod.position.set(0.02, bodyH + 0.04, -0.08);
    rod.rotation.set(tiltX, 0, tiltZ);
