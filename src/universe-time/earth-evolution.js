import { getGeologicalContext } from "./geological-time.js";

/* Earth Evolution — maps the simulation year to an EarthVisualState that drives
 * the Earth shader uniforms. This is a HISTORICAL VISUALIZATION: paleogeography
 * maps are schematic (see src/earth/paleogeography.js), not accurate
 * reconstructions, and the galactic trajectory is a parameterized model.
 *
 * Time scale: simulation years use the project's BCE convention — 66 Ma is the
 * year -66_000_000. ageMaFromYear mirrors geological-timeline.js (BCE scale).
 */

const NOW_YEAR = 2026;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function lerp(a, b, t) { return a + (b - a) * t; }

export function ageMaFromYear(year, nowYear = NOW_YEAR) {
  if (!Number.isFinite(year)) throw new TypeError('ageMaFromYear: year must be finite.');
  void nowYear;
  return Math.max(0, -year / 1_000_000);
}

function fmt(n, minDecimals = 0, maxDecimals = 2) {
  if (Number.isInteger(n) && minDecimals > 0) return n.toFixed(minDecimals);
  return parseFloat(n.toFixed(maxDecimals)).toString();
}

/** Format an age given in YEARS before present (0 → NOW, 12_000 → 12 ka, …). */
export function formatEarthAge(years) {
  if (!Number.isFinite(years) || years <= 0) return 'NOW';
  if (years >= 1_000_000) {
    const ma = years / 1_000_000;
    if (ma >= 1000) return `${fmt(ma / 1000, 1)} Ga`;
    return `${fmt(ma)} Ma`;
  }
  return `${fmt(years / 1000)} ka`;
}

/** Night lights factor — modern 1, fading fast before 100 ka, 0 beyond 0.1 Ma. */
function nightFactorAt(ageMa) {
  if (ageMa <= 0) return 1;
  if (ageMa <= 0.01) return lerp(1, 0.65, ageMa / 0.01);
  if (ageMa <= 0.05) return lerp(0.65, 0.05, (ageMa - 0.01) / 0.04);
  if (ageMa <= 0.1) return lerp(0.05, 0, (ageMa - 0.05) / 0.05);
  return 0;
}

/** Polar ice caps — modern baseline, glacial peak near 12 ka, warm eras 0. */
function iceFactorAt(ageMa) {
  if (ageMa <= 0) return 0.35;
  if (ageMa <= 0.012) return lerp(0.35, 0.62, ageMa / 0.012);
  if (ageMa <= 0.1) return lerp(0.62, 0.3, (ageMa - 0.012) / 0.088);
  if (ageMa <= 2.58) return lerp(0.3, 0.2, (ageMa - 0.1) / 2.48);
  if (ageMa <= 66) return 0;                          // greenhouse Cenozoic
  if (ageMa <= 143.1) return 0.02;                    // Cretaceous
  if (ageMa <= 251.902) return 0;                     // Jurassic/Triassic
  if (ageMa <= 538.8) return 0.04;                    // late Paleozoic
  if (ageMa <= 2500) return lerp(0.12, 0.18, (ageMa - 538.8) / 1961.2);
  if (ageMa <= 4000) return lerp(0.18, 0.1, (ageMa - 2500) / 1500);
  return 0;                                           // Hadean magma
}

function cloudAt(ageMa) {
  if (ageMa <= 0) return 0.64;
  if (ageMa <= 2.58) return lerp(0.64, 0.55, ageMa / 2.58);
  if (ageMa <= 66) return 0.6;
  if (ageMa <= 143.1) return 0.62;
  if (ageMa <= 251.902) return 0.56;
  if (ageMa <= 538.8) return lerp(0.56, 0.5, (ageMa - 251.902) / 286.898);
  if (ageMa <= 2500) return lerp(0.5, 0.32, (ageMa - 538.8) / 1961.2);
  if (ageMa <= 4000) return lerp(0.32, 0.16, (ageMa - 2500) / 1500);
  return 0.06;
}

function atmosphereAt(ageMa) {
  if (ageMa <= 0) return [0x4a7bd8, 1.1];               // modern blue
  if (ageMa <= 2.58) return [0x3a5a90, 1.25];           // glacial cool
  if (ageMa <= 66) return [0x4a7bb8, 1.0];              // Cenozoic
  if (ageMa <= 143.1) return [0x3a8ba0, 1.02];          // Cretaceous
  if (ageMa <= 251.902) return [0x2a9a90, 1.05];        // Jurassic/Triassic
  if (ageMa <= 538.8) return [0x3a8a70, 1.12];          // Paleozoic
  if (ageMa <= 2500) return [0x1a4a80, 1.3];            // Proterozoic deep blue
  if (ageMa <= 4000) return [0x2a6a80, 1.4];            // Archean blue-green
  return [0x9a3a1a, 1.5];                               // Hadean red-orange
}

