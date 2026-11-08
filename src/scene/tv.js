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
