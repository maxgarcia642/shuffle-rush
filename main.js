import Phaser from 'phaser';
import MenuScene from './MenuScene.js';
import GameScene from './GameScene.js';
import CreditsScene from './CreditsScene.js';
import ImageUploadScene from './ImageUploadScene.js';
import LZString from 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm';

// Storage Helper to handle compression for large data
window.ShuffleRushStorage = {
    _failedKeys: new Set(), // Track keys that are too large to avoid repeated attempts
    set(key, value) {
        // Skip if this key previously failed due to size
        if (this._failedKeys.has(key)) {
            return false;
        }
        try {
            const stringValue = JSON.stringify(value);
            
            // Only compress if the string is large (> 100KB) to save CPU
            if (stringValue.length > 100000) {
                const compressed = LZString.compressToUTF16(stringValue);
                localStorage.setItem(key + '_lz', compressed);
                localStorage.removeItem(key); // Cleanup old uncompressed data
            } else {
                localStorage.setItem(key, stringValue);
                localStorage.removeItem(key + '_lz'); // Cleanup old compressed data
            }
            return true;
        } catch (e) {
            // Handle quota errors gracefully without throwing
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`⚠️ Storage quota exceeded for ${key} - continuing without persistence`);
                this._failedKeys.add(key); // Don't try again
                return false;
            }
            // Handle RangeError from too many properties
            if (e.name === 'RangeError' && e.message && e.message.includes('Too many properties')) {
                console.warn(`⚠️ Data structure too large for ${key} - continuing without persistence`);
                this._failedKeys.add(key); // Don't try again
                return false;
            }
            // For other errors, log and return false instead of throwing
            console.error(`Failed to save ${key}:`, e.message || e);
            this._failedKeys.add(key); // Don't try again
            return false;
        }
    },
    get(key) {
        try {
            // Check for compressed version first
            const compressed = localStorage.getItem(key + '_lz');
            if (compressed) {
                const decompressed = LZString.decompressFromUTF16(compressed);
                return JSON.parse(decompressed);
            }
            // Fallback to uncompressed
            const uncompressed = localStorage.getItem(key);
            return uncompressed ? JSON.parse(uncompressed) : null;
        } catch (e) {
            console.error(`Storage Retrieval Error [${key}]:`, e);
            return null;
        }
    }
};

const Storage = window.ShuffleRushStorage;

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
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, GameScene, CreditsScene, ImageUploadScene],
  callbacks: {
    preBoot: (game) => {
      // Load persistent data from localStorage into registry before any scene boots
      console.log('=== SHUFFLE RUSH: Loading Persistent Data ===');
      
      // Load custom dancers
      const dancers = Storage.get('shuffleRushCustomDancers');
      if (dancers) {
        game.registry.set('customDancers', dancers);
        console.log('✓ Loaded', dancers.length, 'custom dancers');
      } else {
        game.registry.set('customDancers', []);
        console.log('✓ Initialized empty custom dancers array');
      }
      
      // Load custom tracks
      const tracks = Storage.get('shuffleRushCustomTracks');
      if (tracks) {
        game.registry.set('customTracks', tracks);
        console.log('✓ Loaded', tracks.length, 'custom tracks');
      } else {
        game.registry.set('customTracks', []);
        console.log('✓ Initialized empty custom tracks array');
      }
      
      // Load custom image data (base64)
      const imageData = Storage.get('shuffleRushCustomImageData');
      if (imageData) {
        game.registry.set('customImageData', imageData);
        console.log('✓ Loaded', Object.keys(imageData).length, 'custom image data entries');
      } else {
        game.registry.set('customImageData', {});
        console.log('✓ Initialized empty custom image data');
      }
      
      // Load custom audio data (base64)
      const audioData = Storage.get('shuffleRushCustomAudioData');
      if (audioData) {
        game.registry.set('customAudioData', audioData);
        console.log('✓ Loaded', Object.keys(audioData).length, 'custom audio data entries');
      } else {
        game.registry.set('customAudioData', {});
        console.log('✓ Initialized empty custom audio data');
      }
      
      // Load custom animations metadata (for GIFs)
      const animations = Storage.get('shuffleRushCustomAnimations');
      if (animations) {
        game.registry.set('customAnimations', animations);
        console.log('✓ Loaded', Object.keys(animations).length, 'custom animation entries');
      } else {
        game.registry.set('customAnimations', {});
        console.log('✓ Initialized empty custom animations');
      }
      
      // Load built-in image assets enabled state (defaults to true)
      const builtInEnabled = Storage.get('shuffleRushBuiltInAssetsEnabled');
      if (builtInEnabled !== null) {
        game.registry.set('builtInAssetsEnabled', builtInEnabled);
        console.log('✓ Loaded built-in image assets state:', builtInEnabled);
      } else {
        game.registry.set('builtInAssetsEnabled', true);
        console.log('✓ Initialized built-in image assets state: enabled');
      }
      
      // Load built-in music enabled state (defaults to true)
      const builtInMusicEnabled = Storage.get('shuffleRushBuiltInMusicEnabled');
      if (builtInMusicEnabled !== null) {
        game.registry.set('builtInMusicEnabled', builtInMusicEnabled);
        console.log('✓ Loaded built-in music assets state:', builtInMusicEnabled);
      } else {
        game.registry.set('builtInMusicEnabled', true);
        console.log('✓ Initialized built-in music assets state: enabled');
      }
      
      console.log('=== Persistent Data Loaded Successfully ===');
    }
  }
};

