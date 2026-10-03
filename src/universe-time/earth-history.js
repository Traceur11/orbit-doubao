/**
 * earth-history.js — approximate Earth visual state per geological era.
 *
 * IMPORTANT: this is a HISTORICAL VISUALIZATION approximation, not a
 * paleo-reconstruction. The first release deliberately does NOT fabricate
 * past Earth textures. Instead it adjusts three subtle live parameters of the
 * existing Earth model — decorative cloud opacity, atmosphere color and
 * atmosphere strength — to suggest very broad era conditions (e.g. a hotter
 * post-formation atmosphere, "snowball" cold spells, warm Mesozoic).
 * Every UI surface labels this as an approximation.
 */

/** Present-era visual returns null fields so the app restores the live base. */
export function getEarthVisualForYear(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return baseVisual();
  if (year >= nowYear) return baseVisual();

  const age = nowYear - year; // years before present
  if (age >= 4000000000) {
    // Hadean: magma ocean / hot early atmosphere.
    return {
      cloudOpacity: 0.12,
      atmosphereColor: 0x7a2a1a,
      atmosphereStrength: 1.35,
      approximation: true,
      label: 'Hadean · 冥古宙（近似）',
    };
  }
  if (age >= 2500000000) {
    // Archean: dimmer, thinner clouds, faint greenish tint.
    return {
      cloudOpacity: 0.28,
      atmosphereColor: 0x1e4a33,
      atmosphereStrength: 1.0,
      approximation: true,
      label: 'Archean · 太古宙（近似）',
    };
  }
  if (age >= 541000000) {
    // Proterozoic: snowball-Earth cold spells.
    return {
      cloudOpacity: 0.34,
      atmosphereColor: 0x0e3352,
      atmosphereStrength: 1.15,
      approximation: true,
      label: 'Proterozoic · 元古宙（近似）',
    };
  }
  if (age >= 252200000) {
    // Paleozoic: moderate, lush early life.
    return {
      cloudOpacity: 0.5,
      atmosphereColor: 0x0a3d33,
      atmosphereStrength: 1.05,
      approximation: true,
      label: 'Paleozoic · 古生代（近似）',
    };
  }
  if (age >= 66000000) {
    // Mesozoic: warm greenhouse.
    return {
      cloudOpacity: 0.68,
      atmosphereColor: 0x0a4a40,
      atmosphereStrength: 1.0,
      approximation: true,
      label: 'Mesozoic · 中生代（近似）',
    };
  }
  if (age >= 2580000) {
    // Cenozoic (pre-Quaternary): approaching the modern climate.
    return {
      cloudOpacity: 0.58,
      atmosphereColor: 0x083f66,
      atmosphereStrength: 1.0,
      approximation: true,
      label: 'Cenozoic · 新生代（近似）',
    };
  }
  return baseVisual('Quaternary · 第四纪（近似）');
}

/** Present / unknown era: restore the live base Earth look (null = keep base). */
function baseVisual() {
  return {
    cloudOpacity: null,
    atmosphereColor: null,
    atmosphereStrength: null,
    approximation: true,
    label: 'Present',
    present: true,
  };
}
