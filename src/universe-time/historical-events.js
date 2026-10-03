/**
 * historical-events.js — key Earth-history events for the COSMIC TIME system.
 *
 * Years are simulation years (negative = before the common era).
 * `source` tags reference docs/DATA_SOURCES.md. Items marked 'approximation'
 * use widely cited approximate dates.
 */

export const HISTORICAL_EVENTS = [
  { id: 'earth-formation', year: -4540000000, name: '地球形成', englishName: 'Earth Formation',
    category: 'formation', source: 'nasa',
    description: '地球在太阳星云中吸积形成，随后与忒伊亚（Theia）碰撞形成月球。' },
  { id: 'moon-formation', year: -4510000000, name: '月球形成', englishName: 'Moon Formation',
    category: 'formation', source: 'nasa',
    description: '大碰撞假说：一颗火星大小的天体撞击早期地球，碎片凝聚为月球。' },
  { id: 'first-oceans', year: -4400000000, name: '最早的海洋', englishName: 'First Oceans',
    category: 'ocean', source: 'usgs', 
    description: '地壳冷却后水蒸气凝结，形成最早的液态水海洋。' },
  { id: 'early-life', year: -3800000000, name: '最早的生命', englishName: 'Early Life',
    category: 'life', source: 'smithsonian', 
    description: '格陵兰伊苏阿（Isua）等地发现最早的生命化学痕迹，原始细胞开始演化。' },
  { id: 'great-oxidation', year: -2400000000, name: '大氧化事件', englishName: 'Great Oxidation Event',
    category: 'life', source: 'smithsonian',
    description: '蓝细菌产氧导致大气氧含量首次显著上升，深刻改变地球化学循环。' },
  { id: 'cambrian-explosion', year: -538800000, name: '寒武纪生命大爆发', englishName: 'Cambrian Explosion',
    category: 'life', source: 'britannica',
    description: '几乎所有主要动物门类在相对短暂的地质时间内首次出现于化石记录。' },
  { id: 'first-land-plants', year: -470000000, name: '最早的陆生植物', englishName: 'First Land Plants',
    category: 'life', source: 'britannica', 
    description: '苔藓类植物登陆，改变地表风化与大气组成。' },
  { id: 'first-forests', year: -385000000, name: '最早的森林', englishName: 'First Forests',
    category: 'life', source: 'britannica',
    description: '泥盆纪晚期出现最早的大型树木与森林生态系统。' },
  { id: 'first-dinosaurs', year: -230000000, name: '最早的恐龙', englishName: 'First Dinosaurs',
    category: 'life', source: 'britannica',
    description: '三叠纪中期，最早确认的恐龙出现在泛大陆上。' },
  { id: 'first-mammals', year: -225000000, name: '最早的哺乳动物', englishName: 'First Mammals',
    category: 'life', source: 'smithsonian',
    description: '与恐龙同时出现的小型合弓类后代，在恐龙灭绝后迅速辐射。' },
  { id: 'dinosaur-extinction', year: -66000000, name: '恐龙灭绝（K-Pg）', englishName: 'Dinosaur Extinction',
    category: 'extinction', source: 'usgs',
    description: '希克苏鲁伯（Chicxulub）小行星撞击与火山活动叠加，非鸟恐龙灭绝。' },
  { id: 'early-primates', year: -55000000, name: '最早的灵长类', englishName: 'Early Primates',
    category: 'life', source: 'smithsonian',
    description: '古新世—始新世之交，最早的灵长类化石出现。' },
  { id: 'hominins', year: -6000000, name: '人族谱系', englishName: 'Hominins',
    category: 'human', source: 'smithsonian',
    description: '人族（Hominini）与黑猩猩谱系分化，直立行走的早期成员出现。' },
  { id: 'homo-sapiens', year: -300000, name: '智人出现', englishName: 'Homo sapiens',
    category: 'human', source: 'smithsonian', 
    description: '摩洛哥杰贝尔依罗（Jebel Irhoud）等地发现约 30 万年前的最早智人化石。' },
  { id: 'agriculture', year: -12000, name: '农业起源', englishName: 'Agriculture',
    category: 'civilization', source: 'britannica',
    description: '新月沃地等地开始驯化作物与牲畜，从狩猎采集转向定居农业。' },
  { id: 'industrial-revolution', year: 1760, name: '工业革命', englishName: 'Industrial Revolution',
    category: 'modern', source: 'britannica',
    description: '蒸汽动力与工厂制度兴起，人类活动开始显著影响全球气候与生态。' },
  { id: 'present', year: 2026, name: '现在', englishName: 'Present',
    category: 'modern', source: 'nasa',
    description: '人类通过卫星与探测器持续观测地球与宇宙的今天。' },
];

const EVENT_BY_ID = new Map(HISTORICAL_EVENTS.map(event => [event.id, event]));

/**
 * Events whose year falls inside [year - windowYears, year + windowYears],
 * sorted by distance from `year`.
 */
export function getEventsAround(year, windowYears = 60000000) {
  if (!Number.isFinite(year)) return [];
  return HISTORICAL_EVENTS
    .filter(event => Math.abs(event.year - year) <= windowYears)
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));
}

/** The nearest event to `year` (exact tie prefers the older event). */
export function getNearestEvent(year) {
  if (!Number.isFinite(year)) return null;
  let best = null, bestDistance = Infinity;
  for (const event of HISTORICAL_EVENTS) {
    const distance = Math.abs(event.year - year);
    if (distance < bestDistance) { best = event; bestDistance = distance; }
  }
  return best;
}

/** Search events by id, CN or EN name. */
export function findEvent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  return HISTORICAL_EVENTS.find(event =>
    event.id.toLowerCase() === q
    || event.name === query.trim()
    || event.englishName.toLowerCase() === q
    || event.englishName.toLowerCase().includes(q)
    || event.name.includes(query.trim()),
  ) || null;
}

export { EVENT_BY_ID };