const game = new Phaser.Game(config);

// Set up registry listeners to auto-save when data changes
game.registry.events.on('changedata-customDancers', (parent, value) => {
  try {
    const success = Storage.set('shuffleRushCustomDancers', value);
    if (success) {
      console.log('✓ Auto-saved custom dancers');
    }
  } catch (e) {
    console.error('Failed to save custom dancers:', e);
  }
});

game.registry.events.on('changedata-customTracks', (parent, value) => {
  try {
    const success = Storage.set('shuffleRushCustomTracks', value);
    if (success) {
      console.log('✓ Auto-saved custom tracks');
    }
  } catch (e) {
    console.error('Failed to save custom tracks:', e);
  }
});

game.registry.events.on('changedata-customImageData', (parent, value) => {
  try {
    const success = Storage.set('shuffleRushCustomImageData', value);
    if (success) {
      console.log('✓ Auto-saved custom image data');
    }
  } catch (e) {
    console.error('Failed to save custom image data:', e);
  }
});

game.registry.events.on('changedata-customAudioData', (parent, value) => {
  try {
    const success = Storage.set('shuffleRushCustomAudioData', value);
    if (success) {
      console.log('✓ Auto-saved custom audio data');
    }
    // If not successful, Storage.set already logged the warning
  } catch (e) {
    console.error('Failed to save custom audio data:', e);
  }
});

game.registry.events.on('changedata-customAnimations', (parent, value) => {
  try {
    const success = Storage.set('shuffleRushCustomAnimations', value);
    if (success) {
      console.log('✓ Auto-saved custom animations');
    }
    // If not successful, Storage.set already logged the warning
  } catch (e) {
    console.error('Failed to save custom animations:', e);
  }
});

game.registry.events.on('changedata-builtInAssetsEnabled', (parent, value) => {
  try {
    Storage.set('shuffleRushBuiltInAssetsEnabled', value);
    console.log('✓ Auto-saved built-in image assets state');
  } catch (e) {
    console.error('Failed to save built-in image assets state:', e);
  }
});

game.registry.events.on('changedata-builtInMusicEnabled', (parent, value) => {
  try {
    Storage.set('shuffleRushBuiltInMusicEnabled', value);
    console.log('✓ Auto-saved built-in music assets state');
  } catch (e) {
    console.error('Failed to save built-in music assets state:', e);
  }
});

