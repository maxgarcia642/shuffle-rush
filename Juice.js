/**
import Phaser from 'phaser';
 * Juice — screen shake, hit-stop, floaters, bursts, beat pulse (v2).
 * Complements (does not replace) the scene's existing effect arsenal — this is
 * the reusable, settings-aware layer on top. All calls no-op when juiceOn is
 * false or particle density is 0. Hit-stop is tween/physics-safe: it scales
 * scene.time and tweens briefly rather than freezing the loop.
 */
import ThemeManager from './ThemeManager.js';

export default class Juice {
  constructor(scene) {
    this.scene = scene;
    this.enabled = scene.registry?.get('juiceOn') !== false;
    this.density = Number(scene.registry?.get('particleDensity'));
    if (!Number.isFinite(this.density)) this.density = 1;      // 0 .. 1.5
    this._floaterTimer = null;
  }

  setEnabled(on) { this.enabled = !!on; this.scene.registry?.set('juiceOn', this.enabled); }
  setDensity(d) { this.density = Math.max(0, Math.min(1.5, d)); this.scene.registry?.set('particleDensity', this.density); }

  shake(intensity = 0.006, ms = 120) {
    if (!this.enabled) return;
    this.scene.cameras?.main?.shake(ms, intensity);
  }

  /** Brief global slowdown — reads as impact without freezing audio. */
  hitstop(ms = 70, scale = 0.25) {
    if (!this.enabled) return;
    const s = this.scene;
    if (s._juiceStopped) return;
    s._juiceStopped = true;
    const prevTime = s.time.timeScale, prevTween = s.tweens.timeScale;
    s.time.timeScale = scale; s.tweens.timeScale = scale;
    setTimeout(() => {
      s.time.timeScale = prevTime; s.tweens.timeScale = prevTween;
      s._juiceStopped = false;
    }, ms);
  }

  burst(x, y, color, n = 12) {
    if (!this.enabled || this.density <= 0) return;
    const t = ThemeManager.current;
    const count = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < count; i++) {
      const dot = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), color ?? t.particle)
        .setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
      const a = Math.random() * Math.PI * 2, sp = Phaser.Math.Between(60, 220);
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp - 30,
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(350, 650),
        ease: 'Cubic.easeOut', onComplete: () => dot.destroy()
      });
    }
  }

  /** Themed floating glyphs (♪ ✦ …) drifting upward — ambient party energy. */
  startFloaters(everyMs = 900) {
    if (this._floaterTimer) return;
    this._floaterTimer = this.scene.time.addEvent({
      delay: everyMs, loop: true, callback: () => {
        if (!this.enabled || this.density <= 0) return;
        const { width, height } = this.scene.scale;
        const t = ThemeManager.current;
        const glyph = Phaser.Utils.Array.GetRandom(t.floaters);
        const txt = this.scene.add.text(Phaser.Math.Between(20, width - 20), height + 20, glyph, {
          fontSize: `${Phaser.Math.Between(14, 30)}px`, color: '#ffffff'
        }).setAlpha(0.5).setDepth(5).setTint(t.particle);
        this.scene.tweens.add({
          targets: txt, y: -40, x: txt.x + Phaser.Math.Between(-60, 60),
          angle: Phaser.Math.Between(-40, 40), alpha: 0,
          duration: Phaser.Math.Between(3500, 6500), onComplete: () => txt.destroy()
        });
      }
    });
  }

  stopFloaters() { this._floaterTimer?.remove(); this._floaterTimer = null; }

  onBeat() {
    if (!this.enabled) return;
    // light beat accent beyond the scene's own camera punch: border flash
    const t = ThemeManager.current;
    const { width, height } = this.scene.scale;
    const g = this.scene.add.rectangle(width / 2, height / 2, width, height)
      .setStrokeStyle(4, t.beam, 0.35).setFillStyle(0, 0).setDepth(900);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  destroy() { this.stopFloaters(); }
}
