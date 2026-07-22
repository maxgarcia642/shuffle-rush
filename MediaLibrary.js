/**
 * MediaLibrary — IndexedDB persistence for Shuffle Rush (v2).
 * WHY: v1 persisted base64 audio/images through localStorage (LZString-packed).
 * One 4MB MP3 eats the whole 5–10MB quota — the documented "likely won't
 * survive refresh" bug. IndexedDB stores Blobs with quotas in the hundreds of
 * MB+. The Phaser REGISTRY CONTRACT IS UNCHANGED: scenes still read/write
 * customDancers / customTracks / customImageData / customAudioData /
 * customAnimations / customVideos — main.js now bridges registry <-> here.
 * Includes one-time migration from the legacy localStorage keys.
 */
const DB_NAME = 'shuffle-rush';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('IDB tx aborted'));
  });
}

function reqValue(db, store, key) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const r = t.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function base64ToBlob(base64, fallbackType = 'application/octet-stream') {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(base64);
  const type = m ? m[1] : fallbackType;
  const raw = m ? m[2] : base64;
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

const MediaLibrary = {
  _db: null,
  _failed: false,

  async open() {
    if (this._db || this._failed) return this._db;
    try { this._db = await openDB(); }
    catch (e) { console.warn('MediaLibrary: IndexedDB unavailable — session-only mode.', e); this._failed = true; }
    return this._db;
  },

  available() { return !!this._db; },

  // ---- small JSON values (track lists, settings, flags) ----
  async setKV(key, value) {
    const db = await this.open(); if (!db) return false;
    try { await tx(db, 'kv', 'readwrite', s => s.put(value, key)); return true; }
    catch (e) { console.error('MediaLibrary.setKV failed:', key, e); return false; }
  },
  async getKV(key, fallback = null) {
    const db = await this.open(); if (!db) return fallback;
    try { const v = await reqValue(db, 'kv', key); return v === undefined ? fallback : v; }
    catch (e) { return fallback; }
  },

  // ---- big binary payloads (audio, images, gif sheets, video) ----
  async putBlob(key, blob, meta = {}) {
    const db = await this.open(); if (!db) return false;
    try { await tx(db, 'blobs', 'readwrite', s => s.put({ blob, meta, type: blob.type, size: blob.size, savedAt: Date.now() }, key)); return true; }
    catch (e) { console.error('MediaLibrary.putBlob failed:', key, e); return false; }
  },
  async getBlob(key) {
    const db = await this.open(); if (!db) return null;
    try { const rec = await reqValue(db, 'blobs', key); return rec ? rec.blob : null; }
    catch (e) { return null; }
  },
  async deleteBlob(key) {
    const db = await this.open(); if (!db) return false;
    try { await tx(db, 'blobs', 'readwrite', s => s.delete(key)); return true; } catch (e) { return false; }
  },
  async listBlobKeys() {
    const db = await this.open(); if (!db) return [];
    return new Promise((resolve) => {
      const t = db.transaction('blobs', 'readonly');
      const r = t.objectStore('blobs').getAllKeys();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => resolve([]);
    });
  },

  /** Store a base64 map {key: dataURL} as blobs under a prefix. */
  async putBase64Map(prefix, map) {
    for (const k of Object.keys(map || {})) {
      try { await this.putBlob(prefix + k, base64ToBlob(map[k])); }
      catch (e) { console.error('putBase64Map item failed:', k, e); }
    }
  },
  /** Rebuild a base64 map {key: dataURL} for the given keys (registry bridge). */
  async readBase64Map(prefix, keys) {
    const out = {};
    for (const k of keys || []) {
      const blob = await this.getBlob(prefix + k);
      if (blob) { try { out[k] = await blobToBase64(blob); } catch (e) { /* skip */ } }
    }
    return out;
  },

  async estimateUsage() {
    try {
      if (navigator?.storage?.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        return { usage: usage || 0, quota: quota || 0 };
      }
    } catch (e) { /* ignore */ }
    return { usage: 0, quota: 0 };
  },

  /**
   * One-time migration from the legacy localStorage layer (ShuffleRushStorage,
   * plain + '_lz' LZString keys). Non-destructive until each piece lands in
   * IDB; giant payload keys are then cleared to free quota. Metadata keys stay
   * in localStorage as a cache — IDB is the source of truth afterward.
   */
  async migrateFromLocalStorage(Storage) {
    const db = await this.open(); if (!db) return { migrated: false };
    const done = await this.getKV('migration-v1-done', false);
    if (done) return { migrated: false, already: true };
    const report = { tracks: 0, images: 0, anims: 0, failures: 0 };
    // Per-item fault isolation: one corrupt base64 payload (atob throws) or
    // one failed putBlob must not abort the rest of the migration — and a
    // legacy payload key may only be purged once EVERY item in it landed in
    // IDB, or a partial failure would permanently drop that media.
    const migrateMap = async (storageKey, prefix, mime, onOk) => {
      const map = (Storage && Storage.get(storageKey)) || {};
      let failed = 0;
      for (const k of Object.keys(map)) {
        try {
          if (await this.putBlob(prefix + k, base64ToBlob(map[k], mime))) onOk();
          else failed++;
        } catch (e) { console.warn('migration item failed:', prefix + k, e); failed++; }
      }
      return failed;
    };
    try {
      const audioFailed = await migrateMap('shuffleRushCustomAudioData', 'audio:', 'audio/mpeg', () => report.tracks++);
      const imageFailed = await migrateMap('shuffleRushCustomImageData', 'image:', 'image/png', () => report.images++);
      let animsFailed = 0;
      const anims = (Storage && Storage.get('shuffleRushCustomAnimations')) || {};
      if (Object.keys(anims).length) {
        if (await this.setKV('customAnimations', anims)) report.anims = Object.keys(anims).length;
        else animsFailed = 1;
      }
      for (const meta of ['shuffleRushCustomTracks', 'shuffleRushCustomDancers']) {
        const v = Storage && Storage.get(meta);
        if (v) await this.setKV(meta, v);
      }
      // Free the quota hogs (payloads only — metadata cache stays), but ONLY
      // the keys whose contents fully migrated.
      const clearable = [
        [audioFailed, 'shuffleRushCustomAudioData'],
        [imageFailed, 'shuffleRushCustomImageData'],
        [animsFailed, 'shuffleRushCustomAnimations']
      ];
      for (const [failed, big] of clearable) {
        if (failed === 0) {
          try { localStorage.removeItem(big); localStorage.removeItem(big + '_lz'); } catch (e) { /* ignore */ }
        }
      }
      report.failures = audioFailed + imageFailed + animsFailed;
      if (report.failures === 0) {
        await this.setKV('migration-v1-done', true);
        console.log('✅ MediaLibrary migration complete:', report);
      } else {
        // Not marked done: failed items stay in localStorage and are retried
        // next boot (already-migrated blobs just overwrite themselves).
        console.warn('⚠ MediaLibrary migration partial — will retry failed items next boot:', report);
      }
      return { migrated: true, ...report };
    } catch (e) {
      console.error('MediaLibrary migration failed (legacy data left intact):', e);
      return { migrated: false, error: String(e) };
    }
  }
};

export default MediaLibrary;
