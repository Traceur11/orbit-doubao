# ORBIT 2.0 Architecture

> This document records the original ORBIT architecture (v1.9.0) and the additive
> ORBIT 2.0 architecture (galactic solar-system motion + Earth geological timeline).
> ORBIT 2.0 follows the principle of **new modules + minimally invasive changes**:
> the original navigation, rendering, EarthSense, Motion Trails, deep-space system,
> mobile support and tests are preserved.

---

## 1. Original project analysis (ORBIT v1.9.0)

### 1.1 Repository layout

| Path | Role |
| --- | --- |
| `src/universe.js` | Compatibility entry point; calls `startOrbit()` from `src/app.js`. |
| `src/app.js` | Assembles renderer, camera, navigation, world, UI; owns the animation loop. |
| `src/shell.html` | Single-page UI shell; contains `/* INLINE_CSS */`, `/* INLINE_ASSETS */`, `/* INLINE_JS */` placeholders filled by `build.mjs`. |
| `src/style.css` | Base UI styles + responsive layout (media queries at 1700 / 1150 / 900 / 600 / 360 px). |
| `src/core/` | Rendering pipeline, camera & navigation flight, scene assembly, textures, math helpers, glow sprites, point clouds. |
| `src/universe/` | Planet catalog & bodies, solar-system simulation, orbit rings, procedural galaxy, deep-space catalog & bodies, nearby galaxies, black holes, JWST, Voyager, flybys, motion-trajectories. |
| `src/earth/` | Earth day/night lighting, atmosphere, decorative clouds, geographic coordinates, on-demand HD textures. |
| `src/earthsense/` | Weather / lightning / typhoon layers, data status, mode save & restore, visual effects. |
| `src/data/` | Open-Meteo / NASA EONET / GDACS adapters, caching, normalization, cyclone track. |
| `src/ui/` | Navigation UI, celestial labels, info panel, destinations, picking, trajectory panel, wallpaper screen modes, compact mode. |
| `tests/` | Node test runner suite (`node --test tests/*.test.js`), fixtures. |
| `assets/` | Embedded textures (15 names inlined into the single HTML) + credits. |
| `docs/` | Data sources, refactor validation, motion-trajectory model, deep-space sources. |
| `build.mjs` | esbuild bundle of `src/universe.js` (IIFE) + inlined textures + shell/CSS → self-contained `index.html`. |

### 1.2 Build system

- **`npm run build`** → `node build.mjs`.
- esbuild bundles `src/universe.js` → `format:'iife'`, `minify:true`, `target:'es2020'`.
- 15 textures are base64-inlined as `window.ORBIT_ASSETS`.
- `src/shell.html` + 6 CSS files (`style.css`, `earthsense.css`, `trajectory.css`, `compact.css`, `jwst.css`) are concatenated into one HTML.
- **`npm test`** → `node --test tests/*.test.js`.
- **`npm start`** → `python3 -m http.server 8767`.
- Three.js **r185** (MIT, vendored in `assets/THREE-LICENSE.txt`).

### 1.3 Rendering pipeline

`src/core/renderer.js`:
- `WebGLRenderer` with `antialias`, `logarithmicDepthBuffer: true`, `ACESFilmicToneMapping`, sRGB output.
- Post-processing: `EffectComposer` → `RenderPass` → `UnrealBloomPass` → `OutputPass`.
- Adaptive pixel ratio; observation-framing view offset for EarthSense; shared render targets.

### 1.4 Camera & navigation

`src/core/camera.js`:
- `PerspectiveCamera(43, aspect, 0.001, 4000000)` + `OrbitControls` (damping, no pan, zoomSpeed 1.65).
- `createNavigation` owns: selected/focus/displayed ids, `activeGalaxyId` / `activeSystemId`,
  smooth exponential camera flights (`flyTo`), stage detection (`earth|solar|galaxy|local-group|trajectory`),
  body collision avoidance, snapshot/restore for EarthSense mode.

### 1.5 Scene assembly

`src/core/scene.js` `createWorld(scene, textures, pixels)`:
- `createPlanets` → bodies Map + orbit rings + satellites + ISS + moon orbit.
- `createGalaxy` → procedural spiral galaxy **at `galaxyCenter = (-18000, 0, 0)`**, radius ~30,000, plus background star field and a `solarMarker` glow at the origin (the galaxy-scale representation of the solar system).
- `createSimulation` (`solar-system.js`) moves planets/moon/satellites/ISS each frame.
- Deep-space catalog (galaxies, stars, black holes, exoplanets), nearby galaxies, JWST, Voyager, flybys.
- `world.update(dt, settings)` drives the solar simulation + spacecraft + deep space.
- `updateWorldVisibility` toggles visibility by camera distance / stage.

### 1.6 Existing time systems

- **Simulation clock**: a simple accumulating `simTime` in `solar-system.js` (secular orbital phase), scaled by user `speed` (0.25× / 1× / 5× / 20×), paused by the space bar.
- **Motion Trails** (`motion-trajectories.js`): a straight-line "galactic reference" demo frame with parameterized past positions — explicitly a **local illustration**, not a Galactic orbit.
- **EarthSense** keeps its own session timestamps.
- There is **no wall-clock-independent cosmic clock** and **no geological timeline** in v1.9.0 — these are the core additions of ORBIT 2.0.

