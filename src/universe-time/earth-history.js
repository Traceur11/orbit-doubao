// earth-history.js — science-driven visual state.
// 0–440 Ma: GPlates dynamic reconstruction.
// >440 Ma: explicitly labeled evidence-constrained schematic, never presented as exact coastline.
// (Merged from ORBIT_PaleoEarth_V4.)
import { getGeologicalContext } from './geological-time.js';
import { ageMaFromYear, formatEarthAge } from './earth-evolution.js';

export function getEarthVisualForYear(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return baseVisual();
  const ageMa = ageMaFromYear(year, nowYear);
  const ctx = getGeologicalContext(year, nowYear);
  const period = ctx?.period || null;
  const era = ctx?.era || null;
  const eon = ctx?.eon || null;
  if (ageMa <= 0) return {
    ageMa, present: true, mode: 'modern', source: 'modern-earth',
    confidence: 'observed-modern', label: 'PRESENT EARTH',
    description: '现代地球：使用项目原有高清昼夜纹理与 EarthSense。',
    periodName: period?.nameZh || '', eraName: era?.nameZh || '', eonName: eon?.nameZh || '',
    cloudOpacity: null, atmosphereColor: null, atmosphereStrength: null,
    nightFactor: 1, iceFactor: 0.35, historyStrength: 0,
    paleoMa: null,
  };
  if (ageMa <= 440) {
    return {
      ageMa, present: false, mode: 'gplates',
      source: 'GPlates Web Service · ZAHIROVIC2022',
      confidence: 'reconstruction',
      label: `${period?.nameZh || '古地球'} · ${formatEarthAge(ageMa * 1_000_000)}`,
      description: `GPlates 板块重建 · ${formatEarthAge(ageMa * 1_000_000)}。大陆位置随地质时间连续变化；颜色、云层、冰盖为科学可视化表达。`,
      periodName: period?.nameZh || '', eraName: era?.nameZh || '', eonName: eon?.nameZh || '',
      cloudOpacity: Math.max(0.42, Math.min(0.68, 0.62 - ageMa / 3000)),
      atmosphereColor: ageMa < 66 ? 0x4b82bd : ageMa < 251.902 ? 0x2c8f9c : 0x367b75,
      atmosphereStrength: ageMa < 66 ? 1.05 : 1.15,
      nightFactor: 0,
      iceFactor: ageMa < 66 ? 0 : ageMa < 300 ? 0.03 : 0.08,
      historyStrength: 1,
      paleoMa: ageMa,
    };
  }
  return {
    ageMa, present: false, mode: 'ancient-schematic',
    source: ageMa >= 4000 ? 'conceptual early Earth' : 'evidence-constrained deep-time schematic',
    confidence: ageMa >= 4000 ? 'conceptual' : 'deep-time-schematic',
    label: ageMa >= 4000 ? 'HADEAN · CONCEPTUAL EARTH' : `PRECAMBRIAN · ${formatEarthAge(ageMa * 1_000_000)}`,
    description: ageMa >= 4000
      ? '冥古宙：概念化早期地球，不显示伪精确大陆边界。'
      : '440 Ma 以前：深时证据约束示意，不将示意海岸线标记为精确重建。',
    periodName: period?.nameZh || '', eraName: era?.nameZh || '', eonName: eon?.nameZh || '',
    cloudOpacity: ageMa >= 4000 ? 0.06 : 0.25,
    atmosphereColor: ageMa >= 4000 ? 0x9a3a1a : 0x245d77,
    atmosphereStrength: ageMa >= 4000 ? 1.45 : 1.3,
    nightFactor: 0, iceFactor: 0.1, historyStrength: 1,
    paleoMa: null,
  };
}
function baseVisual() {
  return { ageMa: 0, present: true, mode: 'modern', source: 'modern-earth', confidence: 'observed-modern',
    label: 'PRESENT EARTH', description: '现代地球', cloudOpacity: null,
    atmosphereColor: null, atmosphereStrength: null, nightFactor: 1, iceFactor: 0.35, historyStrength: 0, paleoMa: null };
}
