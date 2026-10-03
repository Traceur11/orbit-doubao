/**
 * solar-system-motion.js — THREE visuals for the Solar System's Galactic orbit.
 *
 * Renders, at Galactic scale:
 *   - the orbit ring painted as an Earth-history TIME AXIS (each orbit segment
 *     takes the geological-period color of its simulation year),
 *   - clickable epoch nodes on the orbit (timeline keys + period boundaries +
 *     historical events, merged and de-duplicated),
 *   - a bright "recent path" tail arc behind the current position,
 *   - a pulsing SOLAR SYSTEM marker whose position is a pure function of the
 *     simulation year (getSolarSystemGalacticPosition).
 *
 * All heavy geometry (ring buffers, one InstancedMesh for the nodes) is built
 * once at startup and only cheaply updated per frame — no per-frame
 * allocations, no new geometries/materials. This is a visualization
 * approximation, not an N-body simulation (see docs/GALACTIC_TIME_MODEL.md).
 */

import * as THREE from 'three';
import { glow } from '../core/glow.js';
import { clamp } from '../core/math.js';
import {
  TAU, getSolarSystemGalacticPosition, sampleGalacticOrbit,
  getYearForAngle, GALACTIC_ORBIT_PARAMS,
} from '../universe-time/galactic-orbit.js';
import { buildEpochNodes, buildRingSegmentColors } from '../universe-time/galactic-epoch-nodes.js';
import { getPeriod } from '../universe-time/geological-time.js';

const RING_POINTS = 512;
const TAIL_POINTS = 56;
const TAIL_SPAN = TAU * 0.16; // ~16% of the orbit behind the current position

/* ------------------------------------------------------------------ *
 *  Scene construction                                                  *
 * ------------------------------------------------------------------ */

const NODE_SCALE_BASE = { 1: 64, 2: 34, 3: 20 }; // unit sphere radius = 1

