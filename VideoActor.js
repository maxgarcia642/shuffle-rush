/**
 * VideoActor — looping video as a live Phaser texture (v2).
 * Powers "play against a video" opponents and looping video backgrounds with
 * optional sound. A hidden <video> element decodes; each frame is drawn into a
 * Phaser CanvasTexture the scene displays like any sprite texture.
 * AUTOPLAY HONESTY: browsers allow muted autoplay only — sound starts on the
 * first user gesture (we hook pointerdown once, per platform policy).
 */
export default class VideoActor {
  /**
   * @param {Phaser.Scene} scene
   * @param {Blob|string} source  video Blob (from MediaLibrary) or URL
   * @param {object} opts { key, loop=true, sound=false, maxDim=512, fps=30 }
   */
  constructor(scene, source, opts = {}) {
    this.scene = scene;
    this.key = opts.key || `video-actor-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    this.loop = opts.loop !== false;
    this.wantSound = !!opts.sound;
    this.maxDim = opts.maxDim || 512;
    this.fps = opts.fps || 30;
    this._url = typeof source === 'string' ? source : URL.createObjectURL(source);
    this._ownsUrl = typeof source !== 'string';
    this._video = null;
    this._texture = null;
    this._timer = null;
    this._texW = 0;
    this._texH = 0;
    this.ready = false;
    this.onReady = null;
    this.onError = null;                                // called with (this) if the video fails to load
    this._build();
  }

  _build() {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.loop = this.loop;
    v.muted = true;                                     // required for autoplay
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.style.display = 'none';
    v.src = this._url;
    document.body.appendChild(v);
    this._video = v;
    v.onloadedmetadata = () => {
      const scale = Math.min(1, this.maxDim / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.max(2, Math.round(v.videoWidth * scale));
      const h = Math.max(2, Math.round(v.videoHeight * scale));
      if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
      this._texture = this.scene.textures.createCanvas(this.key, w, h);
      this._texW = w; this._texH = h;
      v.play().catch(() => { /* will start on first gesture */ });
      this._startTimer();
      if (this.wantSound) this._armSoundUnlock();
      this.ready = true;
      if (this.onReady) this.onReady(this);
    };
    v.onerror = () => {
      console.error('VideoActor: video failed to load', this.key);
      // Surface the failure — a caller waiting on onReady would otherwise
      // hang forever with no way to detect it.
      if (this.onError) this.onError(this);
    };
  }

  _startTimer() {
    if (this._timer || !this._texture) return;
    this._timer = setInterval(() => this._draw(this._texW, this._texH), 1000 / this.fps);
  }

  _draw(w, h) {
    const v = this._video;
    if (!v || v.readyState < 2 || !this._texture) return;
    const ctx = this._texture.getContext();
    ctx.drawImage(v, 0, 0, w, h);
    this._texture.refresh();
  }

  _armSoundUnlock() {
    const unlock = () => {
      if (this._video) { this._video.muted = false; this._video.volume = 0.5; this._video.play().catch(() => {}); }
    };
    this.scene.input.once('pointerdown', unlock);
  }

  setSound(on) {
    this.wantSound = !!on;
    if (this._video) {
      if (on) this._armSoundUnlock(); else this._video.muted = true;
    }
  }

  pause() {
    this._video && this._video.pause();
    // Suspend the redraw loop too — it would keep repainting the frozen frame
    // at full fps while paused.
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
  resume() {
    this._video && this._video.play().catch(() => {});
    this._startTimer();
  }

  destroy() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._video) { this._video.pause(); this._video.remove(); this._video = null; }
    if (this._texture && this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    if (this._ownsUrl) URL.revokeObjectURL(this._url);
    this.ready = false;
  }
}
