// paleo-earth.js — GPlates coastlines + static plate polygons → Earth texture + plate-drift arrows.
// Merged from ORBIT_PaleoEarth_V4 (with V3 era palettes applied to the texture).
import * as THREE from 'three';
import { PALEO_CONFIG, quantizeMa, supportsGplates, stateForAgeMa } from './paleo-config.js';

const memory = new Map();
const pending = new Map();
const motionMemory = new Map();

function cacheKey(kind, ma) {
  return `${PALEO_CONFIG.cachePrefix}${PALEO_CONFIG.cacheVersion}:${kind}:${ma}`;
}
function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeCache(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}
async function fetchJson(url, key) {
  if (memory.has(key)) return memory.get(key);
  const cached = readCache(key);
  if (cached) {
    memory.set(key, cached);
    return cached;
  }
  if (pending.has(key)) return pending.get(key);
  const task = fetch(url, { mode: 'cors', headers: { Accept: 'application/geo+json, application/json' } })
    .then(r => { if (!r.ok) throw new Error(`GPlates HTTP ${r.status}`); return r.json(); })
    .then(data => {
      memory.set(key, data);
      writeCache(key, data);
      return data;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export function gplatesCoastlines(ma) {
  const q = quantizeMa(ma);
  const key = cacheKey('coast', q);
  const url = `${PALEO_CONFIG.coastUrl}?time=${encodeURIComponent(q)}&model=${encodeURIComponent(PALEO_CONFIG.model)}&wrap=true`;
  return fetchJson(url, key);
}

export function gplatesPlatePolygons(ma) {
  const q = quantizeMa(ma);
  const key = cacheKey('plates', q);
  const url = `${PALEO_CONFIG.plateUrl}?time=${encodeURIComponent(q)}&model=${encodeURIComponent(PALEO_CONFIG.model)}`;
  return fetchJson(url, key);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function drawOcean(ctx, width, height, ageMa) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  const warm = ageMa > 66 ? [13, 62, 82] : [8, 54, 86];
  const cold = ageMa > 250 ? [6, 39, 65] : [8, 48, 76];
  g.addColorStop(0, `rgb(${cold.join(',')})`);
  g.addColorStop(0.5, `rgb(${warm.join(',')})`);
  g.addColorStop(1, `rgb(${cold.join(',')})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function lonX(lon, width) { return ((lon + 180) / 360) * width; }
function latY(lat, height) { return ((90 - lat) / 180) * height; }

function safeRing(ring) {
  return Array.isArray(ring) ? ring.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];
}

/**
 * Draw a GeoJSON ring while correctly splitting at the ±180° dateline.
 * This prevents the classic "continent becomes one line across the whole Earth" bug.
 */
function drawRing(ctx, ring, width, height, fill = null, stroke = null, lineWidth = 1) {
  const pts = safeRing(ring);
  if (pts.length < 3) return;

  ctx.beginPath();
  let started = false;
  let prevLon = null;
  for (let i = 0; i < pts.length; i++) {
    const [lon0, lat] = pts[i];
    let lon = ((lon0 + 540) % 360) - 180;
    if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
      ctx.stroke();
      ctx.beginPath();
      started = false;
    }
    const x = lonX(lon, width);
    const y = latY(clamp(lat, -90, 90), height);
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
    prevLon = lon;
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawGeometry(ctx, geometry, width, height, fill, stroke) {
  if (!geometry) return;
  const type = geometry.type;
  const c = geometry.coordinates;
  if (type === 'Polygon') {
    for (const ring of c || []) drawRing(ctx, ring, width, height, fill, stroke);
  } else if (type === 'MultiPolygon') {
    for (const poly of c || []) for (const ring of poly || []) drawRing(ctx, ring, width, height, fill, stroke);
  } else if (type === 'LineString') {
    drawRing(ctx, c, width, height, null, stroke);
  } else if (type === 'MultiLineString') {
    for (const line of c || []) drawRing(ctx, line, width, height, null, stroke);
  }
}

function renderCoastlineTexture(geojson, ma, width = PALEO_CONFIG.texture.width, height = PALEO_CONFIG.texture.height) {
  const state = stateForAgeMa(ma);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  drawOcean(ctx, width, height, ma);
  const features = geojson?.features || [];
  // Coastline service polygons are used as land masks. Land color is the era
  // palette from paleo-config (V3 states); stroke stays neutral.
  for (const f of features) {
    drawGeometry(ctx, f.geometry, width, height, state.land, '#a0a37b');
  }
  // Subtle latitude/ice treatment, intentionally visual rather than data-pretending.
  const ice = ctx.createLinearGradient(0, 0, 0, height);
  ice.addColorStop(0, 'rgba(235,245,255,0.24)');
  ice.addColorStop(0.10, 'rgba(235,245,255,0)');
  ice.addColorStop(0.90, 'rgba(235,245,255,0)');
  ice.addColorStop(1, 'rgba(235,245,255,0.24)');
  ctx.fillStyle = ice; ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return { texture, canvas };
}

export async function createPaleoEarthManager({ renderer } = {}) {
  let lastSuccessful = null;
  let requestId = 0;
  const textureCache = new Map();

  async function loadTexture(ma) {
    if (!supportsGplates(ma)) return null;
    const q = quantizeMa(ma);
    if (textureCache.has(q)) return textureCache.get(q);
    const id = ++requestId;
    try {
      const geo = await gplatesCoastlines(q);
      if (id !== requestId && lastSuccessful) return lastSuccessful;
      const max = renderer?.capabilities?.maxTextureSize || 4096;
      const width = max < 2048 ? 1024 : 2048;
      const height = width / 2;
      const result = renderCoastlineTexture(geo, q, width, height);
      const entry = { ...result, ma: q, source: PALEO_CONFIG.sourceLabel, confidence: 'gplates' };
      textureCache.set(q, entry);
      lastSuccessful = entry;
      return entry;
    } catch (err) {
      console.warn('[ORBIT PaleoEarth] coastline fetch failed:', err);
      return lastSuccessful;
    }
  }

  async function loadPlates(ma) {
    if (!supportsGplates(ma)) return null;
    const q = quantizeMa(ma);
    const key = `plates:${q}`;
    if (motionMemory.has(key)) return motionMemory.get(key);
    try {
      const geo = await gplatesPlatePolygons(q);
      motionMemory.set(key, geo);
      return geo;
    } catch (err) {
      console.warn('[ORBIT PaleoEarth] plate polygon fetch failed:', err);
      return null;
    }
  }

  return {
    async update(ma) { return loadTexture(ma); },
    async getMotionSnapshot(ma) { return loadPlates(ma); },
    getState() {
      return {
        source: PALEO_CONFIG.sourceLabel,
        maxMa: PALEO_CONFIG.maxMa,
        cacheSize: textureCache.size,
        lastMa: lastSuccessful?.ma ?? null,
        confidence: lastSuccessful?.confidence ?? 'none',
      };
    },
    dispose() {
      for (const e of textureCache.values()) e.texture?.dispose();
      textureCache.clear();
    },
  };
}

/* ---------- plate drift visualization ---------- */

function geometryPoints(geometry) {
  const out = [];
  function addRing(ring) {
    for (const p of ring || []) if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) out.push(p);
  }
  if (!geometry) return out;
  if (geometry.type === 'Polygon') for (const r of geometry.coordinates || []) addRing(r);
  if (geometry.type === 'MultiPolygon') for (const p of geometry.coordinates || []) for (const r of p || []) addRing(r);
  return out;
}

function centroidForGeometry(geometry) {
  const pts = geometryPoints(geometry);
  if (!pts.length) return null;
  let x = 0, y = 0;
  for (const [lon, lat] of pts) { x += lon; y += lat; }
  return [x / pts.length, y / pts.length];
}

function featurePlateId(f) {
  const p = f?.properties || {};
  return p.plate_id ?? p.PLATEID ?? p.PLATE_ID ?? p.PlateID ?? p.reconstruction_plate_id ?? null;
}

function areaEstimate(f) {
  const pts = geometryPoints(f?.geometry);
  if (pts.length < 3) return 0;
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return Math.abs((maxX - minX) * (maxY - minY));
}

function lonLatToVec(lon, lat, radius = 1.018) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(lon + 90);
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta)
  );
}

function makeArc(a, b, radius = 1.02) {
  const va = lonLatToVec(a[0], a[1], radius);
  const vb = lonLatToVec(b[0], b[1], radius);
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const v = va.clone().lerp(vb, t).normalize().multiplyScalar(radius + 0.008 * Math.sin(Math.PI * t));
    points.push(v);
  }
  return points;
}

export function createPlateMotionLayer({ scene, radius = 1.02 } = {}) {
  const group = new THREE.Group();
  group.name = 'ORBIT_PlateMotion';
  scene?.add(group);
  let disposed = false;
  let visible = true;

  function clear() {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse?.(o => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
  }

  function updateFromGeoJSON(nowGeo, futureGeo, ma) {
    // Content is always rebuilt on update; visibility is owned by setVisible.
    // Guarding on `visible` here would keep stale arrows whenever the caller
    // hides before updating (present/deep-time branches), then shows again.
    if (disposed) return;
    clear();
    if (!nowGeo?.features || !futureGeo?.features) return;

    const nowMap = new Map();
    for (const f of nowGeo.features) {
      const id = featurePlateId(f);
      const c = centroidForGeometry(f.geometry);
      if (id != null && c && areaEstimate(f) >= PALEO_CONFIG.motion.minArea) nowMap.set(String(id), { c, area: areaEstimate(f) });
    }

    const candidates = [];
    for (const f of futureGeo.features) {
      const id = featurePlateId(f);
      const c = centroidForGeometry(f.geometry);
      const prev = id != null ? nowMap.get(String(id)) : null;
      if (!prev || !c) continue;
      const d = Math.hypot(c[0] - prev.c[0], c[1] - prev.c[1]);
      if (d > 0.15) candidates.push({ id, from: prev.c, to: c, d, area: prev.area });
    }
    candidates.sort((a, b) => b.area - a.area);

    for (const m of candidates.slice(0, PALEO_CONFIG.motion.maxPlates)) {
      const pts = makeArc(m.from, m.to, PALEO_CONFIG.motion.arrowHeight);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.72 });
      const line = new THREE.Line(geom, mat);
      line.userData.plateId = m.id;
      group.add(line);

      const head = lonLatToVec(m.to[0], m.to[1], PALEO_CONFIG.motion.arrowHeight);
      const tangent = head.clone().sub(lonLatToVec(m.from[0], m.from[1], PALEO_CONFIG.motion.arrowHeight)).normalize();
      const dir = new THREE.Vector3(0, 1, 0);
      const cone = new THREE.ConeGeometry(0.008, 0.035, 6);
      const cm = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(cone, cm);
      mesh.position.copy(head);
      mesh.quaternion.setFromUnitVectors(dir, tangent);
      group.add(mesh);
    }
    group.userData.timeMa = ma;
    group.userData.count = candidates.length;
  }

  return {
    group,
    setVisible(v) { visible = !!v; group.visible = visible; },
    updateFromGeoJSON,
    clear,
    getState: () => ({ visible, count: group.userData.count || 0, timeMa: group.userData.timeMa ?? null }),
    dispose() { disposed = true; clear(); scene?.remove(group); },
  };
}
