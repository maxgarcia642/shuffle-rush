# SHUFFLE RUSH v2 — Recode Notes (Fable Pass)
**Date:** 2026-07-22 · **Basis:** full Rosebud export (16 files read, 3 large scenes mapped + targeted-read) + roadmap research + 65-repo Grok flatten (cwilso/metronome pattern, gifuct-js, AudioStore, idb-keyval verified in source)

## What this pass delivers
The five pillars of the expansion request, in dependency order:
1. **Timing foundation (P0)** — audio-clock Conductor replaces the drifting Phaser-timer heartbeat
2. **Crash-proof media** — IndexedDB persistence (the "lost on refresh" fix) + validated pipelines for **images, GIFs, any audio, and now VIDEO** (looping, with sound)
3. **Themes + juice + smoothness** — 6 Frutiger Metro palettes, floaters, bursts, hit-stop, beat flash
4. **Powerups** — 6 pickups with a tested effect engine wired into scoring/windows/misses
5. **Search + calibration + settings** — fuzzy SearchIndex, latency calibration, full SettingsScene

## File-by-file
| File | Status | What changed |
|---|---|---|
| `Conductor.js` | **NEW** | Web Audio master clock; 25ms/120ms lookahead scheduler ("Tale of Two Clocks", per cwilso/metronome in the repo flatten); `nowMs()` with calibration offset; `setBPM()` WITHOUT phase reset; `syncToPhaserSound()` aligns the beat grid to the playing track mid-song via `sound.seek`; exported pure `ConductorMath` |
| `RhythmSystem.js` | **REWRITTEN (shim)** | Now `extends Conductor` — every scene's `new RhythmSystem(scene, bpm)` keeps working, zero import changes |
| `BeatDetector.js` | **REWRITTEN** | v1 hardcoded 44100 in tempo math (48kHz files detected ~8% wrong — proven in tests) and never computed offset. v2: sample-rate-safe, `detectBeatGrid()` returns `{bpm, offset, confidence}`, legacy `detectBPM()` kept, pure fns exported |
| `MediaLibrary.js` | **NEW** | IndexedDB (`kv` + `blobs` stores); one-time migration from the legacy localStorage keys (real `Storage.get` API + real key names, verified against main.js); base64↔Blob bridge preserving the registry contract; `estimateUsage()` |
| `MediaPipeline.js` | **NEW** | `validateFile` with HONEST caps (image 10MB / gif 15MB / audio 40MB / video 80MB — replaces the contradictory 1GB-vs-5MB doc claims); safe `prepareImage` (createImageBitmap + downscale), `prepareAudio` (Safari-safe decode + beat grid), `prepareVideo` (metadata probe with timeout) |
| `VideoActor.js` | **NEW** | Looping video → live Phaser CanvasTexture at capped fps/size; muted-autoplay compliant, sound unlocks on first tap — powers video backgrounds AND the "play against a video" guest |
| `ThemeManager.js` | **NEW** | 6 palettes (neonRush = shipped default, vaporDusk, metroGlass, sunsetDrive, acidPop, monoIce); persists via registry; `applyToGameScene` feeds `neonColors`, `laneConfig` colors, and the existing `Player/Enemy.setThemeColor()` |
| `Juice.js` | **NEW** | shake, tween-safe hit-stop, themed bursts, ambient glyph floaters, per-beat border flash — all gated by `juiceOn`/`particleDensity` settings |
| `Powerups.js` | **NEW** | TIME DILATOR, GROOVE SHIELD, DOUBLE DOWN, COMBO KEEPER, SECOND WIND, SLOW GROOVE; drop-roll on enemy defeat; tappable orb spawner |
| `SearchIndex.js` | **NEW** | Dependency-free fuzzy search (exact>prefix>substring>subsequence, weighted keys) for track/dancer galleries |
| `Calibration.js` | **NEW** | 8 audio-clock-scheduled clicks; median tap delta → `latencyOffsetMs`, which Conductor subtracts in `nowMs()` |
| `SettingsScene.js` | **NEW** | Theme picker, JUICE toggle, particle density, music/SFX volume, latency calibration, VIDEO upload + VIDEO BG / VIDEO SOUND / VIDEO GUEST toggles, back |
| `main.js` | **REWRITTEN** | Async top-level-await boot: open IDB → migrate → hydrate registry (contract unchanged) → Phaser; write-through persistence registry→IDB with blob diffing; settings bundle; SettingsScene registered; legacy localStorage demoted to small-metadata cache |
| `GameScene.js` | **16 surgical edits** (anchor-asserted) | judgment + marker targetTime moved to `rhythmSystem.nowMs()` (audio clock); windows/travel/score routed through powerups; shield/combo-keeper interception in `handleMiss`; powerup drops on enemy defeat; juice on beat + on hit; `detectBeatGrid` + `syncToPhaserSound(offset)` in `playSpecificTrack`; music volume from settings; `_setupVideoLayers()` (video bg + video guest); theme init + shutdown cleanup |
| `MenuScene.js` | **1 edit** | SETTINGS hex button beside DANCER LAB |
| `ImageUploadScene.js`, `Player.js`, `Enemy.js`, `CreditsScene.js`, `AdManager.js`, `UIManager.js`, `StageManager.js`, `index.html` | untouched | copied verbatim; UIManager/StageManager/AdManager confirmed orphaned (imported by nothing) |

