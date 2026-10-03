/**
 * geological-timeline.js — EARTH GEOLOGICAL TIME bar for ORBIT 2.0.
 *
 * A second timeline under COSMIC TIME that shares the SAME UniverseClock and
 * TimelineController (single simulation clock; no second time system). It maps
 * Earth's geological history onto the piecewise log-linear timeline so the two
 * bars stay visually aligned.
 *
 * Layers: EON / ERA / PERIOD / EVENT (default PERIOD). The bar is draggable
 * (mouse, touch, trackpad), every segment is clickable and sets the simulation
 * year WITHOUT forcing the camera away from the trajectory view; a compact HUD
 * offers an optional [地球近景] flight.
 *
 * Scientific note (also shown in the info HUD): ages follow the ICS
 * International Chronostratigraphic Chart v2026/06; numeric ages are subject to
 * ongoing revision; the Solar System's Galactic trajectory remains a
 * parameterized VISUALIZATION approximation — not a historical ephemeris.
 *
 * Pure data + conversion helpers are exported for unit tests (no DOM needed).
 */

import { getGeologicalContext } from '../universe-time/geological-time.js';
import { clamp } from '../core/math.js';

/* ---------------------------------------------------------------- *
 *  Data (ages in Ma before present). ICS International             *
 *  Chronostratigraphic Chart v2026/06 (stratigraphy.org/chart/).    *
 * ---------------------------------------------------------------- */

export const GEOLOGICAL_EONS = [
  { id: 'hadean', nameZh: '冥古宙', nameEn: 'Hadean', startMa: 4567, endMa: 4031, color: '#c0553f',
    description: '地球形成初期：岩浆海洋、频繁的撞击与最早的地壳固化；月球在此期间形成。' },
  { id: 'archean', nameZh: '太古宙', nameEn: 'Archean', startMa: 4031, endMa: 2500, color: '#8f6f4a',
    description: '最早的海洋与生命证据出现，地壳持续增长。' },
  { id: 'proterozoic', nameZh: '元古宙', nameEn: 'Proterozoic', startMa: 2500, endMa: 538.8, color: '#4f7a8c',
    description: '大氧化事件、多次雪球地球事件与最早的多细胞生物。' },
  { id: 'phanerozoic', nameZh: '显生宙', nameEn: 'Phanerozoic', startMa: 538.8, endMa: 0, color: '#3f7d5c',
    description: '生命爆发并占据陆地与天空，从寒武纪生命大爆发延续至今。' },
];

export const GEOLOGICAL_ERAS = [
  { id: 'paleozoic', nameZh: '古生代', nameEn: 'Paleozoic', startMa: 538.8, endMa: 251.902, color: '#8aa564',
    description: '生命大爆发与早期陆生演化：无脊椎动物、鱼类、昆虫与最早的两栖动物。' },
  { id: 'mesozoic', nameZh: '中生代', nameEn: 'Mesozoic', startMa: 251.902, endMa: 66, color: '#5d8f7c',
    description: '恐龙时代：大陆分裂、被子植物出现，直至白垩纪末大灭绝。' },
  { id: 'cenozoic', nameZh: '新生代', nameEn: 'Cenozoic', startMa: 66, endMa: 0, color: '#4f7fa0',
    description: '哺乳动物与鸟类占据主导，灵长类演化，最终出现现代人类。' },
];

