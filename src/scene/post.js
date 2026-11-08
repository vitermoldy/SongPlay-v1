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
      float amount = smoothstep(0.2, 0.75, length(d));
      amount = max(amount, smoothstep(0.32, 0.0, vUv.y) * 0.95);
      float radius = amount * uMaxRadius;
      vec4 sum = vec4(0.0);
      float total = 0.0;
      for (int i = -6; i <= 6; i++) {
        float f = float(i);
        float w = exp(-f * f / 18.0);
        sum += texture2D(tDiffuse, vUv + uDir * f * radius / (6.0 * uResolution)) * w;
        total += w;
      }
      gl_FragColor = sum / total;
    }
  `,
};

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
  },
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float g = hash(vUv * vec2(1931.0, 1087.0) + fract(uTime * 7.0) * 113.0) - 0.5;
      c.rgb += g * uGrain;
      vec2 q = vUv - 0.5;
      c.rgb *= mix(0.8, 1.0, smoothstep(0.86, 0.3, length(q * vec2(1.0, 1.1))));
      gl_FragColor = c;
