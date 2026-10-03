import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  getEarthEvolution, ageMaFromYear, formatEarthAge, getEvolutionLabel,
} from '../src/universe-time/earth-evolution.js';
import {
  PALEO_KEYS, PALEO_LAYOUTS, drawPaleoLayer, createPaleogeographyTextures,
} from '../src/earth/paleogeography.js';

const NOW = 2026;

/* ------------------------------------------------------------------ */
/* age conversion                                                      */
/* ------------------------------------------------------------------ */
test('ageMaFromYear converts simulation years to Ma before present (BCE scale)', () => {
  assert.equal(ageMaFromYear(NOW, NOW), 0);
  assert.equal(ageMaFromYear(0, NOW), 0);
  assert.equal(ageMaFromYear(-12000, NOW), 0.012);
  assert.equal(ageMaFromYear(-66000000, NOW), 66);
  assert.equal(ageMaFromYear(-180000000, NOW), 180);
  assert.equal(ageMaFromYear(-4540000000, NOW), 4540);
  assert.equal(ageMaFromYear(5000000000, NOW), 0); // future clamps
  assert.throws(() => ageMaFromYear(Number.NaN, NOW), TypeError);
});

test('formatEarthAge formats years before present', () => {
  assert.equal(formatEarthAge(0), 'NOW');
  assert.equal(formatEarthAge(12000), '12 ka');
  assert.equal(formatEarthAge(300000), '300 ka');
  assert.equal(formatEarthAge(2580000), '2.58 Ma');
  assert.equal(formatEarthAge(66000000), '66 Ma');
  assert.equal(formatEarthAge(180000000), '180 Ma');
  assert.equal(formatEarthAge(250000000), '250 Ma');
  assert.equal(formatEarthAge(538800000), '538.8 Ma');
  assert.equal(formatEarthAge(2500000000), '2.5 Ga');
  assert.equal(formatEarthAge(4000000000), '4.0 Ga');
  assert.equal(formatEarthAge(4540000000), '4.54 Ga');
});

/* ------------------------------------------------------------------ */
/* era states                                                          */
/* ------------------------------------------------------------------ */
test('NOW is a modern Earth with full night lights and no history strength', () => {
  const state = getEarthEvolution(NOW, NOW);
  assert.equal(state.surfaceMode, 'modern');
  assert.equal(state.historyStrength, 0);
  assert.equal(state.nightFactor, 1);
  assert.equal(state.lavaFactor, 0);
  assert.equal(state.surfaceState, 'PRESENT EARTH');
  assert.equal(state.ageMa, 0);
});

test('12 ka is an ice-age Earth: modern continents, stronger ice, fading lights', () => {
  const state = getEarthEvolution(-12000, NOW);
  assert.equal(state.surfaceMode, 'modern');
  assert.equal(state.ageMa, 0.012);
  assert.ok(state.iceFactor > 0.6, `iceFactor ${state.iceFactor} should peak near 12 ka`);
  assert.ok(state.nightFactor < 0.65 && state.nightFactor > 0.5, `nightFactor ${state.nightFactor} partially faded`);
  assert.equal(state.surfaceState, 'ICE AGE EARTH');
});

test('300 ka is still modern continents with reduced night lights', () => {
  const state = getEarthEvolution(-300000, NOW);
  assert.equal(state.surfaceMode, 'modern');
  assert.ok(state.nightFactor < 0.1, `nightFactor ${state.nightFactor} should be nearly 0 at 300 ka`);
  assert.ok(state.iceFactor > 0.2);
});

test('2.58 Ma (Quaternary base) keeps modern continents, lights fully off', () => {
  const state = getEarthEvolution(-2580000, NOW);
  assert.equal(state.surfaceMode, 'modern');
  assert.equal(state.nightFactor, 0);
  assert.equal(state.historyStrength, 0);
});

test('66 Ma (K-Pg) switches to the paleo-66 map with no city lights', () => {
  const state = getEarthEvolution(-66000000, NOW);
  assert.equal(state.surfaceMode, 'paleo');
  assert.equal(state.mapB, 'paleo-66');
  assert.equal(state.mapBlend, 1);
  assert.ok(state.historyStrength > 0.9);
  assert.equal(state.nightFactor, 0);
  assert.equal(state.lavaFactor, 0);
  assert.ok(state.iceFactor < 0.1, 'Cretaceous should be ice-free');
  assert.equal(state.surfaceState, 'K–Pg · CENOZOIC BOUNDARY');
});

