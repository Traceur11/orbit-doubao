/**
 * UniverseClock — a wall-clock-independent simulation clock for ORBIT 2.0.
 *
 * Simulation years are plain numbers. Negative values mean "before the common
 * era" (e.g. -66_000_000 = 66 million years ago). The UI never displays raw
 * negative numbers directly; use the formatters in cosmic-time.js instead.
 *
 * The clock supports past, present and future:
 *   -6,000,000,000 ──► -4,540,000,000 ──► ... ──► -66,000,000 ──► ... ──► 2026 ──► future
 */
export const DEFAULT_NOW_YEAR = 2026;
export const MIN_SIMULATION_YEAR = -6_000_000_000;
export const MAX_SIMULATION_YEAR = 5_000_000_000;

export class UniverseClock {
  /**
   * @param {object} [options]
   * @param {number} [options.year] initial simulation year (defaults to nowYear)
   * @param {number} [options.nowYear] the "present" reference year (defaults to DEFAULT_NOW_YEAR)
   * @param {number} [options.minYear] lower clamp (defaults to MIN_SIMULATION_YEAR)
   * @param {number} [options.maxYear] upper clamp (defaults to MAX_SIMULATION_YEAR)
   */
  constructor({ year, nowYear = DEFAULT_NOW_YEAR, minYear = MIN_SIMULATION_YEAR, maxYear = MAX_SIMULATION_YEAR } = {}) {
    if (!Number.isFinite(nowYear)) throw new TypeError('UniverseClock: nowYear must be a finite number.');
    if (!Number.isFinite(minYear) || !Number.isFinite(maxYear) || minYear > maxYear) {
      throw new RangeError('UniverseClock: invalid simulation range.');
    }
    this.nowYear = nowYear;
    this.minYear = minYear;
    this.maxYear = maxYear;
    this._year = this.clampYear(year === undefined ? nowYear : year);
  }

  clampYear(year) {
    return Math.min(this.maxYear, Math.max(this.minYear, year));
  }

  /** Current simulation year. */
  getYear() {
    return this._year;
  }

  /** "Present" reference year. */
  getNowYear() {
    return this.nowYear;
  }

  /** Set the simulation year (clamped to the simulation range). */
  setYear(year) {
    if (!Number.isFinite(year)) throw new TypeError('UniverseClock: year must be a finite number.');
    this._year = this.clampYear(year);
    return this._year;
  }

  /** Advance the simulation by dy years (clamped). */
  advanceYears(dy) {
    if (!Number.isFinite(dy)) throw new TypeError('UniverseClock: dy must be a finite number.');
    this._year = this.clampYear(this._year + dy);
    return this._year;
  }

  /** Years before the present reference year (positive = past). */
  getYearsAgo(year = this._year) {
    return this.nowYear - year;
  }

  /** True when the simulation year is before the present reference year. */
  isPast(year = this._year) {
    return year < this.nowYear;
  }

  /** True when the simulation year is after the present reference year. */
  isFuture(year = this._year) {
    return year > this.nowYear;
  }

  /** True when the simulation year equals the present reference year. */
  isPresent(year = this._year) {
    return year === this.nowYear;
  }
}
