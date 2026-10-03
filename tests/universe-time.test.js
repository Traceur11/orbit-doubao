import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseClock, MIN_SIMULATION_YEAR, MAX_SIMULATION_YEAR } from '../src/universe-time/universe-clock.js';
import { formatYear, formatCompactYear, formatYearsAgo, formatYearsAgoProse } from '../src/universe-time/cosmic-time.js';

// ui/cosmic-time.js imports core/math.js which reads matchMedia at module scope.
globalThis.matchMedia = () => ({ matches: false });

test('UniverseClock defaults to the present reference year', () => {
  const clock = new UniverseClock();
  assert.equal(clock.getYear(), clock.getNowYear());
  assert.equal(clock.getNowYear(), 2026);
  assert.ok(clock.isPresent());
});

test('UniverseClock supports past, present and future years', () => {
  const clock = new UniverseClock({ nowYear: 2026 });
  assert.equal(clock.setYear(-66000000), -66000000);
  assert.ok(clock.isPast());
  assert.equal(clock.getYearsAgo(), 66002026);
  clock.setYear(2030);
  assert.ok(clock.isFuture());
  clock.setYear(2026);
  assert.ok(clock.isPresent());
});

test('UniverseClock clamps to the simulation range and validates input', () => {
  const clock = new UniverseClock({ nowYear: 2026 });
  assert.equal(clock.setYear(-6000000000), MIN_SIMULATION_YEAR);
  assert.equal(clock.setYear(-7000000000), MIN_SIMULATION_YEAR);
  assert.equal(clock.setYear(6000000000), MAX_SIMULATION_YEAR);
  assert.throws(() => clock.setYear(Number.NaN), TypeError);
  assert.throws(() => clock.advanceYears(Number.POSITIVE_INFINITY), TypeError);
  assert.throws(() => new UniverseClock({ nowYear: Number.NaN }), TypeError);
});

test('UniverseClock advances by whole years and clamps at the bounds', () => {
  const clock = new UniverseClock({ year: 2026, nowYear: 2026 });
  assert.equal(clock.advanceYears(-100), 1926);
  assert.equal(clock.advanceYears(200), 2126);
  clock.setYear(MIN_SIMULATION_YEAR);
  assert.equal(clock.advanceYears(-1), MIN_SIMULATION_YEAR);
});

test('cosmic-time formatting never shows raw negative numbers', () => {
  assert.equal(formatYear(2026), '2026 CE');
  assert.equal(formatCompactYear(2026), 'NOW');
  assert.equal(formatYear(-66000000), '66 Ma');
  assert.equal(formatYear(-4540000000), '4.54 Ga');
  assert.equal(formatYear(-252000000), '252 Ma');
  assert.equal(formatYear(-2500000), '2.5 Ma');
  assert.equal(formatYear(-12000), '12,000 BCE');
  assert.equal(formatYear(4000000000), '+4 Ga');
  assert.equal(formatYearsAgo(300000), '300 ka');
  assert.equal(formatYearsAgoProse(66000000), '66 million years ago');
  assert.equal(formatYearsAgoProse(0), 'present');
  assert.equal(formatYearsAgoProse(4540000000), '4.54 billion years ago');
});

test('parseOrbitUrl reads ?time= and ?target= with range validation', async () => {
  const { parseOrbitUrl } = await import('../src/ui/cosmic-time.js');
  assert.deepEqual(parseOrbitUrl('?time=-66000000&target=earth', 2026), { target: 'earth', time: -66000000 });
  assert.deepEqual(parseOrbitUrl('?target=milky-way', 2026), { target: 'galaxy', time: null });
  assert.deepEqual(parseOrbitUrl('?target=Milky-Way', 2026), { target: 'galaxy', time: null });
  assert.deepEqual(parseOrbitUrl('?time=-252000000', 2026), { target: null, time: -252000000 });
  // Out-of-range and malformed values are rejected.
  assert.deepEqual(parseOrbitUrl('?time=99999999999999', 2026), { target: null, time: null });
  assert.deepEqual(parseOrbitUrl('?time=abc', 2026), { target: null, time: null });
  assert.deepEqual(parseOrbitUrl('?target=bad target!', 2026), { target: null, time: null });
  assert.deepEqual(parseOrbitUrl('', 2026), { target: null, time: null });
});
