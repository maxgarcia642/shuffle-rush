import Phaser from 'phaser';
import MenuScene from './MenuScene.js';
import GameScene from './GameScene.js';
import CreditsScene from './CreditsScene.js';
import ImageUploadScene from './ImageUploadScene.js';
import SettingsScene from './SettingsScene.js';
import LZString from 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm';
import MediaLibrary, { base64ToBlob } from './MediaLibrary.js';
import ThemeManager from './ThemeManager.js';

/**
 * SHUFFLE RUSH v2 boot.
 * WHAT CHANGED (and what deliberately didn't):
 * - The Phaser REGISTRY CONTRACT is untouched — every scene still reads/writes
 *   customDancers / customTracks / customImageData / customAudioData /
 *   customAnimations / builtInAssetsEnabled / builtInMusicEnabled exactly as
 *   before. Zero scene-side persistence changes required.
 * - PERSISTENCE moved from localStorage (5–10MB quota → the "lost on refresh"
 *   bug) to IndexedDB via MediaLibrary. Legacy localStorage data migrates
 *   once, automatically. localStorage keeps only small metadata as a cache.
 * - New registry keys: customVideos, videoBgEnabled, videoBgSound,
 *   videoOpponentEnabled, themeId, juiceOn, particleDensity, latencyOffsetMs,
 *   musicVol, sfxVol — persisted through the same bridge.
 * - Boot is async (top-level await, valid in this ESM/import-map build): IDB
 *   opens and hydrates BEFORE Phaser boots, so preBoot stays synchronous.
 */

// Legacy storage helper — retained as the MIGRATION SOURCE and small-metadata
// cache. Big payloads no longer go through here (that was the quota bug).
window.ShuffleRushStorage = {
    _failedKeys: new Set(),
    set(key, value) {
        if (this._failedKeys.has(key)) return false;
        try {
            const stringValue = JSON.stringify(value);
            if (stringValue.length > 100000) {
                const compressed = LZString.compressToUTF16(stringValue);
                localStorage.setItem(key + '_lz', compressed);
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, stringValue);
                localStorage.removeItem(key + '_lz');
            }
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`⚠️ Storage quota exceeded for ${key} - continuing without localStorage cache`);
                this._failedKeys.add(key);
                return false;
            }
            console.error(`Failed to save ${key}:`, e.message || e);
            this._failedKeys.add(key);
            return false;
        }
    },
    get(key) {
        try {
            const compressed = localStorage.getItem(key + '_lz');
            if (compressed) return JSON.parse(LZString.decompressFromUTF16(compressed));
            const uncompressed = localStorage.getItem(key);
            return uncompressed ? JSON.parse(uncompressed) : null;
        } catch (e) {
            console.error(`Storage Retrieval Error [${key}]:`, e);
            return null;
        }
    }
};
const Storage = window.ShuffleRushStorage;

// ── Async hydrate BEFORE Phaser boots ────────────────────────────────────────
console.log('=== SHUFFLE RUSH v2: Opening MediaLibrary (IndexedDB) ===');
await MediaLibrary.open();
await MediaLibrary.migrateFromLocalStorage(Storage);

async function hydrate() {
    const boot = {};
    // Small metadata: IDB kv first, legacy localStorage fallback.
    boot.customTracks = (await MediaLibrary.getKV('shuffleRushCustomTracks'))
        || Storage.get('shuffleRushCustomTracks') || [];
    boot.customDancers = (await MediaLibrary.getKV('shuffleRushCustomDancers'))
        || Storage.get('shuffleRushCustomDancers') || [];
    boot.customAnimations = (await MediaLibrary.getKV('customAnimations'))
        || Storage.get('shuffleRushCustomAnimations') || {};
    boot.customVideos = (await MediaLibrary.getKV('customVideos')) || [];
    // Big payloads: rebuild the base64 maps scenes expect, from stored blobs.
    const blobKeys = await MediaLibrary.listBlobKeys();
    const audioKeys = blobKeys.filter(k => String(k).startsWith('audio:')).map(k => String(k).slice(6));
    const imageKeys = blobKeys.filter(k => String(k).startsWith('image:')).map(k => String(k).slice(6));
    boot.customAudioData = await MediaLibrary.readBase64Map('audio:', audioKeys);
    boot.customImageData = await MediaLibrary.readBase64Map('image:', imageKeys);
    // Legacy fallback if IDB was empty but localStorage still has data.
    if (!Object.keys(boot.customAudioData).length) {
        boot.customAudioData = Storage.get('shuffleRushCustomAudioData') || {};
    }
    if (!Object.keys(boot.customImageData).length) {
        boot.customImageData = Storage.get('shuffleRushCustomImageData') || {};
    }
    // Flags + settings.
    const b1 = await MediaLibrary.getKV('builtInAssetsEnabled');
    boot.builtInAssetsEnabled = b1 !== null ? b1 : (Storage.get('shuffleRushBuiltInAssetsEnabled') ?? true);
    const b2 = await MediaLibrary.getKV('builtInMusicEnabled');
    boot.builtInMusicEnabled = b2 !== null ? b2 : (Storage.get('shuffleRushBuiltInMusicEnabled') ?? true);
    boot.settings = (await MediaLibrary.getKV('settings')) || {};
    return boot;
}
const BOOT = await hydrate();
console.log(`✓ Hydrated: ${BOOT.customTracks.length} tracks, ${BOOT.customDancers.length} dancers, ` +
    `${Object.keys(BOOT.customAudioData).length} audio blobs, ${Object.keys(BOOT.customImageData).length} image blobs, ` +
    `${BOOT.customVideos.length} videos`);