export function createGalacticMotion(scene, params = GALACTIC_ORBIT_PARAMS) {
  const group = new THREE.Group();
  group.name = 'galactic-solar-motion';
  group.visible = false;

  // --- Segmented, time-axis-painted orbit ring (LineSegments + vertex colors).
  const ringPositions = sampleGalacticOrbit(RING_POINTS, params);
  const ringPositionsSegmented = new Float32Array(RING_POINTS * 2 * 3);
  for (let i = 0; i < RING_POINTS; i++) {
    const a = i * 3, b = ((i + 1) % RING_POINTS) * 3;
    ringPositionsSegmented[i * 6] = ringPositions[a];
    ringPositionsSegmented[i * 6 + 1] = ringPositions[a + 1];
    ringPositionsSegmented[i * 6 + 2] = ringPositions[a + 2];
    ringPositionsSegmented[i * 6 + 3] = ringPositions[b];
    ringPositionsSegmented[i * 6 + 4] = ringPositions[b + 1];
    ringPositionsSegmented[i * 6 + 5] = ringPositions[b + 2];
  }
  const ringGeometry = new THREE.BufferGeometry();
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositionsSegmented, 3));
  ringGeometry.setAttribute('color', new THREE.BufferAttribute(buildRingSegmentColors(RING_POINTS, params), 3));
  const ringMaterial = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const ring = new THREE.LineSegments(ringGeometry, ringMaterial);
  ring.name = 'galactic-orbit-ring';
  group.add(ring);

  // --- Epoch nodes: one InstancedMesh, reused sphere geometry/material.
  const epochNodesData = buildEpochNodes(2026);
  const nodeGeometry = new THREE.SphereGeometry(1, 10, 6);
  const nodeMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
  const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, epochNodesData.length);
  nodeMesh.name = 'galactic-epoch-nodes';
  nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const nodePositions = epochNodesData.map(data => {
    const { x, y, z } = getSolarSystemGalacticPosition(data.year, params);
    return { position: new THREE.Vector3(x, y, z), scale: NODE_SCALE_BASE[data.kind] || 20, data };
  });
  const nodeColor = new THREE.Color();
  const nodeQuaternion = new THREE.Quaternion();
  const nodeScale = new THREE.Vector3();
  for (let i = 0; i < nodePositions.length; i++) {
    const { position, scale, data } = nodePositions[i];
    nodeScale.setScalar(scale);
    nodeMesh.setMatrixAt(i, new THREE.Matrix4().compose(position, nodeQuaternion, nodeScale));
    nodeColor.set(data.color);
    nodeMesh.setColorAt(i, nodeColor);
  }
  nodeMesh.instanceMatrix.needsUpdate = true;
  nodeMesh.instanceColor.needsUpdate = true;
  nodeMesh.userData.epochNodes = epochNodesData;
  group.add(nodeMesh);

  // --- Recent-path tail arc (positions rewritten per frame).
  const tailArray = new Float32Array(TAIL_POINTS * 3);
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailArray, 3));
  const tailMaterial = new THREE.LineBasicMaterial({
    color: 0x93ecdc, transparent: true, opacity: 0.85, depthWrite: false,
  });
  const tail = new THREE.Line(tailGeometry, tailMaterial);
  tail.name = 'galactic-orbit-tail';
  group.add(tail);

  // --- Pulsing marker: a soft halo + a bright core.
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
  const instanceMatrix = new THREE.Matrix4();
  const instanceQuaternion = new THREE.Quaternion();
  const instanceScale = new THREE.Vector3();
  const highlightColor = new THREE.Color();
  const white = new THREE.Color(1, 1, 1);

  // Distance-adaptive marker size: grow the halo as the camera pulls out so
  // the SOLAR SYSTEM stays visible at Galactic scale, shrink again in deep
  // space. Also scales the epoch nodes so they stay clickable from far away.
  function setMarkerScale(dist) {
    const base = clamp(dist * 0.000022, 1, 3.2);
    markerGroup.userData.distanceScale = base;
    for (let i = 0; i < nodePositions.length; i++) {
      const { position, scale } = nodePositions[i];
      instanceScale.setScalar(scale * base);
      instanceMatrix.compose(position, instanceQuaternion, instanceScale);
      nodeMesh.setMatrixAt(i, instanceMatrix);
    }
    nodeMesh.instanceMatrix.needsUpdate = true;
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
      const sample = getSolarSystemGalacticPosition(getYearForAngle(a, params), params);
      tailSample.set(sample.x, sample.y, sample.z);
      tailPositions.setXYZ(i, tailSample.x, tailSample.y, tailSample.z);
    }
    tailPositions.needsUpdate = true;

    // Highlight the boundary node of the period containing the current year.
    if (nodeMesh.instanceColor) {
      const period = getPeriod(year);
      for (let i = 0; i < nodePositions.length; i++) {
        const { data } = nodePositions[i];
        let color = data.color;
        if (period && data.kind <= 2
          && (data.year === period.startYear || data.year === period.endYear)) {
          highlightColor.set(data.color).lerp(white, 0.45);
          color = `#${highlightColor.getHexString()}`;
        }
        nodeColor.set(color);
        nodeMesh.setColorAt(i, nodeColor);
      }
      nodeMesh.instanceColor.needsUpdate = true;
    }
  }

  function getPosition(out = new THREE.Vector3()) {
    return out.copy(markerPosition);
  }

  /** Raycast against the epoch-node mesh; returns the node or null. */
  function pickEpoch(raycaster) {
    if (!nodeMesh.visible) return null;
    const hit = raycaster.intersectObject(nodeMesh, false)[0];
    if (!hit || hit.instanceId === undefined || hit.instanceId < 0) return null;
    return epochNodesData[hit.instanceId] || null;
  }

  function getEpochNodes() {
    return epochNodesData.map((data, index) => ({
      ...data, position: nodePositions[index].position,
    }));
  }

  function dispose() {
    ringGeometry.dispose();
    ringMaterial.dispose();
    tailGeometry.dispose();
    tailMaterial.dispose();
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    markerHalo.material.dispose();
    markerHalo.material.map?.dispose();
    markerCore.material.dispose();
    markerCore.material.map?.dispose();
    scene.remove(group);
  }

  return {
    group, ring, tail, markerGroup, nodeMesh,
    update, getPosition, setMarkerScale, pickEpoch, getEpochNodes, dispose,
  };
}
