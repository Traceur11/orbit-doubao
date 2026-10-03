/**
 * galactic-epoch-nodes.js — pure data builders for the orbit-as-time-axis
 * visualization (no THREE, no DOM, unit-testable in plain Node).
 *
 * The Solar System's Galactic trajectory is painted as an Earth-history time
 * axis: the ring's segments take the geological-period color of their
 * simulation year, and clickable epoch nodes mark key timeline stops, period
 * boundaries and historical events.
 *
 * This is a visualization approximation, not an N-body simulation or an
 * observed ephemeris (see docs/GALACTIC_TIME_MODEL.md).
 */

import { TAU, getYearForAngle, getOrbitYearColor, GALACTIC_ORBIT_PARAMS } from './galactic-orbit.js';
import { TIMELINE_KEYS } from './timeline-controller.js';
import { EONS, ERAS, PERIODS, EPOCHS } from './geological-time.js';
import { HISTORICAL_EVENTS } from './historical-events.js';

/** Two distinct node years closer than this merge into the higher-priority one. */
export const NODE_MERGE_YEARS = 2_000_000;

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  if (!Number.isFinite(value)) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(v => v / 255);
}

/**
 * Build the orbit epoch-node table: timeline keys (kind 1) + geological unit
 * boundaries (kind 2) + historical events (kind 3), sorted by year and merged
 * when two years fall within NODE_MERGE_YEARS (higher priority wins).
 * @param {number} nowYear present reference year
 * @returns {Array<{id:string,year:number,name:string,cn:string,kind:number,color:string,category?:string}>}
 */
export function buildEpochNodes(nowYear = 2026) {
  const candidates = [];
  for (const key of TIMELINE_KEYS) {
    candidates.push({
      id: `timeline-${Math.round(key.year)}`, year: key.year,
      name: key.label, cn: key.label, kind: 1, priority: 0,
    });
  }
  for (const unit of [...EONS, ...ERAS, ...PERIODS, ...EPOCHS]) {
    candidates.push({
      id: unit.id, year: unit.startYear,
      name: unit.englishName, cn: unit.name, kind: 2, priority: 1,
    });
  }
  for (const event of HISTORICAL_EVENTS) {
    candidates.push({
      id: event.id, year: event.year,
      name: event.englishName, cn: event.name, kind: 3, priority: 2,
      category: event.category,
    });
  }
  // Merge: sort by year (stable), keep the highest-priority entry within the
  // merge window; the surviving node takes the finer kind.
  candidates.sort((a, b) => a.year - b.year || a.priority - b.priority);
  const merged = [];
  for (const candidate of candidates) {
    const previous = merged[merged.length - 1];
    if (previous && Math.abs(previous.year - candidate.year) <= NODE_MERGE_YEARS) {
      if (candidate.priority < previous.priority) {
        merged[merged.length - 1] = { ...candidate, kind: Math.min(previous.kind, candidate.kind) };
      }
      continue;
    }
    merged.push(candidate);
  }
  return merged.map(node => ({
    id: node.id,
    year: node.year,
    name: node.name,
    cn: node.cn,
    kind: node.kind,
    category: node.category,
    color: getOrbitYearColor(node.year),
    nowYear,
  }));
}

/**
 * Per-vertex colors for the segmented orbit ring: segment i's midpoint year
 * maps to the geological-period color, so the whole ring reads as a time axis.
 * @returns {Float32Array} length sampleCount * 2 * 3 (two vertices per segment)
 */
export function buildRingSegmentColors(sampleCount = 512, params = GALACTIC_ORBIT_PARAMS) {
  if (!Number.isInteger(sampleCount) || sampleCount < 3) throw new RangeError('buildRingSegmentColors: sampleCount must be an integer >= 3.');
  const out = new Float32Array(sampleCount * 2 * 3);
  for (let i = 0; i < sampleCount; i++) {
    const a0 = (i / sampleCount) * TAU;
    const a1 = ((i + 1) / sampleCount) * TAU;
    const year = getYearForAngle((a0 + a1) / 2, params);
    const [r, g, b] = hexToRgb(getOrbitYearColor(year));
    out[i * 6] = r; out[i * 6 + 1] = g; out[i * 6 + 2] = b;
    out[i * 6 + 3] = r; out[i * 6 + 4] = g; out[i * 6 + 5] = b;
  }
  return out;
}