test('100 Ma crossfades between paleo-66 and paleo-100', () => {
  const state = getEarthEvolution(-100000000, NOW);
  assert.equal(state.surfaceMode, 'paleo');
  assert.equal(state.mapA, 'paleo-66');
  assert.equal(state.mapB, 'paleo-100');
  assert.ok(state.mapBlend > 0.4 && state.mapBlend < 0.5, `blend ${state.mapBlend} around 0.44`);
});

test('143.1 Ma is the Jurassic/Cretaceous boundary', () => {
  const cretaceousEnd = getEarthEvolution(-143100000, NOW);
  assert.equal(cretaceousEnd.periodId, 'cretaceous');
  assert.equal(cretaceousEnd.mapB, 'paleo-100');
  const jurassicBase = getEarthEvolution(-143100001, NOW);
  assert.equal(jurassicBase.periodId, 'jurassic');
  assert.equal(jurassicBase.mapA, 'paleo-100');
  assert.ok(jurassicBase.mapBlend < 0.01, `blend ${jurassicBase.mapBlend}`);
});

test('180 Ma is a Jurassic Earth: Pangaea splitting', () => {
  const state = getEarthEvolution(-180000000, NOW);
  assert.equal(state.surfaceMode, 'paleo');
  assert.equal(state.periodId, 'jurassic');
  assert.equal(state.mapA, 'paleo-100');
  assert.equal(state.mapB, 'paleo-180');
  assert.ok(state.mapBlend > 0.5 && state.mapBlend < 0.75, `blend ${state.mapBlend}`);
  assert.equal(state.surfaceState, 'JURASSIC EARTH');
  assert.equal(state.historyStrength, 1);
});

test('250 Ma is Pangaea (Triassic, heavily paleo-250)', () => {
  const state = getEarthEvolution(-250000000, NOW);
  assert.equal(state.periodId, 'triassic');
  assert.ok(state.mapBlend > 0.9, `blend ${state.mapBlend}`);
  assert.equal(state.surfaceState, 'PANGAEA EARTH');
});

test('538.8 Ma is the Cambrian / early Paleozoic using paleo-540', () => {
  const state = getEarthEvolution(-538800000, NOW);
  assert.equal(state.surfaceMode, 'paleo');
  assert.equal(state.mapB, 'paleo-540');
  assert.equal(state.mapBlend, 1);
  assert.equal(state.nightFactor, 0);
  assert.equal(state.surfaceState, 'CAMBRIAN EARTH');
});

test('2.5 Ga is Precambrian: abstract ancient Earth', () => {
  const state = getEarthEvolution(-2500000000, NOW);
  assert.equal(state.surfaceMode, 'ancient');
  assert.equal(state.mapA, 'ancient-earth');
  assert.equal(state.mapB, 'ancient-earth');
  assert.equal(state.surfaceState, 'PRECAMBRIAN EARTH');
  assert.equal(state.nightFactor, 0);
});

test('4.0 Ga+ is a Hadean magma ocean with procedural lava', () => {
  const boundary = getEarthEvolution(-4000000000, NOW);
  assert.equal(boundary.surfaceMode, 'ancient'); // exactly 4000 stays ancient
  const magma = getEarthEvolution(-4300000000, NOW);
  assert.equal(magma.surfaceMode, 'lava');
  assert.ok(magma.lavaFactor > 0.9, `lavaFactor ${magma.lavaFactor}`);
  assert.equal(magma.surfaceState, 'MAGMA EARTH');
  assert.equal(magma.nightFactor, 0);
});

test('4.54 Ga is early Hadean, fully lava', () => {
  const state = getEarthEvolution(-4540000000, NOW);
  assert.equal(state.surfaceMode, 'lava');
  assert.ok(state.lavaFactor > 0.95, `lavaFactor ${state.lavaFactor}`);
  assert.equal(getEvolutionLabel(state), 'MAGMA EARTH');
});

