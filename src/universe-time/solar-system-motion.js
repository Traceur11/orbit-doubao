/**
 * solar-system-motion.js — THREE visuals for the Solar System's Galactic orbit.
 *
 * Renders, at Galactic scale:
 *   - a full parameterized orbit ring around the Galactic center,
 *   - a bright "recent path" tail arc behind the current position,
 *   - a pulsing SOLAR SYSTEM marker whose position is a pure function of the
 *     simulation year (getSolarSystemGalacticPosition).
 *
 * The ring and the tail are single Line objects with preallocated buffers;
 * only the tail's positions are rewritten per frame (no per-frame allocations,
 * no new geometries/materials). This is a visualization approximation, not an
 * N-body simulation (see docs/GALACTIC_TIME_MODEL.md).
 */

import * as THREE from 'three';
import { glow } from '../core/glow.js';
import { clamp } from '../core/math.js';
import { TAU, getSolarSystemGalacticPosition, sampleGalacticOrbit, GALACTIC_ORBIT_PARAMS } from '../universe-time/galactic-orbit.js';

const RING_POINTS = 512;
const TAIL_POINTS = 56;
const TAIL_SPAN = TAU * 0.16; // ~16% of the orbit behind the current position

export function createGalacticMotion(scene, params = GALACTIC_ORBIT_PARAMS) {
  const group = new THREE.Group();
  group.name = 'galactic-solar-motion';
  group.visible = false;

  // Full orbit ring.
  const ringPositions = sampleGalacticOrbit(RING_POINTS, params);
  const ringGeometry = new THREE.BufferGeometry();
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  const ringMaterial = new THREE.LineBasicMaterial({
    color: 0x4f7f9a, transparent: true, opacity: 0.22, depthWrite: false,
  });
  const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
  ring.name = 'galactic-orbit-ring';
  group.add(ring);

  // Recent-path tail arc (positions rewritten per frame).
  const tailArray = new Float32Array(TAIL_POINTS * 3);
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailArray, 3));
  const tailMaterial = new THREE.LineBasicMaterial({
    color: 0x93ecdc, transparent: true, opacity: 0.85, depthWrite: false,
  });
  const tail = new THREE.Line(tailGeometry, tailMaterial);
  tail.name = 'galactic-orbit-tail';
  group.add(tail);

  // Pulsing marker: a soft halo + a bright core.
  const markerHalo = glow(0x93ecdc, 1500, 0.4);
  const markerCore = glow(0xd9fff7, 520, 0.9);
  const markerGroup = new THREE.Group();
  markerGroup.name = 'galactic-solar-marker';
  markerGroup.add(markerHalo, markerCore);
  group.add(markerGroup);

  scene.add(group);

  const markerPosition = new THREE.Vector3();
  const tailSample = new THREE.Vector3();
  const tailPositions = tail.geometry.attributes.position;

  // Distance-adaptive marker size: grow the halo as the camera pulls out so
  // the SOLAR SYSTEM stays visible at Galactic scale, shrink again in deep
  // space. This only changes the visual marker, never the orbit geometry.
  function setMarkerScale(dist) {
    const base = clamp(dist * 0.000022, 1, 3.2);
    markerGroup.userData.distanceScale = base;
  }

  function update(year, timeSec = 0) {
    const { x, y, z, angle } = getSolarSystemGalacticPosition(year, params);
    markerPosition.set(x, y, z);
    markerGroup.position.copy(markerPosition);

    // Pulse the marker (opacity + gentle scale breathing) on top of any
    // distance-adaptive base scale.
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.6);
    markerHalo.material.opacity = 0.28 + pulse * 0.22;
    const base = markerGroup.userData.distanceScale || 1;
    const scale = base * (1 + pulse * 0.18);
    markerGroup.scale.setScalar(scale);

    // Rewrite the tail arc from (angle - TAIL_SPAN) to angle.
    const startAngle = angle - TAIL_SPAN;
    for (let i = 0; i < TAIL_POINTS; i++) {
      const a = startAngle + (TAIL_SPAN * i) / (TAIL_POINTS - 1);
      const sample = getSolarSystemGalacticPosition(
        params.referenceYear + ((a - params.referenceAngle) / TAU) * params.galacticYear, params);
      tailSample.set(sample.x, sample.y, sample.z);
      tailPositions.setXYZ(i, tailSample.x, tailSample.y, tailSample.z);
    }
    tailPositions.needsUpdate = true;
  }

  function getPosition(out = new THREE.Vector3()) {
    return out.copy(markerPosition);
  }

  function dispose() {
    ringGeometry.dispose();
    ringMaterial.dispose();
    tailGeometry.dispose();
    tailMaterial.dispose();
    markerHalo.material.dispose();
    markerHalo.material.map?.dispose();
    markerCore.material.dispose();
    markerCore.material.map?.dispose();
    scene.remove(group);
  }

  return { group, ring, tail, markerGroup, update, getPosition, setMarkerScale, dispose };
}
