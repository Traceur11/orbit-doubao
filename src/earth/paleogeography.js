import * as THREE from "three";

/* Paleogeography textures are generated at startup on a small canvas and
 * upscaled to 1024×512. They are SCIENCE-INSPIRED VISUALIZATION — schematic
 * land blocks drawn from the approximate plate configurations of each era,
 * NOT an accurate paleogeographic reconstruction (see docs/EARTH_EVOLUTION.md).
 * No external fetch: everything is procedural and works offline. */

const PALEO_KEYS = ["paleo-540", "paleo-250", "paleo-180", "paleo-100", "paleo-66", "ancient-earth"];

/* Equirectangular canvas layout: u = longitude 0→1 (left→right, -180°→180°),
 * v = latitude 1→0 (top→bottom, +90°→−90°). A continent blob is an ellipse
 * whose radius is perturbed by a cheap sinusoidal pseudo-noise so the coasts
 * look organic instead of perfect ovals. */
const PALEO_LAYOUTS = {
  "paleo-540": {
    ocean: [0x06203a, 0x0c3a5e],
    land: [0x5a6a42, 0x7a5a38, 0x4a6a4a],
    blobs: [
      { x: 0.5, y: 0.3, rx: 0.34, ry: 0.17, seed: 1.3 },   // Gondwana
      { x: 0.42, y: 0.76, rx: 0.2, ry: 0.08, seed: 2.1 },  // Laurentia
      { x: 0.72, y: 0.62, rx: 0.08, ry: 0.05, seed: 3.0 },
      { x: 0.22, y: 0.5, rx: 0.06, ry: 0.04, seed: 0.7 },
      { x: 0.85, y: 0.25, rx: 0.07, ry: 0.05, seed: 4.2 },
    ],
  },
  "paleo-250": {
    ocean: [0x06243e, 0x0e4a5e],
    land: [0x6a7a48, 0x7a6234, 0x55723e],
    blobs: [
      { x: 0.5, y: 0.5, rx: 0.34, ry: 0.24, seed: 5.0 },   // Pangaea core
      { x: 0.5, y: 0.82, rx: 0.18, ry: 0.05, seed: 5.6 },
      { x: 0.52, y: 0.12, rx: 0.14, ry: 0.05, seed: 6.2 },
      { x: 0.82, y: 0.6, rx: 0.07, ry: 0.05, seed: 6.8 },
      { x: 0.15, y: 0.42, rx: 0.06, ry: 0.04, seed: 7.3 },
    ],
  },
  "paleo-180": {
    ocean: [0x06283e, 0x105066],
    land: [0x6a7c50, 0x7c6238, 0x547440],
    blobs: [
      { x: 0.5, y: 0.74, rx: 0.27, ry: 0.1, seed: 1.9 },   // northern Laurasia
      { x: 0.5, y: 0.28, rx: 0.32, ry: 0.15, seed: 2.7 },  // southern Gondwana
      { x: 0.78, y: 0.8, rx: 0.06, ry: 0.04, seed: 3.4 },
      { x: 0.16, y: 0.3, rx: 0.07, ry: 0.05, seed: 4.1 },
      { x: 0.84, y: 0.24, rx: 0.06, ry: 0.04, seed: 4.9 },
    ],
  },
  "paleo-100": {
    ocean: [0x082c46, 0x125466],
    land: [0x5c7644, 0x746038, 0x4c703e],
    blobs: [
      { x: 0.4, y: 0.76, rx: 0.2, ry: 0.1, seed: 2.0 },   // north-west (Eurasia-ish)
      { x: 0.66, y: 0.72, rx: 0.16, ry: 0.08, seed: 2.8 },
      { x: 0.4, y: 0.34, rx: 0.14, ry: 0.13, seed: 3.5 }, // Africa-ish
      { x: 0.66, y: 0.3, rx: 0.12, ry: 0.14, seed: 4.2 }, // South America-ish
      { x: 0.55, y: 0.08, rx: 0.15, ry: 0.05, seed: 4.8 },// Antarctica-ish
      { x: 0.84, y: 0.42, rx: 0.09, ry: 0.05, seed: 5.5 },
      { x: 0.2, y: 0.2, rx: 0.05, ry: 0.04, seed: 6.1 },
    ],
  },
  "paleo-66": {
    ocean: [0x083048, 0x14566a],
    land: [0x587648, 0x745e38, 0x4c7240],
    blobs: [
      { x: 0.26, y: 0.7, rx: 0.2, ry: 0.13, seed: 1.2 },  // North America
      { x: 0.34, y: 0.3, rx: 0.14, ry: 0.16, seed: 2.4 }, // South America
      { x: 0.48, y: 0.42, rx: 0.13, ry: 0.15, seed: 3.1 },// Africa
      { x: 0.62, y: 0.74, rx: 0.26, ry: 0.1, seed: 3.9 }, // Eurasia
      { x: 0.6, y: 0.34, rx: 0.08, ry: 0.09, seed: 4.6 }, // India (still drifting)
      { x: 0.5, y: 0.08, rx: 0.16, ry: 0.05, seed: 5.3 }, // Antarctica
      { x: 0.8, y: 0.4, rx: 0.1, ry: 0.06, seed: 6.0 },   // Australia
    ],
  },
  "ancient-earth": {
    ocean: [0x041c34, 0x0a3a52],
    land: [0x4a6a4a, 0x5a5a3c, 0x3e6244],
    blobs: [
      { x: 0.32, y: 0.34, rx: 0.12, ry: 0.08, seed: 7.7 },
      { x: 0.64, y: 0.6, rx: 0.1, ry: 0.07, seed: 8.3 },
      { x: 0.5, y: 0.82, rx: 0.09, ry: 0.05, seed: 8.9 },
      { x: 0.78, y: 0.28, rx: 0.07, ry: 0.05, seed: 9.4 },
      { x: 0.16, y: 0.66, rx: 0.06, ry: 0.04, seed: 9.9 },
    ],
  },
};

