/**
 * galactic-orbit.js — parameterized Solar-System Galactic orbit (pure math).
 *
 * This is a VISUALIZATION / EDUCATIONAL APPROXIMATION, not an N-body
 * simulation and not an observed ephemeris. The real past positions of the
 * Solar System in the Milky Way depend on the Sun's motion, stellar
 * encounters and the Galactic potential; the trajectory shown here is a
 * closed-form parameterized orbit fitted to the current reference position.
 *
 * Model:
 *   - the Solar System orbits the Galactic center on a near-circular path,
 *   - radius   = orbitRadius (visual units, matched to the scene: the galaxy
 *     center sits at galacticCenter and the present Solar System at the origin),
 *   - period   = galacticYear (~230 Myr, NASA),
 *   - phase    = referenceAngle at referenceYear (present reference position),
 *   - a small vertical oscillation around the Galactic disk plane is added
 *     for visual richness (approximation).
 *
 * The scene uses visual units: orbitRadius 18,000 units ≈ 26,000 ly in
 * physical terms (see docs/GALACTIC_TIME_MODEL.md).
 */

export const TAU = Math.PI * 2;

import { getGeologicalContext } from './geological-time.js';

export const GALACTIC_ORBIT_PARAMS = Object.freeze({
  galacticCenter: Object.freeze([-18000, 0, 0]), // scene galaxyCenter
  orbitRadius: 18000,                            // visual units (~26,000 ly physical)
  galacticYear: 230_000_000,                     // years per orbit (NASA ~230 Myr)
  referenceYear: 2026,                           // phase anchor year
  referenceAngle: 0,                             // phase at referenceYear (radians)
  verticalAmplitude: 1400,                       // max |y| oscillation (visual units)
  verticalWaves: 3,                              // oscillation cycles per orbit
  tilt: 0.13,                                    // disk plane tilt (matches scene galaxy)
});

function finite(value) {
  return Number.isFinite(value);
}

/**
 * Orbit angle (radians) for a simulation year. Single source of truth for the
 * angle formula; getSolarSystemGalacticPosition derives from it.
 */
export function getAngleForYear(year, params = GALACTIC_ORBIT_PARAMS) {
  if (!finite(year)) throw new TypeError('getAngleForYear: year must be a finite number.');
  const { galacticYear = GALACTIC_ORBIT_PARAMS.galacticYear, referenceYear = GALACTIC_ORBIT_PARAMS.referenceYear,
    referenceAngle = GALACTIC_ORBIT_PARAMS.referenceAngle } = params;
  if (!finite(galacticYear) || galacticYear <= 0) throw new RangeError('getAngleForYear: invalid galacticYear.');
  return referenceAngle + ((year - referenceYear) / galacticYear) * TAU;
}

/**
 * Simulation year corresponding to an orbit angle (inverse of getAngleForYear).
 * Used to paint the trajectory ring as a geological time axis and to anchor
 * Earth-history epoch nodes on the orbit.
 */
export function getYearForAngle(angle, params = GALACTIC_ORBIT_PARAMS) {
  if (!finite(angle)) throw new TypeError('getYearForAngle: angle must be a finite number.');
  const { galacticYear = GALACTIC_ORBIT_PARAMS.galacticYear, referenceYear = GALACTIC_ORBIT_PARAMS.referenceYear,
    referenceAngle = GALACTIC_ORBIT_PARAMS.referenceAngle } = params;
  if (!finite(galacticYear) || galacticYear <= 0) throw new RangeError('getYearForAngle: invalid galacticYear.');
  return referenceYear + ((angle - referenceAngle) / TAU) * galacticYear;
}

/**
 * Geological period color for an orbit position's simulation year — the color
 * used to paint the trajectory ring as an Earth-history time axis.
 * Years before Earth formation fall back to the Hadean-era hue.
 */
export function getOrbitYearColor(year) {
  const context = getGeologicalContext(year);
  return context?.color || '#7fa0b0';
}

/**
 * Compute the Solar System's Galactic position for a simulation year.
 *
 * @param {number} year simulation year (negative = before the common era)
 * @param {object} [params=GALACTIC_ORBIT_PARAMS]
 * @returns {{x:number,y:number,z:number,angle:number,rotation:number}}
 */
export function getSolarSystemGalacticPosition(year, params = GALACTIC_ORBIT_PARAMS) {
  if (!finite(year)) throw new TypeError('getSolarSystemGalacticPosition: year must be a finite number.');
  const {
    galacticCenter = GALACTIC_ORBIT_PARAMS.galacticCenter,
    orbitRadius = GALACTIC_ORBIT_PARAMS.orbitRadius,
    verticalAmplitude = GALACTIC_ORBIT_PARAMS.verticalAmplitude,
    verticalWaves = GALACTIC_ORBIT_PARAMS.verticalWaves,
    tilt = GALACTIC_ORBIT_PARAMS.tilt,
  } = params;
  if (![orbitRadius, verticalAmplitude, verticalWaves, tilt].every(finite) || orbitRadius <= 0) {
    throw new RangeError('getSolarSystemGalacticPosition: invalid orbit parameters.');
  }
  const [cx, cy0, cz] = galacticCenter;
  const angle = getAngleForYear(year, params);
  // Position in the (un-tilted) disk plane, then tilt to match the galaxy display.
  const ox = Math.cos(angle) * orbitRadius;
  const oy = Math.sin(angle * verticalWaves) * verticalAmplitude;
  const oz = Math.sin(angle) * orbitRadius;
  const y = oy * Math.cos(tilt) - oz * Math.sin(tilt);
  const z = oy * Math.sin(tilt) + oz * Math.cos(tilt);
  return { x: cx + ox, y: cy0 + y, z: cz + z, angle, rotation: angle };
}

/**
 * Sample `count` positions along one full orbit starting at `startAngle`,
 * used to draw the trajectory ring. Returns a flat Float32Array [x,y,z,…]
 * (Float32 — WebGL vertex attributes do not accept Float64 buffers).
 */
export function sampleGalacticOrbit(count = 512, params = GALACTIC_ORBIT_PARAMS, startAngle = 0, endAngle = startAngle + TAU) {
  if (!Number.isInteger(count) || count < 3) throw new RangeError('sampleGalacticOrbit: count must be an integer >= 3.');
  const { galacticCenter, orbitRadius, verticalAmplitude, verticalWaves, tilt } = params;
  const [cx, cy0, cz] = galacticCenter;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = startAngle + (endAngle - startAngle) * t;
    const ox = Math.cos(angle) * orbitRadius;
    const oy = Math.sin(angle * verticalWaves) * verticalAmplitude;
    const oz = Math.sin(angle) * orbitRadius;
    out[i * 3] = cx + ox;
    out[i * 3 + 1] = cy0 + oy * Math.cos(tilt) - oz * Math.sin(tilt);
    out[i * 3 + 2] = cz + oy * Math.sin(tilt) + oz * Math.cos(tilt);
  }
  return out;
}

/** Years needed for the Solar System to complete one Galactic orbit. */
export function getGalacticYear(params = GALACTIC_ORBIT_PARAMS) {
  return params.galacticYear;
}