function tintsAt(ageMa, mode) {
  if (mode === 'modern') return [0xffffff, 0xffffff];
  if (ageMa <= 66) return [0xd0c8b0, 0xb8d8e0];
  if (ageMa <= 143.1) return [0xc8d8b8, 0xa8d0dc];
  if (ageMa <= 201.4) return [0xd0d0a8, 0x98c8d0];
  if (ageMa <= 251.902) return [0xd0c090, 0xa0ccd0];
  if (ageMa <= 538.8) return [0xd0d0a0, 0x90c0d0];
  return [0xb8d0a0, 0x78a8c8]; // ancient
}

function surfaceLabel(mode, ageMa, periodId) {
  if (mode === 'lava') return 'MAGMA EARTH';
  if (mode === 'ancient') return 'PRECAMBRIAN EARTH';
  if (ageMa <= 0) return 'PRESENT EARTH';
  if (ageMa <= 0.1) return 'ICE AGE EARTH';
  if (periodId === 'cretaceous') return 'CRETACEOUS EARTH';
  if (periodId === 'jurassic') return 'JURASSIC EARTH';
  if (periodId === 'permian' || periodId === 'triassic') return 'PANGAEA EARTH';
  if (periodId === 'paleogene') return ageMa >= 65 ? 'K–Pg · CENOZOIC BOUNDARY' : 'CENOZOIC EARTH';
  if (periodId === 'neogene') return 'CENOZOIC EARTH';
  if (periodId === 'cambrian' || periodId === 'ordovician' || periodId === 'silurian'
    || periodId === 'devonian' || periodId === 'carboniferous') {
    return `${(periodId || '').toUpperCase()} EARTH`;
  }
  return 'PRESENT EARTH';
}

/**
 * Return the Earth visual state for a simulation year.
 * @param {number} year simulation year (BCE scale; present ≈ 2026)
 * @param {number} [nowYear]
 * @returns {object} EarthVisualState
 */
