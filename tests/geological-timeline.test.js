import test from 'node:test';
import assert from 'node:assert/strict';
// core/math.js reads matchMedia at module top level; provide a Node stub so
// this module chain (geological-timeline.js → core/math.js) can be imported.
globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false }));
import {
  ageMaToYear, yearToAgeMa, formatAge, midAgeMa,
  GEOLOGICAL_EONS, GEOLOGICAL_ERAS, GEOLOGICAL_PERIODS, GEOLOGICAL_EPOCHS, GEOLOGICAL_EVENTS,
} from '../src/ui/geological-timeline.js';
import { getPeriod, getEra, getEon, getEpoch, getGeologicalContext } from '../src/universe-time/geological-time.js';

const NOW = 2026;

/* ---- ICS v2026/06 boundary detection (shared geological-time.js) ---- */

test('538.8 Ma is the base of the Cambrian / Phanerozoic (ICS v2026/06)', () => {
  assert.equal(getPeriod(ageMaToYear(538.8, NOW)).id, 'cambrian');
  assert.equal(getEra(ageMaToYear(538.8, NOW)).id, 'paleozoic');
  assert.equal(getEon(ageMaToYear(538.8, NOW)).id, 'phanerozoic');
});

test('251.902 Ma is the Permian–Triassic boundary', () => {
  assert.equal(getPeriod(ageMaToYear(251.902, NOW)).id, 'triassic');
  assert.equal(getPeriod(ageMaToYear(251.902, NOW) - 1).id, 'permian');
});

test('201.4 Ma is the Triassic–Jurassic boundary', () => {
  assert.equal(getPeriod(ageMaToYear(201.4, NOW)).id, 'jurassic');
  assert.equal(getPeriod(ageMaToYear(201.4, NOW) - 1).id, 'triassic');
});

test('143.1 Ma is the Jurassic–Cretaceous boundary', () => {
  assert.equal(getPeriod(ageMaToYear(143.1, NOW)).id, 'cretaceous');
  assert.equal(getPeriod(ageMaToYear(143.1, NOW) - 1).id, 'jurassic');
});

test('66 Ma is the K-Pg boundary (end of Cretaceous / base of Paleogene)', () => {
  assert.equal(getPeriod(ageMaToYear(66, NOW)).id, 'paleogene');
  assert.equal(getPeriod(ageMaToYear(66, NOW) - 1).id, 'cretaceous');
  assert.equal(getEra(ageMaToYear(66, NOW)).id, 'cenozoic');
});

test('2.58 Ma is the base of the Quaternary (and of the Pleistocene)', () => {
  assert.equal(getPeriod(ageMaToYear(2.58, NOW)).id, 'quaternary');
  assert.equal(getEpoch(ageMaToYear(2.58, NOW)).id, 'pleistocene');
});

test('11.7 ka is the Holocene–Pleistocene boundary', () => {
  assert.equal(getEpoch(ageMaToYear(0.0117, NOW)).id, 'holocene');
  assert.equal(getEpoch(ageMaToYear(0.0117, NOW) - 1).id, 'pleistocene');
});

/* ---- conversions ---- */

test('ageMaToYear converts Ma before present to simulation years (BCE scale)', () => {
  assert.equal(ageMaToYear(0, NOW), 0);
  assert.equal(ageMaToYear(66, NOW), -66_000_000);
  assert.equal(ageMaToYear(538.8, NOW), -538_800_000);
  assert.equal(ageMaToYear(4540, NOW), -4_540_000_000);
  assert.throws(() => ageMaToYear(Number.NaN), TypeError);
});

test('yearToAgeMa converts simulation years to Ma before present', () => {
  assert.equal(yearToAgeMa(2026, NOW), 0);
  assert.equal(yearToAgeMa(-66000000, NOW), 66);
  assert.equal(yearToAgeMa(-538800000, NOW), 538.8);
  assert.equal(yearToAgeMa(-4540000000, NOW), 4540);
  assert.equal(yearToAgeMa(5000000000, NOW), 0); // future clamps to 0
});

test('ageMaToYear and yearToAgeMa round-trip', () => {
  for (const ageMa of [4567, 4031, 2500, 538.8, 251.902, 201.4, 143.1, 66, 2.58, 0.3, 0.012, 0]) {
    assert.ok(Math.abs(yearToAgeMa(ageMaToYear(ageMa, NOW), NOW) - ageMa) < 1e-6, `round trip ${ageMa}`);
  }
});

test('formatAge renders Ga / Ma / ka / NOW with the documented precision', () => {
  assert.equal(formatAge(4567), '4.567 Ga');
  assert.equal(formatAge(2400), '2.4 Ga');
  assert.equal(formatAge(538.8), '538.8 Ma');
  assert.equal(formatAge(66), '66 Ma');
  assert.equal(formatAge(2.58), '2.58 Ma');
  assert.equal(formatAge(0.3), '300 ka');
  assert.equal(formatAge(0.012), '12 ka');
  assert.equal(formatAge(0.0117), '11.7 ka');
  assert.equal(formatAge(0), 'NOW');
  assert.equal(formatAge(Number.NaN), '—');
});

