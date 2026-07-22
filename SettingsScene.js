import Phaser from 'phaser';
import ThemeManager, { THEMES } from './ThemeManager.js';
import Calibration from './Calibration.js';
import MediaLibrary from './MediaLibrary.js';
import { validateFile, prepareVideo } from './MediaPipeline.js';

/**
 * SettingsScene (NEW in v2) — theme picker, juice/particle controls, volumes,
 * latency calibration, and VIDEO uploads (looping background / video opponent
 * "guest screen"), with sound toggle. Video upload lives here rather than the
 * 3.7k-line Dancer Lab so v2 ships it without destabilizing that scene — the
 * full Dancer-Lab video gallery is specced as a Cursor block.
 */
export default class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: 'SettingsScene' }); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(ThemeManager.current.bgBottom);

    this.add.text(width / 2, 46, 'SETTINGS', {
      fontSize: '44px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#00ffff', strokeThickness: 4
    }).setOrigin(0.5);

    this._rows = [];
    let y = 120;
    const rowGap = 58;

    // THEME picker
    this._themeLabel = this._row(y, 'THEME', () => this._cycleTheme(1), () => this._cycleTheme(-1));
    y += rowGap;
    // JUICE toggle
    this._juiceLabel = this._row(y, 'JUICE FX', () => this._toggle('juiceOn'));
    y += rowGap;
    // PARTICLES density
    this._densityLabel = this._row(y, 'PARTICLES', () => this._cycleDensity());
    y += rowGap;
    // MUSIC volume
    this._musicLabel = this._row(y, 'MUSIC VOL', () => this._cycleVol('musicVol'));
    y += rowGap;
    // SFX volume
    this._sfxLabel = this._row(y, 'SFX VOL', () => this._cycleVol('sfxVol'));
    y += rowGap;
    // CALIBRATION
    this._calLabel = this._row(y, 'LATENCY', () => this._runCalibration());
    y += rowGap;
    // VIDEO BACKGROUND
    this._vidLabel = this._row(y, 'VIDEO BG', () => this._toggle('videoBgEnabled'));
    y += rowGap;
    this._vidSoundLabel = this._row(y, 'VIDEO SOUND', () => this._toggle('videoBgSound'));
    y += rowGap;
    this._vsLabel = this._row(y, 'VIDEO GUEST', () => this._toggle('videoOpponentEnabled'));
    y += rowGap;

    // UPLOAD VIDEO button
    this._makeButton(width / 2, y + 8, '⬆ UPLOAD VIDEO (MP4/WEBM)', 0xff71ce, () => this._pickVideo());
    y += rowGap;
    this._videoStatus = this.add.text(width / 2, y, '', { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
    this._refreshVideoStatus();

    // BACK
    this._makeButton(width / 2, height - 56, '◀ BACK TO MENU', 0x00ffff, () => this.scene.start('MenuScene'));

    this._refreshAll();
    this.events.on('shutdown', () => this._removeInput());
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  _row(y, label, onNext, onPrev) {
    const { width } = this.scale;
    this.add.text(width / 2 - 220, y, label, { fontSize: '22px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0, 0.5);
    const value = this.add.text(width / 2 + 90, y, '', { fontSize: '22px', fontFamily: 'Arial', color: '#00ffff' }).setOrigin(0.5);
    const mk = (x, glyph, cb) => {
      if (!cb) return;
      const b = this.add.text(x, y, glyph, { fontSize: '26px', color: '#ffffff', backgroundColor: '#222244', padding: { x: 10, y: 4 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { cb(); this._refreshAll(); });
    };
    mk(width / 2 - 40, '◀', onPrev || onNext);
    mk(width / 2 + 220, '▶', onNext);
    return value;
  }

  _makeButton(x, y, label, color, cb) {
    const t = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#000000',
      backgroundColor: '#' + color.toString(16).padStart(6, '0'), padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', cb);
    return t;
  }

  _refreshAll() {
    const r = this.registry;
    this._themeLabel.setText(ThemeManager.current.label);
    this._juiceLabel.setText(r.get('juiceOn') !== false ? 'ON' : 'OFF');
    const d = Number(r.get('particleDensity')); this._densityLabel.setText(['OFF', 'LOW', 'FULL', 'MAX'][[0, 0.5, 1, 1.5].indexOf(Number.isFinite(d) ? d : 1)] || 'FULL');
    this._musicLabel.setText(Math.round((r.get('musicVol') ?? 0.4) * 100) + '%');
    this._sfxLabel.setText(Math.round((r.get('sfxVol') ?? 0.5) * 100) + '%');
    this._calLabel.setText((r.get('latencyOffsetMs') || 0) + ' ms');
    this._vidLabel.setText(r.get('videoBgEnabled') ? 'ON' : 'OFF');
    this._vidSoundLabel.setText(r.get('videoBgSound') ? 'ON' : 'OFF');
    this._vsLabel.setText(r.get('videoOpponentEnabled') ? 'ON' : 'OFF');
    this.cameras.main.setBackgroundColor(ThemeManager.current.bgBottom);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  _cycleTheme(dir) {
    const ids = ThemeManager.ids();
    const idx = (ids.indexOf(ThemeManager.currentId) + dir + ids.length) % ids.length;
    ThemeManager.set(ids[idx], this.registry);
  }
  _toggle(key) { this.registry.set(key, !this.registry.get(key)); }
  _cycleDensity() {
    const steps = [0, 0.5, 1, 1.5];
    const cur = Number(this.registry.get('particleDensity'));
    const idx = (steps.indexOf(Number.isFinite(cur) ? cur : 1) + 1) % steps.length;
    this.registry.set('particleDensity', steps[idx]);
  }
  _cycleVol(key) {
    const steps = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const cur = Number(this.registry.get(key));
    const idx = (steps.indexOf(Number.isFinite(cur) ? cur : 0.4) + 1) % steps.length;
    this.registry.set(key, steps[idx]);
  }

  _runCalibration() {
    this._calLabel.setText('TAP THE CLICKS…');
    const cal = new Calibration(this);
    const ok = cal.start((offset, err) => {
      if (err) { this._calLabel.setText('FAILED — RETRY'); return; }
      this._calLabel.setText(offset + ' ms ✓');
    });
    if (!ok) this._calLabel.setText('NO AUDIO CTX');
  }

  _pickVideo() {
    this._removeInput();
    const input = document.createElement('input');
    input.type = 'file';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) input.accept = 'video/*';               // iOS Files-app quirk: no accept attr
    input.style.display = 'none';
    document.body.appendChild(input);
    this._fileInput = input;
    input.onchange = async () => {
      const file = input.files && input.files[0];
      this._removeInput();
      if (!file) return;
      const check = validateFile(file);
      if (!check.ok || check.kind !== 'video') {
        this._videoStatus.setText('✗ ' + (check.reason || 'not a video')); return;
      }
      this._videoStatus.setText('probing video…');
      try {
        const { blob, meta } = await prepareVideo(file);
        const key = `custom-video-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
        const stored = await MediaLibrary.putBlob('video:' + key, blob, meta);
        const list = (this.registry.get('customVideos') || []).slice();
        list.push({ key, name: file.name, duration: Math.round(meta.duration), w: meta.width, h: meta.height });
        this.registry.set('customVideos', list);
        this._videoStatus.setText(stored
          ? `✓ ${file.name} saved (${Math.round(meta.duration)}s) — enable VIDEO BG or GUEST`
          : `✓ ${file.name} loaded (session only — storage unavailable)`);
      } catch (e) {
        this._videoStatus.setText('✗ video failed: ' + (e.message || 'unreadable'));
      }
    };
    input.click();
  }

  _refreshVideoStatus() {
    const vids = this.registry.get('customVideos') || [];
    if (vids.length) this._videoStatus?.setText(`${vids.length} video(s) in library — latest: ${vids[vids.length - 1].name}`);
  }

  _removeInput() { if (this._fileInput) { this._fileInput.remove(); this._fileInput = null; } }
}
