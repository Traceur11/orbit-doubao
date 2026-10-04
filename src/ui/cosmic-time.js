/**
 * cosmic-time.js — ORBIT 2.0 COSMIC TIME bar, history panel, search bridge,
 * URL state and Cosmic Journey.
 *
 * Owns the DOM elements added in shell.html and coordinates:
 *   - the piecewise log-linear timeline (TimelineController),
 *   - the simulation clock (UniverseClock),
 *   - the geological context + events panels,
 *   - playback, stepping, speed presets, NOW,
 *   - the Cosmic Journey camera + timeline sequence,
 *   - ?time= / ?target= URL deep links.
 *
 * The 3D scene (galactic marker, earth visual state) is updated through the
 * `onYearChange` callback provided by app.js.
 */

import { clamp } from '../core/math.js';
import { TIMELINE_KEYS, SPEED_PRESETS, BASE_YEARS_PER_SECOND } from '../universe-time/timeline-controller.js';
import { getGeologicalContext, findGeologicalUnit } from '../universe-time/geological-time.js';
import { getEventsAround, findEvent } from '../universe-time/historical-events.js';
import { formatCompactYear, formatYear, formatYearsAgo, formatYearsAgoProse } from '../universe-time/cosmic-time.js';
import { detectScale } from '../universe-time/time-scale.js';
import { getGalacticYear } from '../universe-time/galactic-orbit.js';
import { createGeologicalTimeline } from './geological-timeline.js';

/** Journey stops from the spec: Earth formation → ... → present (ICS v2026/06). */
export const JOURNEY_STOPS = Object.freeze([
  -4_540_000_000, -2_500_000_000, -538_800_000, -251_902_000, -201_400_000,
  -143_100_000, -66_000_000, -2_580_000, 2026,
]);
const JOURNEY_HOLD_MS = 2600;

/**
 * Only these anchors get a visible label on the cosmic bar (every key still
 * renders a clickable tick). Denser labels would overlap at 8px on mobile.
 */
const SHOW_TICK_LABELS = new Set([
  '2.5 Ga', '538.8 Ma', '251.902 Ma', '201.4 Ma', '143.1 Ma', '66 Ma', '2.58 Ma',
]);

/** Parse ?time=&target= from a URL string (used by app.js and tests). */
export function parseOrbitUrl(search = window.location.search, nowYear = 2026) {
  // Friendly URL aliases for destinations whose internal id differs.
  const TARGET_ALIASES = { 'milky-way': 'galaxy', milkyway: 'galaxy', 'deep-space': 'local-group' };
  const params = new URLSearchParams(search);
  const target = params.get('target');
  const rawTime = params.get('time');
  const time = rawTime === null ? null : Number(rawTime);
  return {
    target: target && /^[a-z0-9-]+$/i.test(target)
      ? (TARGET_ALIASES[target.toLowerCase()] || target) : null,
    time: time !== null && Number.isFinite(time) && time <= nowYear + 6_000_000_000 && time >= -6_000_000_000 ? time : null,
  };
}

function formatSpeed(speed) {
  if (speed < 1) return `${speed}×`;
  if (speed >= 1e9) return '1,000,000,000×';
  if (speed >= 1e6) return '1,000,000×';
  if (speed >= 1e3) return '1,000×';
  return `${speed}×`;
}

