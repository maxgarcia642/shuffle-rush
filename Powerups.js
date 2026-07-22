/**
 * Powerups — six pickups + effect engine (v2).
 * Drops roll on enemy defeat; effects surface through query methods the scene
 * calls at the exact points it already computes score/windows/misses:
 *   windowScale() → widens judgment windows (TIME DILATOR)
 *   scoreMult()   → score multiplier (DOUBLE DOWN / HYPE TRAIN)
 *   consumeShield() → absorbs one miss (GROOVE SHIELD)
 *   consumeComboKeeper() → next miss keeps combo
 * SECOND WIND heals immediately; SLOW GROOVE eases marker travel speed.
 */
export const POWERUP_DEFS = {
  time_dilator: { label: 'TIME DILATOR', color: 0x01cdfe, desc: 'Wider timing windows · 10s', durationMs: 10000 },
  groove_shield:{ label: 'GROOVE SHIELD', color: 0x05ffa1, desc: 'Absorbs the next miss', durationMs: 0 },
  double_down:  { label: 'DOUBLE DOWN', color: 0xffee00, desc: '2× score · 12s', durationMs: 12000 },
  combo_keeper: { label: 'COMBO KEEPER', color: 0xb967ff, desc: 'Next miss keeps thy combo', durationMs: 0 },
  second_wind:  { label: 'SECOND WIND', color: 0x00ff88, desc: '+25 HP instantly', durationMs: 0 },
  slow_groove:  { label: 'SLOW GROOVE', color: 0xff71ce, desc: 'Markers fall 25% slower · 8s', durationMs: 8000 }
};

export default class PowerupManager {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.dropChance = opts.dropChance ?? 0.35;          // per enemy defeat
    this.fx = { windowScaleUntil: 0, scoreMultUntil: 0, slowUntil: 0, shield: false, comboKeeper: false };
    this.nowFn = opts.nowFn || (() => Date.now());      // injectable for tests
    this.onApply = opts.onApply || null;                // (id, def) => void  (feedback hook)
  }

  windowScale() { return this.nowFn() < this.fx.windowScaleUntil ? 1.4 : 1; }
  scoreMult()   { return this.nowFn() < this.fx.scoreMultUntil ? 2 : 1; }
  travelScale() { return this.nowFn() < this.fx.slowUntil ? 1.25 : 1; }
  consumeShield() { if (this.fx.shield) { this.fx.shield = false; return true; } return false; }
  consumeComboKeeper() { if (this.fx.comboKeeper) { this.fx.comboKeeper = false; return true; } return false; }

  apply(id) {
    const def = POWERUP_DEFS[id];
    if (!def) return false;
    const now = this.nowFn();
    switch (id) {
      case 'time_dilator': this.fx.windowScaleUntil = now + def.durationMs; break;
      case 'double_down':  this.fx.scoreMultUntil = now + def.durationMs; break;
      case 'slow_groove':  this.fx.slowUntil = now + def.durationMs; break;
      case 'groove_shield': this.fx.shield = true; break;
      case 'combo_keeper':  this.fx.comboKeeper = true; break;
      case 'second_wind':
        if (this.scene?.player?.heal) this.scene.player.heal(25);
        break;
      default: return false;
    }
    if (this.onApply) this.onApply(id, def);
    return true;
  }

  /** Roll a drop at (x,y); spawns a tappable pickup that auto-applies on click
   *  or auto-expires. Pure-visual pickup, safe in any scene. */
  onEnemyDefeated(x, y) {
    if (!this.scene || Math.random() > this.dropChance) return null;
    const ids = Object.keys(POWERUP_DEFS);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const def = POWERUP_DEFS[id];
    const c = this.scene.add.container(x, y).setDepth(940);
    const orb = this.scene.add.circle(0, 0, 26, def.color).setStrokeStyle(3, 0xffffff);
    const glyph = this.scene.add.text(0, 0, '★', { fontSize: '24px', color: '#000000' }).setOrigin(0.5);
    c.add([orb, glyph]);
    c.setSize(60, 60).setInteractive({ useHandCursor: true });
    this.scene.tweens.add({ targets: c, y: y - 14, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
    const grab = () => { this.apply(id); c.destroy(); };
    c.once('pointerdown', grab);
    this.scene.time.delayedCall(6000, () => { if (c.active) c.destroy(); });
    return id;
  }
}
