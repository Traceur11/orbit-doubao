/**
 * paleo-config.js — Paleo-Earth configuration.
 *
 * Merged from ORBIT_PaleoEarth_V3 + V4 deployment packs.
 *   0–440 Ma: GPlates Web Service (ZAHIROVIC2022) reconstructed coastlines +
 *             reconstructed static plate polygons (plate-drift arrows).
 *   >440 Ma : no false precision is claimed — the visual state is
 *             evidence-constrained and explicitly marked schematic.
 */

export const PALEO_CONFIG = Object.freeze({
  model: 'ZAHIROVIC2022',
  coastUrl: 'https://gws.gplates.org/reconstruct/coastlines/',
  plateUrl: 'https://gws.gplates.org/reconstruct/static_polygons/',
  maxMa: 440,
  texture: { width: 2048, height: 1024 },
  cachePrefix: 'orbit-paleo-v3:',
  cacheVersion: '3',
  coastQuantize: [
    { max: 20, step: 1 },
    { max: 100, step: 2 },
    { max: 200, step: 5 },
    { max: 440, step: 10 },
  ],
  motion: {
    enabled: true,
    lookAheadMa: 10,
    minArea: 0.003,
    maxPlates: 18,
    arrowHeight: 1.018,
    lineHeight: 1.012,
  },
  sourceLabel: 'GPlates Web Service · ZAHIROVIC2022',
});

export function quantizeMa(ma) {
  const a = Math.max(0, Number(ma) || 0);
  const band = PALEO_CONFIG.coastQuantize.find(x => a <= x.max);
  const step = band?.step ?? 10;
  return Math.min(PALEO_CONFIG.maxMa, Math.round(a / step) * step);
}

export function supportsGplates(ma) {
  return Number.isFinite(ma) && ma >= 0 && ma <= PALEO_CONFIG.maxMa;
}

/** Per-era climate/atmosphere/ice palettes for the coastline texture. */
export const PALEO_STATES = Object.freeze([
  { maxMa: 0, name: '现代地球', en: 'Present Earth', land: '#6f8f57', ocean: '#173f69', atmosphere: '#1d72b8', clouds: .64, iceLat: 66, confidence: 'observed' },
  { maxMa: 2.58, name: '更新世', en: 'Pleistocene', land: '#718b61', ocean: '#17446c', atmosphere: '#1d6fae', clouds: .58, iceLat: 50, confidence: 'reconstructed' },
  { maxMa: 11.7, name: '全新世', en: 'Holocene', land: '#6d8d55', ocean: '#174b73', atmosphere: '#2378b8', clouds: .62, iceLat: 64, confidence: 'observed+reconstructed' },
  { maxMa: 66, name: '白垩纪末', en: 'Late Cretaceous / K–Pg', land: '#719b61', ocean: '#205a7d', atmosphere: '#2b7797', clouds: .72, iceLat: 82, confidence: 'reconstructed' },
  { maxMa: 100, name: '白垩纪', en: 'Cretaceous', land: '#719b61', ocean: '#1c5b7e', atmosphere: '#2d7f96', clouds: .74, iceLat: 88, confidence: 'reconstructed' },
  { maxMa: 145, name: '晚侏罗世', en: 'Late Jurassic', land: '#6f8e58', ocean: '#1b5278', atmosphere: '#2d7892', clouds: .70, iceLat: 88, confidence: 'reconstructed' },
  { maxMa: 201, name: '三叠纪—侏罗纪边界', en: 'Triassic–Jurassic boundary', land: '#8b9256', ocean: '#1d5275', atmosphere: '#39788c', clouds: .68, iceLat: 85, confidence: 'reconstructed' },
  { maxMa: 252.2, name: '二叠纪末', en: 'Permian–Triassic boundary', land: '#9a8b50', ocean: '#1c4d70', atmosphere: '#557d78', clouds: .55, iceLat: 72, confidence: 'reconstructed' },
  { maxMa: 300, name: '晚石炭纪', en: 'Late Carboniferous', land: '#5f8654', ocean: '#1d5576', atmosphere: '#2b6d86', clouds: .66, iceLat: 55, confidence: 'reconstructed' },
  { maxMa: 359, name: '泥盆纪', en: 'Devonian', land: '#718c59', ocean: '#1c5579', atmosphere: '#3a7890', clouds: .64, iceLat: 70, confidence: 'reconstructed' },
  { maxMa: 419, name: '志留纪', en: 'Silurian', land: '#78935e', ocean: '#1e5577', atmosphere: '#3a7c93', clouds: .62, iceLat: 62, confidence: 'reconstructed' },
  { maxMa: 444, name: '奥陶纪—志留纪边界', en: 'Ordovician–Silurian boundary', land: '#78935e', ocean: '#1d5274', atmosphere: '#3b7890', clouds: .58, iceLat: 50, confidence: 'reconstructed' },
]);

export const DEEP_TIME_STATES = Object.freeze([
  { maxMa: 541, name: '寒武纪', en: 'Cambrian', land: '#8b875c', ocean: '#244f6c', atmosphere: '#4f7780', clouds: .48, iceLat: 82, confidence: 'schematic' },
  { maxMa: 635, name: '埃迪卡拉纪', en: 'Ediacaran', land: '#706d55', ocean: '#21495f', atmosphere: '#506d70', clouds: .42, iceLat: 55, confidence: 'schematic' },
  { maxMa: 720, name: '成冰纪', en: 'Cryogenian', land: '#68706b', ocean: '#31566a', atmosphere: '#68858a', clouds: .34, iceLat: 20, confidence: 'schematic' },
  { maxMa: 1000, name: '中元古代', en: 'Mesoproterozoic', land: '#655f4e', ocean: '#274c5c', atmosphere: '#536d68', clouds: .32, iceLat: 82, confidence: 'schematic' },
  { maxMa: 1800, name: '古元古代', en: 'Paleoproterozoic', land: '#655a48', ocean: '#284b58', atmosphere: '#4e675f', clouds: .28, iceLat: 82, confidence: 'schematic' },
  { maxMa: 2500, name: '太古宙晚期', en: 'Late Archean', land: '#594c3d', ocean: '#263f49', atmosphere: '#455c53', clouds: .25, iceLat: 82, confidence: 'schematic' },
  { maxMa: 4000, name: '太古宙', en: 'Archean', land: '#4f453b', ocean: '#253c43', atmosphere: '#554b42', clouds: .22, iceLat: 82, confidence: 'schematic' },
  { maxMa: 4540, name: '冥古宙', en: 'Hadean', land: '#a43e28', ocean: '#4b2520', atmosphere: '#9d3b23', clouds: .12, iceLat: 82, confidence: 'conceptual' },
]);

export function stateForAgeMa(ma) {
  if (!Number.isFinite(ma) || ma <= 0) return PALEO_STATES[0];
  const exact = PALEO_STATES.find(s => ma <= s.maxMa);
  if (exact) return exact;
  return DEEP_TIME_STATES.find(s => ma <= s.maxMa) || DEEP_TIME_STATES[DEEP_TIME_STATES.length - 1];
}

export function ageMa(year, nowYear = 2026) {
  return Math.max(0, (nowYear - year) / 1_000_000);
}