### 1.7 UI

- Top: brand, scale scenes (`earth / solar / galaxy / local-group`), wallpaper / fullscreen / settings / help.
- Left: info panel. Right: scale rail. Bottom: control row + planet dock + footer meta.
- `src/ui/navigation.js` binds all controls, shortcuts (`Space + - H F I ?`), and returns `getState()` consumed by the animation loop.

---

## 2. ORBIT 2.0 additions

### 2.1 New module tree

```
src/universe-time/
├── universe-clock.js        # UniverseClock — wall-clock-independent simulation year
├── cosmic-time.js           # year formatting helpers (Ga / Ma / BCE / CE)
├── geological-time.js       # eons / eras / periods / epochs data + detection + search
├── historical-events.js     # key Earth-history events + lookup
├── galactic-orbit.js        # parameterized Solar-System Galactic orbit (pure math)
├── solar-system-motion.js   # THREE visuals: orbit ring, tail arc, pulsing marker
├── timeline-controller.js   # piecewise log-linear timeline mapping + speed presets
├── time-scale.js            # scale level detection (EARTH … DEEP SPACE)
└── earth-history.js         # approximate Earth visual state per era

src/ui/cosmic-time.js        # COSMIC TIME bar, history panel, search bridge, URL state
src/ui/cosmic.css            # styles for the new UI (inlined by build.mjs)
```

### 2.2 Minimal-invasive integration points

| File | Change |
| --- | --- |
| `src/core/scene.js` | Create `world.galacticMotion`; call `galacticMotion.update(settings.simulationYear)` in `world.update`; expose `getPosition('galactic-solar')`; add galactic motion visibility in `updateWorldVisibility`. |
| `src/app.js` | Create `UniverseClock` + `TimelineController`; bind `createCosmicTimeUI`; parse URL state (`?time=` / `?target=`); drive cosmic playhead in the animation loop; apply approximate Earth visual state on year change; extend `window.ORBIT` API. |
| `src/ui/labels.js` | Add a `SOLAR SYSTEM` label that follows the moving galactic marker. |
| `src/shell.html` | Add COSMIC TIME bar (inside `.bottom-ui`), right-side history panel. |
| `src/style.css` | Layout offsets for the new footer row; history panel; responsive rules. |
| `build.mjs` | Append `src/ui/cosmic.css` to the CSS list (additive one-line change). |

### 2.3 Data flow

```
URL (?time=&target=) ──► UniverseClock.setYear ──► TimelineController (position) ──► COSMIC TIME bar
       ▲                                                     │
       │                                                     ▼
   history.replaceState                            getSolarSystemGalacticPosition(year)
       ▲                                                     │
       └────────── ORBIT.universeTime API ◄──── world.galacticMotion.update(year)
                                   │
                                   ▼
                     getGeologicalContext(year) ──► history panel + Earth visual state
```

### 2.4 Honesty model

The Galactic orbit is a **parameterized visualization approximation** (`galactic-orbit.js`
returns positions from a closed-form orbit, documented in `docs/GALACTIC_TIME_MODEL.md`).
Earth's visual state per era is an **approximation** (atmosphere/clouds only, clearly
labeled "Historical visualization"), not a paleo-reconstruction. Geological boundaries
follow the commonly cited ICS-rounded values; precise ICS v2024 numbers are listed in
`docs/DATA_SOURCES.md`.

---

## 3. Verification & validation

- `npm test` — original suite + new `tests/universe-time`, `tests/geological-time`,
  `tests/galactic-motion`, `tests/timeline` suites.
- `npm run build` — esbuild bundle must succeed and produce the self-contained `index.html`.
- Manual browser verification: Earth → Solar System → Milky Way flight, timeline drag/play,
  period detection, URL deep links, search bridge, mobile layout.

---

## 4. Final integration fixes (verified in browser)

- **Galactic marker findability**: `labels.js` edge-anchors the Solar System label in
  Milky Way view when the marker projects off-screen / behind the info column (clamped,
  opacity 0.8, opens left at the right edge); `galactic-solar` skips the occlusion test
  (it shares the Sun's position); `solar-system-motion.js` `setMarkerScale(dist)` keeps
  the pulsing marker visible at Galactic scale and small in deep space.
- **URL deep links**: `parseOrbitUrl` maps friendly aliases (`milky-way` → `galaxy`,
  `deep-space` → `local-group`); pausing playback now re-syncs `?time=` with the clock;
  the target flight is re-asserted 250 ms after init so no first-frame settling can
  override a shared link's camera.
- **Mobile**: `compact-ui` kept hiding the whole `.bottom-ui` (including the COSMIC TIME
  bar); `cosmic.css` now restores the timeline as a fixed bottom strip above the compact
  buttons, with ≤520px rules (hide step buttons, shrink track) so phones keep the full
  time-travel control.
- **WebGL correctness**: galactic orbit samples use `Float32Array` (Float64 buffers are
  unsupported in WebGL2).
- 342 node:test cases pass; build produces a self-contained 18.98 MB `index.html`
  (Three.js r185, 15 embedded textures).
