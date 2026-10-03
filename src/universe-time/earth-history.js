/**
 * earth-history.js — approximate Earth visual state per geological era.
 *
 * HISTORICAL VISUALIZATION: this is a science-inspired approximation, not a
 * paleo-reconstruction. The detailed surface state (paleogeography maps,
 * clouds, atmosphere, night lights, ice caps, magma-ocean shader) lives in
 * earth-evolution.js; this module keeps its legacy `getEarthVisualForYear`
 * signature as a compatibility view over the new state machine so any
 * existing caller keeps working.
 */

import { getEarthEvolution } from "./earth-evolution.js";

/** Present-era visual returns null fields so the app restores the live base. */
export function getEarthVisualForYear(year, nowYear = 2026) {
  if (!Number.isFinite(year)) return baseVisual();
  const evolution = getEarthEvolution(year, nowYear);
  const present = evolution.ageMa <= 0;
  return {
    cloudOpacity: evolution.cloudOpacity,
    atmosphereColor: evolution.atmosphereColor,
    atmosphereStrength: evolution.atmosphereStrength,
    present,
    approximation: true,
    label: evolution.contextLabel,
    ...evolution,
  };
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
