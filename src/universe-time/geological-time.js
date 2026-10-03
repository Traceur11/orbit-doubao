/**
 * geological-time.js — Earth geological time scale data and detection.
 *
 * Boundaries use the commonly cited rounded values of the International
 * Chronostratigraphic Chart (ICS). Precise ICS v2024 numbers differ slightly
 * (e.g. base Cambrian 538.8 Ma vs 541 Ma used here); see docs/DATA_SOURCES.md.
 *
 * Internal representation: startYear / endYear are SIMULATION YEARS
 * (negative = before the common era). endYear 0 means "up to the present".
 * The base of the Phanerozoic is 541,000,000 years ago -> startYear -541000000.
 */

export const EARTH_FORMATION_YEAR = -4_540_000_000;

export const EONS = [
  { id: 'hadean', name: '冥古宙', englishName: 'Hadean', startYear: -4600000000, endYear: -4000000000,
    color: '#c0553f', description: '地球形成初期：岩浆海洋、频繁的撞击与最早的地壳固化。月球在这一时期形成。' },
  { id: 'archean', name: '太古宙', englishName: 'Archean', startYear: -4000000000, endYear: -2500000000,
    color: '#8f6f4a', description: '最早的海洋与生命证据出现，地壳持续增长，大气富含甲烷与二氧化碳。' },
  { id: 'proterozoic', name: '元古宙', englishName: 'Proterozoic', startYear: -2500000000, endYear: -541000000,
    color: '#4f7a8c', description: '大氧化事件、多次雪球地球事件与最早的多细胞生物。' },
  { id: 'phanerozoic', name: '显生宙', englishName: 'Phanerozoic', startYear: -541000000, endYear: 0,
    color: '#3f7d5c', description: '生命爆发并占据陆地与天空的时期，从寒武纪生命大爆发延续至今。' },
];

export const ERAS = [
  { id: 'paleozoic', name: '古生代', englishName: 'Paleozoic', startYear: -541000000, endYear: -252200000,
    eonId: 'phanerozoic', color: '#8aa564', description: '生命大爆发与早期陆生演化：无脊椎动物、鱼类、昆虫与最早的两栖动物。' },
  { id: 'mesozoic', name: '中生代', englishName: 'Mesozoic', startYear: -252200000, endYear: -66000000,
    eonId: 'phanerozoic', color: '#5d8f7c', description: '恐龙时代：大陆分裂、被子植物出现、恐龙繁盛直至白垩纪末大灭绝。' },
  { id: 'cenozoic', name: '新生代', englishName: 'Cenozoic', startYear: -66000000, endYear: 0,
    eonId: 'phanerozoic', color: '#4f7fa0', description: '哺乳动物与鸟类占据主导，灵长类演化，最终出现现代人类。' },
];

export const PERIODS = [
  { id: 'cambrian', name: '寒武纪', englishName: 'Cambrian', startYear: -541000000, endYear: -485400000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#8fa96a',
    description: '寒武纪生命大爆发：几乎所有主要动物门类在数千万年内出现。' },
  { id: 'ordovician', name: '奥陶纪', englishName: 'Ordovician', startYear: -485400000, endYear: -443800000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#7fa68a',
    description: '海洋无脊椎动物繁盛，最早的陆生植物出现；末期发生大灭绝。' },
  { id: 'silurian', name: '志留纪', englishName: 'Silurian', startYear: -443800000, endYear: -419200000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#97b58a',
    description: '陆生维管植物出现，珊瑚礁扩张，最早的陆地节肢动物留下足迹。' },
  { id: 'devonian', name: '泥盆纪', englishName: 'Devonian', startYear: -419200000, endYear: -358900000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#8f9a6a',
    description: '"鱼类时代"：四足动物登陆，最早的大型森林出现。' },
  { id: 'carboniferous', name: '石炭纪', englishName: 'Carboniferous', startYear: -358900000, endYear: -298900000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#6f8f5a',
    description: '大规模沼泽森林形成煤炭，昆虫巨型化，最早的有羊膜卵动物出现。' },
  { id: 'permian', name: '二叠纪', englishName: 'Permian', startYear: -298900000, endYear: -252200000,
    eraId: 'paleozoic', eonId: 'phanerozoic', color: '#a58a4a',
    description: '泛大陆形成，合弓类动物繁盛；末期发生地球历史上最大规模的灭绝事件。' },
  { id: 'triassic', name: '三叠纪', englishName: 'Triassic', startYear: -252200000, endYear: -201400000,
    eraId: 'mesozoic', eonId: 'phanerozoic', color: '#6f9a8a',
    description: '恐龙与早期哺乳动物出现；末期发生三叠纪末大灭绝。' },
  { id: 'jurassic', name: '侏罗纪', englishName: 'Jurassic', startYear: -201400000, endYear: -145000000,
    eraId: 'mesozoic', eonId: 'phanerozoic', color: '#5d8f7c',
    description: '恐龙主宰陆地，始祖鸟出现，超大陆开始分裂。' },
  { id: 'cretaceous', name: '白垩纪', englishName: 'Cretaceous', startYear: -145000000, endYear: -66000000,
    eraId: 'mesozoic', eonId: 'phanerozoic', color: '#4f8f7c',
    description: '被子植物扩张，恐龙持续繁盛，大陆继续分裂；末期发生白垩纪—古近纪灭绝事件（K-Pg）。' },
  { id: 'paleogene', name: '古近纪', englishName: 'Paleogene', startYear: -66000000, endYear: -23030000,
    eraId: 'cenozoic', eonId: 'phanerozoic', color: '#6f8fa0',
    description: '恐龙灭绝后哺乳动物快速辐射，最早的灵长类出现。' },
  { id: 'neogene', name: '新近纪', englishName: 'Neogene', startYear: -23030000, endYear: -2580000,
    eraId: 'cenozoic', eonId: 'phanerozoic', color: '#5f7f9a',
    description: '草原扩张、人科谱系与最早的人族成员出现。' },
  { id: 'quaternary', name: '第四纪', englishName: 'Quaternary', startYear: -2580000, endYear: 0,
    eraId: 'cenozoic', eonId: 'phanerozoic', color: '#7fa0b0',
    description: '冰期—间冰期旋回，现代人类演化并扩散全球。' },
];