export const GEOLOGICAL_PERIODS = [
  { id: 'cambrian', nameZh: '寒武纪', nameEn: 'Cambrian', startMa: 538.8, endMa: 485.4, eraId: 'paleozoic', color: '#8fa96a',
    description: '寒武纪生命大爆发：几乎所有主要动物门类在数千万年内出现。' },
  { id: 'ordovician', nameZh: '奥陶纪', nameEn: 'Ordovician', startMa: 485.4, endMa: 443.8, eraId: 'paleozoic', color: '#7fa68a',
    description: '海洋无脊椎动物繁盛，最早的陆生植物出现；末期发生大灭绝。' },
  { id: 'silurian', nameZh: '志留纪', nameEn: 'Silurian', startMa: 443.8, endMa: 419.2, eraId: 'paleozoic', color: '#97b58a',
    description: '陆生维管植物出现，珊瑚礁扩张。' },
  { id: 'devonian', nameZh: '泥盆纪', nameEn: 'Devonian', startMa: 419.2, endMa: 358.86, eraId: 'paleozoic', color: '#8f9a6a',
    description: '"鱼类时代"：四足动物登陆，最早的大型森林出现。' },
  { id: 'carboniferous', nameZh: '石炭纪', nameEn: 'Carboniferous', startMa: 358.86, endMa: 298.9, eraId: 'paleozoic', color: '#6f8f5a',
    description: '大规模沼泽森林形成煤炭，昆虫巨型化。' },
  { id: 'permian', nameZh: '二叠纪', nameEn: 'Permian', startMa: 298.9, endMa: 251.902, eraId: 'paleozoic', color: '#a58a4a',
    description: '泛大陆形成；末期发生地球历史上最大规模的灭绝事件。' },
  { id: 'triassic', nameZh: '三叠纪', nameEn: 'Triassic', startMa: 251.902, endMa: 201.4, eraId: 'mesozoic', color: '#6f9a8a',
    description: '恐龙与早期哺乳动物出现；末期发生三叠纪末大灭绝。' },
  { id: 'jurassic', nameZh: '侏罗纪', nameEn: 'Jurassic', startMa: 201.4, endMa: 143.1, eraId: 'mesozoic', color: '#5d8f7c',
    description: '恐龙主宰陆地，始祖鸟出现，超大陆开始分裂。' },
  { id: 'cretaceous', nameZh: '白垩纪', nameEn: 'Cretaceous', startMa: 143.1, endMa: 66, eraId: 'mesozoic', color: '#4f8f7c',
    description: '被子植物扩张，恐龙持续繁盛，大陆继续分裂；末期发生 K-Pg 灭绝事件。' },
  { id: 'paleogene', nameZh: '古近纪', nameEn: 'Paleogene', startMa: 66, endMa: 23.03, eraId: 'cenozoic', color: '#6f8fa0',
    description: '恐龙灭绝后哺乳动物快速辐射，最早的灵长类出现。' },
  { id: 'neogene', nameZh: '新近纪', nameEn: 'Neogene', startMa: 23.03, endMa: 2.58, eraId: 'cenozoic', color: '#5f7f9a',
    description: '草原扩张、人科谱系与最早的人族成员出现。' },
  { id: 'quaternary', nameZh: '第四纪', nameEn: 'Quaternary', startMa: 2.58, endMa: 0, eraId: 'cenozoic', color: '#7fa0b0',
    description: '冰期—间冰期旋回，现代人类演化并扩散全球。' },
];

/** Epochs shown on the bar; finer GSSP stages (Greenlandian, Northgrippian,
 *  Meghalayan) are reserved for a future refinement. */
export const GEOLOGICAL_EPOCHS = [
  { id: 'pleistocene', nameZh: '更新世', nameEn: 'Pleistocene', startMa: 2.58, endMa: 0.0117, color: '#8fa8b8',
    description: '反复的冰川期，直立人与早期智人出现。' },
  { id: 'holocene', nameZh: '全新世', nameEn: 'Holocene', startMa: 0.0117, endMa: 0, color: '#a0b8c0',
    description: '气候相对稳定，农业与文明兴起，直至现代。' },
];

