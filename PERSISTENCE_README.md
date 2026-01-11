# Shuffle Rush - Persistent Storage System

## Overview
Shuffle Rush now features a **complete persistent storage system** that preserves all user data across browser refreshes, app closures, and device restarts. This works on all operating systems and browsers that support localStorage.

## What Persists Forever

### 1. **Game Stats & Scores** ✅
- **High Score**: Your personal best score
- **Total Enemies Defeated**: Lifetime enemy kill count
- **Storage Key**: `shuffleRushHighScore`, `shuffleRushTotalEnemies`

### 2. **Leaderboard / Hall of Fame** ✅
- **Top 10 Records**: Names, scores, enemies defeated, and dates
- **Storage Key**: `shuffleRushLeaderboard`
- **Features**:
  - Scrollable list (supports unlimited entries technically, displays top 10)
  - Two-step "CLEAR" confirmation to prevent accidental deletion
  - Persists across all sessions until manually cleared

### 3. **Custom Dancer Images** ✅
- **User-uploaded images** from Dancer Lab
- **Storage Keys**: 
  - `shuffleRushCustomDancers` (array of dancer keys)
  - `shuffleRushCustomImageData` (base64 image data)
- **Features**:
  - Images are encoded as base64 and stored in localStorage
  - Automatically restored when entering Dancer Lab or starting gameplay
  - Individual deletion via the gallery interface
  - Bulk clear via "Clear All" button

### 4. **Custom Audio Tracks** ✅
- **User-uploaded music** from Dancer Lab
- **Storage Keys**:
  - `shuffleRushCustomTracks` (array of track metadata)
  - `shuffleRushCustomAudioData` (base64 audio data)
- **Features**:
  - Audio files encoded as base64 and persisted
  - Appear in gameplay playlist automatically
  - Restored on game boot and scene transitions
  - Individual/bulk deletion supported

## Technical Implementation

### Auto-Save Architecture
The game uses **Phaser's Registry Event System** with **localStorage** for automatic persistence:

```javascript
// When data changes in the registry, it's automatically saved to localStorage
game.registry.events.on('changedata-customDancers', (parent, value) => {
  localStorage.setItem('shuffleRushCustomDancers', JSON.stringify(value));
});
```

### Boot-Time Restoration
All persistent data is loaded **before any scene boots** via the `preBoot` callback:

```javascript
callbacks: {
  preBoot: (game) => {
    // Load all data from localStorage into registry
    // Available to ALL scenes immediately
  }
}
```

### Scene-Level Restoration
When entering `ImageUploadScene`, custom assets are re-loaded into Phaser's cache:
- Images: `this.textures.addBase64(key, base64Data)`
- Audio: `this.sound.decodeAudio(key, base64Data)`

## Storage Limitations

### Browser LocalStorage Limits
- **Typical Limit**: 5-10 MB per domain (browser dependent)
- **Chrome/Edge**: ~10 MB
- **Firefox**: ~10 MB
- **Safari**: ~5-10 MB (stricter in Private Mode)

### Practical Guidelines
- **Images**: PNG/JPG compressed to ~100-200 KB each = ~25-50 images
- **Audio**: MP3 compressed to ~3-5 MB each = ~2-3 full tracks safely
- **Leaderboard**: Virtually unlimited (a few KB for hundreds of entries)

### What Happens if Storage is Full?
- The browser throws a `QuotaExceededError`
- **User sees a friendly alert**: "⚠️ Storage Full! Your audio/image files are too large to save permanently."
- **Files still work for current session** (loaded into Phaser cache)
- **On refresh**: Custom files uploaded after quota was exceeded will be lost
- **Existing saved data remains intact**
- **Solution**: Delete old custom assets via "Clear All" or individual X buttons to free space

### Graceful Degradation
If storage quota is exceeded:
1. ✅ Game continues working normally
2. ✅ New uploads work for the current session
3. ✅ User is warned with clear instructions
4. ✅ Previously saved content is NOT affected
5. ⚠️ New uploads won't persist after refresh (unless space is freed)

## How to Clear Data

### In-Game Methods:
1. **Leaderboard**: Click "CLEAR" → "SURE?" in Hall of Fame
2. **Dancer Lab**: Click "Clear All" button
3. **Individual Assets**: Click the "X" on any custom dancer or track

### Manual Browser Clear:
Open browser console (F12) and run:
```javascript
// Clear everything
localStorage.clear();

// Clear specific data
localStorage.removeItem('shuffleRushLeaderboard');
localStorage.removeItem('shuffleRushCustomDancers');
localStorage.removeItem('shuffleRushCustomImageData');
localStorage.removeItem('shuffleRushCustomTracks');
localStorage.removeItem('shuffleRushCustomAudioData');
```

## Cross-Platform Compatibility

### ✅ Guaranteed to Work:
- **Windows**: Chrome, Edge, Firefox, Opera
- **macOS**: Safari, Chrome, Firefox, Edge
- **Linux**: Chrome, Firefox, Chromium
- **iOS**: Safari, Chrome (uses Safari engine)
- **Android**: Chrome, Firefox, Samsung Internet
- **Electron Apps**: Full localStorage support
- **PWA/Installed Web Apps**: Full support with persistent storage

### ⚠️ Limitations:
- **Incognito/Private Mode**: Data clears when session ends
- **Browser Clear History**: User can manually wipe localStorage
- **Cross-Device**: Data is per-device, not synced across devices
- **Different Browsers**: Each browser has separate storage

## Developer Notes

### Console Logging
The game logs all persistence operations to the console:
```
=== SHUFFLE RUSH: Loading Persistent Data ===
✓ Loaded 3 custom dancers from localStorage
✓ Loaded 1 custom tracks from localStorage
✓ Auto-saved custom dancers to localStorage
```

### Testing Persistence
1. Upload custom assets in Dancer Lab
2. Refresh the page (F5 or Cmd+R)
3. Assets should reappear automatically
4. Check console for restoration logs

### Debugging
If data isn't persisting:
1. Check console for errors
2. Verify localStorage isn't disabled (some enterprise browsers block it)
3. Check browser storage quota (DevTools → Application → Storage)
4. Ensure not in Incognito/Private mode

## Future Enhancements (Optional)

Potential upgrades if needed:
- **IndexedDB**: For larger files (50MB+ per domain)
- **Cloud Sync**: Firebase/Supabase for cross-device persistence
- **Compression**: LZ-String library to compress base64 data
- **Service Workers**: Offline-first PWA support
- **Export/Import**: Download data as JSON backup file

---

**Shuffle Rush is now a fully persistent game experience.** 
Your progress, records, and custom content will survive forever (or until you manually clear it). 🎮💾✨