const SMALL_W = 512, SMALL_H = 256;

function noiseRadius(px, py, cx, cy, seed, rx, ry) {
  const dx = (px - cx) / rx, dy = (py - cy) / ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  const a = Math.atan2(dy, dx);
  const wave = Math.sin(a * 3 + seed) * 0.18 + Math.sin(a * 7 + seed * 2.1) * 0.07;
  return d < 1 + wave;
}

function drawPaleoLayer(ctx, key, width = SMALL_W, height = SMALL_H) {
  const layout = PALEO_LAYOUTS[key];
  if (!layout) throw new Error(`drawPaleoLayer: unknown key "${key}"`);
  const img = ctx.createImageData(width, height);
  const d = img.data;
  const oceanA = layout.ocean[0], oceanB = layout.ocean[1];
  const landColors = layout.land;
  const parse = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const oA = parse(oceanA), oB = parse(oceanB);
  const lands = landColors.map(parse);
  for (let y = 0; y < height; y++) {
    const v = 1 - y / height;
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lat = Math.abs(v - 0.5) * 2; // 0 equator → 1 pole
      const jitter = ((x * 7 + y * 13) % 5) - 2;
      const ocean = [
        oA[0] + (oB[0] - oA[0]) * (0.35 + 0.65 * (1 - lat)) + jitter,
        oA[1] + (oB[1] - oA[1]) * (0.35 + 0.65 * (1 - lat)) + jitter,
        oA[2] + (oB[2] - oA[2]) * (0.35 + 0.65 * (1 - lat)) + jitter,
      ];
      let r = ocean[0], g = ocean[1], b = ocean[2];
      let isLand = false;
      for (const blob of layout.blobs) {
        if (noiseRadius(u, v, blob.x, blob.y, blob.seed, blob.rx, blob.ry)) {
          const base = lands[Math.abs(x + y) % lands.length];
          const lJ = ((x * 3 + y * 11) % 7) - 3;
          r = Math.max(0, Math.min(255, base[0] + lJ));
          g = Math.max(0, Math.min(255, base[1] + lJ));
          b = Math.max(0, Math.min(255, base[2] + lJ));
          isLand = true;
          break;
        }
      }
      if (!isLand) {
        /* Slight high-latitude ocean cooling (no explicit ice here; the shader
         * adds ice caps via uIceFactor). */
        const cool = Math.min(1, Math.max(0, (lat - 0.82) / 0.18));
        r = r + (r * 0.1 + 6) * cool;
        g = g + (g * 0.1 + 8) * cool;
        b = b + (b * 0.08 + 10) * cool;
      }
      const i = row + x * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function createPaleogeographyTextures() {
  const canvas = document.createElement("canvas");
  canvas.width = SMALL_W; canvas.height = SMALL_H;
  const ctx = canvas.getContext("2d");
  const out = {};
  for (const key of PALEO_KEYS) {
    drawPaleoLayer(ctx, key, SMALL_W, SMALL_H);
    const big = document.createElement("canvas");
    big.width = SMALL_W * 2; big.height = SMALL_H * 2;
    const bigCtx = big.getContext("2d");
    bigCtx.imageSmoothingEnabled = true;
    bigCtx.drawImage(canvas, 0, 0, SMALL_W, SMALL_H, 0, 0, big.width, big.height);
    const texture = new THREE.CanvasTexture(big);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
    out[key] = texture;
  }
  return out;
}

export {
  PALEO_KEYS,
  PALEO_LAYOUTS,
  drawPaleoLayer,
  createPaleogeographyTextures,
};
