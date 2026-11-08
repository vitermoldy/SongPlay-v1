import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const passVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A separable blur whose radius grows away from the television, standing in for a shallow
// depth of field: the set is sharp, the near grass and the far sky go soft.
const FocusBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uDir: { value: new Vector2(1, 0) },
    uFocus: { value: new Vector2(0.5, 0.42) },
    uAspect: { value: 1.6 },
    uMaxRadius: { value: 9 },
  },
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uDir;
    uniform vec2 uFocus;
    uniform float uAspect;
    uniform float uMaxRadius;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - uFocus) * vec2(uAspect * 0.75, 1.1);
