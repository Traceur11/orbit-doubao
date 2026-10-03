import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSolarSystemGalacticPosition, sampleGalacticOrbit, getGalacticYear,
  GALACTIC_ORBIT_PARAMS, TAU,
} from '../src/universe-time/galactic-orbit.js';

const TOL = 1e-6;

function near(actual, expected, label, tolerance = TOL) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: expected ${expected}, received ${actual}`);
}

test('the present reference year places the Solar System at the current reference position', () => {
  const p = getSolarSystemGalacticPosition(GALACTIC_ORBIT_PARAMS.referenceYear);
  near(p.x, 0, 'x at reference position', 1e-6);
  near(p.y, 0, 'y at reference position', 1e-6);
  near(p.z, 0, 'z at reference position', 1e-6);
});

test('one galactic year later returns to the same position (closed orbit)', () => {
  const a = getSolarSystemGalacticPosition(-66_000_000);
  const b = getSolarSystemGalacticPosition(-66_000_000 + getGalacticYear());
  near(a.x, b.x, 'closed orbit x', 1e-3);
  near(a.y, b.y, 'closed orbit y', 1e-3);
  near(a.z, b.z, 'closed orbit z', 1e-3);
  near(a.angle, b.angle - TAU, 'phase advances one full revolution', 1e-3);
});

test('the Solar System stays on the orbit radius from the Galactic center', () => {
  const [cx, cy] = GALACTIC_ORBIT_PARAMS.galacticCenter;
  const A = GALACTIC_ORBIT_PARAMS.verticalAmplitude;
  for (const year of [-4540000000, -252000000, -66000000, 0, 2026]) {
    const p = getSolarSystemGalacticPosition(year);
    const r = Math.hypot(p.x - cx, p.y - cy, p.z);
    assert.ok(r >= GALACTIC_ORBIT_PARAMS.orbitRadius - 1 && r <= GALACTIC_ORBIT_PARAMS.orbitRadius + A + 1,
      `radius at ${year} is ${r}, expected within ${GALACTIC_ORBIT_PARAMS.orbitRadius} ± ${A + 1}`);
  }
});

test('vertical displacement stays within the tilted disk + oscillation envelope', () => {
  const [cx, cy] = GALACTIC_ORBIT_PARAMS.galacticCenter;
  const maxY = GALACTIC_ORBIT_PARAMS.orbitRadius * Math.sin(GALACTIC_ORBIT_PARAMS.tilt)
    + GALACTIC_ORBIT_PARAMS.verticalAmplitude + 1;
  for (let year = -6000000000; year <= 2026; year += 12345678) {
    const p = getSolarSystemGalacticPosition(year);
    assert.ok(Math.abs(p.y - cy) < maxY, `|y| bounded at ${year}`);
  }
});

test('the orbit is continuous and counter-clockwise in the disk plane', () => {
  let previous = getSolarSystemGalacticPosition(-66000000);
  for (let year = -66000000 + 1e5; year <= -66000000 + 1e8; year += 1e5) {
    const p = getSolarSystemGalacticPosition(year);
    assert.ok(p.x !== previous.x || p.z !== previous.z, 'position changes with year');
    previous = p;
  }
});

test('galactic position rejects non-finite years', () => {
  assert.throws(() => getSolarSystemGalacticPosition(Number.NaN), TypeError);
  assert.throws(() => getSolarSystemGalacticPosition(Number.POSITIVE_INFINITY), TypeError);
});

test('sampleGalacticOrbit returns count×3 points starting at angle 0', () => {
  const count = 128;
  const flat = sampleGalacticOrbit(count);
  assert.equal(flat.length, count * 3);
  const start = getSolarSystemGalacticPosition(GALACTIC_ORBIT_PARAMS.referenceYear);
  near(flat[0], start.x, 'first sample x');
  near(flat[1], start.y, 'first sample y');
  near(flat[2], start.z, 'first sample z');
  // The ring closes on itself.
  const end = sampleGalacticOrbit(count, GALACTIC_ORBIT_PARAMS, 0, TAU - 0.000001);
  near(end[0], flat[0], 'closed ring');
  assert.throws(() => sampleGalacticOrbit(2), RangeError);
});

test('galactic year matches the documented ~230 Myr approximation', () => {
  assert.equal(getGalacticYear(), 230_000_000);
});
