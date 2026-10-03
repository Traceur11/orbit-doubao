import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TimelineController, TIMELINE_KEYS, SPEED_PRESETS, BASE_YEARS_PER_SECOND, getTimelineTicks,
} from '../src/universe-time/timeline-controller.js';

const NOW = 2026;
const TOL = 1e-6;

function near(actual, expected, label, tolerance = TOL) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: expected ${expected}, received ${actual}`);
}

function fresh(nowYear = NOW) {
  return new TimelineController({ nowYear });
}

test('timeline keys map exactly onto their positions', () => {
  const timeline = fresh();
  for (const key of TIMELINE_KEYS) {
    near(timeline.yearToPosition(key.year), key.p, `key ${key.label} position`);
  }
});

test('the timeline is monotonic across the whole domain', () => {
  const timeline = fresh();
  let previous = -Infinity;
  for (let year = -4500000000; year <= NOW + 1000000000; year += 1234567) {
    const p = timeline.yearToPosition(year);
    assert.ok(p >= previous, `monotonic at ${year} (${p} < ${previous})`);
    previous = p;
  }
});

test('position → year round-trips through year → position', () => {
  const timeline = fresh();
  const samples = [-4540000000, -2500000000, -1000000000, -541000000, -252200000,
    -66000000, -2600000, -300000, -12000, -66, 1900, NOW];
  for (const year of samples) {
    const back = timeline.positionToYear(timeline.yearToPosition(year));
    assert.ok(Math.abs(back - year) <= 1, `round-trip ${year} → ${back}`);
  }
});

test('66 million years ago falls in the Cretaceous-era segment of the timeline', () => {
  const timeline = fresh();
  const p = timeline.yearToPosition(-66000000);
  assert.ok(p >= 0.5 && p <= 0.84, `66 Ma position ${p} between 252 Ma and 2.58 Ma`);
  near(timeline.positionToYear(p), -66000000, '66 Ma round-trip', 1);
});

test('the present and the deep past map to the timeline ends', () => {
  const timeline = fresh();
  near(timeline.yearToPosition(NOW), 1, 'NOW → 1');
  assert.equal(timeline.positionToYear(1), NOW);
  near(timeline.yearToPosition(-4540000000), 0, '4.54 Ga → 0');
  assert.equal(timeline.positionToYear(0), -4540000000);
});

test('future years extend the timeline beyond NOW', () => {
  const timeline = fresh();
  const p = timeline.yearToPosition(NOW + 1000000000);
  assert.ok(p > 1, 'future position > 1');
  const back = timeline.positionToYear(p);
  assert.ok(Math.abs(back - (NOW + 1000000000)) < 100000000, `future round-trip ${back}`);
  // Deep past clamps to the first key.
  assert.equal(timeline.positionToYear(-0.5), -4540000000);
});

test('step moves between adjacent timeline keys', () => {
  const timeline = fresh();
  const previous = timeline.step(NOW, -1);
  assert.equal(previous.year, -300000);
  assert.equal(previous.position, 0.92);
  const next = timeline.step(-300000, 1);
  assert.equal(next.year, NOW);
  assert.equal(timeline.step(-4540000000, -1), null);
  assert.equal(timeline.step(NOW, 1), null);
  assert.throws(() => timeline.step(NOW, 0), RangeError);
});

test('speed presets cover the required multipliers', () => {
  assert.deepEqual([...SPEED_PRESETS], [0.1, 1, 10, 100, 1000, 1000000, 1000000000]);
  assert.equal(BASE_YEARS_PER_SECOND, 1);
});

test('getTimelineTicks returns all key labels for the UI', () => {
  const ticks = getTimelineTicks();
  assert.equal(ticks.length, TIMELINE_KEYS.length);
  assert.ok(ticks.some(tick => tick.label === 'NOW'));
  assert.ok(ticks.some(tick => tick.label === '66 Ma'));
});

test('a custom nowYear shifts the timeline reference', () => {
  const timeline = fresh(2050);
  near(timeline.yearToPosition(2050), 1, 'custom NOW');
  assert.equal(timeline.positionToYear(1), 2050);
  const p = timeline.yearToPosition(-66000000);
  assert.ok(p >= 0.5 && p <= 0.84, '66 Ma still between 252 Ma and 2.58 Ma');
});

test('timeline rejects invalid inputs', () => {
  const timeline = fresh();
  assert.throws(() => timeline.yearToPosition('2026'), TypeError);
  assert.throws(() => timeline.positionToYear(Number.NaN), TypeError);
  assert.throws(() => new TimelineController({ keys: [{ p: 0, year: 1 }] }), RangeError);
});

test('ORBIT 2.1 merge: 201 Ma, 145 Ma and 2.58 Ma are clickable timeline keys', () => {
  const timeline = fresh();
  const labels = TIMELINE_KEYS.map(key => key.label);
  assert.ok(labels.includes('201 Ma'), '201 Ma key present');
  assert.ok(labels.includes('145 Ma'), '145 Ma key present');
  assert.ok(labels.includes('2.58 Ma'), '2.58 Ma key present');
  // Every key position must round-trip exactly to its own year (a key is a
  // piecewise-segment anchor, so interpolation at the anchor is exact).
  for (const key of TIMELINE_KEYS) {
    assert.equal(timeline.positionToYear(key.p), key.year, `${key.label} anchor round-trips`);
  }
});

test('ORBIT 2.1 merge: journey stops cover the requested geological gates', async () => {
  globalThis.matchMedia = () => ({ matches: false });
  const { JOURNEY_STOPS } = await import('../src/ui/cosmic-time.js');
  assert.deepEqual([...JOURNEY_STOPS],
    [-4540000000, -2500000000, -541000000, -252000000, -201000000, -145000000, -66000000, -2580000, 2026]);
});

