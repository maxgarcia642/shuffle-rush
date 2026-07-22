/**
 * LeaderboardService (Block 7) — leaderboard + async-ghost groundwork.
 *
 * TWO MODES, HARD-GUARDED:
 * - LOCAL (always works, zero config): top-10 list in localStorage under
 *   'shuffleRushLeaderboard'. The existing 'shuffleRushHighScore' /
 *   'shuffleRushTotalEnemies' keys are UNTOUCHED — this is additive.
 * - REMOTE (optional): InstantDB via its documented browser ESM CDN import
 *   (https://esm.sh/@instantdb/core — see instantdb.com/docs/patterns "Using
 *   Instant via CDN"). Activated ONLY if instant_db_config.js exists at the
 *   repo root (gitignored; see instant_db_config.example.js). Without it the
 *   service silently stays local — the GitHub build runs on itch.io/local
 *   with no credentials and no network calls.
 *
 * GHOSTS: ReplayRecorder captures a run's input feed (time, lane, judgment)
 * as compact JSON small enough to store alongside a score, enabling "ghost
 * battle" playback of a rival's hit/miss feed beside the enemy panel.
 */

const LOCAL_KEY = 'shuffleRushLeaderboard';
const MAX_ENTRIES = 10;
const MAX_REPLAY_EVENTS = 2000;

/** Pure: insert an entry into a top-N list (highest score first). Unit-tested. */
export function insertScore(list, entry, maxEntries = MAX_ENTRIES) {
  const next = [...(list || []), entry]
    .filter(e => e && Number.isFinite(Number(e.score)))
    .sort((a, b) => Number(b.score) - Number(a.score) || (a.at || 0) - (b.at || 0));
  return next.slice(0, maxEntries);
}

/** Pure: cap + normalize a replay event list. Unit-tested. */
export function normalizeReplay(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter(e => Array.isArray(e) && e.length >= 3 && typeof e[0] === 'number' && Number.isFinite(e[0]))
    .slice(0, MAX_REPLAY_EVENTS)
    .map(e => [Math.round(Number(e[0])), Number(e[1]) | 0, String(e[2])]);
}

/** Records one run's input feed on the conductor clock. */
export class ReplayRecorder {
  constructor(nowFn) {
    this._now = nowFn || (() => Date.now());
    this._events = [];
    this._t0 = null;
  }
  start() { this._t0 = this._now(); this._events = []; }
  /** judgment: 'perfect' | 'good' | 'ok' | 'miss' */
  record(laneIdx, judgment) {
    if (this._t0 === null || this._events.length >= MAX_REPLAY_EVENTS) return;
    this._events.push([this._now() - this._t0, laneIdx, judgment]);
  }
  finish() {
    const replay = { version: 1, events: normalizeReplay(this._events) };
    this._t0 = null;
    return replay;
  }
}

const LeaderboardService = {
  _db: null,
  _remoteTried: false,
  _storage: (typeof localStorage !== 'undefined') ? localStorage : null,

  isRemote() { return !!this._db; },

  /**
   * Try to activate remote mode. Safe to call unconditionally: if the config
   * file is absent (the default), the dynamic import 404s, we catch, and stay
   * local. No CDN request is made unless a config actually exists.
   */
  async configure() {
    if (this._remoteTried) return this.isRemote();
    this._remoteTried = true;
    let config;
    try {
      config = (await import('./instant_db_config.js')).default;
    } catch {
      return false;                                       // no config → local-only mode
    }
    if (!config || !config.appId) return false;
    try {
      const { init } = await import('https://esm.sh/@instantdb/core@0.21.28');
      this._db = init({ appId: config.appId });
      console.log('✓ Leaderboard: InstantDB remote mode active');
      return true;
    } catch (e) {
      console.warn('Leaderboard: InstantDB unavailable, staying local:', e.message || e);
      this._db = null;
      return false;
    }
  },

  _readLocal() {
    try {
      const raw = this._storage?.getItem(LOCAL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      // Corrupted/foreign storage (object, string…) would make insertScore's
      // spread throw — normalize anything non-array to an empty list.
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  },

  _writeLocal(list) {
    try { this._storage?.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* quota — local list is best-effort */ }
  },

  /** @param {{name:string, score:number, enemies:number, replay?:object}} entry */
  async submitScore(entry) {
    const record = {
      name: String(entry.name || 'PLAYER').slice(0, 24),
      score: Number(entry.score) || 0,
      enemies: Number(entry.enemies) || 0,
      at: Date.now(),
      replay: entry.replay ? { version: entry.replay.version || 1, events: normalizeReplay(entry.replay.events) } : null
    };
    // Local list always updates (it is the fallback and the offline truth).
    this._writeLocal(insertScore(this._readLocal(), record));
    if (this._db) {
      try {
        const { id } = await import('https://esm.sh/@instantdb/core@0.21.28');
        await this._db.transact(
          this._db.tx.scores[id()].update({
            name: record.name, score: record.score, enemies: record.enemies,
            at: record.at, replay: record.replay ? JSON.stringify(record.replay) : null
          })
        );
      } catch (e) { console.warn('Leaderboard: remote submit failed (local saved):', e.message || e); }
    }
    return record;
  },

  async top10() {
    if (this._db) {
      try {
        const res = await this._db.queryOnce({ scores: { $: { order: { score: 'desc' }, limit: MAX_ENTRIES } } });
        const rows = res?.data?.scores;
        if (Array.isArray(rows)) {
          return rows.map(r => {
            // Per-row defensive parse: one malformed replay must not abort
            // the whole remote list (it would hide every valid score).
            let replay = null;
            try { replay = r.replay ? JSON.parse(r.replay) : null; }
            catch { /* bad replay payload — keep the score, drop the ghost */ }
            return { name: r.name, score: r.score, enemies: r.enemies, at: r.at, replay };
          });
        }
      } catch (e) { console.warn('Leaderboard: remote read failed, using local:', e.message || e); }
    }
    return this._readLocal();
  }
};

export default LeaderboardService;