export const EPOCHS = [
  { id: 'pleistocene', name: '更新世', englishName: 'Pleistocene', startYear: -2580000, endYear: -11700,
    periodId: 'quaternary', color: '#8fa8b8', description: '反复的冰川期，直立人与早期智人出现。' },
  { id: 'holocene', name: '全新世', englishName: 'Holocene', startYear: -11700, endYear: 0,
    periodId: 'quaternary', color: '#a0b8c0', description: '气候相对稳定，农业与文明兴起，直至现代。' },
];

const ALL_UNITS = [...EONS, ...ERAS, ...PERIODS, ...EPOCHS];

/** Inclusive start, exclusive end; endYear 0 means "up to the present reference year". */
export function yearWithin(unit, year, nowYear = 2026) {
  if (!unit || !Number.isFinite(year)) return false;
  if (year < unit.startYear) return false;
  return unit.endYear === 0 ? year <= nowYear : year < unit.endYear;
}

export function getEon(year, nowYear = 2026) { return EONS.find(unit => yearWithin(unit, year, nowYear)) || null; }
export function getEra(year, nowYear = 2026) { return ERAS.find(unit => yearWithin(unit, year, nowYear)) || null; }
export function getPeriod(year, nowYear = 2026) { return PERIODS.find(unit => yearWithin(unit, year, nowYear)) || null; }
export function getEpoch(year, nowYear = 2026) { return EPOCHS.find(unit => yearWithin(unit, year, nowYear)) || null; }

/**
 * Full geological context for a simulation year.
 * Pre-Earth years (before ~4.6 Ga) return a "pre-geological" context.
 */
export function getGeologicalContext(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return null;
  const eon = getEon(year, nowYear);
  const era = getEra(year, nowYear);
  const period = getPeriod(year, nowYear);
  const epoch = getEpoch(year, nowYear);
  const beforeEarth = year < EARTH_FORMATION_YEAR - 60000000;
  return {
    year, nowYear, beforeEarth, eon, era, period, epoch,
    label: [eon?.englishName, era?.englishName, period?.englishName, epoch?.englishName]
      .filter(Boolean).join(' · ') || 'Pre-Geological',
    cnLabel: [eon?.name, era?.name, period?.name, epoch?.name].filter(Boolean).join(' · ') || '前地质时期',
    color: period?.color || era?.color || eon?.color || '#7fa0b0',
  };
}

/** Search geological units (eons / eras / periods / epochs) by id, CN or EN name. */
export function findGeologicalUnit(query) {
  if (typeof query !== 'string' || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  return ALL_UNITS.find(unit =>
    unit.id.toLowerCase() === q
    || unit.name === query.trim()
    || unit.englishName.toLowerCase() === q
    || unit.englishName.toLowerCase().includes(q)
    || unit.name.includes(query.trim()),
  ) || null;
}

/** Public read-only accessors used by the search bridge and tests. */
export function listUnits() {
  return { eons: EONS, eras: ERAS, periods: PERIODS, epochs: EPOCHS };
}
