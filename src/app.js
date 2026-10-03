import { bindCompactUI } from './ui/compact.js';
import { createWallpaperRenderer } from './ui/wallpaper-renderer.js';
import * as THREE from 'three';
import { createRenderer, createPipeline } from './core/renderer.js';
import { createCamera, createNavigation } from './core/camera.js';
import { createWorld, updateWorldVisibility } from './core/scene.js';
import { loadTextures } from './core/textures.js';
import { visitPing } from './core/telemetry.js';
import { data } from './universe/catalog.js';
import { createInfoPanel } from './ui/info-panel.js';
import { createLabels } from './ui/labels.js';
import { bindNavigationUI } from './ui/navigation.js';
import { toast, fail } from './ui/feedback.js';
import { createEarthSense } from './earthsense/index.js';
import { createEarthDetail } from './earth/detail.js';
import { mobile } from './core/math.js';
import { UniverseClock } from './universe-time/universe-clock.js';
import { TimelineController } from './universe-time/timeline-controller.js';
import { getEarthEvolution, formatEarthAge, getTechEra } from './universe-time/earth-evolution.js';
import { createPaleogeographyTextures } from './earth/paleogeography.js';
import { createCosmicTimeUI, parseOrbitUrl } from './ui/cosmic-time.js';
import { BRANDING } from './branding.js';

/** 应用「我的 ORBIT」品牌配置（来自 branding.js，改一个文件即可换名字）。 */
function applyBranding() {
  document.title = BRANDING.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = BRANDING.description;
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = BRANDING.tagline;
  const brandEn = document.querySelector('.brand-english');
  if (brandEn) brandEn.textContent = BRANDING.taglineEn;
  const github = document.querySelector('.github-link');
  if (github && BRANDING.githubUrl) github.href = BRANDING.githubUrl;
}