const SETTINGS_DEFAULTS = {
    themeId: 'neonRush', juiceOn: true, particleDensity: 1, latencyOffsetMs: 0,
    musicVol: 0.4, sfxVol: 0.5, videoBgEnabled: false, videoBgSound: false, videoOpponentEnabled: false,
    selectedVideoKey: null // Block 3: Dancer Lab video gallery selection
};

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'phaser-game-container',
    width: 1024,
    height: 768
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [MenuScene, GameScene, CreditsScene, ImageUploadScene, SettingsScene],
  callbacks: {
    preBoot: (game) => {
      console.log('=== SHUFFLE RUSH v2: Seeding registry ===');
      game.registry.set('customDancers', BOOT.customDancers);
      game.registry.set('customTracks', BOOT.customTracks);
      game.registry.set('customImageData', BOOT.customImageData);
      game.registry.set('customAudioData', BOOT.customAudioData);
      game.registry.set('customAnimations', BOOT.customAnimations);
      game.registry.set('customVideos', BOOT.customVideos);
      game.registry.set('builtInAssetsEnabled', BOOT.builtInAssetsEnabled);
      game.registry.set('builtInMusicEnabled', BOOT.builtInMusicEnabled);
      for (const [k, def] of Object.entries(SETTINGS_DEFAULTS)) {
        game.registry.set(k, BOOT.settings[k] !== undefined ? BOOT.settings[k] : def);
      }
      ThemeManager.init(game.registry);
      console.log('=== Registry ready (theme:', ThemeManager.currentId + ') ===');
    }
  }
};

const game = new Phaser.Game(config);

// ── Write-through persistence: registry → IndexedDB (+ small localStorage cache)
const persistedBlobs = new Set((await MediaLibrary.listBlobKeys()).map(String));

async function syncBlobMap(prefix, map, mimeFallback) {
    const wanted = new Set(Object.keys(map || {}).map(k => prefix + k));
    for (const k of Object.keys(map || {})) {
        const full = prefix + k;
        if (!persistedBlobs.has(full)) {
            try {
                const ok = await MediaLibrary.putBlob(full, base64ToBlob(map[k], mimeFallback));
                if (ok) { persistedBlobs.add(full); console.log('✓ IDB stored', full); }
            } catch (e) { console.error('IDB store failed', full, e); }
        }
    }
    for (const full of [...persistedBlobs]) {
        if (full.startsWith(prefix) && !wanted.has(full)) {
            await MediaLibrary.deleteBlob(full);
            persistedBlobs.delete(full);
            console.log('✓ IDB removed', full);
        }
    }
}

game.registry.events.on('changedata-customDancers', (p, value) => {
    MediaLibrary.setKV('shuffleRushCustomDancers', value);
    Storage.set('shuffleRushCustomDancers', value);
});
game.registry.events.on('changedata-customTracks', (p, value) => {
    MediaLibrary.setKV('shuffleRushCustomTracks', value);
    Storage.set('shuffleRushCustomTracks', value);
});
game.registry.events.on('changedata-customImageData', (p, value) => {
    syncBlobMap('image:', value, 'image/png');
});
game.registry.events.on('changedata-customAudioData', (p, value) => {
    syncBlobMap('audio:', value, 'audio/mpeg');
});
game.registry.events.on('changedata-customAnimations', (p, value) => {
    MediaLibrary.setKV('customAnimations', value);
});
game.registry.events.on('changedata-customVideos', (p, value) => {
    MediaLibrary.setKV('customVideos', value);
});
game.registry.events.on('changedata-builtInAssetsEnabled', (p, value) => {
    MediaLibrary.setKV('builtInAssetsEnabled', value);
    Storage.set('shuffleRushBuiltInAssetsEnabled', value);
});
game.registry.events.on('changedata-builtInMusicEnabled', (p, value) => {
    MediaLibrary.setKV('builtInMusicEnabled', value);
    Storage.set('shuffleRushBuiltInMusicEnabled', value);
});
// Settings bundle — one kv record, updated on any settings key change.
for (const key of Object.keys(SETTINGS_DEFAULTS)) {
    game.registry.events.on('changedata-' + key, async () => {
        const bundle = {};
        for (const k of Object.keys(SETTINGS_DEFAULTS)) bundle[k] = game.registry.get(k);
        await MediaLibrary.setKV('settings', bundle);
    });
}
console.log('=== SHUFFLE RUSH v2 boot complete ===');
