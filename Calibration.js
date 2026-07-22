/**
 * Calibration — audio/input latency offset measurement (v2).
 * Plays 8 clicks scheduled ON the audio clock; the player taps along; the
 * median tap-vs-click delta becomes latencyOffsetMs (persisted). Conductor
 * subtracts it inside nowMs(), so judgment matches what the player HEARS.
 */
export default class Calibration {
  constructor(scene) {
    this.scene = scene;
    this.taps = [];
    this.clickTimes = [];
    this.active = false;
    this._handler = null;
  }

  start(onDone, bpm = 100, clicks = 8) {
    const sm = this.scene.sound;
    const ctx = sm && sm.context;
    if (!ctx) { onDone && onDone(null, 'WebAudio unavailable'); return false; }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    this.taps = []; this.clickTimes = []; this.active = true;
    const interval = 60 / bpm;
    const start = ctx.currentTime + 0.6;
    for (let i = 0; i < clicks; i++) {
      const at = start + i * interval;
      this.clickTimes.push(at * 1000);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = i === 0 ? 1200 : 880;
      gain.gain.setValueAtTime(0.15, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + 0.09);
    }
    this._handler = () => this.tap(ctx.currentTime * 1000);
    this.scene.input.on('pointerdown', this._handler);
    this.scene.input.keyboard?.on('keydown-SPACE', this._handler);
    this.scene.time.delayedCall((0.6 + clicks * interval + 0.8) * 1000, () => this.finish(onDone));
    return true;
  }

  tap(nowMsAudio) { if (this.active) this.taps.push(nowMsAudio); }

  finish(onDone) {
    this.active = false;
    if (this._handler) {
      this.scene.input.off('pointerdown', this._handler);
      this.scene.input.keyboard?.off('keydown-SPACE', this._handler);
      this._handler = null;
    }
    const deltas = [];
    for (const t of this.taps) {
      let best = Infinity;
      for (const c of this.clickTimes) {
        const d = t - c;
        if (Math.abs(d) < Math.abs(best)) best = d;
      }
      if (Math.abs(best) < 250) deltas.push(best);       // discard wild taps
    }
    if (deltas.length < 3) { onDone && onDone(null, 'not enough taps'); return; }
    deltas.sort((a, b) => a - b);
    const median = deltas[Math.floor(deltas.length / 2)];
    const offset = Math.round(median);
    this.scene.registry.set('latencyOffsetMs', offset);
    onDone && onDone(offset, null);
  }
}