## Verification (what was actually proven)
- **38/38 unit tests pass** (`tests/run.mjs`): ConductorMath grid/judgment boundaries; BeatDetector recovers 128 BPM AND the 0.25s offset from a synthetic 48kHz click track (and demonstrates the v1 hardcoded-rate math answering 118); validateFile caps; powerup timers on a fake clock; SearchIndex queries.
- **All 23 files parse clean** as ES modules (`node --check`).
- **Every GameScene/MenuScene edit was anchor-asserted** against the real file text — 17/17 anchors found exactly once (or exactly twice where expected).

## HONEST LIMITS — read before shipping
- **No browser runtime test was possible here** (no browser in this environment). Syntax + logic are verified; Phaser runtime behavior, autoplay, and IDB need your local/Rosebud boot. First checks: console shows "SHUFFLE RUSH v2 boot complete"; a refresh KEEPS uploaded tracks/dancers; Settings opens; a custom MP3 shows a BPM and beats feel on-grid.
- **Marker visuals vs judgment:** marker fall is still a Phaser tween while judgment is audio-clock. Under heavy frame drops the circle can lag the true window slightly — judgment is now HONEST, visuals may trail. Cursor block: drive marker y from conductor time in `update()`.
- **Cached-BPM replays** don't re-apply offset (only fresh detection does). Cursor block: cache `{bpm, offset}` instead of bpm.
- **Video:** sound requires one user tap (browser policy); iOS file input quirks handled the same way the Dancer Lab does (no accept attr on iOS); very large videos depend on device memory.
- **Private browsing** can block IndexedDB — MediaLibrary degrades to session-only and says so.

## CURSOR BLOCKS (deferred by design — for the next superprompt)
1. Dancer Lab video gallery UI (list/preview/delete customVideos; today Settings holds upload + latest-video selection)
2. Deep re-theming of every effect generator (halftone, energy waves, equalizer, shooting stars still use v1 hardcoded colors — ThemeManager currently feeds neon/lanes/actors)
3. SearchIndex wiring into the Dancer Lab + playlist galleries (module ready, UI not built)
4. InstantDB leaderboard + async ghost battles (per roadmap; keep local high score as fallback)
5. Per-SFX volume routing through `sfxVol` (music volume is wired; SFX calls still hardcode volumes)
6. Marker-position-from-conductor rendering (see limits)
7. Chart format (FNF-style JSON) + tap-to-record editor groundwork