/* ------------------------------------------------------------------ */
/* cross-era invariants                                                */
/* ------------------------------------------------------------------ */
test('night lights are strictly modern-first and zero in the deep past', () => {
  const modern = getEarthEvolution(NOW, NOW).nightFactor;
  const ice = getEarthEvolution(-12000, NOW).nightFactor;
  const paleo = getEarthEvolution(-66000000, NOW).nightFactor;
  const ancient = getEarthEvolution(-2000000000, NOW).nightFactor;
  assert.ok(modern > ice, 'modern > ice age');
  assert.ok(ice > paleo, 'ice age > 66 Ma');
  assert.equal(paleo, 0);
  assert.equal(ancient, 0);
});

test('lava factor is positive only in the Hadean', () => {
  assert.equal(getEarthEvolution(NOW, NOW).lavaFactor, 0);
  assert.equal(getEarthEvolution(-66000000, NOW).lavaFactor, 0);
  assert.equal(getEarthEvolution(-2500000000, NOW).lavaFactor, 0);
  assert.ok(getEarthEvolution(-4300000000, NOW).lavaFactor > 0);
});

test('ice factor is stronger at the ice age than in the warm Mesozoic', () => {
  const glacial = getEarthEvolution(-12000, NOW).iceFactor;
  const cretaceous = getEarthEvolution(-66000000, NOW).iceFactor;
  assert.ok(glacial > cretaceous, `ice ${glacial} > mesozoic ${cretaceous}`);
  assert.ok(cretaceous < 0.1);
});

test('history strength is 0 for the modern era and 1 for Jurassic', () => {
  assert.equal(getEarthEvolution(NOW, NOW).historyStrength, 0);
  assert.equal(getEarthEvolution(-180000000, NOW).historyStrength, 1);
});

test('visual state evolves continuously across the Cenozoic→Cretaceous seam', () => {
  const cenozoic = getEarthEvolution(-66000000, NOW);
  const cretaceous = getEarthEvolution(-66000001, NOW);
  assert.equal(cenozoic.mapB, 'paleo-66');
  assert.equal(cretaceous.mapA, 'paleo-66');
  assert.ok(Math.abs(cenozoic.historyStrength - cretaceous.historyStrength) < 0.3);
});

/* ------------------------------------------------------------------ */
/* paleogeography module                                               */
/* ------------------------------------------------------------------ */
test('paleogeography layouts cover all expected era keys', () => {
  assert.deepEqual(PALEO_KEYS,
    ['paleo-540', 'paleo-250', 'paleo-180', 'paleo-100', 'paleo-66', 'ancient-earth']);
  for (const key of PALEO_KEYS) {
    assert.ok(PALEO_LAYOUTS[key], `layout for ${key}`);
    assert.ok(PALEO_LAYOUTS[key].blobs.length >= 3, `${key} has continents`);
    assert.ok(PALEO_LAYOUTS[key].ocean.length === 2, `${key} ocean gradient`);
    assert.ok(PALEO_LAYOUTS[key].land.length >= 2, `${key} land palette`);
  }
});

test('createPaleogeographyTextures returns CanvasTextures for every key', () => {
  // Minimal DOM/canvas stub so the module works in Node (no real canvas here).
  const gradientStub = { addColorStop() {} };
  const ctxStub = {
    fillStyle: '', globalAlpha: 1,
    createLinearGradient() { return gradientStub; },
    createRadialGradient() { return gradientStub; },
    createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4), width, height }; },
    putImageData() {}, drawImage() {}, fillRect() {}, imageSmoothingEnabled: true,
  };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }) };
  const textures = createPaleogeographyTextures();
  for (const key of PALEO_KEYS) {
    assert.ok(textures[key], `texture ${key}`);
    assert.ok(textures[key] instanceof THREE.Texture, `${key} is a THREE.Texture`);
    assert.equal(textures[key].colorSpace, THREE.SRGBColorSpace);
    assert.equal(textures[key].wrapS, THREE.RepeatWrapping);
    assert.equal(textures[key].wrapT, THREE.ClampToEdgeWrapping);
  }
  delete globalThis.document;
});

test('drawPaleoLayer rejects unknown keys', () => {
  assert.throws(() => drawPaleoLayer({}, 'nope', 4, 4), /unknown key/);
});