/** Major Earth-history events (age in Ma; ≈ marks approximation). */
export const GEOLOGICAL_EVENTS = [
  { id: 'earth-formation', nameZh: '地球形成', nameEn: 'Earth Formation', ageMa: 4540, color: '#e0896f',
    description: '地球在太阳星云中吸积形成。' },
  { id: 'moon-formation', nameZh: '月球形成', nameEn: 'Moon Formation', ageMa: 4510, color: '#c9c2d6',
    description: '大碰撞假说：早期撞击碎片凝聚为月球。' },
  { id: 'great-oxidation', nameZh: '大氧化事件', nameEn: 'Great Oxidation Event', ageMa: 2400, color: '#8fae6a',
    description: '蓝细菌产氧导致大气氧含量首次显著上升。' },
  { id: 'cambrian-explosion', nameZh: '寒武纪生命大爆发', nameEn: 'Cambrian Explosion', ageMa: 538.8, color: '#b7d06a',
    description: '几乎所有主要动物门类在相对短暂的地质时间内出现。' },
  { id: 'first-land-plants', nameZh: '最早陆生植物', nameEn: 'First Land Plants', ageMa: 470, color: '#6fae6a',
    description: '苔藓类植物登陆，改变地表风化与大气组成。' },
  { id: 'first-forests', nameZh: '最早森林', nameEn: 'First Forests', ageMa: 385, color: '#4f8f4a',
    description: '泥盆纪晚期出现最早的大型树木与森林生态系统。' },
  { id: 'first-dinosaurs', nameZh: '最早恐龙', nameEn: 'First Dinosaurs', ageMa: 230, color: '#d08f4a',
    description: '三叠纪中期，最早确认的恐龙出现在泛大陆上。' },
  { id: 'k-pg', nameZh: '白垩纪—古近纪边界', nameEn: 'K–Pg Boundary', ageMa: 66, color: '#d06a6a',
    description: '希克苏鲁伯小行星撞击与火山活动叠加，非鸟恐龙灭绝。' },
  { id: 'homo-sapiens', nameZh: '智人', nameEn: 'Homo sapiens', ageMa: 0.3, color: '#8fb0d0',
    description: '摩洛哥杰贝尔依罗等地发现约 30 万年前的最早智人化石。' },
  { id: 'agriculture', nameZh: '农业起源', nameEn: 'Agriculture', ageMa: 0.012, color: '#b0c080',
    description: '新月沃地等地开始驯化作物与牲畜。' },
  { id: 'present', nameZh: '现在', nameEn: 'Present', ageMa: 0, color: '#93ecdc',
    description: '今天。' },
];

export const ICS_SOURCE_TEXT = 'DATA SOURCE — International Commission on Stratigraphy · ICS International Chronostratigraphic Chart v2026/06 · https://stratigraphy.org/chart/ · Numeric ages are subject to ongoing revision.（数值年龄可能随国际地层表更新而修订。）';

/* ---------------------------------------------------------------- *
 *  Conversion + formatting helpers (pure, unit-testable)             *
 * ---------------------------------------------------------------- */

/** Age in Ma → simulation year.
 *
 * NOTE: the project's simulation years use the BCE scale — 66 Ma is the year
 * -66_000_000 (matching ?time=-66000000, TIMELINE_KEYS and the galactic
 * orbit). The `nowYear` argument is kept for API compatibility but does not
 * offset the past scale: `nowYear - ageMa * 1e6` would shift every boundary by
 * the present year (2026), breaking alignment with the existing clock.
 */
export function ageMaToYear(ageMa, nowYear = 2026) {
  if (!Number.isFinite(ageMa)) throw new TypeError('ageMaToYear: ageMa must be finite.');
  void nowYear;
  if (ageMa === 0) return 0;
  return -ageMa * 1_000_000;
}

/** Simulation year → age in Ma before present (never negative). */
export function yearToAgeMa(year, nowYear = 2026) {
  if (!Number.isFinite(year)) throw new TypeError('yearToAgeMa: year must be finite.');
  void nowYear;
  return Math.max(0, -year / 1_000_000);
}