export function createCosmicTimeUI({ world, navigation, clock, timeline, toast, searchInput, onYearChange, plateMotion }) {
  const $ = id => document.getElementById(id);
  const track = $('cosmic-track');
  const thumb = $('cosmic-thumb');
  const fill = $('cosmic-fill');
  const readout = $('cosmic-readout');
  const playButton = $('cosmic-play');
  const speedButton = $('cosmic-speed');
  const journeyButton = $('cosmic-journey');
  const platesButton = $('cosmic-plates');
  const panel = $('history-panel');

  let playing = false;
  let speedIndex = 1; // default 1×
  let journey = null;
  let panelOpen = true;
  let dragging = false;
  let lastAppliedYear = null;
  let tick = 0;
  let urlTimer = null;
  let exploreTimer = null;
  let plateEnabled = true;
  let exploreToken = 0;

  /* ---------- ticks ---------- */
  const ticksHost = $('cosmic-ticks');
  for (const key of TIMELINE_KEYS) {
    const mark = document.createElement('i');
    mark.className = 'cosmic-tick' + (key.p === 0 || key.p === 1 ? ' major' : '');
    mark.style.left = `${key.p * 100}%`;
    mark.dataset.position = key.p;
    mark.title = key.label;
    // ORBIT 2.1 merge: every key year is directly clickable.
    mark.onclick = () => {
      cancelJourney();
      setYear(key.year);
      refresh();
      toast(`时间轴 → ${key.label}`);
    };
    ticksHost.appendChild(mark);
    if (key.p > 0 && key.p < 1 && SHOW_TICK_LABELS.has(key.label)) {
      const label = document.createElement('span');
      label.className = 'cosmic-tick-label';
      label.textContent = key.label;
      label.style.left = `${key.p * 100}%`;
      ticksHost.appendChild(label);
    }
  }
  const tickMarks = [...ticksHost.querySelectorAll('.cosmic-tick')];

  /* ---------- state ---------- */
  function setPlaying(value) {
    playing = value;
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? '暂停宇宙时间' : '播放宇宙时间');
    if (!value) scheduleUrlUpdate();
  }

  function setYear(year, { syncUrl = true } = {}) {
    const clamped = clock.setYear(year);
    applyYear(clamped);
    if (syncUrl) scheduleUrlUpdate();
    return clamped;
  }

  function applyYear(year) {
    if (year === lastAppliedYear) return;
    lastAppliedYear = year;
    onYearChange?.(year);
  }

  function refresh() {
    const year = clock.getYear();
    const position = timeline.yearToPosition(year);
    const percent = clamp(position * 100, 0, 125);
    thumb.style.left = `${percent}%`;
    fill.style.width = `${clamp(position * 100, 0, 100)}%`;
    readout.textContent = formatCompactYear(year, clock.nowYear);
    readout.title = formatYear(year, clock.nowYear);
    for (const mark of tickMarks) {
      const at = Math.abs(Number(mark.dataset.position) - position) < 0.015;
      mark.classList.toggle('active', at);
    }
    const scale = detectScale(navigation.getState());
    $('scale-label').textContent = scale.label;
    $('scale-hint').textContent = scale.id === 'galactic'
      ? '≈ 26,000 ly · 银河年 ≈ 230 Myr · 近似' : scale.hint;
    const yearsPerSecond = BASE_YEARS_PER_SECOND * SPEED_PRESETS[speedIndex];
    speedButton.textContent = formatSpeed(SPEED_PRESETS[speedIndex]);
    speedButton.title = yearsPerSecond >= 1e6
      ? `≈ ${formatYearsAgo(yearsPerSecond)}/秒` : `${formatYearsAgo(yearsPerSecond)}/秒`;
    updateHistoryPanel();
    geologicalTimeline.refresh();
  }

  /* ---------- history panel ---------- */
  function windowYearsFor(year) {
    const age = clock.nowYear - year;
    return clamp(age * 0.06 + 10000, 10000, 120_000_000);
  }

  function updateHistoryPanel() {
    if (!panelOpen || !panel) return;
    const year = clock.getYear();
    if (year === clock.nowYear) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const context = getGeologicalContext(year, clock.nowYear);
    const events = getEventsAround(year, windowYearsFor(year)).slice(0, 6);
    $('history-eon').textContent = (context.eon?.englishName || 'PRE-GEOLOGICAL').toUpperCase();
    $('history-en').textContent = context.period?.englishName || context.era?.englishName || context.eon?.englishName || 'EARTH FORMATION';
    $('history-name').textContent = context.period?.name || context.era?.name || context.eon?.name || '地球形成之前';
    const start = context.period ? context.period.startYear
      : context.era ? context.era.startYear
      : context.eon ? context.eon.startYear : -4600000000;
    const end = context.period ? context.period.endYear
      : context.era ? context.era.endYear
      : context.eon ? context.eon.endYear : -4000000000;
    $('history-range').textContent = end === 0
      ? `${formatYearsAgoProse(clock.nowYear - start)} — present`
      : `${formatYearsAgoProse(clock.nowYear - start)} — ${formatYearsAgoProse(clock.nowYear - end)}`;
    const desc = context.period?.description || context.era?.description || context.eon?.description
      || '太阳系尚未形成：银河系中只有星际气体与早期恒星。';
    $('history-desc').textContent = desc;
    const list = $('history-events');
    list.replaceChildren(...events.map(event => {
      const button = document.createElement('button');
      button.className = 'history-event';
      const dot = document.createElement('i');
      const name = document.createElement('b');
      name.textContent = event.name;
      const age = document.createElement('small');
      age.textContent = event.year >= clock.nowYear - 1000
        ? (event.year < 0 ? `${Math.round(clock.nowYear - event.year).toLocaleString('en-US')} yr ago` : `${event.year} CE`)
        : formatYearsAgo(clock.nowYear - event.year);
      button.append(dot, name, age);
      button.title = event.description;
      button.onclick = () => {
        setYear(event.year);
        toast(`时间轴 → ${event.englishName}`);
      };
      return button;
    }));
    const note = $('history-panel').querySelector('.history-note');
    // Paleo-Earth source/confidence label (set by app.js through window.ORBIT).
    const paleo = globalThis.ORBIT?.paleoEarth?.getState?.();
    if (paleo && paleo.confidence && paleo.confidence !== 'observed') {
      const label = paleo.confidence === 'reconstruction' ? 'GPlates 板块重建'
        : paleo.confidence === 'deep-time-schematic' ? '深时证据约束示意'
          : paleo.confidence === 'conceptual' ? '概念化早期地球'
            : '离线示意（OFFLINE SCHEMATIC）';
      note.textContent = `${paleo.stateName || paleo.mode || '古地球'} · ${label} · 海岸线/板块按地质时间重建；银河轨道为参数化近似`;
    } else {
      note.textContent = `历史可视化 · 近似示意，非精确复原；银河轨道为参数化近似（银河年 ${formatYearsAgo(getGalacticYear())}）`;
    }
  }

  function showPanel(open) {
    panelOpen = open;
    if (!open && panel) panel.hidden = true;
    else updateHistoryPanel();
  }

  /* ---------- track interactions ---------- */
  function positionFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    return clamp((clientX - rect.left) / rect.width, 0, 1.25);
  }

  function setYearFromPosition(clientX) {
    cancelJourney();
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
  });
  const endDrag = event => {
    if (!dragging) return;
    dragging = false;
    try { track.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    refresh();
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('wheel', event => {
    event.preventDefault();
    cancelJourney();
    const position = clamp(timeline.yearToPosition(clock.getYear()) + (event.deltaY < 0 ? 0.015 : -0.015), 0, 1.25);
    setYear(timeline.positionToYear(position));
  }, { passive: false });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepYear(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); stepYear(1); }
    else if (event.key === 'Home') { event.preventDefault(); setYear(timeline.keys[0].year); }
    else if (event.key === 'End') { event.preventDefault(); setYear(clock.nowYear); }
  });

  /* ---------- global keys (N / 1 / 2 / 3) ---------- */
  // ORBIT 2.1 merge: quick time + viewport keys. Space is owned by the
  // original navigation handler, which we hand over through ui.setSpaceHandler.
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    const tag = event.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
    if (window.ORBIT?.wallpaper?.active) return;
    const key = event.key.toLowerCase();
    if (key === 'n') {
      event.preventDefault();
      cancelJourney();
      setPlaying(false);
      setYear(clock.nowYear);
      refresh();
      toast('回到现在 · 太阳系返回当前银河参考位置');
    } else if (key === '1') {
      event.preventDefault();
      navigation.flyTo('earth');
    } else if (key === '2') {
      event.preventDefault();
      navigation.flyTo('solar');
    } else if (key === '3') {
      event.preventDefault();
      navigation.flyTo('galaxy');
    }
  });

  function stepYear(direction) {
    cancelJourney();
    const result = timeline.step(clock.getYear(), direction);
    if (!result) { toast(direction < 0 ? '已经是最早的时间' : '已经回到现在'); return; }
    setYear(result.year);
    toast(`时间轴 → ${formatCompactYear(result.year, clock.nowYear)}`);
  }

  /* ---------- controls ---------- */
  $('cosmic-play').onclick = () => {
    cancelJourney();
    setPlaying(!playing);
    if (playing && clock.isPresent()) {
      // resume from the most recent geological key
      const back = timeline.step(clock.nowYear, -1);
      if (back) setYear(back.year);
    }
  };
  $('cosmic-back').onclick = () => stepYear(-1);
  $('cosmic-forward').onclick = () => stepYear(1);
  if (platesButton) {
    const syncPlatesButton = () => {
      platesButton.setAttribute('aria-pressed', String(plateEnabled));
      platesButton.classList.toggle('active', plateEnabled);
      platesButton.title = plateEnabled
        ? '板块漂移：开（GPlates 重建方向；箭头长度为视觉放大）' : '板块漂移：关';
    };
    platesButton.onclick = () => {
      plateEnabled = !plateEnabled;
      syncPlatesButton();
      plateMotion?.setVisible(plateEnabled);
      // Re-apply the current era so arrows appear/disappear immediately.
      onYearChange?.(clock.getYear());
      toast(plateEnabled ? '板块漂移：开' : '板块漂移：关');
    };
    syncPlatesButton();
  }
  $('cosmic-now').onclick = () => {
    cancelJourney();
    setPlaying(false);
    setYear(clock.nowYear);
    toast('回到现在 · 太阳系返回当前银河参考位置');
  };
  $('cosmic-speed').onclick = () => {
    speedIndex = (speedIndex + 1) % SPEED_PRESETS.length;
    refresh();
    toast(`宇宙时间流速 ${formatSpeed(SPEED_PRESETS[speedIndex])}`);
  };
  $('history-close').onclick = () => showPanel(false);
  $('history-explore').onclick = explorePeriod;
  journeyButton.onclick = () => journey ? cancelJourney() : startJourney();

  /* ---------- EARTH GEOLOGICAL TIME (second bar, same clock) ---------- */
  const geologicalTimeline = createGeologicalTimeline({
    bar: $('cosmic-bar'),
    clock,
    timeline,
    navigation,
    setYear,
    toast,
  });

  /* ---------- Cosmic Journey ---------- */
  function startJourney() {
    if (journey) return;
    setPlaying(false);
    journey = { index: -1, phase: 0 };
    journeyButton.classList.add('active');
    toast('宇宙旅行：地球 → 太阳系 → 银河 → 地球历史');
    navigation.flyTo('earth');
    setTimeout(() => { if (journey) navigation.flyTo('solar'); }, 220);
    setTimeout(() => { if (journey) navigation.flyTo('galaxy'); }, 2300);
    setTimeout(() => {
      if (!journey) return;
      journey.phase = 1;
      journey.index = 0;
      journeyStop();
    }, 5400);
  }

  function journeyStop() {
    if (!journey || journey.phase !== 1) return;
    if (journey.index >= JOURNEY_STOPS.length) {
      finishJourney();
      return;
    }
    const year = JOURNEY_STOPS[journey.index];
    setYear(year);
    refresh();
    journey.index += 1;
    journey.timer = setTimeout(journeyStop, JOURNEY_HOLD_MS);
  }

  function finishJourney() {
    cancelJourney();
    setYear(clock.nowYear);
    toast('宇宙旅行完成 · 欢迎回到现在');
  }

  function cancelJourney() {
    if (!journey) return;
    clearTimeout(journey.timer);
    journey = null;
    journeyButton.classList.remove('active');
  }

  /* ---------- explore current period (进入该时期) ---------- */
  function explorePeriod() {
    cancelJourney();
    const token = ++exploreToken;
    navigation.flyTo('galaxy');
    exploreTimer = setTimeout(() => { if (token === exploreToken) navigation.flyTo('solar'); }, 2800);
    exploreTimer = setTimeout(() => { if (token === exploreToken) navigation.flyTo('earth'); }, 4900);
    toast('镜头飞行：银河 → 太阳系 → 地球');
  }

  /* ---------- search bridge ---------- */
  function handleSearchEnter(event) {
    if (event.key !== 'Enter') return;
    const query = searchInput?.value?.trim();
    if (!query) return;
    const unit = findGeologicalUnit(query);
    const eventItem = findEvent(query);
    if (unit) {
      event.preventDefault();
      const endYear = unit.endYear === 0 ? Math.floor(unit.startYear / 2) : unit.endYear;
      const year = Math.round((unit.startYear + Math.max(endYear, unit.startYear)) / 2);
      setYear(year);
      showPanel(true);
      toast(`时间轴 → ${unit.englishName}（${formatYearsAgo(clock.nowYear - year)}）`);
      if (searchInput) searchInput.value = '';
    } else if (eventItem) {
      event.preventDefault();
      setYear(eventItem.year);
      showPanel(true);
      toast(`时间轴 → ${eventItem.englishName}`);
      if (searchInput) searchInput.value = '';
    }
  }
  searchInput?.addEventListener('keydown', handleSearchEnter);

  /* ---------- URL state ---------- */
  function scheduleUrlUpdate() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(syncUrl, 400);
  }

  function syncUrl() {
    const params = new URLSearchParams();
    const year = clock.getYear();
    if (year !== clock.nowYear) params.set('time', String(Math.round(year)));
    const { focusBody, stage } = navigation.getState();
    if (stage === 'galaxy' || stage === 'solar' || (focusBody && focusBody !== 'earth' && !['galaxy', 'solar'].includes(focusBody))) {
      params.set('target', focusBody);
    }
    const qs = params.toString();
    const url = qs ? `${location.pathname}?${qs}` : location.pathname;
    try { history.replaceState(null, '', url); } catch { /* file:// pages may reject */ }
  }

  /* ---------- per-frame ---------- */
  function update(dt) {
    if (playing && !journey) {
      const years = dt * BASE_YEARS_PER_SECOND * SPEED_PRESETS[speedIndex];
      clock.advanceYears(years);
      applyYear(clock.getYear());
    }
    if (++tick % 6 === 0) refresh();
  }

  /* ---------- API ---------- */
  return {
    update,
    refresh,
    setYear,
    getYear: () => clock.getYear(),
    setPlaying,
    isPlaying: () => playing,
    syncUrl,
    showPanel,
    startJourney,
    cancelJourney,
    stepYear,
    isPlateEnabled: () => plateEnabled,
    getState: () => ({
      year: clock.getYear(),
      nowYear: clock.nowYear,
      playing,
      speed: SPEED_PRESETS[speedIndex],
      speedIndex,
      position: timeline.yearToPosition(clock.getYear()),
      journey: !!journey,
    }),
    geologicalTimeline,
  };
}
