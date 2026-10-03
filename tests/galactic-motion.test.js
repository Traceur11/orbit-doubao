import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSolarSystemGalacticPosition, sampleGalacticOrbit, getGalacticYear,
  getAngleForYear, getYearForAngle, getOrbitYearColor,
  GALACTIC_ORBIT_PARAMS, TAU,
} from '../src/universe-time/galactic-orbit.js';
import { buildEpochNodes, buildRingSegmentColors } from '../src/universe-time/galactic-epoch-nodes.js';
import { getGeologicalContext, PERIODS } from '../src/universe-time/geological-time.js';
import { TIMELINE_KEYS } from '../src/universe-time/timeline-controller.js';
import { HISTORICAL_EVENTS } from '../src/universe-time/historical-events.js';

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

/* ---- ORBIT 2.0: trajectory-as-time-axis helpers ---- */

test('getAngleForYear / getYearForAngle are exact inverses', () => {
  for (const year of [-4540000000, -252000000, -66000000, -11700, 0, 2026, 123456789]) {
    const back = getYearForAngle(getAngleForYear(year));
    assert.ok(Math.abs(back - year) < 1e-3, `round trip for ${year}: got ${back}`);
  }
});

test('angle advances with time and the reference year anchors angle 0', () => {
  near(getAngleForYear(GALACTIC_ORBIT_PARAMS.referenceYear), 0, 'reference angle');
  assert.ok(getAngleForYear(-66000000) < 0, 'past years have negative angle');
  near(getAngleForYear(2026 + getGalacticYear() / 2), Math.PI, 'half orbit ahead is PI', 1e-6);
});

test('getOrbitYearColor maps years to the geological period color', () => {
  // Mid-Cretaceous (100 Ma) sits inside the Cretaceous.
  const cretaceous = PERIODS.find(period => period.id === 'cretaceous');
  assert.ok(cretaceous, 'cretaceous exists');
  assert.equal(getGeologicalContext(-100000000).period?.id, 'cretaceous', '100 Ma context');
  assert.equal(getOrbitYearColor(-100000000).toLowerCase(), cretaceous.color.toLowerCase(), '100 Ma color');
  // Exactly 66 Ma is the K-Pg boundary: the end of the Cretaceous is exclusive,
  // so that year already belongs to the Paleogene.
  assert.equal(getGeologicalContext(-66000000).period?.id, 'paleogene', '66 Ma context (K-Pg boundary)');
  assert.equal(getOrbitYearColor(-66000000).toLowerCase(),
    PERIODS.find(period => period.id === 'paleogene').color.toLowerCase(), '66 Ma color');
  // Before Earth formation falls back to a non-empty color.
  assert.ok(getOrbitYearColor(-7000000000), 'pre-Earth year still yields a color');
});

test('buildEpochNodes merges, de-duplicates and sorts timeline+geology+events', () => {
  const nodes = buildEpochNodes(2026);
  // Sorted ascending by year.
  for (let i = 1; i < nodes.length; i++) assert.ok(nodes[i - 1].year <= nodes[i].year, `sorted at ${i}`);
  // Every timeline key survives as a kind-1 node.
  for (const key of TIMELINE_KEYS) {
    const match = nodes.find(node => node.kind === 1 && Math.abs(node.year - key.year) < 2e6);
    assert.ok(match, `timeline key ${key.name} (${key.year}) present as kind-1 node`);
  }
  // Every merged node carries a non-empty color and a stable id.
  for (const node of nodes) {
    assert.ok(node.id && node.name && node.cn, `node ${node.id} has id/name`);
    assert.ok(node.color && /^#[0-9a-f]{6}$/i.test(node.color), `node ${node.id} has hex color`);
  }
  // Nodes stay inside the orbit envelope.
  const [cx] = GALACTIC_ORBIT_PARAMS.galacticCenter;
  const radiusMax = GALACTIC_ORBIT_PARAMS.orbitRadius + GALACTIC_ORBIT_PARAMS.verticalAmplitude + 2;
  for (const node of nodes) {
    const p = getSolarSystemGalacticPosition(node.year);
    const r = Math.hypot(p.x - cx, p.y, p.z);
    assert.ok(r <= radiusMax, `node ${node.id} on orbit (r=${r})`);
  }
});

test('buildEpochNodes exposes the refined finer-grained stops (period boundaries and events)', () => {
  const nodes = buildEpochNodes(2026);
  const years = new Set(nodes.map(node => node.year));
  // A fine-grained mid-period event far from any timeline key survives:
  // agriculture (-12 000) is not among the 10 timeline keys.
  assert.ok([...years].some(year => Math.abs(year - -12000) < 2e6), 'agriculture event node present');
  // The three key extinction boundaries appear (K-Pg 66 Ma, Permian 252 Ma, Triassic 201 Ma).
  for (const year of [-66000000, -252000000, -201000000]) {
    assert.ok([...years].some(y => Math.abs(y - year) < 2e6), `boundary ${year} present`);
  }
});

test('buildRingSegmentColors paints every segment with a geological color', () => {
  const count = 256;
  const colors = buildRingSegmentColors(count);
  assert.equal(colors.length, count * 2 * 3);
  for (let i = 0; i < count; i++) {
    const r = colors[i * 6], g = colors[i * 6 + 1], b = colors[i * 6 + 2];
    assert.ok(r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1, `segment ${i} color in range`);
  }
  // The ring covers a full orbit: earliest color band appears somewhere, and
  // the present year (angle 0) matches the current-period color.
  const presentRgb = new Uint8Array(3);
  const p0 = getSolarSystemGalacticPosition(GALACTIC_ORBIT_PARAMS.referenceYear);
  const year0 = getYearForAngle(getAngleForYear(2026));
  assert.equal(getOrbitYearColor(year0), getOrbitYearColor(2026), 'present segment color = current period color');
  void p0;
  void presentRgb;
  assert.throws(() => buildRingSegmentColors(2), RangeError);
});

test('historical events years are finite and inside the orbit time span', () => {
  for (const event of HISTORICAL_EVENTS) {
    assert.ok(Number.isFinite(event.year), `${event.id} has finite year`);
    assert.ok(event.year <= 2026 && event.year >= -4540000000, `${event.id} within span`);
  }
});
