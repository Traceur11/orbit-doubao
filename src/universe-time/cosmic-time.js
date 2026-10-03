/**
 * cosmic-time.js — human-readable formatting for simulation years.
 *
 * The UI never shows raw negative numbers: past ages are rendered as
 * "4.54 Ga", "66 Ma", "12,000 BCE" etc., the present as "NOW" / "2026 CE",
 * and future years as "+X Ma" (relative to the present reference year).
 */

const THOUSAND = 1e3;
const MILLION = 1e6;
const BILLION = 1e9;

/** Compact age suffix: 4.54e9 → { value: 4.54, unit: 'Ga' } */
export function decomposeYearsAgo(yearsAgo) {
  if (!Number.isFinite(yearsAgo)) return null;
  const age = Math.abs(yearsAgo);
  if (age >= BILLION) return { value: age / BILLION, unit: 'Ga' };
  if (age >= MILLION) return { value: age / MILLION, unit: 'Ma' };
  if (age >= THOUSAND) return { value: age / THOUSAND, unit: 'ka' };
  return { value: age, unit: 'yr' };
}

/** "4.54 Ga" / "66 Ma" / "12,000 yr" — magnitude-aware, fixed-width-ish. */
export function formatYearsAgo(yearsAgo) {
  const part = decomposeYearsAgo(yearsAgo);
  if (!part) return '—';
  const digits = part.unit === 'yr' ? 0 : part.unit === 'ka' ? Math.round(part.value).toLocaleString('en-US') : part.value.toFixed(2).replace(/\.?0+$/, '');
  return `${digits} ${part.unit}`;
}

/**
 * Format a simulation year as a user-facing label.
 *   formatYear(2026)            → "2026 CE"
 *   formatYear(-66000000)       → "66 Ma"
 *   formatYear(-4540000000)     → "4.54 Ga"
 *   formatYear(-12000)          → "12,000 BCE"
 *   formatYear(4000000000)      → "+4 Ga" (future)
 */
export function formatYear(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return '—';
  if (year === nowYear) return `${nowYear} CE`;
  if (year > nowYear) {
    const future = decomposeYearsAgo(year - nowYear);
    return `+${future.value.toFixed(future.unit === 'Ga' ? 2 : 0).replace(/\.?0+$/, '')} ${future.unit}`;
  }
  const yearsAgo = nowYear - year;
  if (yearsAgo >= BILLION || yearsAgo >= MILLION) return formatYearsAgo(yearsAgo);
  if (yearsAgo >= THOUSAND) {
    // The simulation year directly encodes the BCE year (no year zero):
    // -12_000 is "12,000 BCE", never "14,000 BCE" (which would add nowYear).
    const bce = Math.max(1, Math.round(Math.abs(year)));
    return `${bce.toLocaleString('en-US')} BCE`;
  }
  return `${Math.max(1, Math.round(yearsAgo))} yr ago`;
}

/** Short readout used on the COSMIC TIME bar ("NOW", "66 Ma", "4.54 Ga"). */
export function formatCompactYear(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return '—';
  if (year === nowYear) return 'NOW';
  return formatYear(year, nowYear);
}

/** "66 million years ago" / "4.54 billion years ago" / "present" — for panel prose. */
export function formatYearsAgoProse(yearsAgo) {
  if (!Number.isFinite(yearsAgo)) return '—';
  if (yearsAgo <= 0) return 'present';
  const part = decomposeYearsAgo(yearsAgo);
  if (part.unit === 'Ga') return `${part.value.toFixed(2).replace(/\.?0+$/, '')} billion years ago`;
  if (part.unit === 'Ma') return `${Math.round(part.value).toLocaleString('en-US')} million years ago`;
  if (part.unit === 'ka') return `${Math.round(part.value).toLocaleString('en-US')} thousand years ago`;
  return `${Math.round(part.value).toLocaleString('en-US')} years ago`;
}
