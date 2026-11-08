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
