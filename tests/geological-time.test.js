import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEon, getEra, getPeriod, getEpoch, getGeologicalContext, findGeologicalUnit,
  yearWithin, EARTH_FORMATION_YEAR, listUnits,
} from '../src/universe-time/geological-time.js';
import { getNearestEvent, getEventsAround, findEvent, HISTORICAL_EVENTS } from '../src/universe-time/historical-events.js';

test('66 million years ago is recognised as the Cretaceous / K-Pg boundary region', () => {
  // Exactly at the boundary the ICS convention assigns the younger unit.
  assert.equal(getPeriod(-66000000).id, 'paleogene');
  assert.equal(getEra(-66000000).id, 'cenozoic');
  // One year earlier is still the end of the Cretaceous.
  assert.equal(getPeriod(-66000001).id, 'cretaceous');
  assert.equal(getEra(-66000001).id, 'mesozoic');
  // The nearest event is the dinosaur extinction.
  assert.equal(getNearestEvent(-66000000).id, 'dinosaur-extinction');
  const near = getEventsAround(-66000000, 60000000).map(event => event.id);
  assert.ok(near.includes('dinosaur-extinction'));
});

test('252/251.902 million years ago is the Permian–Triassic transition', () => {
  assert.equal(getPeriod(-251902001).id, 'permian');
  assert.equal(getPeriod(-251902000).id, 'triassic');
  const near = getEventsAround(-251902000, 60000000).map(event => event.id);
  assert.ok(near.includes('first-dinosaurs'));
});

test('541/538.8 million years ago is the base of the Cambrian / Phanerozoic', () => {
  assert.equal(getPeriod(-538800000).id, 'cambrian');
  assert.equal(getEra(-538800000).id, 'paleozoic');
  assert.equal(getEon(-538800000).id, 'phanerozoic');
  // One year earlier is still the Proterozoic (out of the Phanerozoic).
  assert.equal(getPeriod(-538800001), null);
  assert.equal(getEon(-538800001).id, 'proterozoic');
});

test('4.54 billion years ago is Earth formation (Hadean, pre-period)', () => {
  assert.equal(getEon(-4540000000).id, 'hadean');
  assert.equal(getPeriod(-4540000000), null);
  assert.ok(getGeologicalContext(-4540000000).beforeEarth === false);
  assert.equal(getGeologicalContext(-4700000000).beforeEarth, true);
  assert.equal(yearWithin({ startYear: -4600000000, endYear: -4000000000 }, EARTH_FORMATION_YEAR), true);
});

test('the present year maps to the Holocene / Quaternary / Cenozoic / Phanerozoic', () => {
  assert.equal(getEpoch(2026).id, 'holocene');
  assert.equal(getPeriod(2026).id, 'quaternary');
  assert.equal(getEra(2026).id, 'cenozoic');
  assert.equal(getEon(2026).id, 'phanerozoic');
});

test('geological context returns a readable label and a period colour', () => {
  const context = getGeologicalContext(-100000000, 2026);
  assert.equal(context.period.id, 'cretaceous');
  assert.match(context.label, /CRETACEOUS/i);
  assert.ok(context.color.startsWith('#'));
  const pre = getGeologicalContext(-5000000000, 2026);
  assert.equal(pre.eon, null);
  assert.equal(pre.period, null);
  assert.equal(pre.beforeEarth, true);
});

test('geological units can be searched by English, Chinese and id', () => {
  assert.equal(findGeologicalUnit('Cretaceous').id, 'cretaceous');
  assert.equal(findGeologicalUnit('cretaceous').id, 'cretaceous');
  assert.equal(findGeologicalUnit('白垩纪').id, 'cretaceous');
  assert.equal(findGeologicalUnit('cret').id, 'cretaceous');
  assert.equal(findGeologicalUnit('jurassic').id, 'jurassic');
  assert.equal(findGeologicalUnit('侏罗纪').id, 'jurassic');
  assert.equal(findGeologicalUnit('  '), null);
  assert.equal(findGeologicalUnit('not-a-period'), null);
});

test('all geological periods cover the Phanerozoic without gaps or overlaps', () => {
  const { periods } = listUnits();
  for (let i = 0; i < periods.length - 1; i++) {
    assert.equal(periods[i].endYear, periods[i + 1].startYear, `gap between ${periods[i].id} and ${periods[i + 1].id}`);
  }
  assert.equal(periods[0].startYear, -538800000);
  assert.equal(periods[periods.length - 1].endYear, 0);
});

test('historical events cover the required milestones', () => {
  const ids = new Set(HISTORICAL_EVENTS.map(event => event.id));
  for (const id of ['earth-formation', 'moon-formation', 'first-oceans', 'early-life',
    'great-oxidation', 'cambrian-explosion', 'first-land-plants', 'first-forests',
    'first-dinosaurs', 'first-mammals', 'dinosaur-extinction', 'early-primates',
    'hominins', 'homo-sapiens', 'agriculture', 'industrial-revolution']) {
    assert.ok(ids.has(id), `missing event ${id}`);
  }
  assert.equal(findEvent('Homo sapiens').id, 'homo-sapiens');
  assert.equal(findEvent('智人出现').id, 'homo-sapiens');
  assert.equal(getNearestEvent(-300000).id, 'homo-sapiens');
});
