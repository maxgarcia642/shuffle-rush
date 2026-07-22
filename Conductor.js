import Phaser from 'phaser';

/**
 * Conductor — Web Audio master clock for Shuffle Rush.
 * Replaces the Phaser-timer heartbeat with the "Tale of Two Clocks" pattern
 * (cwilso/metronome): a light setInterval scheduler that places beats on the
 * AudioContext clock inside a lookahead window, so beats never drift with
 * frame drops. Drop-in compatible with the old RhythmSystem API:
 *   new Conductor(scene, 120) · start() · stop() · setBPM(n) · .beatInterval
 *   .on('beat', fn)
 * New capabilities: nowMs() (audio-clock ms), syncToPhaserSound(), setOffset(),
 * judge(). All gameplay judgment should read nowMs(), never scene.time.now.
 */
export default class Conductor extends Phaser.Events.EventEmitter {
  constructor(scene, bpm = 120) {
    super();
    this.scene = scene;
    this.bpm = bpm;
    this.offsetMs = 0;                                  // beat-grid offset from track analysis
    this.userLatencyMs = Number(scene?.registry?.get('latencyOffsetMs')) || 0; // calibration
    this._ctx = null;
    this._running = false;
    this._lookaheadMs = 25;                             // scheduler tick
    this._scheduleAheadS = 0.12;                        // schedule window (~120ms)
    this._nextBeatTime = 0;                             // audio-clock seconds
    this._beatNumber = 0;
    this._timer = null;
    this._boundSound = null;
    this._pausedAt = null;
  }

  /** ms per beat — legacy name kept because GameScene reads it. */
  get beatInterval() { return 60000 / this.bpm; }

  get ctx() {
    if (!this._ctx) {
      const sm = this.scene && this.scene.sound;
      if (sm && sm.context && typeof sm.context.currentTime === 'number') {
        this._ctx = sm.context;                          // reuse Phaser's WebAudio context
      } else if (typeof AudioContext !== 'undefined') {
        this._ctx = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        this._ctx = new webkitAudioContext();            // eslint-disable-line no-undef
      }
    }
    return this._ctx;
  }

  /** Audio-clock time in seconds (falls back to game clock only if WebAudio is absent). */
  now() {
    const c = this.ctx;
    if (c) return c.currentTime;
    return (this.scene ? this.scene.time.now : Date.now()) / 1000;
  }

  /** Audio-clock time in ms, with the user's calibration offset applied. */
  nowMs() { return this.now() * 1000 - this.userLatencyMs; }

  start() {
    if (this._running) return;
    const c = this.ctx;
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { /* gesture-gated */ } }
    this._running = true;
    this._beatNumber = 0;
    this._nextBeatTime = this.now() + 0.1;
    this._timer = setInterval(() => this._schedule(), this._lookaheadMs);
    this._schedule();
  }

  stop() {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _schedule() {
    if (!this._running) return;
    const horizon = this.now() + this._scheduleAheadS;
    while (this._nextBeatTime < horizon) {
      this._emitAt(this._nextBeatTime, this._beatNumber);
      this._beatNumber++;
      this._nextBeatTime += 60 / this.bpm;               // reads CURRENT bpm — setBPM keeps phase
    }
  }

  _emitAt(atTime, beat) {
    const delayMs = Math.max(0, (atTime - this.now()) * 1000);
    setTimeout(() => { if (this._running) this.emit('beat', { beat, atTime }); }, delayMs);
    // NOTE: the setTimeout jitter (±few ms) affects VISUAL beat events only.
    // Judgment never uses event timing — it compares against nowMs() directly.
  }

  /** Tempo change WITHOUT phase reset — the old system restarted its timer here. */
  setBPM(newBPM) {
    const n = Number(newBPM);
    if (!n || n <= 0 || n === this.bpm) return;
    this.bpm = Math.max(40, Math.min(300, n));
  }

  /** First-beat offset (seconds) from BeatDetector.detectBeatGrid. */
  setOffset(offsetSec) { this.offsetMs = (Number(offsetSec) || 0) * 1000; }

  /**
   * Align the beat grid to a Phaser WebAudio sound that just started playing.
   * Call right after sound.play(). gridOffsetSec = detected first-beat offset.
   */
  syncToPhaserSound(sound, gridOffsetSec = 0) {
    this._boundSound = sound || null;
    this.setOffset(gridOffsetSec);
    let anchor;
    if (sound && typeof sound.seek === 'number' && sound.isPlaying) {
      // Mid-song alignment: place the next beat on the track's own grid.
      const beatLen = 60 / this.bpm;
      const pos = sound.seek;
      const off = Number(gridOffsetSec) || 0;
      const sinceGrid = ((pos - off) % beatLen + beatLen) % beatLen;
      anchor = this.now() + ((beatLen - sinceGrid) % beatLen);
      if (anchor <= this.now() + 0.02) anchor += beatLen;
    } else {
      anchor = this.now() + Math.max(0.05, Number(gridOffsetSec) || 0);
    }
    this._beatNumber = 0;
    this._nextBeatTime = anchor;
  }

  /** Song position in ms if a sound is bound (uses Phaser's context-derived seek). */
  songPositionMs() {
    const s = this._boundSound;
    if (s && typeof s.seek === 'number' && s.isPlaying) return s.seek * 1000 - this.offsetMs;
    return this.nowMs();
  }

  judge(deltaMs, windows) { return ConductorMath.judge(deltaMs, windows || Conductor.DEFAULT_WINDOWS); }

  destroy() { this.stop(); this.removeAllListeners(); this._boundSound = null; }
}

/** Shipped-feel defaults (matches the live 100/200/300ms tiers); Settings can scale. */
Conductor.DEFAULT_WINDOWS = { perfect: 100, good: 200, ok: 300 };

/** Pure math — unit-testable without Phaser or WebAudio. */
export const ConductorMath = {
  beatLenMs(bpm) { return 60000 / bpm; },
  /** Signed distance (ms) from time t to the nearest grid line. */
  gridDelta(tMs, bpm, offsetMs = 0) {
    const bl = 60000 / bpm;
    let p = ((tMs - offsetMs) % bl + bl) % bl;
    return p > bl / 2 ? p - bl : p;
  },
  judge(deltaMs, w) {
    const d = Math.abs(deltaMs);
    if (d <= w.perfect) return 'perfect';
    if (d <= w.good) return 'good';
    if (d <= w.ok) return 'ok';
    return 'miss';
  },
  /** Phase continuity check helper: next beat time after a bpm change. */
  nextBeatAfter(nowS, lastScheduledS, bpm) { return lastScheduledS + 60 / bpm > nowS; },
  /**
   * Block 1: time-driven marker fall. Returns y for a marker at audio-clock
   * time nowMs, clamped to [spawnY, targetY + 15% overshoot past the line].
   */
  markerY(nowMs, targetTime, travelTime, spawnY, targetY) {
    const progress = 1 - (targetTime - nowMs) / travelTime;
    const p = Math.max(0, Math.min(1.15, progress));
    return spawnY + (targetY - spawnY) * p;
  }
};
