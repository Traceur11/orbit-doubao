/**
 * timeline-controller.js — piecewise log-linear mapping between the COSMIC
 * TIME bar (position 0..1) and simulation years.
 *
 * A single linear or single-log scale would squeeze the deep past into a few
 * pixels, so the timeline uses PIECEWISE LOG-LINEAR segments between
 * hand-placed key years: within each segment the mapping is linear in
 * log(years-ago), which keeps both deep history and recent history usable.
 *
 * Key positions are design choices; years are simulation years.
 * The final segment ends at the present with a tiny epsilon so the mapping
 * is well-defined and exactly round-trips the present year.
 */

/**
 * ICS 2026/06-aligned anchors (V3 timeline upgrade: more clickable geological
 * gates — Hadean/Archean, 1.8 Ga, 1.0 Ga, Cryogenian, Ediacaran, Silurian,
 * Devonian, Carboniferous, Permian, Neogene, Holocene). Positions are UI
 * design values; years are simulation years (negative = before present).
 */
export const TIMELINE_KEYS = Object.freeze([
  { p: 0.0, year: -4_540_000_000, label: '4.54 Ga' },
  { p: 0.055, year: -4_031_000_000, label: '4.031 Ga' },
  { p: 0.11, year: -2_500_000_000, label: '2.5 Ga' },
  { p: 0.17, year: -1_800_000_000, label: '1.8 Ga' },
  { p: 0.23, year: -1_000_000_000, label: '1.0 Ga' },
  { p: 0.29, year: -720_000_000, label: '720 Ma' },
  { p: 0.34, year: -635_000_000, label: '635 Ma' },
  { p: 0.39, year: -538_800_000, label: '538.8 Ma' },
  { p: 0.44, year: -443_100_000, label: '443.1 Ma' },
  { p: 0.49, year: -419_620_000, label: '419.62 Ma' },
  { p: 0.54, year: -358_860_000, label: '358.86 Ma' },
  { p: 0.59, year: -298_900_000, label: '298.9 Ma' },
  { p: 0.64, year: -251_902_000, label: '251.902 Ma' },
  { p: 0.69, year: -201_400_000, label: '201.4 Ma' },
  { p: 0.75, year: -143_100_000, label: '143.1 Ma' },
  { p: 0.81, year: -66_000_000, label: '66 Ma' },
  { p: 0.86, year: -23_030_000, label: '23.03 Ma' },
  { p: 0.91, year: -2_580_000, label: '2.58 Ma' },
  { p: 0.95, year: -11_700, label: '11.7 ka' },
  { p: 1.0, year: 2026, label: 'NOW' },
]);

/** Playback speed multipliers; 1× advances 1 year per second. */
export const SPEED_PRESETS = Object.freeze([0.1, 1, 10, 100, 1e3, 1e6, 1e9]);
export const BASE_YEARS_PER_SECOND = 1;

/** Epsilon used at the present end of the last segment (half a year). */
const EPSILON = 0.5;
/** Future mapping is allowed up to this position (≈ +1.2 Ga). */
const MAX_POSITION = 1.25;

export class TimelineController {
  /**
   * @param {object} [options]
   * @param {number} [options.nowYear]
   * @param {Array}  [options.keys] segment keys [{p, year, label}]
   */
  constructor({ nowYear = 2026, keys = TIMELINE_KEYS } = {}) {
    if (!Number.isFinite(nowYear)) throw new TypeError('TimelineController: nowYear must be finite.');
    this.nowYear = nowYear;
    this.keys = keys.slice().sort((a, b) => a.p - b.p);
    if (this.keys.length < 2) throw new RangeError('TimelineController: at least two keys required.');
    // The final key ("NOW") always anchors at the controller's present year,
    // so a custom nowYear keeps the present exactly at position 1.
    const last = this.keys[this.keys.length - 1];
    if (last.year !== nowYear) this.keys[this.keys.length - 1] = { ...last, year: nowYear };
    this._segments = this.keys.slice(0, -1).map((key, i) => ({
      p0: key.p, p1: this.keys[i + 1].p,
      a0: Math.max(nowYear - key.year, EPSILON),
      a1: Math.max(nowYear - this.keys[i + 1].year, EPSILON),
    }));
  }

  /** Index of the segment containing `position`. */
  segmentAtPosition(position) {
    if (position <= this._segments[0].p0) return 0;
    for (let i = 0; i < this._segments.length; i++) {
      if (position <= this._segments[i].p1) return i;
    }
    return this._segments.length - 1;
  }

  /** Simulation year → timeline position (clamped). */
  yearToPosition(year) {
    if (!Number.isFinite(year)) throw new TypeError('yearToPosition: year must be finite.');
    if (year > this.nowYear) {
      // Future: extend the last segment in log space.
      const last = this._segments[this._segments.length - 1];
      const futureAge = Math.max(year - this.nowYear + 1, EPSILON);
      const logSpan = Math.log(last.a0 / last.a1);
      const p = last.p1 + (last.p1 - last.p0) * Math.log(futureAge) / logSpan;
      return Math.min(MAX_POSITION, Math.max(0, p));
    }
    const age = Math.max(this.nowYear - year, EPSILON);
    const i = this._segments.findIndex(seg => age <= seg.a0 && age >= seg.a1);
    const segment = this._segments[i >= 0 ? i : 0];
    const t = (Math.log(age) - Math.log(segment.a0)) / (Math.log(segment.a1) - Math.log(segment.a0));
    return segment.p0 + (segment.p1 - segment.p0) * t;
  }

  /** Timeline position → simulation year (clamped to the timeline domain). */
  positionToYear(position) {
    if (!Number.isFinite(position)) throw new TypeError('positionToYear: position must be finite.');
    if (position >= 1) {
      // Future: inverse of the last-segment log extension.
      const last = this._segments[this._segments.length - 1];
      const p = Math.min(position, MAX_POSITION);
      const logFuture = ((p - last.p1) / (last.p1 - last.p0)) * Math.log(last.a0 / last.a1);
      const futureAge = Math.exp(logFuture);
      return this.nowYear + Math.round(futureAge) - 1;
    }
    if (position <= 0) return this.keys[0].year;
    const i = this.segmentAtPosition(position);
    const segment = this._segments[i];
    const t = (position - segment.p0) / (segment.p1 - segment.p0);
    const logAge = Math.log(segment.a0) + t * (Math.log(segment.a1) - Math.log(segment.a0));
    return this.nowYear - Math.round(Math.exp(logAge));
  }

  /** The key index nearest to (at or below) a position. */
  keyIndexAtPosition(position) {
    let index = 0;
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i].p <= position) index = i;
    }
    return index;
  }

  /**
   * Step the timeline to the previous (-1) or next (+1) key relative to a year.
   * Returns { year, position } or null when there is no such key.
   */
  step(year, direction) {
    if (direction !== -1 && direction !== 1) throw new RangeError('step: direction must be -1 or 1.');
    const p = this.yearToPosition(year);
    const index = this.keyIndexAtPosition(p);
    const target = index + direction;
    if (target < 0 || target >= this.keys.length) return null;
    const key = this.keys[target];
    return { year: key.year, position: key.p };
  }
}

/** Export the design positions of the main geological marks for UI ticks. */
export function getTimelineTicks(keys = TIMELINE_KEYS) {
  return keys.map(key => ({ ...key }));
}