function trimFixed(value, decimals) {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

/** 4567 → '4.567 Ga' · 538.8 → '538.8 Ma' · 0.3 → '300 ka' · 0 → 'NOW'. */
export function formatAge(ageMa) {
  if (!Number.isFinite(ageMa)) return '—';
  if (ageMa <= 0) return 'NOW';
  const years = ageMa * 1_000_000;
  if (years >= 1e9) return `${trimFixed(ageMa / 1e3, 3)} Ga`;
  if (years >= 1e6) return `${trimFixed(ageMa, 2)} Ma`;
  if (years >= 1e3) return `${trimFixed(years / 1e3, 1)} ka`;
  return `${Math.round(years)} yr`;
}

/** Mid age (Ma) of a unit; a unit ending at the present uses half its start. */
export function midAgeMa(unit) {
  const end = unit.endMa > 0 ? unit.endMa : 0;
  return (unit.startMa + end) / 2;
}

/* ---------------------------------------------------------------- *
 *  DOM builder                                                       *
 * ---------------------------------------------------------------- */

const SCALES = [
  { key: 'eon', label: 'EON', data: GEOLOGICAL_EONS, rowClass: 'geo-row--eon' },
  { key: 'era', label: 'ERA', data: GEOLOGICAL_ERAS, rowClass: 'geo-row--era' },
  { key: 'period', label: 'PERIOD', data: GEOLOGICAL_PERIODS, rowClass: 'geo-row--period' },
  { key: 'event', label: 'EVENT', data: null, rowClass: 'geo-row--event' },
];

export function createGeologicalTimeline({ bar, clock, timeline, navigation, setYear, toast }) {
  const root = document.createElement('section');
  root.className = 'geo';
  root.id = 'geo-timeline';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', '地球地质时间轴 · 与宇宙时间共享同一游标');

  /* ----- header ----- */
  const head = document.createElement('div');
  head.className = 'geo-head';
  const kicker = document.createElement('span');
  kicker.className = 'geo-kicker';
  kicker.textContent = 'EARTH GEOLOGICAL TIME';
  const current = document.createElement('b');
  current.id = 'geo-current';
  current.textContent = 'PRESENT';
  const currentZh = document.createElement('span');
  currentZh.id = 'geo-current-zh';
  currentZh.textContent = '现在';
  const age = document.createElement('small');
  age.id = 'geo-age';
  age.textContent = '0 Ma';
  head.append(kicker, current, currentZh, age);

  const tools = document.createElement('div');
  tools.className = 'geo-tools';
  const scales = document.createElement('div');
  scales.className = 'geo-scales';
  scales.setAttribute('role', 'tablist');
  scales.setAttribute('aria-label', '地质时间轴显示层级');
  const scaleButtons = new Map();
  for (const scale of SCALES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'geo-scale-btn' + (scale.key === 'period' ? ' active' : '');
    button.textContent = scale.label;
    button.dataset.scale = scale.key;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', scale.key === 'period' ? 'true' : 'false');
    button.title = scale.key === 'event'
      ? '重大地球历史事件' : `${scale.label} · 地质${scale.label === 'EON' ? '宙' : scale.label === 'ERA' ? '代' : '纪'}`;
    button.setAttribute('aria-label', button.title);
    button.onclick = () => { setScale(scale.key); };
    scales.appendChild(button);
    scaleButtons.set(scale.key, button);
  }
  const linkButton = document.createElement('button');
  linkButton.type = 'button';
  linkButton.id = 'geo-link';
  linkButton.textContent = 'TIME LINK';
  linkButton.dataset.state = 'on';
  linkButton.setAttribute('aria-pressed', 'true');
  linkButton.title = '时间联动：地质时间与宇宙轨迹共享同一游标（ON）。关闭后仅淡化强调，不改变共享时间。';
  linkButton.setAttribute('aria-label', '时间联动开关');
  const infoButton = document.createElement('button');
  infoButton.type = 'button';
  infoButton.id = 'geo-info';
  infoButton.textContent = 'ⓘ';
  infoButton.title = '数据来源与科学说明';
  infoButton.setAttribute('aria-label', '数据来源与科学说明');
  const minimizeButton = document.createElement('button');
  minimizeButton.type = 'button';
  minimizeButton.id = 'geo-min';
  minimizeButton.textContent = '—';
  minimizeButton.title = '最小化地质时间轴';
  minimizeButton.setAttribute('aria-label', '最小化地质时间轴');
  tools.append(scales, linkButton, infoButton, minimizeButton);
  head.append(tools);

  /* ----- track + rows ----- */
  const track = document.createElement('div');
  track.className = 'geo-track';
  track.id = 'geo-track';
  track.setAttribute('role', 'slider');
  track.tabIndex = 0;
  track.setAttribute('aria-label', '地球地质时间轴 · 拖动穿越地球历史（与 COSMIC TIME 联动）');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', '100');

  const rows = {};
  for (const scale of SCALES) {
    const row = document.createElement('div');
    row.className = `geo-row ${scale.rowClass}`;
    row.dataset.scale = scale.key;
    if (scale.key === 'event') {
      row.classList.add('geo-row--events');
    }
    track.appendChild(row);
    rows[scale.key] = row;
  }
  const cursor = document.createElement('div');
  cursor.className = 'geo-cursor';
  cursor.id = 'geo-cursor';
  cursor.innerHTML = '<i></i>';
  track.appendChild(cursor);
  const tooltip = document.createElement('div');
  tooltip.className = 'geo-tip';
  tooltip.id = 'geo-tip';
  track.appendChild(tooltip);

  /* ----- mini (collapsed) row ----- */
  const mini = document.createElement('div');
  mini.className = 'geo-mini';
  mini.id = 'geo-mini';
  mini.hidden = true;
  mini.textContent = 'EARTH · PRESENT · NOW';
  mini.setAttribute('role', 'button');
  mini.tabIndex = 0;
  mini.title = '展开地质时间轴';

  root.append(head, track, mini);
  bar.insertAdjacentElement('afterend', root);

  /* ----- state ----- */
  const nowYear = clock.nowYear;
  let scale = 'period';
  let linked = true;
  let collapsed = false;
  let hudOpen = null; // { id, kind, unit }
  let dragging = false;

  /* ----- render rows (positions via the shared TimelineController) ----- */
  function positionOf(year) { return clamp(timeline.yearToPosition(year), 0, 1); }

  function buildSegment(unit, kind) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'geo-seg';
    el.dataset.id = unit.id;
    el.dataset.kind = kind;
    const p0 = positionOf(ageMaToYear(unit.startMa, nowYear));
    const p1 = positionOf(ageMaToYear(unit.endMa, nowYear));
    el.style.left = `${p0 * 100}%`;
    el.style.width = `${Math.max((p1 - p0) * 100, 0.4)}%`;
    el.style.setProperty('--seg', unit.color);
    el.title = `${unit.nameEn} · ${unit.nameZh}\n${formatAge(unit.startMa)} → ${formatAge(unit.endMa)}\n${unit.description}`;
    el.setAttribute('aria-label', `${unit.nameZh}，${formatAge(unit.startMa)} 至 ${formatAge(unit.endMa)}`);
    el.onclick = event => {
      event.stopPropagation();
      selectUnit(unit, kind);
    };
    return el;
  }

  function renderRows() {
    for (const scale of SCALES) {
      if (!scale.data) continue;
      const host = rows[scale.key];
      host.replaceChildren(...scale.data.map(unit => buildSegment(unit, scale.key)));
    }
    // Event dots: small glowing marks on the event row.
    const eventRow = rows.event;
    eventRow.replaceChildren(...GEOLOGICAL_EVENTS.map(event => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'geo-event';
      dot.dataset.id = event.id;
      dot.style.left = `${positionOf(ageMaToYear(event.ageMa, nowYear)) * 100}%`;
      dot.style.setProperty('--seg', event.color);
      dot.title = `${event.nameEn} · ${event.nameZh}\n${formatAge(event.ageMa)}\n${event.description}`;
      dot.setAttribute('aria-label', `${event.nameZh}，${formatAge(event.ageMa)}`);
      dot.onclick = () => {
        setYear(ageMaToYear(event.ageMa, nowYear));
        refresh();
        toast(`地质时间 → ${event.nameEn} · ${formatAge(event.ageMa)}`);
      };
      return dot;
    }));
    // Period name tags (visible on the period row).
    const tags = document.createElement('div');
    tags.className = 'geo-tags';
    tags.id = 'geo-tags';
    for (const unit of GEOLOGICAL_PERIODS) {
      const tag = document.createElement('span');
      tag.className = 'geo-tag';
      tag.textContent = unit.nameEn;
      const p = positionOf(ageMaToYear(midAgeMa(unit), nowYear));
      tag.style.left = `${p * 100}%`;
      tag.title = `${unit.nameEn} · ${unit.nameZh}`;
      tags.appendChild(tag);
    }
    const previousTags = root.querySelector('.geo-tags');
    if (previousTags) previousTags.remove();
    track.insertAdjacentElement('afterend', tags);
  }

  /* ----- selection + HUD ----- */
  const hud = document.createElement('div');
  hud.className = 'geo-hud';
  hud.id = 'geo-hud';
  hud.hidden = true;
  root.appendChild(hud);

  function selectUnit(unit, kind) {
    const year = ageMaToYear(midAgeMa(unit), nowYear);
    setYear(year);
    refresh();
    showHud(unit, kind, year);
    toast(`地质时间 → ${unit.nameEn} · ${formatAge(midAgeMa(unit))}`);
  }

  function showHud(unit, kind, year) {
    hudOpen = { id: unit.id, kind };
    hud.hidden = false;
    const era = kind === 'period' ? GEOLOGICAL_ERAS.find(e => e.id === unit.eraId) : null;
    const zh = kind === 'eon' ? '宙' : kind === 'era' ? '代' : '纪';
    const eraPrefix = era ? `${era.nameEn} · ${era.nameZh} · ` : '';
    hud.innerHTML = `
      <div class="geo-hud-eyebrow">EARTH GEOLOGICAL TIME</div>
      <h3 class="geo-hud-en">${unit.nameEn}<span>${zh}</span></h3>
      <p class="geo-hud-zh">${unit.nameZh}</p>
      <p class="geo-hud-range">${eraPrefix}${formatAge(unit.startMa)} — ${formatAge(unit.endMa)}</p>
      <p class="geo-hud-desc">${unit.description}</p>
      <div class="geo-hud-position"><b>CURRENT POSITION</b><span>≈ ${formatAge(yearToAgeMa(year, nowYear))}</span></div>
      <div class="geo-hud-actions">
        <button class="geo-hud-earth" data-action="earth">地球近景 ↗</button>
        <button class="geo-hud-close" data-action="close">关闭</button>
      </div>`;
    hud.querySelector('[data-action="earth"]').onclick = () => {
      navigation.flyTo('earth');
      toast('镜头飞行 → 地球近景');
    };
    hud.querySelector('[data-action="close"]').onclick = () => {
      hud.hidden = true;
      hudOpen = null;
    };
  }

  /* ----- info source HUD ----- */
  function showInfo() {
    const existing = root.querySelector('.geo-info-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.className = 'geo-info-pop';
    pop.innerHTML = `<b>${ICS_SOURCE_TEXT.split(' · ')[0]}</b>
      <p>ICS International Chronostratigraphic Chart · v2026/06<br>https://stratigraphy.org/chart/<br><br>Numeric ages are subject to ongoing revision.<br>数值年龄可能随国际地层表更新而修订。<br><br>地质时间用于描述地球历史；宇宙轨迹用于展示太阳系运动的参数化视觉模型。时间可以联动浏览，但不代表精确历史天文星历。</p>`;
    root.appendChild(pop);
    setTimeout(() => {
      const again = root.querySelector('.geo-info-pop');
      if (again) again.remove();
    }, 12000);
  }

  /* ----- dragging (mouse + touch + trackpad, no page scroll) ----- */
  function positionFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    return clamp((clientX - rect.left) / rect.width, 0, 1.25);
  }

  function setYearFromPosition(clientX) {
    const position = positionFromClientX(clientX);
    const year = timeline.positionToYear(position);
    setYear(year);
    refresh();
  }

  track.addEventListener('pointerdown', event => {
    dragging = true;
    track.setPointerCapture(event.pointerId);
    track.focus();
    setYearFromPosition(event.clientX);
  });
  track.addEventListener('pointermove', event => {
    if (dragging) setYearFromPosition(event.clientX);
    else showHover(event.clientX, event.clientY);
  });
  const endDrag = event => {
    if (!dragging) return;
    dragging = false;
    try { track.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('wheel', event => {
    event.preventDefault();
    const position = clamp(timeline.yearToPosition(clock.getYear()) + (event.deltaY < 0 ? 0.012 : -0.012), 0, 1.25);
    setYear(timeline.positionToYear(position));
    refresh();
  }, { passive: false });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setYear(timeline.positionToYear(Math.max(0, timeline.yearToPosition(clock.getYear()) - 0.012))); refresh(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); setYear(timeline.positionToYear(Math.min(1.25, timeline.yearToPosition(clock.getYear()) + 0.012))); refresh(); }
    else if (event.key === 'Home') { event.preventDefault(); setYear(timeline.keys[0].year); refresh(); }
    else if (event.key === 'End') { event.preventDefault(); setYear(clock.nowYear); refresh(); }
  });

  function showHover(clientX, clientY) {
    // Tooltip on the event row: nearest event dot within 24px.
    const rect = track.getBoundingClientRect();
    const position = clamp((clientX - rect.left) / rect.width, 0, 1);
    let best = null, bestDistance = Infinity;
    for (const event of GEOLOGICAL_EVENTS) {
      const p = positionOf(ageMaToYear(event.ageMa, nowYear));
      const distance = Math.abs(p - position);
      if (distance < bestDistance && distance < 0.015) { best = event; bestDistance = distance; }
    }
    if (best) {
      tooltip.textContent = `${best.nameEn} · ${best.nameZh} · ${formatAge(best.ageMa)}`;
      tooltip.style.left = `${position * 100}%`;
      tooltip.style.display = 'block';
    } else tooltip.style.display = 'none';
  }
  track.addEventListener('pointerleave', () => { tooltip.style.display = 'none'; });

  /* ----- scale switching ----- */
  function setScale(next) {
    scale = next;
    for (const [key, button] of scaleButtons) {
      const active = key === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const [key, row] of Object.entries(rows)) {
      const emphasize = key === next || next === 'event';
      row.classList.toggle('emphasize', emphasize);
      row.classList.toggle('dim', !emphasize);
    }
    refresh();
  }

  /* ----- collapse ----- */
  function toggleCollapse() {
    collapsed = !collapsed;
    root.classList.toggle('collapsed', collapsed);
    mini.hidden = !collapsed;
    head.hidden = collapsed;
    track.hidden = collapsed;
    minimizeButton.textContent = collapsed ? '+' : '—';
    minimizeButton.title = collapsed ? '展开地质时间轴' : '最小化地质时间轴';
  }
  minimizeButton.onclick = toggleCollapse;
  mini.onclick = toggleCollapse;
  mini.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleCollapse(); }
  };
  linkButton.onclick = () => {
    linked = !linked;
    linkButton.dataset.state = linked ? 'on' : 'off';
    linkButton.setAttribute('aria-pressed', linked ? 'true' : 'false');
    root.classList.toggle('unlinked', !linked);
    toast(linked
      ? 'TIME LINK ON — 地质时间与宇宙轨迹共享同一游标'
      : 'TIME LINK OFF — 时间仍共享，仅淡化联动强调');
    refresh();
  };
  infoButton.onclick = showInfo;

  /* ----- refresh (driven by cosmic.refresh()) ----- */
  function refresh() {
    const year = clock.getYear();
    const position = positionOf(year);
    const pct = position * 100;
    cursor.style.left = `${pct}%`;
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
    const context = getGeologicalContext(year, nowYear);
    const ageMa = yearToAgeMa(year, nowYear);
    if (year === nowYear) {
      current.textContent = 'PRESENT';
      currentZh.textContent = '现在';
    } else {
      const unit = context.period || context.era || context.eon;
      current.textContent = unit ? unit.englishName.toUpperCase() : 'PRE-GEOLOGICAL';
      currentZh.textContent = unit ? unit.name : '地球形成之前';
    }
    age.textContent = year === nowYear ? 'NOW' : `≈ ${formatAge(ageMa)}`;
    // trajectory enhancement label.
    const stage = navigation?.getState?.()?.stage;
    root.classList.toggle('geo-trajectory', stage === 'trajectory');
    // highlight active segments + cursor glow per link state.
    root.classList.toggle('geo-linked', linked);
    // mark current unit active
    const activeUnit = (context.period || context.era || context.eon)?.id;
    for (const seg of root.querySelectorAll('.geo-seg')) {
      seg.classList.toggle('active', seg.dataset.id === activeUnit);
    }
    for (const dot of root.querySelectorAll('.geo-event')) {
      const event = GEOLOGICAL_EVENTS.find(item => item.id === dot.dataset.id);
      if (!event) continue;
      const eventYear = ageMaToYear(event.ageMa, nowYear);
      dot.classList.toggle('active', Math.abs(positionOf(eventYear) - position) < 0.002);
    }
    // mini label
    mini.textContent = `EARTH · ${current.textContent} · ${year === nowYear ? 'NOW' : formatAge(ageMa)}`;
    // HUD position line, if open
    if (hudOpen && !hud.hidden) {
      const pos = hud.querySelector('.geo-hud-position span');
      if (pos) pos.textContent = `≈ ${formatAge(yearToAgeMa(year, nowYear))}`;
    }
  }

  /* ----- keyboard: G / J / K (does not touch existing H / F / I / N) ----- */
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    const tag = event.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
    if (window.ORBIT?.wallpaper?.active) return;
    const key = event.key.toLowerCase();
    if (key === 'g') {
      event.preventDefault();
      toggle();
      toast(collapsed ? '地质时间轴已最小化' : '地质时间轴已展开');
    } else if (key === 'j') {
      event.preventDefault();
      const jurassic = GEOLOGICAL_PERIODS.find(unit => unit.id === 'jurassic');
      selectUnit(jurassic, 'period');
    } else if (key === 'k') {
      event.preventDefault();
      const kpg = GEOLOGICAL_EVENTS.find(event => event.id === 'k-pg');
      setYear(ageMaToYear(kpg.ageMa, nowYear));
      refresh();
      toast(`地质时间 → K–Pg Boundary · 66 Ma`);
    }
  });

  /* ----- show / hide / toggle ----- */
  function show() {
    root.hidden = false;
    root.style.display = '';
  }
  function hide() {
    root.hidden = true;
  }
  function toggle() {
    if (root.hidden) show();
    else hide();
  }
  function setAge(ageMa) {
    setYear(ageMaToYear(ageMa, nowYear));
  }

  /* ----- init ----- */
  renderRows();
  setScale('period');
  refresh();

  return {
    refresh,
    setScale,
    toggle,
    show,
    hide,
    setAge,
    getState: () => ({
      visible: !root.hidden,
      scale,
      linked,
      currentAgeMa: yearToAgeMa(clock.getYear(), nowYear),
      currentYear: clock.getYear(),
      selectedUnitId: hudOpen?.id || null,
      selectedEventId: null,
    }),
  };
}