export function getEarthEvolution(year, nowYear = NOW_YEAR) {
  if (!Number.isFinite(year)) throw new TypeError('getEarthEvolution: year must be finite.');
  const ageMa = ageMaFromYear(year, nowYear);
  const ctx = getGeologicalContext(year);
  const period = ctx?.period || null;
  const era = ctx?.era || null;
  const eon = ctx?.eon || null;
  const periodId = ctx?.period?.id || '';

  let mode = 'modern';
  let mapA = 'paleo-540', mapB = 'paleo-540', mapBlend = 0;
  let historyStrength = 0;
  let landTint, oceanTint, lavaFactor = 0, surfaceBrightness = 1;
  let description = '现代地球：大陆、海洋、城市夜灯与现代大气。';
  let label = 'PRESENT EARTH';

  if (ageMa <= 2.58) {
    /* Modern continents stay in place through the Quaternary; only ice, clouds,
     * atmosphere and night lights change. */
    mode = 'modern';
    historyStrength = 0;
    mapA = 'paleo-540'; mapB = 'paleo-540'; mapBlend = 0;
    landTint = 0xffffff; oceanTint = 0xffffff;
    surfaceBrightness = 1;
    if (ageMa > 0) {
      description = `第四纪 · ${formatEarthAge(ageMa * 1_000_000)}：现代大陆，冰期增强，城市灯光逐渐消失。`;
      label = 'ICE AGE EARTH';
    } else {
      description = '现代地球：大陆、海洋、城市夜灯与现代大气。';
      label = 'PRESENT EARTH';
    }
  } else if (ageMa <= 66) {
    /* Cenozoic: modern surface crossfades to the paleo-66 map. */
    mode = 'paleo';
    const t = clamp01((ageMa - 2.58) / (66 - 2.58));
    mapA = 'paleo-540'; mapB = 'paleo-66';
    mapBlend = t;
    historyStrength = lerp(0, 0.95, t);
    landTint = 0xd0c8b0; oceanTint = 0xb8d8e0;
    surfaceBrightness = 0.96;
    description = `新生代 · ${formatEarthAge(ageMa * 1_000_000)}：现代大陆向古地理过渡，印度板块漂移，温暖大气，无城市灯光。`;
    label = ageMa > 65 ? 'K–Pg · CENOZOIC BOUNDARY' : 'CENOZOIC EARTH';
  } else if (ageMa <= 143.1) {
    /* Cretaceous: paleo-66 ↔ paleo-100. */
    mode = 'paleo';
    const t = clamp01((ageMa - 66) / (143.1 - 66));
    mapA = 'paleo-66'; mapB = 'paleo-100';
    mapBlend = t;
    historyStrength = 1;
    landTint = 0xc8d8b8; oceanTint = 0xa8d0dc;
    surfaceBrightness = 1;
    description = `白垩纪 · ${formatEarthAge(ageMa * 1_000_000)}：大陆继续分裂，温暖气候，海洋占更大比例。`;
    label = 'CRETACEOUS EARTH';
  } else if (ageMa <= 201.4) {
    /* Jurassic: paleo-100 ↔ paleo-180. */
    mode = 'paleo';
    const t = clamp01((ageMa - 143.1) / (201.4 - 143.1));
    mapA = 'paleo-100'; mapB = 'paleo-180';
    mapBlend = t;
    historyStrength = 1;
    landTint = 0xd0d0a8; oceanTint = 0x98c8d0;
    surfaceBrightness = 1.02;
    description = `侏罗纪 · ${formatEarthAge(ageMa * 1_000_000)}：Pangaea 开始裂解，裂谷海洋扩大，温暖大气。`;
    label = 'JURASSIC EARTH';
  } else if (ageMa <= 251.902) {
    /* Triassic: paleo-180 ↔ paleo-250. */
    mode = 'paleo';
    const t = clamp01((ageMa - 201.4) / (251.902 - 201.4));
    mapA = 'paleo-180'; mapB = 'paleo-250';
    mapBlend = t;
    historyStrength = 1;
    landTint = 0xd0c090; oceanTint = 0xa0ccd0;
    surfaceBrightness = 1;
    description = `三叠纪 · ${formatEarthAge(ageMa * 1_000_000)}：Pangaea 联合大陆，内陆广布，气候干燥。`;
    label = 'PANGAEA EARTH';
  } else if (ageMa <= 298.9) {
    /* Permian: Pangaea fully assembled. */
    mode = 'paleo';
    mapA = 'paleo-250'; mapB = 'paleo-250';
    mapBlend = 1;
    historyStrength = 1;
    landTint = 0xd8b890; oceanTint = 0xa8ccd0;
    surfaceBrightness = 1.02;
    description = `二叠纪 · ${formatEarthAge(ageMa * 1_000_000)}：Pangaea 联合大陆，大规模内陆区域，海陆比例不同。`;
    label = 'PANGAEA EARTH';
  } else if (ageMa <= 538.8) {
    /* Rest of Paleozoic: paleo-250 → paleo-540. */
    mode = 'paleo';
    const t = clamp01((ageMa - 298.9) / (538.8 - 298.9));
    mapA = 'paleo-250'; mapB = 'paleo-540';
    mapBlend = t;
    historyStrength = 1;
    landTint = 0xd0d0a0; oceanTint = 0x90c0d0;
    surfaceBrightness = 1.04;
    description = `${period ? period.nameZh : '古生代'} · ${formatEarthAge(ageMa * 1_000_000)}：冈瓦纳与劳伦西亚等大型陆块，海洋占主导。`;
    label = `${(periodId || 'PALEOZOIC').toUpperCase()} EARTH`;
  } else if (ageMa <= 4000) {
    /* Precambrian: abstract ancient Earth — high ocean fraction, sparse crust. */
    mode = 'ancient';
    mapA = 'ancient-earth'; mapB = 'ancient-earth';
    mapBlend = 0;
    historyStrength = 1;
    landTint = 0xb8d0a0; oceanTint = 0x78a8c8;
    surfaceBrightness = 1.08;
    description = `前寒武纪 · ${formatEarthAge(ageMa * 1_000_000)}：海洋占主导，原始陆块，较厚大气。PRECAMBRIAN VISUALIZATION。`;
    label = 'PRECAMBRIAN EARTH';
  } else {
    /* Hadean: magma ocean — procedural lava shader. */
    mode = 'lava';
    mapA = 'ancient-earth'; mapB = 'ancient-earth';
    mapBlend = 0;
    historyStrength = 1;
    landTint = 0xffffff; oceanTint = 0xffffff;
    lavaFactor = lerp(0.9, 1, clamp01((ageMa - 4000) / 567));
    surfaceBrightness = 0.9;
    description = `冥古宙 · ${formatEarthAge(ageMa * 1_000_000)}：岩浆海洋，炽热地表，强烈大气辉光。MAGMA EARTH。`;
    label = 'MAGMA EARTH';
  }

  const [atmosphereColor, atmosphereStrength] = atmosphereAt(ageMa);
  const nightFactor = nightFactorAt(ageMa);
  const iceFactor = iceFactorAt(ageMa);
  const cloudOpacity = cloudAt(ageMa);

  return {
    ageMa,
    periodId,
    surfaceMode: mode,
    mapA, mapB, mapBlend,
    historyStrength,
    landTint, oceanTint,
    cloudOpacity,
    nightFactor,
    iceFactor,
    lavaFactor,
    atmosphereColor,
    atmosphereStrength,
    surfaceBrightness,
    description,
    label: surfaceLabel(mode, ageMa, periodId),
    contextLabel: label,
    surfaceState: surfaceLabel(mode, ageMa, periodId),
    approximation: true,
    periodName: period ? period.nameZh : '',
    eraName: era ? era.nameZh : '',
    eonName: eon ? eon.nameZh : '',
  };
}

export function getEvolutionLabel(state) {
  return state ? state.surfaceState : 'PRESENT EARTH';
}
