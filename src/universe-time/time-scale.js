/**
 * time-scale.js — scale-level detection for the SCALE indicator.
 *
 * Levels: EARTH → SOLAR SYSTEM → INTERSTELLAR → GALACTIC → DEEP SPACE.
 * Distances are visual units from the current camera target; the hints are
 * order-of-magnitude physical descriptions, not measurements.
 */

export const SCALE_LEVELS = Object.freeze([
  { id: 'earth', label: 'EARTH', hint: '~ 12,742 km' },
  { id: 'solar', label: 'SOLAR SYSTEM', hint: '~ 10 AU' },
  { id: 'interstellar', label: 'INTERSTELLAR', hint: '~ 1,000 ly' },
  { id: 'galactic', label: 'GALACTIC', hint: '~ 26,000 ly' },
  { id: 'deep-space', label: 'DEEP SPACE', hint: 'beyond the Milky Way' },
]);

/**
 * Map a navigation stage + camera distance to a scale level.
 * @param {{stage:string, distance:number}} state navigation.getState()
 */
export function detectScale({ stage, distance = 0 } = {}) {
  if (!Number.isFinite(distance)) distance = 0;
  let level;
  if (stage === 'local-group') level = 'deep-space';
  else if (stage === 'galaxy') level = distance < 18000 ? 'interstellar' : 'galactic';
  else if (stage === 'solar' || stage === 'trajectory') level = 'solar';
  else level = 'earth';
  return SCALE_LEVELS.find(item => item.id === level) || SCALE_LEVELS[0];
}