/* ---- data integrity ---- */

test('GEOLOGICAL_EONS cover 4567 Ma → present without gaps', () => {
  assert.equal(GEOLOGICAL_EONS[0].startMa, 4567);
  for (let i = 0; i < GEOLOGICAL_EONS.length - 1; i++) {
    assert.equal(GEOLOGICAL_EONS[i].endMa, GEOLOGICAL_EONS[i + 1].startMa);
  }
  assert.equal(GEOLOGICAL_EONS[GEOLOGICAL_EONS.length - 1].endMa, 0);
});

test('GEOLOGICAL_ERAS cover the Phanerozoic without gaps', () => {
  assert.equal(GEOLOGICAL_ERAS[0].startMa, 538.8);
  for (let i = 0; i < GEOLOGICAL_ERAS.length - 1; i++) {
    assert.equal(GEOLOGICAL_ERAS[i].endMa, GEOLOGICAL_ERAS[i + 1].startMa);
  }
  assert.equal(GEOLOGICAL_ERAS[GEOLOGICAL_ERAS.length - 1].endMa, 0);
});

test('GEOLOGICAL_PERIODS cover the Phanerozoic without gaps or overlaps', () => {
  assert.equal(GEOLOGICAL_PERIODS[0].startMa, 538.8);
  for (let i = 0; i < GEOLOGICAL_PERIODS.length - 1; i++) {
    assert.equal(GEOLOGICAL_PERIODS[i].endMa, GEOLOGICAL_PERIODS[i + 1].startMa,
      `gap between ${GEOLOGICAL_PERIODS[i].id} and ${GEOLOGICAL_PERIODS[i + 1].id}`);
  }
  assert.equal(GEOLOGICAL_PERIODS[GEOLOGICAL_PERIODS.length - 1].endMa, 0);
  const ids = new Set(GEOLOGICAL_PERIODS.map(unit => unit.id));
  for (const id of ['cambrian', 'ordovician', 'silurian', 'devonian', 'carboniferous', 'permian',
    'triassic', 'jurassic', 'cretaceous', 'paleogene', 'neogene', 'quaternary']) {
    assert.ok(ids.has(id), `missing period ${id}`);
  }
});

test('GEOLOGICAL_EPOCHS include Pleistocene and Holocene at the documented ages', () => {
  const pleistocene = GEOLOGICAL_EPOCHS.find(unit => unit.id === 'pleistocene');
  const holocene = GEOLOGICAL_EPOCHS.find(unit => unit.id === 'holocene');
  assert.ok(pleistocene && holocene);
  assert.equal(pleistocene.startMa, 2.58);
  assert.equal(pleistocene.endMa, 0.0117);
  assert.equal(holocene.startMa, 0.0117);
  assert.equal(holocene.endMa, 0);
});

test('GEOLOGICAL_EVENTS include the required milestones at approximate ages', () => {
  const ids = new Set(GEOLOGICAL_EVENTS.map(event => event.id));
  for (const id of ['earth-formation', 'moon-formation', 'great-oxidation', 'cambrian-explosion',
    'first-land-plants', 'first-forests', 'first-dinosaurs', 'k-pg', 'homo-sapiens', 'agriculture', 'present']) {
    assert.ok(ids.has(id), `missing event ${id}`);
  }
  assert.equal(GEOLOGICAL_EVENTS.find(event => event.id === 'k-pg').ageMa, 66);
  assert.equal(GEOLOGICAL_EVENTS.find(event => event.id === 'earth-formation').ageMa, 4540);
  assert.equal(GEOLOGICAL_EVENTS.find(event => event.id === 'homo-sapiens').ageMa, 0.3);
  assert.equal(GEOLOGICAL_EVENTS.find(event => event.id === 'agriculture').ageMa, 0.012);
  for (const event of GEOLOGICAL_EVENTS) assert.ok(Number.isFinite(event.ageMa), `${event.id} finite age`);
});

test('midAgeMa picks the middle of a unit (present-ended units use half the start)', () => {
  assert.ok(Math.abs(midAgeMa(GEOLOGICAL_PERIODS.find(unit => unit.id === 'jurassic')) - (201.4 + 143.1) / 2) < 1e-6);
  assert.ok(Math.abs(midAgeMa(GEOLOGICAL_PERIODS.find(unit => unit.id === 'quaternary')) - 2.58 / 2) < 1e-6);
});

test('geological context for key ages matches the timeline data', () => {
  const jurassic = getGeologicalContext(ageMaToYear(180, NOW), NOW);
  assert.equal(jurassic.period.id, 'jurassic');
  assert.equal(jurassic.era.id, 'mesozoic');
  const kpg = getGeologicalContext(ageMaToYear(66, NOW), NOW);
  assert.equal(kpg.era.id, 'cenozoic');
  const cambrian = getGeologicalContext(ageMaToYear(520, NOW), NOW);
  assert.equal(cambrian.period.id, 'cambrian');
  const hadean = getGeologicalContext(ageMaToYear(4500, NOW), NOW);
  assert.equal(hadean.eon.id, 'hadean');
  assert.equal(hadean.period, null);
});
