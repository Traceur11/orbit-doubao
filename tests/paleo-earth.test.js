import test from 'node:test';
import assert from 'node:assert/strict';
import { quantizeMa, supportsGplates, PALEO_CONFIG, stateForAgeMa, PALEO_STATES, DEEP_TIME_STATES } from '../src/universe-time/paleo-config.js';
import { getEarthVisualForYear } from '../src/universe-time/earth-history.js';

const NOW = 2026;

test('quantizeMa bands match the V4 coast quantization table', () => {
  assert.equal(quantizeMa(0), 0);
  assert.equal(quantizeMa(3), 3);        // 0–20 Ma: 1 Ma
  assert.equal(quantizeMa(55), 56);      // 20–100 Ma: 2 Ma
  assert.equal(quantizeMa(101), 100);    // 100–200 Ma: 5 Ma
  assert.equal(quantizeMa(180), 180);    // 180 is already on a 5-step
  assert.equal(quantizeMa(251.902), 250); // 200–440 Ma: 10 Ma
  assert.equal(quantizeMa(500), 440);    // clamped to GPlates max
  assert.equal(quantizeMa(-5), 0);
});

test('supportsGplates only within 0–440 Ma', () => {
  assert.ok(supportsGplates(0));
  assert.ok(supportsGplates(66));
  assert.ok(supportsGplates(440));
  assert.equal(supportsGplates(440.1), false);
  assert.equal(supportsGplates(541), false);
  assert.equal(supportsGplates(-1), false);
});

test('stateForAgeMa resolves era palettes (V3 states preserved)', () => {
  assert.equal(stateForAgeMa(0).name, '现代地球');
  assert.equal(stateForAgeMa(2.58).name, '更新世');
  assert.equal(stateForAgeMa(100).en, 'Cretaceous');
  assert.equal(stateForAgeMa(250).en, 'Permian–Triassic boundary');
  assert.equal(stateForAgeMa(541).confidence, 'schematic');
  assert.equal(stateForAgeMa(4540).confidence, 'conceptual');
  assert.equal(stateForAgeMa(6000).confidence, 'conceptual'); // clamps to Hadean
});

test('0–440 Ma maps to GPlates reconstruction mode', () => {
  const s = getEarthVisualForYear(NOW - 66_000_000, NOW);
  assert.equal(s.present, false);
  assert.equal(s.mode, 'gplates');
  assert.equal(s.confidence, 'reconstruction');
  assert.equal(s.nightFactor, 0, 'no city lights before humans');
  assert.equal(s.historyStrength, 1);
  assert.ok(s.paleoMa > 60 && s.paleoMa < 70, '66 Ma near K–Pg');
  assert.equal(s.source.includes('GPlates'), true);
});

test('>440 Ma is explicitly deep-time schematic, never exact coastline', () => {
  const precambrian = getEarthVisualForYear(NOW - 2_000_000_000, NOW);
  assert.equal(precambrian.present, false);
  assert.equal(precambrian.mode, 'ancient-schematic');
  assert.equal(precambrian.confidence, 'deep-time-schematic');
  assert.equal(precambrian.paleoMa, null);
  const hadean = getEarthVisualForYear(NOW - 4_300_000_000, NOW);
  assert.equal(hadean.mode, 'ancient-schematic');
  assert.equal(hadean.confidence, 'conceptual');
  assert.ok(hadean.label.includes('HADEAN'));
});

test('present / future restore the modern Earth', () => {
  const present = getEarthVisualForYear(NOW, NOW);
  assert.equal(present.present, true);
  assert.equal(present.mode, 'modern');
  assert.equal(present.confidence, 'observed-modern');
  assert.equal(present.nightFactor, 1);
  const future = getEarthVisualForYear(NOW + 1_000_000_000, NOW);
  assert.equal(future.present, true);
  assert.equal(future.mode, 'modern');
});

test('atmosphere/clouds vary with age (visual climate response)', () => {
  const warm = getEarthVisualForYear(NOW - 180_000_000, NOW);   // Jurassic
  const cold = getEarthVisualForYear(NOW - 11_000, NOW);        // Holocene
  const magma = getEarthVisualForYear(NOW - 4_200_000_000, NOW);
  assert.notEqual(warm.atmosphereColor, magma.atmosphereColor);
  assert.ok(magma.cloudOpacity < warm.cloudOpacity, 'Hadean has almost no clouds');
  assert.ok(warm.atmosphereColor !== cold.atmosphereColor, 'era atmospheres differ');
});
