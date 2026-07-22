/**
 * ChartFormat (Block 8, groundwork) — FNF-inspired authored-chart JSON.
 *
 * Shape:
 *   {
 *     meta:  { title, artist, bpm, offset },   // offset = first-beat sec
 *     notes: [ [timeMs, lane, key], ... ]      // timeMs on the SONG clock,
 *   }                                          // lane 0..2, key = input id
 *
 * GameScene.loadChart(chart) switches spawning from the random generator to
 * notes[]; the generator stays the default when no chart is loaded.
 * ChartRecorder is the tap-to-record dev tool (F9 toggle in GameScene).
 */

export function validateChart(chart) {
  if (!chart || typeof chart !== 'object') return { ok: false, reason: 'not an object' };
  const m = chart.meta;
  if (!m || typeof m !== 'object') return { ok: false, reason: 'missing meta' };
  if (!Number.isFinite(Number(m.bpm)) || Number(m.bpm) <= 0) return { ok: false, reason: 'meta.bpm must be a positive number' };
  if (!Array.isArray(chart.notes)) return { ok: false, reason: 'notes must be an array' };
  for (let i = 0; i < chart.notes.length; i++) {
    const n = chart.notes[i];
    if (!Array.isArray(n) || n.length < 3) return { ok: false, reason: `note ${i}: expected [timeMs, lane, key]` };
    if (typeof n[0] !== 'number' || !Number.isFinite(n[0]) || n[0] < 0) return { ok: false, reason: `note ${i}: bad timeMs` };
    if (![0, 1, 2].includes(n[1])) return { ok: false, reason: `note ${i}: lane must be 0..2` };
    if (typeof n[2] !== 'string' || !n[2]) return { ok: false, reason: `note ${i}: key must be a string` };
  }
  return { ok: true };
}

/** Sort notes by time (charts author out-of-order; playback needs order). */
export function sortNotes(notes) {
  return [...notes].sort((a, b) => a[0] - b[0]);
}

/**
 * Pure spawn window scan: given sorted notes and the current song position,
 * return the index after the last note that should have spawned (notes spawn
 * travelTimeMs before their hit time). GameScene walks fromIdx → result.
 */
export function spawnCursor(notes, fromIdx, songPosMs, travelTimeMs) {
  let i = fromIdx;
  while (i < notes.length && notes[i][0] - travelTimeMs <= songPosMs) i++;
  return i;
}

/** Tap-to-record dev tool. Times come from the conductor/song clock. */
export class ChartRecorder {
  constructor(meta = {}) {
    this.meta = { title: 'untitled', artist: 'unknown', bpm: 120, offset: 0, ...meta };
    this.notes = [];
    this.active = false;
  }
  start(meta) {
    if (meta) this.meta = { ...this.meta, ...meta };
    this.notes = [];
    this.active = true;
  }
  record(timeMs, lane, key) {
    if (!this.active || !Number.isFinite(timeMs) || timeMs < 0) return;
    this.notes.push([Math.round(timeMs), lane, key]);
  }
  stop() {
    this.active = false;
    return this.toChart();
  }
  toChart() {
    return { meta: { ...this.meta }, notes: sortNotes(this.notes) };
  }
  /** Dumps JSON to console and (in a browser) triggers a .json download. */
  export() {
    const chart = this.toChart();
    const json = JSON.stringify(chart, null, 2);
    console.log('=== CHART EXPORT ===\n' + json);
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(this.meta.title || 'chart').replace(/[^\w-]+/g, '_')}.chart.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return chart;
  }
}