export async function startOrbit() {
  let renderer;
  applyBranding();
  window.addEventListener('error', event => {
    console.error(event.error || event.message);
    if (!renderer) fail('加载出现问题。请使用支持 WebGL 2 的新版 Chrome、Edge 或 Safari 打开此文件。');
  });
  visitPing();
  try {
    renderer = createRenderer(document.getElementById('universe'), () =>
      fail('图形上下文已丢失。请关闭占用显卡的页面后，重新加载星空。'));
    const scene = new THREE.Scene();
    const { camera, controls } = createCamera(renderer);
    const { composer, resize, updateFraming } = createPipeline(renderer, scene, camera);
    const pixels = resize();
    const assets = window.ORBIT_ASSETS;
    const textures = await loadTextures(assets, fraction => {
      document.getElementById('load-progress').style.width = `${fraction * 90}%`;
    });
    // Earth Evolution: procedural paleogeography maps (generated once at
    // startup, offline-safe, no external fetch). They feed the Earth shader's
    // uHistoryMapA/B uniforms and must exist before createWorld builds the mesh.
    const historicalTextures = createPaleogeographyTextures();
    Object.assign(textures, historicalTextures);
    const world = createWorld(scene, textures, pixels);
    const earthDetail = createEarthDetail({ world, renderer, assets, compact: mobile() });
    const info = createInfoPanel({ getData: world.getData });
    let ui, earthsense;
    const navigation = createNavigation({
      camera, controls, world, onInfo: info.update, toast,
      onStage: mode => ui?.updateStage(mode),
    });
    // ORBIT 2.0: epoch nodes painted on the Galactic orbit jump the COSMIC
    // TIME clock to their year when clicked (labels and 3D picking both land
    // here). `cosmic` is created later in the same scope — the closure reads
    // it only after user interaction, when it is initialized.
    const epochNodes = world.galacticMotion?.getEpochNodes?.() || [];
    const labels = createLabels({
      camera, controls, world, onSelect: navigation.flyTo, onInfo: () => info.update('solar'),
      epochNodes,
      onEpoch: node => {
        cosmic.setYear(node.year);
        cosmic.refresh();
        toast(`${node.cn || node.name} · 时间回到 ${node.name}`);
      },
    });
    ui = bindNavigationUI({ renderer, camera, world, navigation, assets, toast, controls,
      wallpaperView: createWallpaperRenderer({ renderer, composer, scene, world, textures, mainCamera: camera, resizeMain: () => resize(world) }),
      setSpaceColor: color => {
        scene.background = new THREE.Color(color);
        renderer.setClearColor(color);
        document.documentElement.style.setProperty('--space-color', color);
      },
      onPick: (raycaster, event) => {
        // Epoch nodes on the Galactic orbit: clicking jumps the clock.
        const hit = world.galacticMotion?.pickEpoch?.(raycaster);
        if (hit) {
          cosmic.setYear(hit.year);
          cosmic.refresh();
          toast(`${hit.cn || hit.name} · 时间回到 ${hit.name}`);
          return true;
        }
        return earthsense?.pick(raycaster, event) || false;
      },
    });
    world.update(0, ui.getState());
    navigation.initialize();
    earthsense = createEarthSense({ world, camera, controls, navigation, ui });
    bindCompactUI();

    // ORBIT 2.0 — cosmic clock, timeline, history UI and URL deep links.
    const nowYear = new Date().getUTCFullYear();
    const clock = new UniverseClock({ nowYear });
    const timeline = new TimelineController({ nowYear });
    const baseAtmosphere = world.earth?.atmosphere?.material.uniforms;
    const baseAtmosphereColor = baseAtmosphere?.uColor?.value?.getHex?.() ?? 0x4a7bd8;
    const baseAtmosphereStrength = baseAtmosphere?.uStrength?.value ?? 1.1;
    const baseCloudOpacity = world.clouds?.material?.opacity ?? 0.64;
    // Human space-technology era (satellites / ISS / JWST / Voyager): visible
    // only from 1957 onward in simulation years — a Jurassic Earth must not
    // be surrounded by modern spacecraft.
    let techEra = true;
    function applyEarthVisual(year) {
      // EarthSense shows the live modern surface; on exit the animate loop
      // re-applies the visual for the current simulation year.
      const visual = earthsense?.active
        ? getEarthEvolution(nowYear, nowYear)
        : getEarthEvolution(year, nowYear);
      techEra = getTechEra(year, nowYear);
      if (world.earthSatellites) world.earthSatellites.visible = techEra && !earthsense?.active;
      if (world.station) world.station.visible = techEra;
      if (world.jwst?.body?.group) world.jwst.body.group.visible = techEra;
      if (world.voyager?.body?.group) world.voyager.body.group.visible = techEra;
      const nightBtn = document.getElementById('night-view');
      if (nightBtn) {
        const noLights = visual.nightFactor <= 0.05;
        nightBtn.disabled = !techEra || noLights;
        nightBtn.title = (!techEra || noLights) ? '该时期没有城市灯光' : '看万家灯火';
      }
      const stationBtn = document.getElementById('station-view');
      if (stationBtn) {
        stationBtn.disabled = !techEra;
        stationBtn.title = techEra ? '探访空间站' : '该时期还没有空间站';
      }
      const jwstBtn = document.getElementById('jwst-visit');
      if (jwstBtn) {
        jwstBtn.disabled = !techEra;
        jwstBtn.title = techEra ? '探访詹姆斯·韦布太空望远镜' : '该时期还没有韦布望远镜';
      }
      const u = world.earth?.mesh?.material?.uniforms;
      if (u && visual.mapA && historicalTextures[visual.mapA]) u.uHistoryMapA.value = historicalTextures[visual.mapA];
      if (u && visual.mapB && historicalTextures[visual.mapB]) u.uHistoryMapB.value = historicalTextures[visual.mapB];
      if (u) {
        u.uHistoryBlend.value = visual.mapBlend;
        u.uHistoryStrength.value = visual.historyStrength;
        u.uLandTint.value.setHex(visual.landTint);
        u.uOceanTint.value.setHex(visual.oceanTint);
        u.uNightFactor.value = visual.nightFactor;
        u.uIceFactor.value = visual.iceFactor;
        u.uLavaFactor.value = visual.lavaFactor;
        u.uSurfaceBrightness.value = visual.surfaceBrightness;
      }
      if (world.clouds?.material) world.clouds.material.opacity = visual.cloudOpacity;
      if (baseAtmosphere) {
        if (visual.ageMa <= 0) {
          baseAtmosphere.uColor.value.setHex(baseAtmosphereColor);
          baseAtmosphere.uStrength.value = baseAtmosphereStrength;
        } else {
          baseAtmosphere.uColor.value.setHex(visual.atmosphereColor);
          baseAtmosphere.uStrength.value = visual.atmosphereStrength;
        }
      }
      const surfaceEl = document.getElementById('history-surface-state');
      if (surfaceEl) surfaceEl.textContent = visual.surfaceState;
      const ageValue = document.getElementById('earth-age-value');
      if (ageValue) ageValue.textContent = visual.surfaceState === 'FUTURE EARTH'
        ? formatEarthAge(Math.abs(year - nowYear)) : formatEarthAge(visual.ageMa * 1_000_000);
      const stateEl = document.getElementById('earth-surface-state');
      if (stateEl) stateEl.textContent = visual.surfaceState;
      const hudEl = document.getElementById('earth-age-hud');
      if (hudEl) hudEl.hidden = navigation.getState()?.focusBody !== 'earth';
      // The left info-panel blurb must match the era: "万家灯火" makes no
      // sense on a Precambrian or Hadean Earth.
      if (navigation.getState()?.focusBody === 'earth') {
        const infoDesc = document.getElementById('info-description');
        if (infoDesc) {
          infoDesc.textContent = visual.surfaceState === 'PRESENT EARTH'
            ? '越过蔚蓝的大气层，看见云海之下的万家灯火。这里，是我们在宇宙中的家。'
            : visual.description;
        }
      }
      // The bottom dock offers JWST / Voyager destinations — impossible before
      // the space age. Disable them in the deep past like the jwst-visit button.
      if (techEra === false) {
        for (const dockBtn of document.querySelectorAll('.planet-button[data-id="jwst"], .planet-button[data-id="voyager-1"], .planet-button[data-id="iss"]')) {
          dockBtn.disabled = true;
          dockBtn.title = '该时期还没有这个航天器';
        }
      } else {
        for (const dockBtn of document.querySelectorAll('.planet-button[data-id="jwst"], .planet-button[data-id="voyager-1"], .planet-button[data-id="iss"]')) {
          dockBtn.disabled = false;
          dockBtn.title = '';
        }
      }
    }
    const cosmic = createCosmicTimeUI({
      world, navigation, clock, timeline, toast,
      searchInput: document.getElementById('destination-search'),
      onYearChange: applyEarthVisual,
    });
    // ORBIT 2.1 merge: Space plays/pauses the COSMIC TIME clock; the original
    // animation pause stays available through the pause button.
    ui.setSpaceHandler(() => cosmic.setPlaying(!cosmic.isPlaying()));
    const urlState = parseOrbitUrl(location.search, nowYear);
    if (urlState.time !== null) {
      cosmic.setYear(urlState.time, { syncUrl: false });
      cosmic.showPanel(true);
    }
    if (urlState.target) {
      navigation.flyTo(urlState.target, { immediate: true });
      // Re-assert the deep-link target after init settles (resize, compile,
      // first rendered frame) so no init-time side effect can leave the
      // camera on the default Earth view. Immediate + same target = idempotent.
      setTimeout(() => {
        navigation.flyTo(urlState.target, { immediate: true });
        applyEarthVisual(cosmic.getYear());
      }, 250);
    }
    // Apply after the target is set so the era-aware info-panel blurb and
    // Earth HUD render for the requested focus body.
    applyEarthVisual(cosmic.getYear());
    cosmic.refresh();
    resize(world);
    document.getElementById('load-progress').style.width = '100%';
    document.getElementById('load-text').textContent = BRANDING.welcome;
    await renderer.compileAsync(scene, camera);
    composer.render();
    void earthDetail.prepare();
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading')?.remove(), 900);

    let hidden = false, lastFrameTime = performance.now(), uiTick = 0, observingEarth = false;
    let earthsenseActive = false;
    let trajectoriesVisible = false;
    function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - lastFrameTime) / 1000, .05);
      lastFrameTime = now;
      if (hidden) return;
      if (ui.wallpaper.active && ui.wallpaper.isolated) { ui.wallpaper.update(dt); return; }
      const settings = ui.getState();
      const navigationState = navigation.getState();
      const navigating = navigationState.flight;
      const inTrajectories = navigationState.stage === 'trajectory';
      if (inTrajectories) trajectoriesVisible = true;
      else if (!navigating) trajectoriesVisible = false;
      // Keep the entire astronomical simulation intact while observing the surface.
      navigation.update(dt, now, () => world.update(dt, {
        ...settings, paused: earthsense.active || navigationState.returning || trajectoriesVisible || settings.paused,
        simulationYear: cosmic.getYear(),
      }));
      cosmic.update(dt);
      // Freeze both the model and any reference-frame transition while the
      // camera is borrowed, so EarthSense returns to exactly the saved view.
      world.motionTrajectories.update(navigating || earthsense.active || !inTrajectories ? 0 : dt, {
        active: trajectoriesVisible, speed: settings.speed,
        paused: settings.paused || navigating || earthsense.active || !inTrajectories,
      });
      world.backgroundStars.position.copy(camera.position);
      world.backgroundStars.visible = ui.wallpaper.starsVisible;
      world.flybys.update(dt, camera, {
        paused: settings.paused, enabled: !earthsense.active && !trajectoriesVisible, navigating,
      });
      updateWorldVisibility(world, camera, controls, settings.orbitsVisible, navigation.getState(), techEra);
      if (!ui.wallpaper.satellitesVisible || !techEra) {
        world.earthSatellites.visible = false;
        world.station.visible = false;
      }
      if (!ui.wallpaper.satellitesVisible) {
        world.earthOrbitGroup.visible = false;
      }
      world.motionTrajectories.group.traverse(object => {
        if (object.name.startsWith('trajectory-trail-')) object.visible = settings.orbitsVisible && (object.material.uniforms.uGalactic.value > 0 || object.material.uniforms.uRadius.value > 0);
      });
      navigation.updateStage();
      earthsense.update(now / 1000, { scaleFactor: THREE.MathUtils.clamp(
        (camera.position.distanceTo(world.earth.position) - 1) / 3.65, .06, 1,
      ) });
      if (observingEarth !== earthsense.visible) {
        observingEarth = earthsense.visible;
        earthDetail.setObservation(observingEarth);
      }
      // EarthSense borrows the modern surface; restore the current era's
      // visual state as soon as the session ends.
      if (earthsenseActive !== earthsense.active) {
        earthsenseActive = earthsense.active;
        if (!earthsenseActive) applyEarthVisual(cosmic.getYear());
      }
      updateFraming(observingEarth, dt);
      if (earthsense.visible) {
        world.earthSatellites.visible = false;
        world.station.visible = false;
        world.earthOrbitGroup.visible = false;
        world.orbitGroup.visible = false;
      }
      if (++uiTick % 2 === 0) labels.update({ ...settings, ...navigation.getState(),
        satellitesVisible: ui.wallpaper.satellitesVisible && techEra,
        labelsVisible: settings.labelsVisible && !earthsense.visible && !trajectoriesVisible,
      });
      if (uiTick % 10 === 0) {
        ui.updateHud();
        if (earthsense.visible) {
          const detail = earthDetail.getState();
          document.getElementById('view-caption').textContent = detail.status === 'ready'
            ? `EARTHSENSE · ${detail.textureWidth / 1024}K 地表` : 'EARTHSENSE · 地表观测';
        } else if (navigation.getState().focusBody === 'earth' && navigation.getState().stage === 'earth'
          && earthDetail.getState().status === 'ready') {
          document.getElementById('view-caption').textContent += ` · ${earthDetail.getState().textureWidth / 1024}K 地表`;
        }
      }
      if (ui.wallpaper.active) ui.wallpaper.update(dt);
      else composer.render();
    }
    addEventListener('resize', () => ui.wallpaper.active ? ui.wallpaper.resize() : resize(world));
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      lastFrameTime = performance.now();
    });
    requestAnimationFrame(animate);
    window.ORBIT = {
      version: '2.0.0',
      wallpaper: ui.wallpaper,
      world,
      getState: () => ({
        ...navigation.getState(), ...ui.getState(),
        planetCount: data.filter(d => d.orbit && d.id !== 'moon').length,
        satelliteCount: world.satellites.length,
        galaxyStars: world.galaxy.geometry.attributes.position.count,
        galaxyCount: world.galaxyDefinitions.length, deepSpaceBodyCount: world.deepSpace.bodies.size,
        flybys: world.flybys.getState(),
        trajectories: world.motionTrajectories.getState(),
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        mode: earthsense.active ? 'earthsense' : 'universe',
        earthDetail: earthDetail.getState(), pixelRatio: renderer.getPixelRatio(),
      }),
      goTo: navigation.flyTo, zoom: navigation.zoom, setPaused: ui.setPaused,
      setMode: earthsense.setMode,
      earthsense: { getState: earthsense.diagnostics, setLayer: earthsense.toggleLayer },
      trajectories: {
        getState: world.motionTrajectories.getState,
        setReferenceFrame: world.motionTrajectories.setReferenceFrame,
        setTrailLength: world.motionTrajectories.setTrailLength,
      },
      universeTime: {
        getYear: () => cosmic.getYear(),
        setYear: year => cosmic.setYear(year),
        play: () => cosmic.setPlaying(true),
        pause: () => cosmic.setPlaying(false),
        getState: () => cosmic.getState(),
        startJourney: () => cosmic.startJourney(),
        syncUrl: () => cosmic.syncUrl(),
      },
      earthEvolution: {
        getState: () => getEarthEvolution(cosmic.getYear(), nowYear),
        setYear: year => {
          cosmic.setYear(year);
          applyEarthVisual(cosmic.getYear());
          cosmic.refresh();
        },
      },
      destinations: () => [...world.galaxyDefinitions, ...world.deepSpace.bodies.values()].map(body => ({
        id: body.id, name: body.cn, kind: body.kind, parentGalaxy: body.parentGalaxy,
        parentStarId: body.parentStarId, modelStatus: body.modelStatus,
      })),
    };
  } catch (error) {
    console.error(error);
    fail('无法初始化三维场景。请确认浏览器已开启硬件加速，或使用新版 Chrome、Edge、Safari 重试。');
  }
}
