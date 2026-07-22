import Phaser from 'phaser';
import RhythmSystem from './RhythmSystem.js';
import { ConductorMath } from './Conductor.js';
import Player from './Player.js';
import Enemy from './Enemy.js';
import BeatDetector from './BeatDetector.js';
import ThemeManager from './ThemeManager.js';
import Juice from './Juice.js';
import PowerupManager from './Powerups.js';
import MediaLibrary from './MediaLibrary.js';
import VideoActor from './VideoActor.js';
import { search } from './SearchIndex.js';
import LeaderboardService, { ReplayRecorder } from './LeaderboardService.js';
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  
  upscaleBuiltInDancers() {
    // List of all built-in dancer keys
    const builtInDancers = [
      'dancer-1', 'dancer-3', 'dancer-8', 'dancer-9', 'dancer-11', 'dancer-12',
      'dancer-13', 'dancer-14', 'dancer-16', 'dancer-17', 'dancer-18', 'dancer-19',
      'dancer-20', 'dancer-22', 'dancer-25', 'dancer-29', 'dancer-30', 'dancer-32',
      'dancer-33', 'dancer-34', 'dancer-35', 'dancer-36', 'dancer-37', 'dancer-38',
      'dancer-39', 'dancer-40'
    ];
    
    const minHeight = 1000;
    
    builtInDancers.forEach(key => {
      if (!this.textures.exists(key)) return;
      
      const texture = this.textures.get(key);
      const source = texture.getSourceImage();
      
      // Check if upscaling is needed
      if (source.height >= minHeight) return;
      
      const scaleFactor = minHeight / source.height;
      const targetWidth = Math.round(source.width * scaleFactor);
      const targetHeight = minHeight;
      
      console.log(`📏 Upscaling ${key}: ${source.height}px → ${targetHeight}px`);
      
      // Create canvas for upscaling
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      // High-quality upscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
      
      // Replace texture with upscaled version
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
    });
  }
  
  restoreGIFAnimations() {
    // Recreate GIF animations for this scene based on customAnimations metadata
    const customAnims = this.registry.get('customAnimations') || {};
    
    Object.keys(customAnims).forEach(key => {
      const animData = customAnims[key];
      const animKey = `${key}-anim`;
      
      // Only create if it doesn't already exist in this scene
      if (!this.anims.exists(animKey) && animData.frameKeys && animData.frameKeys.length > 0) {
        // CRITICAL: Recreate frame textures from base64 data if they don't exist
        if (animData.frameData && animData.frameData.length > 0) {
          animData.frameData.forEach(frameInfo => {
            if (!this.textures.exists(frameInfo.key)) {
              this.textures.addBase64(frameInfo.key, frameInfo.base64);
            }
          });
          console.log(`✓ GameScene: Recreated ${animData.frameData.length} frame textures for ${key}`);
        }
        
        // Now check if all frame textures exist
        const allFramesExist = animData.frameKeys.every(fk => this.textures.exists(fk));
        
        if (allFramesExist) {
          this.anims.create({
            key: animKey,
            frames: animData.frameKeys.map(fk => ({ key: fk })),
            frameRate: animData.frameRate || 10,
            repeat: -1
          });
          console.log(`✓ GameScene: Restored animation ${animKey} with ${animData.frameKeys.length} frames`);
        } else {
          console.warn(`⚠️ GameScene: Cannot restore animation ${animKey} - frame textures still missing`);
          console.log(`Missing frames for ${key}:`, animData.frameKeys.filter(fk => !this.textures.exists(fk)));
        }
      }
    });
  }
  
  init(data) {
    // Simplified - no stage progression yet
    // this.currentStage = data.stage || 1;
    // this.checkpoint = data.checkpoint || null;
    // this.totalDeaths = data.totalDeaths || 0;
  }

  preload() {
    this.load.image('gradient-bg', 'assets/gradientbackground.png');
    this.load.image('dancer-1', 'assets/ipod_1.png');
    this.load.image('dancer-3', 'assets/3416ffd35c26a1752542c0bc288ff84f.png');
    // dancer-5 removed
    // dancer-6 removed
    // dancer-7 removed
    this.load.image('dancer-8', 'assets/48e6419460e1089bfbbf469f66d5b857.png');
    this.load.image('dancer-9', 'assets/openart-image_5h9r7rhc_1766769844463_raw.png');
    this.load.image('dancer-11', 'assets/openart-image_cj7r3if8_1766772364490_raw.png');
    this.load.image('dancer-12', 'assets/openart-image_ec_nokeu_1766772858600_raw.png');
    this.load.image('dancer-13', 'assets/openart-image_bovz_q4e_1766769708364_raw.png');
    this.load.image('dancer-14', 'assets/openart-image_ej6hcmyk_1766773004301_raw.png');
    // dancer-15 removed
    this.load.image('dancer-16', 'assets/openart-image_l0o4fc_g_1766769308945_raw.png');
    this.load.image('dancer-17', 'assets/openart-image_fn9nwtak_1766769352930_raw.png');
    this.load.image('dancer-18', 'assets/openart-image_nhn1g02r_1766769862487_raw.png');
    this.load.image('dancer-19', 'assets/openart-image_najwctbh_1766769722191_raw.png');
    this.load.image('dancer-20', 'assets/openart-image_n16k-ofj_1766769295833_raw.png');
    // dancer-21 removed
    this.load.image('dancer-22', 'assets/openart-image_oa5ytai5_1766772352539_raw.png');
    // dancer-23 removed
    // dancer-24 removed
    this.load.image('dancer-25', 'assets/openart-image_vrprs7pd_1766769720970_raw.png');
    // dancer-26 removed
    // dancer-27 removed
    this.load.image('dancer-29', 'assets/openart-image_1_akyk0s_1766769096571_raw.png');
    this.load.image('dancer-30', 'assets/e868c390b62d4df3bb1bdd17395fe41e.png');
    this.load.image('dancer-32', 'assets/metro-girl.png');
    this.load.image('dancer-33', 'assets/openart-image_k-mxai4w_1766769199781_raw.png');
    this.load.image('dancer-34', 'assets/openart-image_s1am0xlb_1766769052493_raw.png');
    this.load.image('dancer-35', 'assets/openart-image_vrqgo9cg_1766768971563_raw.png');
    this.load.image('dancer-36', 'assets/openart-image_zazypc3u_1766768967253_raw.png');
    this.load.image('dancer-37', 'assets/1ef1da67fdd7c4342f74ffd5dcee1c4c-1.png');
    this.load.image('dancer-38', 'assets/openart-image_c28fk6gg_1766802182766_raw.png');
    this.load.image('dancer-39', 'assets/openart-image_l2s8r2yu_1766801528984_raw.png');
    this.load.image('dancer-40', 'assets/openart-image_qm4ezqai_1766803187306_raw.png');
    this.load.image('attack-burst', 'assets/hiteffectburst.png');
    this.load.image('beat-circle', 'assets/beatcircleui.png');
    
    // Load Gameplay Music - All URLs properly encoded
    this.load.audio('rave-planet', encodeURI('assets/rave-planet-by-matrika.mp3'));
    this.load.audio('guns-n-drive', encodeURI('assets/guns-and-drive-by-inplusmusic.mp3'));
    this.load.audio('supercell', encodeURI('assets/supercell-by-tatami.mp3'));
    this.load.audio('dont-stop-me', encodeURI("assets/dont-stop-me-by-tatami.mp3"));
    this.load.audio('find-home', encodeURI('assets/find-home-by-arenas.mp3'));
    this.load.audio('fast-light', encodeURI('assets/fast-and-light-technology-by-audio-tape.mp3'));
    // back-2-back is only for menu, not loaded in GameScene
    this.load.audio('menu-click', encodeURI('assets/menu-click-by-leszek_szary-of-freesound_community.mp3'));
    this.load.audio('successful-hit', encodeURI('assets/successful-hit-video-game-bonus-by-universfield.mp3'));
    this.load.audio('missed-hit', encodeURI('assets/missed-hit-babyscratch-by-nobodyyouknowof-freesound-of-freesound_community.mp3'));
    this.load.audio('healing', encodeURI('assets/healing-magic-6-by-yodguard.mp3'));
    this.load.audio('counterattack', encodeURI('assets/counterattack-game-over-arcade-by-myfox14-freesound-of-freesound_community.mp3'));
    this.load.audio('enemy-death', encodeURI('assets/enemy-death-sfx12-boss_damage1-by-data_pion.mp3'));
    this.load.audio('player-death', encodeURI('assets/player-death-game-explosion-by-soundreality.mp3'));
    this.load.audio('game-over', encodeURI('assets/game-over-by-ivan_luzan.mp3'));
    this.load.audio('severe-warning', encodeURI('assets/severe-warning-alarm-by-freesound_community.mp3'));
  }
  create() {
    const { width, height } = this.scale;
    
    // Detect mobile device for difficulty adjustment
    this.isMobile = !this.sys.game.device.os.desktop;
    
    // Upscale built-in dancer assets if needed
    this.upscaleBuiltInDancers();
    
    // Restore GIF animations for this scene
    this.restoreGIFAnimations();
    
    // Restore custom audio from localStorage
    this.restoreCustomAudio();
    
    // Track current BPM and enemy count for endless mode
    this.currentBPM = 120;
    this.enemiesDefeated = 0;
    this.isPaused = false;
    this.highScoreCelebrated = false; // Track if we've celebrated this session

    // Ensure all sounds stop when leaving scene (fixes persistent low health alarm bug)
    this.events.on('shutdown', () => {
        this.sound.stopAll();
    });
    
    // Y2K RAVE MAXIMALIST PALETTE — Block 4: theme-driven. The theme must be
    // live BEFORE any effect generator runs, since they all sample neonColors
    // (or theme fields) at creation time.
    ThemeManager.init(this.registry);
    const theme = ThemeManager.current;
    this.neonColors = theme.neon.slice();
    this.currentColorIndex = 0;
    
    // 1. VOID BACKGROUND (themed; neonRush = near-black, shipped feel)
    this.add.rectangle(width / 2, height / 2, width, height, theme.bgBottom).setDepth(-100);
    
    // 2. HALFTONE DOT GRID
    this.createHalftoneGrid();
    
    // 3. CONCENTRIC SPEAKER RINGS (The "Explosive" center)
    this.createSpeakerRings();
    
    // 4. GEOMETRIC CHAOS (Arrows, Triangles)
    this.createGeometricChaos();
    
    // Center glow (keeping for depth but tweaking) — themed (neonRush glow = the old magenta)
    this.centerGlow = this.add.circle(width / 2, height / 2, width * 0.4, theme.glow, 0.1);
    this.centerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.centerGlow.setDepth(-10);
    
    this.tweens.add({
      targets: this.centerGlow,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.1, to: 0.3 },
      duration: 500, // Fast beat pulse
      yoyo: true,
      repeat: -1
    });
    // Change neon accents rapidly
    this.time.addEvent({
      delay: 500, // FAST changes
      callback: () => this.cycleNeonColors(),
      loop: true
    });
    
    // Simple rhythm system - 120 BPM (Initialize BEFORE particle effects that use it)
    this.rhythmSystem = new RhythmSystem(this, 120);
    // ── v2 systems: juice, powerups, video layers (theme initialized above) ──
    this.juice = new Juice(this);
    this.juice.startFloaters();
    this.powerups = new PowerupManager(this, {
      onApply: (id, def) => this.showFeedback(def.label + '!', def.color)
    });
    ThemeManager.applyToGameScene(this);
    this._setupVideoLayers();
    this.events.once('shutdown', () => {
      this.juice?.destroy();
      this.videoBg?.destroy();
      this.videoGuest?.destroy();
      this._removePlaylistSearchInput();
    });
    
    // Add radial gradient overlay
    this.createRadialGradient();
    
    // Add rotating light beams
    this.createLightBeams();
    
    // Add pulsing vignette
    this.createVignette();
    
    // Add energetic equalizer background
    this.createEqualizer();
    // Add floating particle effects
    this.createParticleEffects();
    
    // Add screen border glow
    this.createScreenBorderGlow();
    
    // Add shooting stars
    this.createShootingStars();
    
    // Add energy waves
    this.createEnergyWaves();
    
    // Create Pause Button
    this.createPauseButton();
    
    // Create Music Toggle Button
    this.createMusicToggleButton();
    
    // Low Health Warning Effect
    this.createLowHealthEffect();
    
    // Player and Enemy with fixed health
    this.player = new Player(this, width * 0.25, height * 0.52);
    this.enemy = new Enemy(this, width * 0.75, height * 0.52, 100);
    // Simple UI
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.scoreText.setInteractive({ useHandCursor: true });
    this.scoreText.on('pointerover', () => {
        this.tweens.add({ targets: this.scoreText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.scoreText.on('pointerout', () => {
        this.tweens.add({ targets: this.scoreText, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    this.instructionsText = this.add.text(width / 2, height - 40, 'Press the SHOWN KEY or TAP THE HOLE when the circles reach the bottom!', {
      fontSize: '22px', // Slightly smaller to fit the longer text
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.instructionsText.setOrigin(0.5);
    this.instructionsText.setInteractive({ useHandCursor: true });
    this.instructionsText.on('pointerover', () => {
        this.tweens.add({ targets: this.instructionsText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.instructionsText.on('pointerout', () => {
        this.tweens.add({ targets: this.instructionsText, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // Enemy count display
    this.enemyCountText = this.add.text(width / 2, 60, 'ENEMIES DEFEATED: 0', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.enemyCountText.setOrigin(0.5);
    this.enemyCountText.setInteractive({ useHandCursor: true });
    this.enemyCountText.on('pointerover', () => {
        this.tweens.add({ targets: this.enemyCountText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.enemyCountText.on('pointerout', () => {
        this.tweens.add({ targets: this.enemyCountText, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // Keyboard shortcuts hint
    const shortcutsHint = this.add.text(20, height - 40, '[;] Playlist, [`] RIP', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
      alpha: 0.7
    });
    shortcutsHint.setInteractive({ useHandCursor: true });
    shortcutsHint.on('pointerover', () => {
        this.tweens.add({ targets: shortcutsHint, alpha: 1, scale: 1.05, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    shortcutsHint.on('pointerout', () => {
        this.tweens.add({ targets: shortcutsHint, alpha: 0.7, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // Keyboard shortcut for playlist (; key)
    this.input.keyboard.on('keydown-SEMICOLON', () => {
      if (this.isDying) return; // Prevent input if dying
      
      // If we are showing playlist, just hide it
      if (this.playlistDisplayVisible) {
          this.hidePlaylistDisplay();
      } else {
          // If not paused, pause first to show pause menu
          if (!this.isPaused) {
              this.togglePause();
          }
          this.showPlaylistDisplay();
      }
    });
    
    // Input
    this.input.keyboard.on('keydown', (event) => {
        if (this.isDying) return;
        this.onHitInput(event);
    });
    this.input.on('pointerdown', (pointer) => {
      if (this.isDying) return;
      // Check if clicking pause button
      if (this.pauseButton && this.pauseButton.getBounds().contains(pointer.x, pointer.y)) {
        return; // Let pause button handle it
      }
      
      // Only register taps in the target zone area (bottom of screen)
      const { width, height } = this.scale;
      const targetZoneY = height * 0.85;
      const targetZoneRadius = 80; // Wider hit area for touch
      const targetZoneMinY = targetZoneY - targetZoneRadius;
      const targetZoneMaxY = targetZoneY + targetZoneRadius;
      
      // Check if tap is within vertical range of target zones
      if (pointer.y < targetZoneMinY || pointer.y > targetZoneMaxY) {
        return; // Tap outside target zone area - ignore
      }
      
      // Determine which lane was tapped based on horizontal position
      let tappedLaneIdx = -1;
      let minDistance = Infinity;
      
      this.laneConfig.forEach((lane, idx) => {
        const distance = Math.abs(pointer.x - lane.x);
        if (distance < targetZoneRadius && distance < minDistance) {
          minDistance = distance;
          tappedLaneIdx = idx;
        }
      });
      
      // If no lane was close enough, ignore the tap
      if (tappedLaneIdx === -1) {
        return;
      }
      
      // Pass the tapped lane to onHitInput for lane-specific matching
      this.onHitInput(null, tappedLaneIdx);
    });
    
    // Keyboard shortcuts for music, pause and DEV KILL - more robust key detection
    this.input.keyboard.on('keydown', (event) => {
        if (event.key === '-' || event.code === 'Minus') {
            this.toggleMusicMode();
        } else if (event.key === '=' || event.code === 'Equal') {
            this.togglePause();
        } else if (event.key === '`' || event.key === '~' || event.key === "'" || event.code === 'Backquote' || event.code === 'Quote') {
            // INSTANT KILL (DEV)
            if (!this.isDying && !this.isPaused) {
                console.log('DEV KILL TRIGGERED');
                this.isDying = true;
                
                // Immediately empty health UI and internal value
                if (this.player) {
                    this.player.health = 0;
                    // Directly update the visual health bar width to 0
                    if (this.player.healthBar) {
                        this.player.healthBar.width = 0;
                    }
                    // Trigger the setLowHealthState via checkLowHealth or direct call
                    if (this.setLowHealthState) {
                        this.setLowHealthState(true);
                    }
                }
                
                this.playPlayerDeath();
            }
        }
    });
    // Game state - simplified
    this.score = 0;
    this.combo = 0;
    this.totalHits = 0; // Track cumulative successful hits
    this.totalMisses = 0; // Track cumulative misses
    this.feverMode = false;
    this.beatMarkers = [];
    this.beatCount = 0;
    this.lastSelectedKey = null; // Track last key for repetition
    this.streakCount = 0; // Track current streak length
    this.nextSpawnBeat = 0; // Initialize spawn tracking
    this.isDying = false; // Reset death state
    
    // Fever Text Effect
    this.feverText = this.add.text(width / 2, height * 0.35, 'FEVER MODE!', {
      fontSize: '80px',
      fontFamily: 'Impact, Arial',
      color: '#ff00ff',
      stroke: '#ffffff',
      strokeThickness: 8,
      shadow: { blur: 20, color: '#ff00ff', fill: true }
    });
    this.feverText.setOrigin(0.5);
    this.feverText.setVisible(false);
    this.feverText.setAlpha(0);
    // Combo Text
    this.comboText = this.add.text(width - 20, 20, '', {
      fontSize: '48px',
      fontFamily: 'Impact, Arial',
      color: '#ffff00',
      stroke: '#ff0000',
      strokeThickness: 6
    });
    this.comboText.setOrigin(1, 0);
    this.comboText.setVisible(false);
    // Target zone indicators (3 Lanes)
    this.laneConfig = [
        { 
            x: width * 0.35, 
            color: 0x00ffff, 
            keys: ['1', '2', '3', 'Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'LEFT'] 
        }, // Left - Cyan
        { 
            x: width * 0.5,  
            color: 0xff00ff, 
            keys: ['4', '5', '6', '7', 'R', 'T', 'Y', 'U', 'F', 'G', 'H', 'C', 'V', 'B', 'SPACE', 'UP', 'DOWN'] 
        }, // Center - Magenta
        { 
            x: width * 0.65, 
            color: 0xffff00, 
            keys: ['8', '9', '0', 'I', 'O', 'P', 'J', 'K', 'L', 'N', 'M', 'RIGHT'] 
        }  // Right - Yellow
    ];
    
    this.targetZones = [];
    
    this.laneConfig.forEach(lane => {
        const zone = this.add.circle(lane.x, height * 0.85, 50);
        zone.setStrokeStyle(4, lane.color);
        zone.setFillStyle(lane.color, 0.1);
        
        this.tweens.add({
          targets: zone,
          alpha: { from: 0.5, to: 1 },
          scale: { from: 0.95, to: 1.05 },
          duration: 300,
          yoyo: true,
          repeat: -1
        });
        
        this.targetZones.push(zone);
    });
    // Keep reference to center for backward compatibility if needed, 
    // though we should use specific lane coords for effects
    this.targetZone = this.targetZones[1]; 
    this.detectedBPMs = new Map(); // Cache for track BPMs
    this.rhythmSystem.start();
    this.rhythmSystem.on('beat', () => this.onBeat());
    
    // Block 7: leaderboard (local always; InstantDB only if configured) and
    // the per-run input-replay recorder that powers future ghost battles.
    LeaderboardService.configure(); // async, guarded — no-ops without config
    this.replayRecorder = new ReplayRecorder(() => this.rhythmSystem.nowMs());
    this.replayRecorder.start();
    
    // Music Playlist System - Setup and start music AFTER rhythm system is initialized
    this.setupMusicPlaylist();
    
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  updateSystemBPM(newBPM) {
    console.log(`🥁 System BPM updated to: ${newBPM}`);
    this.currentBPM = newBPM;
    this.rhythmSystem.setBPM(newBPM);
    
    // Visual feedback for BPM change
    this.showFeedback(`${newBPM} BPM DETECTED`, 0x00ffff);
  }

  onBeat() {
    const { width, height } = this.scale;
    
    // 1. Camera Beat Punch (Zoom effect)
    const zoomAmount = this.feverMode ? 1.02 : 1.01;
    this.cameras.main.setZoom(zoomAmount);
    this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.0,
        duration: 150,
        ease: 'Sine.easeOut'
    });
    
    // Pulse Speaker Rings on Beat
    this.pulseSpeakerRings();
    this.juice?.onBeat();
    
    // Scramble Geometric Chaos
    this.scrambleGeometricChaos();
    
    // 2. Animate Equalizer
    this.updateEqualizer();
    // Fever Mode Effects (Run every beat)
    if (this.feverMode) {
      this.cycleNeonColors(); 
      this.cameras.main.shake(100, 0.005);
    }
    
    this.beatCount++;
    
    // Dynamic Spawn Logic: vary the gap between beats
    if (this.nextSpawnBeat === undefined) this.nextSpawnBeat = 0;
    
    // Wait until we reach the next scheduled spawn beat
    if (this.beatCount < this.nextSpawnBeat) return;
    
    // Determine gap to next beat (Randomize for variety)
    let gap = 3; // Default comfortable gap
    const chance = Math.random();
    
    // Fever Mode = Higher density / Faster pace feel
    if (this.feverMode) {
        if (chance < 0.4) gap = 1;       // 40% chance for rapid fire (1 beat gap)
        else if (chance < 0.7) gap = 2;  // 30% chance for medium (2 beat gap)
    } else {
        // Normal Mode = mostly 3, occasionally 2 for surprise
        if (chance < 0.25) gap = 2;      // 25% chance for closer beats
        else if (chance < 0.05) gap = 1; // 5% chance for rapid fire
    }
    
    this.nextSpawnBeat = this.beatCount + gap;
    // Create a beat marker that falls down
    // Logic for High Repetition Streaks
    let laneIdx;
    let selectedKey;
    const maxStreak = 8; // Increased streak limit significantly
    // Try to repeat the previous key and lane (80% chance if within streak limit)
    if (this.lastLaneIdx !== undefined && this.lastSelectedKey && this.streakCount < maxStreak && Math.random() < 0.8) {
        laneIdx = this.lastLaneIdx;
        selectedKey = this.lastSelectedKey;
        this.streakCount++;
    } else {
        // Otherwise pick a new random lane and key
        laneIdx = Phaser.Math.Between(0, 2);
        const lane = this.laneConfig[laneIdx];
        selectedKey = Phaser.Utils.Array.GetRandom(lane.keys);
        this.streakCount = 1;
    }
    
    const lane = this.laneConfig[laneIdx];
    this.lastSelectedKey = selectedKey;
    this.lastLaneIdx = laneIdx;
    
    const isFever = this.feverMode;
    const markerColor = isFever ? 0xffffff : lane.color; // White in fever, or lane color
    
    // Create Container for Marker + Text
    const markerContainer = this.add.container(lane.x, height * 0.2);
    
    const circle = this.add.circle(0, 0, isFever ? 50 : 40, markerColor);
    circle.setStrokeStyle(4, 0xffffff);
    
    let displaySymbol = selectedKey;
    if (selectedKey === 'UP') displaySymbol = '↑';
    else if (selectedKey === 'DOWN') displaySymbol = '↓';
    else if (selectedKey === 'LEFT') displaySymbol = '←';
    else if (selectedKey === 'RIGHT') displaySymbol = '→';
    else if (selectedKey === 'SPACE') displaySymbol = '␣';
    
    const text = this.add.text(0, 0, displaySymbol, {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#000000',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    markerContainer.add([circle, text]);
    
    // Mobile devices get faster falling circles for increased difficulty (1.4x speed)
    // Desktop uses standard speed (tapping is easier than typing)
    const speedMultiplier = this.isMobile ? 1.4 : 2.0;
    const travelTime = this.rhythmSystem.beatInterval * speedMultiplier * (this.powerups ? this.powerups.travelScale() : 1);
    
    const markerData = {
      sprite: markerContainer,
      targetTime: this.rhythmSystem.nowMs() + travelTime,
      travelTime: travelTime,
      spawnY: height * 0.2,
      targetY: height * 0.85,
      requiredKey: selectedKey,
      laneX: lane.x,
      laneColor: lane.color,
      hit: false
    };
    this.beatMarkers.push(markerData);
    
    if (GameScene.MARKER_TWEEN_FALLBACK) {
      // Legacy path: tween-driven fall + tween-onComplete miss detection.
      // Kept only as an emergency fallback; judgment/visual sync is worse here
      // because frame drops make the tween trail the audio clock.
      this.tweens.add({
        targets: markerContainer,
        y: markerData.targetY,
        duration: travelTime,
        ease: 'Linear',
        onComplete: () => {
          if (!markerData.hit) {
            this.handleMiss(markerData);
          }
        }
      });
    }
    // Default path: marker y is driven from conductor time in update() —
    // see updateMarkerPositions(). Miss detection happens there too.
  }
  
  /**
   * v2.1 (Block 1): drive marker fall from the audio clock instead of tweens,
   * so visuals can never trail judgment under frame drops. Also sweeps misses:
   * a marker dies when it is later than the widest (late) hit window, which —
   * unlike the old tween-onComplete — makes late hits actually reachable.
   */
  updateMarkerPositions() {
    if (GameScene.MARKER_TWEEN_FALLBACK) return;
    if (this.isPaused || this.isDying || !this.rhythmSystem || !this.beatMarkers) return;
    const now = this.rhythmSystem.nowMs();
    const lateWindow = 300 * (this.powerups ? this.powerups.windowScale() : 1);
    // Iterate over a copy: handleMiss splices this.beatMarkers.
    for (const marker of [...this.beatMarkers]) {
      if (marker.hit || !marker.sprite) continue;
      if (marker.travelTime === undefined) continue; // safety: pre-v2.1 marker
      if (now - marker.targetTime > lateWindow) {
        this.handleMiss(marker);
        continue;
      }
      marker.sprite.y = ConductorMath.markerY(now, marker.targetTime, marker.travelTime, marker.spawnY, marker.targetY);
    }
  }
  
  onHitInput(event, tappedLaneIdx = null) {
    if (this.isPaused) return; // Don't allow input when paused
    
    const { height } = this.scale;
    // Determine Input Key
    let inputKey = 'WILDCARD'; // Default for pointer/touch
    if (event) {
        const code = event.code;
        // Map event.code to our internal key IDs
        if (code === 'ArrowUp') inputKey = 'UP';
        else if (code === 'ArrowDown') inputKey = 'DOWN';
        else if (code === 'ArrowLeft') inputKey = 'LEFT';
        else if (code === 'ArrowRight') inputKey = 'RIGHT';
        else if (code === 'Space') inputKey = 'SPACE';
        else if (code.startsWith('Key')) inputKey = code.replace('Key', '');
        else if (code.startsWith('Digit')) inputKey = code.replace('Digit', '');
        else {
            const specialMap = {
                'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']',
                'Backslash': '\\', 'Semicolon': ';', 'Quote': "'", 'Comma': ',',
                'Period': '.', 'Slash': '/'
            };
            if (specialMap[code]) inputKey = specialMap[code];
        }
    }
    // Find closest marker to target that MATCHES the input key (or any if wildcard)
    let closestMarker = null;
    let closestDiff = Infinity;
    
    // Filter markers that are within hit window AND match the key/lane
    const hittableMarkers = this.beatMarkers.filter(marker => {
        if (marker.hit) return false;
        const diff = Math.abs(marker.targetTime - this.rhythmSystem.nowMs());
        // Basic window 300ms
        if (diff >= 300 * (this.powerups ? this.powerups.windowScale() : 1)) return false;
        
        // If tap input with specific lane, only hit markers in that lane
        if (tappedLaneIdx !== null) {
            const tappedLane = this.laneConfig[tappedLaneIdx];
            if (marker.laneX !== tappedLane.x) {
                return false; // Wrong lane
            }
        }
        
        // Strict Key Check: Marker must match input key (unless wildcard tap)
        if (inputKey !== 'WILDCARD' && marker.requiredKey !== inputKey) {
            return false;
        }
        return true;
    });
    // Find the absolute closest among the valid candidates
    hittableMarkers.forEach(marker => {
        const diff = Math.abs(marker.targetTime - this.rhythmSystem.nowMs());
        if (diff < closestDiff) {
            closestDiff = diff;
            closestMarker = marker;
        }
    });
    if (closestMarker) {
      closestMarker.hit = true;
      closestMarker.sprite.destroy();
      
      const index = this.beatMarkers.indexOf(closestMarker);
      if (index > -1) this.beatMarkers.splice(index, 1);
      
      // Determine hit quality
      let feedback = 'HIT!';
      let points = 100;
      let damage = 20;
      const wScale = this.powerups ? this.powerups.windowScale() : 1;
      if (closestDiff < 100 * wScale) {
        feedback = 'PERFECT!';
        points = 200;
        damage = 30;
      } else if (closestDiff < 200 * wScale) {
        feedback = 'GOOD!';
        points = 150;
        damage = 25;
      }
      points = Math.round(points * (this.powerups ? this.powerups.scoreMult() : 1));
      this.score += points;
      
      // Block 7: feed the ghost-replay recorder (judgment on the audio clock)
      const hitLaneIdx = this.laneConfig.findIndex(l => l.x === closestMarker.laneX);
      this.replayRecorder?.record(hitLaneIdx, feedback === 'PERFECT!' ? 'perfect' : feedback === 'GOOD!' ? 'good' : 'ok');
      
      // Check for new high score during gameplay
      const currentHighScore = parseInt(localStorage.getItem('shuffleRushHighScore') || '0');
      const wasHighScore = currentHighScore > 0;
      
      if (this.score > currentHighScore) {
          localStorage.setItem('shuffleRushHighScore', this.score.toString());
          
          // Celebrate only once when crossing the threshold
          if (!this.highScoreCelebrated && wasHighScore) {
              this.highScoreCelebrated = true;
              this.celebrateHighScore();
          }
      }
      
      this.combo++;
      this.totalHits++;
      
      // Speed up every 50 combo hits
      if (this.combo > 0 && this.combo % 50 === 0) {
          this.increaseTempo();
      }
      // Heal every 40 cumulative hits (regardless of combo)
      const healThreshold = 40;
      if (this.totalHits > 0 && this.totalHits % healThreshold === 0) {
          if (this.player) {
            this.player.heal(10);
            this.showFeedback('+10 HP', 0x00ff00);
            
            // Play healing sound
            this.sound.play('healing', { volume: 0.5 });
          }
      }
      
      // Update heal progress visual
      if (this.player) {
          // If we hit the threshold, show it as full (logic handles reset on next hit)
          let progress = this.totalHits % healThreshold;
          this.player.updateHealProgress(progress, healThreshold);
      }
      this.updateComboVisuals();
      
      this.scoreText.setText(`SCORE: ${this.score}`);
      this.showFeedback(feedback, 0x00ff00);
      
      // Play successful hit sound
      this.sound.play('successful-hit', { volume: 0.25 });
      
      // Visual Impact - Use the lane position of the hit marker
      this.createShockwave(closestMarker.laneX, height * 0.85, closestMarker.laneColor);
      this.juice?.burst(closestMarker.laneX, height * 0.85, closestMarker.laneColor);
      if (feedback === 'PERFECT!') this.juice?.hitstop(60, 0.3);
      
      this.player.attack();
      this.enemy.takeDamage(damage);
      // Check if enemy defeated - spawn new one for endless mode
      if (this.enemy.health <= 0) {
        if (this.enemy.sprite) this.powerups?.onEnemyDefeated(this.enemy.sprite.x, this.enemy.sprite.y);
        this.spawnNewEnemy();
      }
    }
  }
  handleMiss(markerData) {
      // v2: powerup interception before any penalty
      if (this.powerups && this.powerups.consumeShield()) {
          this.showFeedback('SHIELDED!', 0x05ffa1);
          if (markerData.sprite) markerData.sprite.destroy();
          const si = this.beatMarkers.indexOf(markerData);
          if (si > -1) this.beatMarkers.splice(si, 1);
          return;
      }
      const keepCombo = this.powerups ? this.powerups.consumeComboKeeper() : false;
      // Missed the beat (or wrong key)
      if (!keepCombo) { this.combo = 0; } else { this.showFeedback('COMBO KEPT!', 0xb967ff); }
      this.totalMisses++;
      // Block 7: ghost-replay feed
      this.replayRecorder?.record(this.laneConfig.findIndex(l => l.x === markerData.laneX), 'miss');
      this.updateComboVisuals();
      this.showFeedback('MISS', 0xff0000);
      
      // Play miss sound
      this.sound.play('missed-hit', { volume: 0.8 });
      
      // Update Enemy Miss Bar (Enemy attacks every 10 misses)
      const missThreshold = 10;
      if (this.enemy) {
          if (this.totalMisses > 0 && this.totalMisses % missThreshold === 0) {
              if (this.player) {
                  this.player.takeDamage(5); // Extra damage penalty
                  this.enemy.attack(); // Visual attack
                  this.showFeedback('COUNTER ATTACK!', 0xff0000, 0x000000);
                  
                  // Play counter-attack sound
                  this.sound.play('counterattack', { volume: 0.85 });
                  
                  // Intense Counter-Attack Effects
                  this.cameras.main.shake(400, 0.025);
                  this.cameras.main.flash(300, 255, 0, 0); // Red screen flash
                  if (this.enemy && this.enemy.sprite) {
                      this.createShockwave(this.enemy.sprite.x, this.enemy.sprite.y, 0xff0000);
                  }
              }
          }
          
          let progress = this.totalMisses % missThreshold;
          this.enemy.updateMissProgress(progress, missThreshold);
      }
      
      // Apply penalty: Player loses 1/100th of health (1 point)
      if (this.player) {
          this.player.takeDamage(1);
          // Check for game over
          if (this.player.health <= 0 && !this.isDying) {
              this.playPlayerDeath();
          }
      }
      
      if (markerData.sprite) {
          markerData.sprite.destroy();
      }
      const index = this.beatMarkers.indexOf(markerData);
      if (index > -1) this.beatMarkers.splice(index, 1);
  }

  showFeedback(text, color, strokeColor = 0xffffff) {
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    const strokeHex = '#' + strokeColor.toString(16).padStart(6, '0');
    const feedbackText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.4,
      text,
      {
        fontSize: '48px',
        fontFamily: 'Impact, Arial',
        color: colorHex,
        stroke: strokeHex,
        strokeThickness: 4
      }
    );
    feedbackText.setOrigin(0.5);
    this.tweens.add({
      targets: feedbackText,
      y: feedbackText.y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => feedbackText.destroy()
    });
  }
  
  spawnNewEnemy() {
    const { width, height } = this.scale;
    
    this.enemiesDefeated++;
    // Moved totalMisses reset to callback to ignore transition misses
    this.enemyCountText.setText(`ENEMIES DEFEATED: ${this.enemiesDefeated}`);
    
    // Flash effect with NEON color
    const flashColor = Phaser.Display.Color.ValueToColor(this.neonColors[this.currentColorIndex]);
    this.cameras.main.flash(200, flashColor.r, flashColor.g, flashColor.b);
    
    // Show enemy defeated text
    const defeatedText = this.add.text(
      width / 2,
      height * 0.4,
      'ENEMY DEFEATED!',
      {
        fontSize: '56px',
        fontFamily: 'Impact, Arial',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    defeatedText.setOrigin(0.5);
    defeatedText.setScale(0);
    
    this.tweens.add({
      targets: defeatedText,
      scale: 1.2,
      alpha: 0,
      y: defeatedText.y - 100,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => defeatedText.destroy()
    });
    
    // Increase BPM for next enemy (gets faster!)
    this.currentBPM = Math.min(this.currentBPM + 10, 300); // Cap at 300 BPM
    this.rhythmSystem.setBPM(this.currentBPM);
    
    // Calculate new enemy health (increases with each spawn)
    const newHealth = 100 + (this.enemiesDefeated * 20);
    
    // Destroy old enemy with proper cleanup
    this.time.delayedCall(500, () => {
      if (this.enemy) {
        // Stop all tweens on enemy sprites to prevent conflicts
        this.tweens.killTweensOf([this.enemy.sprite, this.enemy.glow, this.enemy.healthBar, this.enemy.healthBarBg]);
        
        // Stop the bop tween specifically
        if (this.enemy.bopTween) {
          this.enemy.bopTween.stop();
          this.enemy.bopTween = null;
        }
        
        // Stop the glow pulse tween
        if (this.enemy.glowPulseTween) {
          this.enemy.glowPulseTween.stop();
          this.enemy.glowPulseTween = null;
        }
        
        // Now safely destroy
        this.enemy.sprite.destroy();
        this.enemy.glow.destroy();
        this.enemy.healthBar.destroy();
        this.enemy.healthBarBg.destroy();
        if (this.enemy.missBar) this.enemy.missBar.destroy();
        if (this.enemy.missBarBg) this.enemy.missBarBg.destroy();
        if (this.enemy.missIcon) this.enemy.missIcon.destroy();
      }
      
      // Spawn new enemy
      this.enemy = new Enemy(this, width * 0.75, height * 0.52, newHealth);
      
      // Persist miss meter visual state
      if (this.totalMisses > 0) {
          this.enemy.updateMissProgress(this.totalMisses % 10, 10);
      }
      // Update color to match current theme
      const availableColors = this.neonColors.filter((_, i) => i !== this.currentColorIndex);
      const enemyColor = Phaser.Utils.Array.GetRandom(availableColors);
      this.enemy.setThemeColor(enemyColor);
      
      // Show new BPM indicator
      const bpmText = this.add.text(
        width / 2,
        height * 0.35,
        `TEMPO UP!\n${this.currentBPM} BPM`,
        {
          fontSize: '48px',
          fontFamily: 'Impact, Arial',
          color: '#ff00ff',
          stroke: '#ffffff',
          strokeThickness: 4,
          align: 'center'
        }
      );
      bpmText.setOrigin(0.5);
      bpmText.setAlpha(0);
      
      this.tweens.add({
        targets: bpmText,
        alpha: 1,
        scale: { from: 0.5, to: 1.2 },
        duration: 600,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () => bpmText.destroy()
      });
    });
  }
  
  updateComboVisuals() {
    // Check for Fever Mode Threshold (20 Combo)
    const FEVER_THRESHOLD = 20;
    
    if (this.combo >= FEVER_THRESHOLD && !this.feverMode) {
      // ENTER FEVER MODE
      this.feverMode = true;
      this.rhythmSystem.setBPM(150); // Speed up!
      
      // Fever Visual Explosion
      this.feverText.setVisible(true);
      this.feverText.setScale(0);
      this.feverText.setAlpha(1);
      
      this.tweens.add({
        targets: this.feverText,
        scale: 1.2,
        duration: 400,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 1000,
        onComplete: () => {
           this.tweens.add({
             targets: this.feverText,
             alpha: 0,
             duration: 300
           });
        }
      });
      
    } else if (this.combo < FEVER_THRESHOLD && this.feverMode) {
      // EXIT FEVER MODE
      this.feverMode = false;
      this.rhythmSystem.setBPM(120); // Reset speed
    }
    // Visual text update
    if (this.combo > 1) {
      this.comboText.setText(`${this.combo} COMBO!`);
      this.comboText.setVisible(true);
      this.comboText.setScale(1.5);
      
      // Color based on combo tier
      if (this.combo >= 30) this.comboText.setColor('#00ffff'); // Cyan for Godlike
      else if (this.combo >= 15) this.comboText.setColor('#ff00ff'); // Magenta for Epic
      else this.comboText.setColor('#ffff00'); // Yellow for Good
      
      this.tweens.add({
        targets: this.comboText,
        scale: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    } else {
      this.comboText.setVisible(false);
    }
    // Calculate intensity (0.0 to 1.0) based on combo (max effect at 30 combo)
    const intensity = Math.min(this.combo / 30, 1.0);
    
    // Update entities
    if (this.player) this.player.setComboIntensity(intensity);
    if (this.enemy) this.enemy.setComboIntensity(intensity);
  }
  // Removed: onDefeat, showDefeatOptions
  // Removed: Stage progression system
  // Removed: Ad manager integration
  // Removed: Dodge mechanics
  // Removed: Complex combo system
  restoreCustomAudio() {
    console.log('=== GameScene: Restoring Custom Audio ===');
    
    // Track which audio files are being decoded
    this.decodingAudio = new Set();
    
    // Restore custom audio
    const audioData = this.registry.get('customAudioData') || {};
    const customTracks = this.registry.get('customTracks') || [];
    
    let decodeCount = 0;
    
    customTracks.forEach(track => {
      if (audioData[track.key] && !this.cache.audio.exists(track.key)) {
        try {
          this.decodingAudio.add(track.key);
          decodeCount++;
          
          // Decode audio with callback
          this.sound.decodeAudio(track.key, audioData[track.key]);
          
          console.log('⏳ Decoding audio in GameScene:', track.key);
        } catch (e) {
          console.error('Failed to restore audio in GameScene:', track.key, e);
          this.decodingAudio.delete(track.key);
        }
      }
    });
    
    if (decodeCount > 0) {
      console.log(`⏳ Decoding ${decodeCount} custom audio files... this may take a moment`);
      
      // Poll to check when all audio is decoded
      const checkDecoded = () => {
        let allDecoded = true;
        this.decodingAudio.forEach(key => {
          if (!this.cache.audio.exists(key)) {
            allDecoded = false;
          } else {
            this.decodingAudio.delete(key);
            console.log('✓ Audio ready:', key);
          }
        });
        
        if (!allDecoded && this.scene.isActive()) {
          this.time.delayedCall(100, checkDecoded);
        } else if (allDecoded) {
          console.log('=== All Custom Audio Ready ===');
        }
      };
      
      this.time.delayedCall(100, checkDecoded);
    } else {
      console.log('=== Custom Audio Restored in GameScene ===');
    }
  }
  
  async _setupVideoLayers() {
    const vids = this.registry.get('customVideos') || [];
    if (!vids.length) return;
    // Block 3: prefer the video the player SELECTED in the Dancer Lab gallery;
    // fall back to the latest upload (the pre-gallery behavior).
    const selectedKey = this.registry.get('selectedVideoKey');
    const latest = vids.find(v => v.key === selectedKey) || vids[vids.length - 1];
    const { width, height } = this.scale;
    try {
      if (this.registry.get('videoBgEnabled')) {
        const blob = await MediaLibrary.getBlob('video:' + latest.key);
        if (blob) {
          this.videoBg = new VideoActor(this, blob, {
            key: 'vbg-' + latest.key, sound: !!this.registry.get('videoBgSound'), maxDim: 1024, fps: 24
          });
          this.videoBg.onReady = () => {
            const img = this.add.image(width / 2, height / 2, this.videoBg.key).setDepth(-5).setAlpha(0.35);
            img.setScale(Math.max(width / img.width, height / img.height));
            this.videoBgImage = img;
          };
        }
      }
      if (this.registry.get('videoOpponentEnabled')) {
        const blob = await MediaLibrary.getBlob('video:' + latest.key);
        if (blob) {
          this.videoGuest = new VideoActor(this, blob, { key: 'vguest-' + latest.key, sound: false, maxDim: 360, fps: 24 });
          this.videoGuest.onReady = () => {
            const gx = width * 0.78, gy = height * 0.30;
            this.videoGuestFrame = this.add.rectangle(gx, gy, 236, 156, 0x000000, 0.55)
              .setStrokeStyle(3, ThemeManager.current.beam).setDepth(6);
            const img = this.add.image(gx, gy, this.videoGuest.key).setDepth(7);
            img.setScale(Math.min(228 / img.width, 148 / img.height));
            this.videoGuestImage = img;
          };
        }
      }
    } catch (e) { console.warn('video layers unavailable:', e); }
  }

  createHalftoneGrid() {
    const { width, height } = this.scale;
    const spacing = 40;
    this.halftoneDots = [];
    
    const dotColor = ThemeManager.current.halftone ?? 0x333333; // Block 4
    for (let x = 0; x < width + spacing; x += spacing) {
      for (let y = 0; y < height + spacing; y += spacing) {
        const dot = this.add.circle(x, y, 2, dotColor);
        dot.setDepth(-90);
        dot.originalX = x;
        dot.originalY = y;
        this.halftoneDots.push(dot);
      }
    }
    
    // Warp the grid
    this.tweens.add({
      targets: this.halftoneDots,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 0.3, to: 0.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      delay: (target) => Math.random() * 1000
    });
  }
  createSpeakerRings() {
    const { width, height } = this.scale;
    this.speakerRings = [];
    
    for (let i = 0; i < 8; i++) {
        const ring = this.add.graphics();
        ring.setDepth(-50 + i);
        ring.baseRadius = 100 + (i * 80);
        this.speakerRings.push(ring);
    }
    
    this.updateSpeakerRingsColor();
  }
  
  updateSpeakerRingsColor() {
    this.speakerRings.forEach((ring, i) => {
        ring.clear();
        const color = this.neonColors[(this.currentColorIndex + i) % this.neonColors.length];
        ring.lineStyle(15 - i, color, 0.6); // Thicker vector lines
        ring.strokeCircle(this.scale.width / 2, this.scale.height / 2, ring.baseRadius);
        ring.setBlendMode(Phaser.BlendModes.ADD);
    });
  }
  
  pulseSpeakerRings() {
    if (!this.speakerRings) return;
    
    this.speakerRings.forEach((ring, i) => {
        const targetRadius = ring.baseRadius * 1.1;
        
        this.tweens.add({
            targets: ring,
            scale: 1.1,
            alpha: 1,
            duration: 100,
            yoyo: true,
            onUpdate: () => {
                // Redraw on scale not strictly needed for graphics container, but good for clarity
            }
        });
    });
  }
  createGeometricChaos() {
    const { width, height } = this.scale;
    this.geoShapes = [];
    
    // Create random triangles, arrows, crosses
    for (let i = 0; i < 15; i++) {
        const shape = this.add.graphics();
        this.drawRandomGeoShape(shape);
        shape.x = Phaser.Math.Between(0, width);
        shape.y = Phaser.Math.Between(0, height);
        shape.setDepth(-40);
        shape.setBlendMode(Phaser.BlendModes.ADD);
        this.geoShapes.push(shape);
        
        // Random drift
        this.tweens.add({
            targets: shape,
            x: shape.x + Phaser.Math.Between(-100, 100),
            y: shape.y + Phaser.Math.Between(-100, 100),
            rotation: Phaser.Math.FloatBetween(-2, 2),
            duration: Phaser.Math.Between(3000, 6000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
  }
  
  drawRandomGeoShape(graphics) {
    graphics.clear();
    const type = Phaser.Math.Between(0, 3);
    const color = Phaser.Utils.Array.GetRandom(this.neonColors);
    graphics.lineStyle(4, color, 0.8);
    
    if (type === 0) { // Triangle
        graphics.strokeTriangle(0, 0, 40, 80, -40, 80);
    } else if (type === 1) { // Cross
        graphics.lineBetween(-30, 0, 30, 0);
        graphics.lineBetween(0, -30, 0, 30);
    } else if (type === 2) { // Jagged Arrow
        graphics.beginPath();
        graphics.moveTo(-40, 0);
        graphics.lineTo(20, 0);
        graphics.lineTo(0, -20);
        graphics.moveTo(20, 0);
        graphics.lineTo(0, 20);
        graphics.strokePath();
    } else { // Circle with dot
        graphics.strokeCircle(0, 0, 30);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, 5);
    }
  }
  
  scrambleGeometricChaos() {
    if (!this.geoShapes) return;
    // On beat, sometimes jump shapes to new positions
    this.geoShapes.forEach(shape => {
        if (Math.random() > 0.7) {
            shape.x = Phaser.Math.Between(0, this.scale.width);
            shape.y = Phaser.Math.Between(0, this.scale.height);
            this.drawRandomGeoShape(shape); // Redraw new color/shape
        }
    });
  }
  cycleNeonColors() {
    this.currentColorIndex = (this.currentColorIndex + 1) % this.neonColors.length;
    
    // Update center glow
    const newColor = this.neonColors[this.currentColorIndex];
    this.tweens.add({
        targets: this.centerGlow,
        fillColor: newColor,
        duration: 200
    });
    
    // Update Radial Gradient Tint
    if (this.radialGlow && this.radialGlow.redraw) {
        this.radialGlow.redraw(newColor);
    }
    
    // Update Light Beams (Scramble their colors)
    if (this.lightBeams) {
        this.lightBeams.forEach(beam => {
            if (beam.redraw) {
                beam.redraw(Phaser.Utils.Array.GetRandom(this.neonColors));
            }
        });
    }
    
    // Update Border Glows
    if (this.borderGlows) {
        this.borderGlows.forEach(glow => {
            glow.setFillStyle(newColor, glow.alpha);
        });
    }
    
    // Update Rings
    this.updateSpeakerRingsColor();
    
    // Randomize entities
    const playerColor = Phaser.Utils.Array.GetRandom(this.neonColors);
    const enemyColor = Phaser.Utils.Array.GetRandom(this.neonColors);
    
    if (this.player) this.player.setThemeColor(playerColor);
    if (this.enemy) this.enemy.setThemeColor(enemyColor);
  }
  
  createParticleEffects() {
    const { width, height } = this.scale;
    
    // MORE Floating sparkle particles (increased from 30 to 50)
    for (let i = 0; i < 50; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 5),
        Phaser.Utils.Array.GetRandom(this.neonColors), // Random NEON color
        Phaser.Math.FloatBetween(0.4, 0.9)
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(-1);
      
      // Twinkle
      this.tweens.add({
        targets: particle,
        alpha: { from: 0.2, to: 0.8 },
        scale: { from: 0.5, to: 1.3 },
        duration: Phaser.Math.Between(1000, 2000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000)
      });
      
      // Float
      this.tweens.add({
        targets: particle,
        y: particle.y + Phaser.Math.Between(-70, 70),
        x: particle.x + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // MORE Rotating beat circles (increased from 5 to 10)
    for (let i = 0; i < 10; i++) {
      const beatCircle = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(50, height - 50),
        'beat-circle'
      );
      beatCircle.setScale(Phaser.Math.FloatBetween(0.02, 0.05));
      beatCircle.setAlpha(Phaser.Math.FloatBetween(0.1, 0.25));
      // Block 4: themed tint (neonRush lanes[0]/beam ≈ the old pink/cyan pair)
      beatCircle.setTint(Phaser.Math.Between(0, 1) ? ThemeManager.current.lanes[0] : ThemeManager.current.beam);
      beatCircle.setBlendMode(Phaser.BlendModes.ADD);
      beatCircle.setDepth(-1);
      
      this.tweens.add({
        targets: beatCircle,
        rotation: Math.PI * 2,
        duration: Phaser.Math.Between(10000, 18000),
        repeat: -1,
        ease: 'Linear'
      });
      
      this.tweens.add({
        targets: beatCircle,
        y: beatCircle.y + Phaser.Math.Between(-80, 80),
        x: beatCircle.x + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(5000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.tweens.add({
        targets: beatCircle,
        scale: beatCircle.scaleX * 1.4,
        alpha: { from: beatCircle.alpha, to: beatCircle.alpha * 0.4 },
        duration: Phaser.Math.Between(2500, 4000),
        yoyo: true,
        repeat: -1
      });
    }
    
    // Add explosive ring particles on beats
    this.createBeatRings();
  }
  
  createBeatRings() {
    // These will spawn on every beat
    this.rhythmSystem.on('beat', () => {
      const { width, height } = this.scale;
      
      for (let i = 0; i < 3; i++) {
        const color = this.neonColors[this.currentColorIndex];
        const ring = this.add.circle(width / 2, height / 2, 0, color, 0.2); // Added fill with low alpha
        ring.setStrokeStyle(4, color, 0.8);
        ring.setDepth(-1);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        
        this.tweens.add({
          targets: ring,
          radius: 400 + (i * 100),
          alpha: { from: 0.6, to: 0 },
          duration: 800 + (i * 200),
          ease: 'Cubic.easeOut',
          delay: i * 100,
          onComplete: () => ring.destroy()
        });
      }
    });
  }
  
  createShootingStars() {
    // Create multiple shooting stars continuously
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(Phaser.Math.Between(0, 3000), () => {
        this.createShootingStar();
      });
    }
  }
  
  createShootingStar() {
    const { width, height } = this.scale;
    const startX = Phaser.Math.Between(-50, width + 50);
    const startY = Phaser.Math.Between(-50, height / 3);
    
    const color = Phaser.Utils.Array.GetRandom(this.neonColors);
    const star = this.add.circle(startX, startY, 3, color);
    star.setBlendMode(Phaser.BlendModes.ADD);
    star.setDepth(-1);
    
    // Trail effect
    const trail = this.add.graphics();
    trail.lineStyle(2, color, 0.5);
    trail.setBlendMode(Phaser.BlendModes.ADD);
    trail.setDepth(-1);
    
    this.tweens.add({
      targets: star,
      x: startX + Phaser.Math.Between(-300, 300),
      y: startY + Phaser.Math.Between(200, 500),
      alpha: 0,
      duration: Phaser.Math.Between(800, 1500),
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        trail.clear();
        trail.lineStyle(2, color, star.alpha * 0.5);
        trail.lineBetween(startX, startY, star.x, star.y);
      },
      onComplete: () => {
        star.destroy();
        trail.destroy();
        // Create another one
        this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
          if (this.scene.isActive()) {
            this.createShootingStar();
          }
        });
      }
    });
  }
  
  createEnergyWaves() {
    const { width, height } = this.scale;
    
    // Create pulsing energy rings from center
    this.time.addEvent({
      delay: 1500,
      callback: () => {
        for (let i = 0; i < 2; i++) {
          const color = Phaser.Utils.Array.GetRandom(this.neonColors);
          const ring = this.add.circle(width / 2, height / 2, 50, color, 0);
          ring.setStrokeStyle(3, color, 0.6);
          ring.setBlendMode(Phaser.BlendModes.ADD);
          ring.setDepth(-1);
          
          this.tweens.add({
            targets: ring,
            radius: 500,
            alpha: 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            delay: i * 300,
            onComplete: () => ring.destroy()
          });
        }
      },
      loop: true
    });
    
    // Create diagonal energy beams that sweep across
    this.time.addEvent({
      delay: 2500,
      callback: () => {
        const beam = this.add.rectangle(
          Phaser.Math.Between(-100, width + 100),
          -50,
          80,
          height * 2,
          Phaser.Utils.Array.GetRandom(this.neonColors),
          0.15
        );
        beam.setBlendMode(Phaser.BlendModes.ADD);
        beam.setDepth(-1);
        beam.setRotation(Phaser.Math.FloatBetween(-0.3, 0.3));
        
        this.tweens.add({
          targets: beam,
          y: height + 50,
          alpha: 0,
          duration: 2000,
          ease: 'Sine.easeInOut',
          onComplete: () => beam.destroy()
        });
      },
      loop: true
    });
  }
  
  createRadialGradient() {
    const { width, height } = this.scale;
    this.radialGlow = this.add.graphics();
    this.radialGlow.setDepth(-2);
    
    // Custom redraw function to handle color changes
    this.radialGlow.redraw = (color) => {
        this.radialGlow.clear();
        for (let i = 3; i > 0; i--) {
            this.radialGlow.fillStyle(color, 0.06 * i);
            this.radialGlow.fillCircle(width / 2, height / 2, (width * 0.7) * i / 3);
        }
    };
    
    // Initial color
    this.radialGlow.redraw(this.neonColors[0]);
    
    this.tweens.add({
      targets: this.radialGlow,
      alpha: { from: 0.4, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  createLightBeams() {
    const { width, height } = this.scale;
    
    // MORE light beams (increased from 6 to 10)
    this.lightBeams = [];
    for (let i = 0; i < 10; i++) {
      const beam = this.add.graphics();
      beam.setDepth(-1);
      
      const angle = (Math.PI * 2 / 10) * i;
      const length = Math.max(width, height);
      
      // Attach redraw function to beam for color updating
      beam.redraw = (color) => {
          beam.clear();
          beam.fillStyle(color, 0.08);
          beam.beginPath();
          beam.moveTo(width / 2, height / 2);
          beam.lineTo(
            width / 2 + Math.cos(angle) * length,
            height / 2 + Math.sin(angle) * length
          );
          beam.lineTo(
            width / 2 + Math.cos(angle + 0.4) * length,
            height / 2 + Math.sin(angle + 0.4) * length
          );
          beam.closePath();
          beam.fillPath();
      };
      // Initial draw
      beam.redraw(Phaser.Utils.Array.GetRandom(this.neonColors));
      beam.setBlendMode(Phaser.BlendModes.ADD);
      this.lightBeams.push(beam);
      
      this.tweens.add({
        targets: beam,
        angle: 360,
        duration: 20000 + (i * 1500),
        repeat: -1,
        ease: 'Linear'
      });
    }
  }
  
  createVignette() {
    const { width, height } = this.scale;
    const vignette = this.add.graphics();
    vignette.setDepth(998);
    
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0, 0, 0.5);
    vignette.fillRect(0, 0, width, height);
    
    this.tweens.add({
      targets: vignette,
      alpha: { from: 0.5, to: 0.7 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  createScreenBorderGlow() {
    const { width, height } = this.scale;
    
    const initialColor = this.neonColors[0];
    
    const topGlow = this.add.rectangle(width / 2, 0, width, 10, initialColor, 0.5);
    topGlow.setBlendMode(Phaser.BlendModes.ADD);
    topGlow.setDepth(999);
    
    const bottomGlow = this.add.rectangle(width / 2, height, width, 10, initialColor, 0.5);
    bottomGlow.setBlendMode(Phaser.BlendModes.ADD);
    bottomGlow.setDepth(999);
    
    const leftGlow = this.add.rectangle(0, height / 2, 10, height, initialColor, 0.5);
    leftGlow.setBlendMode(Phaser.BlendModes.ADD);
    leftGlow.setDepth(999);
    
    const rightGlow = this.add.rectangle(width, height / 2, 10, height, initialColor, 0.5);
    rightGlow.setBlendMode(Phaser.BlendModes.ADD);
    rightGlow.setDepth(999);
    
    this.borderGlows = [topGlow, bottomGlow, leftGlow, rightGlow];
    
    this.borderGlows.forEach((glow, i) => {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.3, to: 0.7 },
        duration: 1200 + (i * 150),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }
  
  createEqualizer() {
    const { width, height } = this.scale;
    this.equalizerBars = [];
    const barCount = 20;
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
        const bar = this.add.rectangle(
            i * barWidth + barWidth / 2,
            height,
            barWidth * 0.8,
            100,
            0xffffff,
            0.15
        );
        bar.setOrigin(0.5, 1);
        bar.setBlendMode(Phaser.BlendModes.ADD);
        this.equalizerBars.push(bar);
    }
  }
  updateEqualizer() {
    this.equalizerBars.forEach((bar, index) => {
        // Randomize height based on "music" (simulated)
        const targetHeight = Phaser.Math.Between(100, 400);
        
        this.tweens.add({
            targets: bar,
            height: targetHeight,
            alpha: Phaser.Math.FloatBetween(0.1, 0.3),
            duration: 100,
            ease: 'Sine.easeOut',
            yoyo: true
        });
        
        // Block 4: cycle bars through the THEME palette (was a raw HSV rainbow
        // that ignored the theme entirely). Same motion, themed colors.
        const palette = ThemeManager.current.neon;
        const step = Math.floor(this.time.now / 400);
        const color = palette[(step + index) % palette.length];
        bar.setFillStyle(color, bar.alpha);
    });
  }
  createShockwave(x, y, colorOverride = null) {
      const color = colorOverride !== null ? colorOverride : this.neonColors[this.currentColorIndex];
      const circle = this.add.circle(x, y, 10, color, 0);
      circle.setStrokeStyle(10, color);
      circle.setDepth(100);
      
      this.tweens.add({
          targets: circle,
          radius: 300,
          alpha: { from: 1, to: 0 },
          strokeWidth: { from: 10, to: 0 },
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => circle.destroy()
      });
  }
  
  createPauseButton() {
    const { width } = this.scale;
    
    // Pause button (top right)
    this.pauseButton = this.add.circle(width - 40, 40, 25, 0xffffff, 0.8);
    this.pauseButton.setStrokeStyle(3, 0x000000);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.setDepth(3000); // Increased depth to stay above overlays
    
    // Pause icon (two vertical bars)
    const bar1 = this.add.rectangle(width - 47, 40, 6, 20, 0x000000);
    bar1.setDepth(3001);
    const bar2 = this.add.rectangle(width - 33, 40, 6, 20, 0x000000);
    bar2.setDepth(3001);
    
    this.pauseIcon = [bar1, bar2];
    
    // Instruction text below button
    const pauseInstruction = this.add.text(width - 40, 80, 'Press = to\nPause Game', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    });
    pauseInstruction.setOrigin(0.5);
    pauseInstruction.setDepth(3001);
    
    // Hover effect
    this.pauseButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.pauseButton,
        scale: 1.15,
        duration: 150,
        ease: 'Back.easeOut'
      });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    
    this.pauseButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.pauseButton,
        scale: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    // Click to pause
    this.pauseButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.togglePause();
    });
  }
  
  createMusicToggleButton() {
    const { width } = this.scale;
    
    // Music toggle button (to the left of pause button)
    this.musicToggleButton = this.add.circle(width - 120, 40, 25, 0xffff00, 0.8);
    this.musicToggleButton.setStrokeStyle(3, 0x000000);
    this.musicToggleButton.setInteractive({ useHandCursor: true });
    this.musicToggleButton.setDepth(3000); // Increased depth to stay above overlays
    
    // Music note icon
    const musicNote = this.add.text(width - 120, 40, '♫', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#000000',
      fontStyle: 'bold'
    });
    musicNote.setOrigin(0.5);
    musicNote.setDepth(3001);
    
    // Instruction text below button
    const instructionText = this.add.text(width - 120, 80, 'Press - to\nchange song', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffff00',
      align: 'center'
    });
    instructionText.setOrigin(0.5);
    instructionText.setDepth(3001);
    
    // Hover effect
    this.musicToggleButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.musicToggleButton,
        scale: 1.15,
        duration: 150,
        ease: 'Back.easeOut'
      });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    
    this.musicToggleButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.musicToggleButton,
        scale: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    // Click to toggle music mode
    this.musicToggleButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.toggleMusicMode();
    });
    
    // Playlist display toggle (click music note icon to show/hide playlist)
    musicNote.setInteractive({ useHandCursor: true });
    musicNote.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.2 });
      // Pause game when opening playlist if not already paused
      if (!this.isPaused) {
        this.togglePause();
      }
      this.togglePlaylistDisplay();
    });
    
    this.playlistDisplayVisible = false;
  }
  
  toggleMusicMode() {
    // Skip to next track
    // Pulse animation on the button
    this.tweens.add({
      targets: this.musicToggleButton,
      scale: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut'
    });
    
    // Play next track immediately
    this.playRandomTrack();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      // Pause the game
      // The conductor's audio clock keeps ticking while paused, so remember
      // when the pause began — resume shifts marker targets by the gap.
      this._pauseStartedMs = this.rhythmSystem.nowMs();
      this.rhythmSystem.stop();
      this.physics.pause();
      this.tweens.pauseAll();
      if (this.currentTrack && this.currentTrack.isPlaying) {
          this.currentTrack.pause();
      }
      
      // Stop Warning Alarm if playing
      if (this.warningAlarm && this.warningAlarm.isPlaying) {
          this.warningAlarm.pause();
      }
      
      // Hide low health UI elements while paused
      if (this.isLowHealth) {
          this.lowHealthOverlay.setVisible(false);
          this.lowHealthText.setVisible(false);
      }
      
      // Show pause menu
      this.showPauseMenu();
    } else {
      // Resume the game
      // Shift every in-flight marker forward by the paused duration so both
      // judgment and the time-driven fall pick up exactly where they stopped.
      if (this._pauseStartedMs !== undefined) {
        const pausedFor = this.rhythmSystem.nowMs() - this._pauseStartedMs;
        if (pausedFor > 0 && this.beatMarkers) {
          for (const m of this.beatMarkers) m.targetTime += pausedFor;
        }
        this._pauseStartedMs = undefined;
      }
      this.rhythmSystem.start();
      this.physics.resume();
      this.tweens.resumeAll();
      if (this.currentTrack && this.currentTrack.isPaused) {
          this.currentTrack.resume();
      }
      
      // Resume Warning Alarm if it was active
      if (this.isLowHealth && this.warningAlarm) {
          this.warningAlarm.resume();
          this.lowHealthOverlay.setVisible(true);
          this.lowHealthText.setVisible(true);
      }
      
      // Hide pause menu
      this.hidePauseMenu();
    }
  }
  
  setupMusicPlaylist() {
    // Check if built-in music is enabled
    const builtInMusicEnabled = this.registry.get('builtInMusicEnabled');
    const shouldUseBuiltInMusic = builtInMusicEnabled !== false; // Default to true if not set
    
    this.playlist = [];
    
    // Add built-in tracks only if enabled
    if (shouldUseBuiltInMusic) {
        this.playlist = [
            { key: 'rave-planet', title: 'Rave Planet', artist: 'Matrika' },
            { key: 'guns-n-drive', title: 'Guns and Drive', artist: 'INPLUSMUSIC' },
            { key: 'supercell', title: 'Supercell', artist: 'Tatami' },
            { key: 'dont-stop-me', title: "Don't Stop Me", artist: 'Tatami' },
            { key: 'find-home', title: 'Find Home', artist: 'Arenas' },
            { key: 'fast-light', title: 'Fast and Light Technology', artist: 'Audio Tape' }
        ];
    }
    
    // Check for custom tracks uploaded in Dancer Lab
    const customTracks = this.registry.get('customTracks') || [];
    if (customTracks.length > 0) {
        // Add custom tracks to the playlist
        this.playlist = [...this.playlist, ...customTracks];
        console.log('Added custom tracks to playlist:', customTracks.length);
    }
    
    // Log available tracks for debugging
    console.log('Available music tracks:');
    this.playlist.forEach(track => {
        const exists = this.cache.audio.exists(track.key);
        console.log(`  - ${track.title} by ${track.artist} (${track.key}): ${exists ? 'LOADED' : 'MISSING'}`);
    });
    
    this.playRandomTrack();
  }
  async playSpecificTrack(track) {
    // Stop current if playing
    if (this.currentTrack) {
        this.currentTrack.stop();
    }
    
    console.log('=== PLAYING SPECIFIC TRACK ===');
    console.log('Selected track:', track.title, 'by', track.artist, `(${track.key})`);
    
    this.currentTrackKey = track.key;
    
    // Check if audio exists in cache before playing
    if (this.cache.audio.exists(track.key)) {
        console.log('✓ Audio file FOUND in cache, playing now...');
        this.currentTrack = this.sound.add(track.key, { volume: this.registry.get('musicVol') ?? 0.4 });
        
        // AUTO BPM DETECTION
        // Block 2: the cache stores the FULL grid {bpm, offset} — replays must
        // re-align the beat grid, not just the tempo, or beats drift off the
        // track's own first-beat offset on every replay after the first.
        let cachedGrid = null;
        if (this.detectedBPMs.has(track.key)) {
            cachedGrid = this.detectedBPMs.get(track.key);
            if (typeof cachedGrid === 'number') cachedGrid = { bpm: cachedGrid, offset: 0 }; // legacy shape
            console.log(`ℹ️ Using cached grid for ${track.key}: ${cachedGrid.bpm} BPM, offset ${cachedGrid.offset}s`);
            this.updateSystemBPM(cachedGrid.bpm);
        } else {
            // Get the actual AudioBuffer for analysis
            // In Phaser 3 WebAudio, it's accessible via the sound instance
            const audioBuffer = this.currentTrack.audioBuffer;
            if (audioBuffer) {
                console.log('🔍 Analyzing audio buffer for BPM...');
                this.showFeedback('ANALYZING BEATS...', 0xffffff);
                
                // Use a slight delay to allow the UI to update if needed
                this.time.delayedCall(100, async () => {
                    const grid = await BeatDetector.detectBeatGrid(audioBuffer);
                    this.detectedBPMs.set(track.key, { bpm: grid.bpm, offset: grid.offset });
                    this.updateSystemBPM(grid.bpm);
                    // Align the beat grid to the track's own first-beat offset
                    this.rhythmSystem.syncToPhaserSound(this.currentTrack, grid.offset);
                });
            }
        }

        this.currentTrack.play();
        // Cached-grid path: sync AFTER play() so syncToPhaserSound sees the
        // live sound (it reads sound.seek/isPlaying for mid-song alignment).
        if (cachedGrid) {
            this.rhythmSystem.syncToPhaserSound(this.currentTrack, cachedGrid.offset);
        }
        
        // When track ends, play another one
        this.currentTrack.once('complete', () => {
            if (this.scene.isActive()) {
                this.playRandomTrack();
            }
        });
        
        this.showNowPlaying(track);
    } else if (this.decodingAudio && this.decodingAudio.has(track.key)) {
        // Track is still being decoded
        console.warn(`⏳ Audio "${track.key}" is still decoding. Please wait...`);
        this.showFeedback('Track is loading, please wait...', 0xffaa00);
        
        // Try again in 500ms
        this.time.delayedCall(500, () => {
            if (this.cache.audio.exists(track.key)) {
                this.playSpecificTrack(track);
            } else {
                this.showFeedback('Track failed to load', 0xff0000);
            }
        });
    } else {
        console.warn(`✗ Audio key "${track.key}" missing from cache. Cannot play.`);
        this.showFeedback('Track not loaded!', 0xff0000);
    }
  }

  playRandomTrack() {
    // Stop current if playing
    if (this.currentTrack) {
        this.currentTrack.stop();
    }
    
    // Use full playlist (all built-in tracks + custom tracks)
    const fullPlaylist = this.playlist;
    
    console.log('=== TRACK SKIP TRIGGERED ===');
    console.log('Current track key:', this.currentTrackKey);
    console.log('Full playlist:', fullPlaylist.map(t => t.key));
    
    // Filter out the currently playing track and tracks still decoding
    const availableTracks = fullPlaylist.filter(t => {
      if (t.key === this.currentTrackKey) return false; // Skip current track
      
      // Check if track is ready to play
      if (!this.cache.audio.exists(t.key)) {
        if (this.decodingAudio && this.decodingAudio.has(t.key)) {
          console.log(`⏳ Skipping ${t.key} - still decoding`);
        } else {
          console.warn(`⚠️ Skipping ${t.key} - not found in cache`);
        }
        return false;
      }
      
      return true; // Track is ready
    });
    
    console.log('Available tracks (excluding current & decoding):', availableTracks.map(t => t.key));
    
    if (availableTracks.length === 0) {
        console.warn('No available tracks to play (all filtered out or still loading)');
        this.showFeedback('No tracks ready yet, please wait...', 0xffaa00);
        
        // Try again in 1 second
        this.time.delayedCall(1000, () => {
          this.playRandomTrack();
        });
        return;
    }
    
    // Pick random track from available tracks
    const nextTrack = Phaser.Utils.Array.GetRandom(availableTracks);
    
    console.log('✓ Selected next track:', nextTrack.title, 'by', nextTrack.artist, `(${nextTrack.key})`);
    
    this.playSpecificTrack(nextTrack);
  }
  showNowPlaying(track) {
      const { width } = this.scale;
      
      // Position moved down to 150 to sit below the pause button
      const container = this.add.container(width, 150);
      
      const bg = this.add.rectangle(0, 0, 320, 80, 0x000000, 0.7);
      bg.setStrokeStyle(2, 0x00ffff);
      bg.setOrigin(1, 0.5);
      
      // Truncate title if too long (max 30 characters)
      let displayTitle = track.title;
      if (displayTitle.length > 30) {
          displayTitle = displayTitle.substring(0, 27) + '...';
      }
      
      const titleText = this.add.text(-20, -15, '♪ ' + displayTitle, {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: '#00ffff',
          fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      
      // Truncate artist if too long (max 25 characters)
      let displayArtist = track.artist;
      if (displayArtist.length > 25) {
          displayArtist = displayArtist.substring(0, 22) + '...';
      }
      
      const artistText = this.add.text(-20, 15, displayArtist, {
          fontSize: '16px',
          fontFamily: 'Arial',
          color: '#cccccc'
      }).setOrigin(1, 0.5);
      
      container.add([bg, titleText, artistText]);
      container.setDepth(2000);
      
      // Add hover interactions to the container (using bg as the hit area)
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
          this.tweens.add({
              targets: container,
              scale: 1.05,
              duration: 200,
              ease: 'Back.easeOut'
          });
          this.sound.play('menu-click', { volume: 0.3 });
      });
      bg.on('pointerout', () => {
          this.tweens.add({
              targets: container,
              scale: 1,
              duration: 200,
              ease: 'Back.easeOut'
          });
      });
      
      // Slide in
      this.tweens.add({
          targets: container,
          x: width - 20,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => {
              // Slide out after delay
              this.time.delayedCall(4000, () => {
                  this.tweens.add({
                      targets: container,
                      x: width + 400,
                      duration: 1000,
                      ease: 'Power2',
                      onComplete: () => container.destroy()
                  });
              });
          }
      });
  }
  showPauseMenu() {
    const { width, height } = this.scale;
    
    // Dark overlay
    this.pauseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.pauseOverlay.setDepth(1500);
    
    // Pause title
    this.pauseTitle = this.add.text(width / 2, height * 0.3, 'PAUSED', {
      fontSize: '80px',
      fontFamily: 'Impact, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    });
    this.pauseTitle.setOrigin(0.5);
    this.pauseTitle.setDepth(1501);
    this.pauseTitle.setInteractive({ useHandCursor: true });
    this.pauseTitle.on('pointerover', () => {
        this.tweens.add({ targets: this.pauseTitle, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.pauseTitle.on('pointerout', () => {
        this.tweens.add({ targets: this.pauseTitle, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // Resume button
    const resumeButton = this.add.ellipse(width / 2, height * 0.45, 280, 70, 0x00ff00);
    resumeButton.setInteractive({ useHandCursor: true });
    resumeButton.setDepth(1501);
    
    const resumeText = this.add.text(width / 2, height * 0.45, 'RESUME', {
      fontSize: '36px',
      fontFamily: 'Impact, Arial',
      color: '#000000',
      fontStyle: 'bold'
    });
    resumeText.setOrigin(0.5);
    resumeText.setDepth(1502);
    
    resumeButton.on('pointerover', () => {
      this.tweens.add({ targets: [resumeButton, resumeText], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    resumeButton.on('pointerout', () => {
      this.tweens.add({ targets: [resumeButton, resumeText], scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    resumeButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.togglePause();
    });
    // Restart button
    const restartButton = this.add.ellipse(width / 2, height * 0.575, 280, 70, 0x00ffff);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.setDepth(1501);
    
    const restartText = this.add.text(width / 2, height * 0.575, 'RESTART', {
      fontSize: '36px',
      fontFamily: 'Impact, Arial',
      color: '#000000',
      fontStyle: 'bold'
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(1502);
    
    restartButton.on('pointerover', () => {
      this.tweens.add({ targets: [restartButton, restartText], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    restartButton.on('pointerout', () => {
      this.tweens.add({ targets: [restartButton, restartText], scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    restartButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.scene.restart();
    });
    
    // Main Menu button
    const menuButton = this.add.ellipse(width / 2, height * 0.70, 280, 70, 0xff0066);
    menuButton.setInteractive({ useHandCursor: true });
    menuButton.setDepth(1501);
    
    const menuText = this.add.text(width / 2, height * 0.70, 'MAIN MENU', {
      fontSize: '36px',
      fontFamily: 'Impact, Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    menuText.setOrigin(0.5);
    menuText.setDepth(1502);
    
    menuButton.on('pointerover', () => {
      this.tweens.add({ targets: [menuButton, menuText], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    menuButton.on('pointerout', () => {
      this.tweens.add({ targets: [menuButton, menuText], scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    menuButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      
      // Stop warning alarm immediately
      if (this.warningAlarm) this.warningAlarm.stop();
      
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('MenuScene');
      });
    });
    
    this.pauseMenuElements = [
        this.pauseOverlay, this.pauseTitle, 
        resumeButton, resumeText, 
        restartButton, restartText,
        menuButton, menuText
    ];
    
    // Resume tweens so hover effects work on pause menu
    this.tweens.resumeAll();
  }
  
  hidePauseMenu() {
    if (this.pauseMenuElements) {
      this.pauseMenuElements.forEach(element => element.destroy());
      this.pauseMenuElements = null;
    }
  }
  
  togglePlaylistDisplay() {
    if (this.playlistDisplayVisible) {
      this.hidePlaylistDisplay();
    } else {
      this.showPlaylistDisplay();
    }
  }
  
  showPlaylistDisplay() {
    if (this.playlistDisplayVisible) return;
    this.playlistDisplayVisible = true;
    
    const { width, height } = this.scale;
    
    // Create container for playlist
    this.playlistContainer = this.add.container(0, 0);
    this.playlistContainer.setDepth(2500);
    
    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.hidePlaylistDisplay());
    this.playlistContainer.add(backdrop);
    
    // Playlist panel
    const panelWidth = Math.min(550, width - 40);
    const panelHeight = Math.min(650, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;
    
    const panelBg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x050505, 0.98);
    panelBg.setStrokeStyle(3, 0x9d00ff);
    this.playlistContainer.add(panelBg);
    
    // Title
    const titleText = this.add.text(panelX, panelY - panelHeight / 2 + 35, 'Playlist Tracklist', {
      fontSize: '32px',
      fontFamily: 'Impact, Arial',
      color: '#9d00ff',
      fontStyle: 'bold',
      shadow: { blur: 10, color: '#9d00ff', fill: true }
    });
    titleText.setOrigin(0.5);
    titleText.setInteractive({ useHandCursor: true });
    this.playlistContainer.add(titleText);
    
    // Title Hover Effect
    titleText.on('pointerover', () => {
        this.tweens.add({
            targets: titleText,
            scale: 1.1,
            duration: 150,
            ease: 'Back.easeOut'
        });
        this.sound.play('menu-click', { volume: 0.3 });
    });
    titleText.on('pointerout', () => {
        this.tweens.add({
            targets: titleText,
            scale: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });
    });
    
    // Close button (X)
    const closeBtn = this.add.text(panelX + panelWidth / 2 - 25, panelY - panelHeight / 2 + 25, '✕', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hidePlaylistDisplay());
    this.playlistContainer.add(closeBtn);
    
    // Block 5: search input over the panel (DOM element, canvas-positioned).
    // Filters this.playlist live; empty query restores the full list.
    const searchAnchor = this.add.rectangle(panelX, panelY - panelHeight / 2 + 68, panelWidth - 80, 30, 0x000000, 0);
    this.playlistContainer.add(searchAnchor);
    this._playlistSearchAnchor = searchAnchor;
    this._createPlaylistSearchInput();
    
    // Track list area (nudged down to fit the search bar)
    const listStartY = panelY - panelHeight / 2 + 108;
    const trackSpacing = 48;
    
    // Entries live in their own sub-container so search can rebuild them
    this.playlistEntriesContainer = this.add.container(0, 0);
    this.playlistContainer.add(this.playlistEntriesContainer);
    this._playlistLayout = { panelX, panelY, panelWidth, panelHeight, listStartY, trackSpacing };
    this._buildPlaylistEntries(this.playlist);
    
    // Slide in animation
    this.playlistContainer.setAlpha(0);
    this.playlistContainer.setScale(0.95);
    this.tweens.add({
      targets: this.playlistContainer,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }
  
  /** Block 5: (re)build the playlist rows for the given (possibly filtered) tracks. */
  _buildPlaylistEntries(tracks) {
    if (!this.playlistEntriesContainer || !this._playlistLayout) return;
    this.playlistEntriesContainer.removeAll(true);
    const { panelX, panelY, panelWidth, panelHeight, listStartY, trackSpacing } = this._playlistLayout;
    
    if (!tracks.length) {
      const none = this.add.text(panelX, listStartY + 40, 'No matching tracks', {
        fontSize: '18px', fontFamily: 'Arial', color: '#ffff00'
      }).setOrigin(0.5);
      this.playlistEntriesContainer.add(none);
      return;
    }
    
    tracks.forEach((track, index) => {
      const trackY = listStartY + (index * trackSpacing);
      
      // Basic vertical overflow check
      if (trackY > panelY + panelHeight / 2 - 50) return;
      
      const isCurrentTrack = track.key === this.currentTrackKey;
      const trackColor = isCurrentTrack ? '#00ff00' : '#ffffff';
      const trackBgColor = isCurrentTrack ? 0x00ff00 : 0x222222;
      const trackBgAlpha = isCurrentTrack ? 0.35 : 0.15;
      
      // Track background highlight (larger hit area)
      const trackBg = this.add.rectangle(panelX, trackY, panelWidth - 40, 42, trackBgColor, trackBgAlpha);
      trackBg.setStrokeStyle(isCurrentTrack ? 2 : 1, isCurrentTrack ? 0x00ff00 : 0x444444);
      this.playlistEntriesContainer.add(trackBg);
      
      // Now Playing indicator
      let displayText = isCurrentTrack ? '▶ ' : '  ';
      displayText += track.title;
      
      const trackText = this.add.text(panelX - panelWidth / 2 + 40, trackY - 9, displayText, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: trackColor,
        fontStyle: isCurrentTrack ? 'bold' : 'normal'
      });
      trackText.setOrigin(0, 0.5);
      this.playlistEntriesContainer.add(trackText);
      
      // Artist name
      const artistText = this.add.text(panelX - panelWidth / 2 + 55, trackY + 11, track.artist, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: isCurrentTrack ? '#00ff00' : '#888888'
      });
      artistText.setOrigin(0, 0.5);
      this.playlistEntriesContainer.add(artistText);
      
      // Input handling
      trackBg.setInteractive({ useHandCursor: true });
      trackBg.on('pointerover', () => {
        if (!isCurrentTrack) {
            trackBg.setFillStyle(0x9d00ff, 0.25);
            this.tweens.add({
                targets: [trackBg, trackText, artistText],
                scaleX: 1.02,
                duration: 100,
                ease: 'Power1'
            });
        }
        this.sound.play('menu-click', { volume: 0.15 });
      });
      trackBg.on('pointerout', () => {
        trackBg.setFillStyle(trackBgColor, trackBgAlpha);
        this.tweens.add({
            targets: [trackBg, trackText, artistText],
            scaleX: 1,
            duration: 100,
            ease: 'Power1'
        });
      });
      trackBg.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.2 });
        this.playSpecificTrack(track);
        this.hidePlaylistDisplay();
        // Resume game if it was paused to open playlist
        if (this.isPaused) {
           this.togglePause();
        }
      });
    });
  }
  
  /** Block 5: DOM search input for the playlist overlay (canvas-positioned). */
  _createPlaylistSearchInput() {
    this._removePlaylistSearchInput();
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '🔎 search tracks…';
    input.autocomplete = 'off';
    input.style.position = 'absolute';
    input.style.zIndex = '1000';
    input.style.background = 'rgba(0,0,0,0.85)';
    input.style.border = '2px solid #9d00ff';
    input.style.borderRadius = '6px';
    input.style.color = '#ffffff';
    input.style.fontFamily = 'Arial, sans-serif';
    input.style.fontSize = '14px';
    input.style.padding = '2px 8px';
    input.style.outline = 'none';
    document.body.appendChild(input);
    this._playlistSearchEl = input;
    
    const applyFilter = () => {
      const q = input.value;
      const filtered = search(this.playlist, q, [{ name: 'title', weight: 2 }, { name: 'artist', weight: 1 }]);
      this._buildPlaylistEntries(filtered);
    };
    input.addEventListener('keyup', applyFilter);
    input.addEventListener('input', applyFilter); // covers the ✕ clear button
    // Keyboard gameplay input must not steal characters while typing
    input.addEventListener('keydown', (e) => e.stopPropagation());
    
    this._syncPlaylistSearchPosition();
    setTimeout(() => input.focus(), 50);
  }
  
  _syncPlaylistSearchPosition() {
    const input = this._playlistSearchEl, anchor = this._playlistSearchAnchor;
    if (!input || !anchor || !anchor.active || !this.scale?.canvas) return;
    const canvasBounds = this.scale.canvas.getBoundingClientRect();
    const b = anchor.getBounds();
    const sx = canvasBounds.width / this.scale.width;
    const sy = canvasBounds.height / this.scale.height;
    input.style.left = `${canvasBounds.left + b.x * sx}px`;
    input.style.top = `${canvasBounds.top + b.y * sy}px`;
    input.style.width = `${b.width * sx}px`;
    input.style.height = `${b.height * sy}px`;
  }
  
  _removePlaylistSearchInput() {
    if (this._playlistSearchEl) { this._playlistSearchEl.remove(); this._playlistSearchEl = null; }
    this._playlistSearchAnchor = null;
  }
  
  hidePlaylistDisplay() {
    if (!this.playlistDisplayVisible) return;
    this.playlistDisplayVisible = false;
    this._removePlaylistSearchInput();
    
    if (this.playlistContainer) {
      this.tweens.add({
        targets: this.playlistContainer,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => {
          if (this.playlistContainer) {
            this.playlistContainer.destroy();
            this.playlistContainer = null;
          }
        }
      });
    }
  }
  
  createLowHealthEffect() {
    const { width, height } = this.scale;
    
    // Red vignette for low health
    this.lowHealthOverlay = this.add.graphics();
    this.lowHealthOverlay.fillGradientStyle(0xff0000, 0xff0000, 0xff0000, 0xff0000, 0.6, 0, 0, 0.6);
    this.lowHealthOverlay.fillRect(0, 0, width, height);
    this.lowHealthOverlay.setBlendMode(Phaser.BlendModes.ADD);
    this.lowHealthOverlay.setDepth(1900); // Below pause menu/game over but above game
    this.lowHealthOverlay.setAlpha(0);
    
    // Warning Text
    this.lowHealthText = this.add.text(width / 2, height * 0.2, '⚠ LOW HEALTH ⚠', {
        fontSize: '48px',
        fontFamily: 'Impact, Arial',
        color: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 4
    });
    this.lowHealthText.setOrigin(0.5);
    this.lowHealthText.setDepth(1901);
    this.lowHealthText.setAlpha(0);
    this.lowHealthText.setInteractive({ useHandCursor: true });
    
    // Low Health Text Interactions
    this.lowHealthText.on('pointerover', () => {
        this.tweens.add({
            targets: this.lowHealthText,
            scale: 1.2,
            duration: 150,
            ease: 'Back.easeOut'
        });
        this.sound.play('menu-click', { volume: 0.3 });
    });
    
    this.lowHealthText.on('pointerout', () => {
        this.tweens.add({
            targets: this.lowHealthText,
            scale: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });
    });
    
    this.lowHealthText.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.4 });
        // Maybe some additional effect when clicking warning? 
        this.cameras.main.shake(200, 0.01);
    });
    
    // Create alarm sound (don't play yet)
    this.warningAlarm = this.sound.add('severe-warning', { loop: true, volume: 0.65 });
    
    // Pulse animation
    this.lowHealthTween = this.tweens.add({
        targets: this.lowHealthOverlay,
        alpha: { from: 0.1, to: 0.4 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        paused: true
    });
    
    this.lowHealthTextTween = this.tweens.add({
        targets: this.lowHealthText,
        alpha: { from: 0.5, to: 1 },
        scale: { from: 1, to: 1.1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        paused: true
    });
  }
  setLowHealthState(active) {
      if (this.isLowHealth === active) return;
      this.isLowHealth = active;
      
      if (active) {
          if (this.lowHealthTween) this.lowHealthTween.play();
          if (this.lowHealthTextTween) this.lowHealthTextTween.play();
          this.lowHealthOverlay.setVisible(true);
          this.lowHealthText.setVisible(true);
          
          // Start Warning Alarm on loop
          if (this.warningAlarm && !this.warningAlarm.isPlaying) {
              this.warningAlarm.play();
          }
          
          // Initial alert shake
          this.cameras.main.shake(300, 0.01);
      } else {
          // Check if tweens are playing before pausing to prevent errors after killAll()
          if (this.lowHealthTween && this.lowHealthTween.isPlaying()) this.lowHealthTween.pause();
          if (this.lowHealthTextTween && this.lowHealthTextTween.isPlaying()) this.lowHealthTextTween.pause();
          
          this.lowHealthOverlay.setAlpha(0);
          this.lowHealthText.setAlpha(0);
          this.lowHealthOverlay.setVisible(false);
          this.lowHealthText.setVisible(false);
          
          // Stop Warning Alarm
          if (this.warningAlarm && this.warningAlarm.isPlaying) {
              this.warningAlarm.stop();
          }
      }
  }
  
  playPlayerDeath() {
      this.isDying = true;
      
      // Close playlist display if open
      this.hidePlaylistDisplay();
      
      // Play death sound
      this.sound.play('player-death', { volume: 0.6 });
      
      // Stop gameplay systems immediately
      this.rhythmSystem.stop();
      this.physics.pause();
      
      // Disable low health effect safely BEFORE killing all tweens
      this.setLowHealthState(false);
      
      // Kill all existing tweens to clear the stage for the death sequence
      this.tweens.killAll(); 
      
      if (this.currentTrack) {
          this.currentTrack.stop();
      }
      
      // Dramatic Death Sound Simulation
      this.cameras.main.flash(500, 255, 0, 0); // Red flash
      this.cameras.main.shake(500, 0.02);
      
      const playerSprite = this.player.sprite;
      const playerGlow = this.player.glow;
      
      // Ensure player is on top for the finale
      playerSprite.setDepth(2000);
      playerGlow.setDepth(1999);
      
      // --- PHASE 1: The Ascension (0s - 1.5s) ---
      // Player turns red and floats up slowly
      this.tweens.add({
          targets: [playerSprite, playerGlow],
          y: playerSprite.y - 150,
          rotation: 0.5,
          scale: 1.3,
          tint: 0xff0000,
          duration: 1500,
          ease: 'Sine.easeInOut'
      });
      
      // --- PHASE 2: Destabilization (1.5s - 3.0s) ---
      // Rapid shaking and flickering to simulate data corruption
      this.time.delayedCall(1500, () => {
          // Shake side to side violently
          this.tweens.add({
              targets: [playerSprite, playerGlow],
              x: '+=15', 
              yoyo: true,
              duration: 50,
              repeat: 28 // ~1.5 seconds of shaking
          });
          
          // Flicker visibility
          this.tweens.add({
              targets: [playerSprite, playerGlow],
              alpha: 0.3,
              yoyo: true,
              duration: 80,
              repeat: 18
          });
      });
      
      // --- PHASE 3: The Shatter (3.0s - 4.0s) ---
      // Explode into particles and vanish
      this.time.delayedCall(3000, () => {
          // Create explosion particles
          for (let i = 0; i < 40; i++) {
              const p = this.add.circle(playerSprite.x, playerSprite.y, Phaser.Math.Between(4, 8), 0xff0000);
              p.setDepth(2001);
              
              this.tweens.add({
                  targets: p,
                  x: playerSprite.x + Phaser.Math.Between(-300, 300),
                  y: playerSprite.y + Phaser.Math.Between(-300, 300),
                  alpha: 0,
                  scale: 0,
                  duration: 1000,
                  ease: 'Expo.easeOut'
              });
          }
          
          // Collapse into a singularity (shrink to 0 with fast spin)
          this.tweens.add({
              targets: [playerSprite, playerGlow],
              scale: 0,
              rotation: 10, // Fast spin
              alpha: 0,
              duration: 900,
              ease: 'Back.easeIn',
              onComplete: () => {
                  // Final death confirmed - show game over screen
                  this.gameOver();
              }
          });
      });
  }
  gameOver() {
      // Clear low health effect
      this.setLowHealthState(false);
      
      // Ensure systems are stopped (redundant safety if coming from playPlayerDeath)
      this.rhythmSystem.stop();
      this.physics.pause();
      
      // Don't pause tweens here if we just finished the death animation, 
      // but we do want to stop any lingering effects
      // this.tweens.pauseAll(); 
      
      if (this.currentTrack && this.currentTrack.isPlaying) {
          this.currentTrack.stop();
      }
      // Save high score and total enemies
      const currentHighScore = parseInt(localStorage.getItem('shuffleRushHighScore') || '0');
      if (this.score > currentHighScore) {
          localStorage.setItem('shuffleRushHighScore', this.score.toString());
      }
      
      const currentTotalEnemies = parseInt(localStorage.getItem('shuffleRushTotalEnemies') || '0');
      localStorage.setItem('shuffleRushTotalEnemies', (currentTotalEnemies + this.enemiesDefeated).toString());
      
      // Block 7: submit the run to the leaderboard (local list always; remote
      // only when InstantDB is configured) with the ghost replay attached.
      if (this.replayRecorder && this.score > 0) {
          const replay = this.replayRecorder.finish();
          LeaderboardService.submitScore({
              name: 'PLAYER', score: this.score, enemies: this.enemiesDefeated, replay
          }).catch(e => console.warn('leaderboard submit failed:', e));
          this.replayRecorder = null;
      }
      
      const { width, height } = this.scale;
      
      // Play game over sound
      this.sound.play('game-over', { volume: 0.5 });
      
      // Dark overlay
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
      overlay.setDepth(2000);
      const gameOverText = this.add.text(width / 2, height * 0.3, 'GAME OVER', {
          fontSize: '80px',
          fontFamily: 'Impact, Arial',
          color: '#ff0000',
          stroke: '#ffffff',
          strokeThickness: 6
      });
      gameOverText.setOrigin(0.5);
      gameOverText.setDepth(2001);
      gameOverText.setInteractive({ useHandCursor: true });
      gameOverText.on('pointerover', () => {
          this.tweens.add({ targets: gameOverText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      gameOverText.on('pointerout', () => {
          this.tweens.add({ targets: gameOverText, scale: 1, duration: 150, ease: 'Back.easeOut' });
      });
      
      const finalScoreText = this.add.text(width / 2, height * 0.45, `FINAL SCORE: ${this.score}`, {
          fontSize: '40px',
          fontFamily: 'Arial',
          color: '#ffffff'
      });
      finalScoreText.setOrigin(0.5);
      finalScoreText.setDepth(2001);
      finalScoreText.setInteractive({ useHandCursor: true });
      finalScoreText.on('pointerover', () => {
          this.tweens.add({ targets: finalScoreText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      finalScoreText.on('pointerout', () => {
          this.tweens.add({ targets: finalScoreText, scale: 1, duration: 150, ease: 'Back.easeOut' });
      });
      
      // Show if new high score
      const highScore = parseInt(localStorage.getItem('shuffleRushHighScore') || '0');
      if (this.score >= highScore) {
          const newHighScoreText = this.add.text(width / 2, height * 0.52, '★ NEW HIGH SCORE! ★', {
              fontSize: '36px',
              fontFamily: 'Impact, Arial',
              color: '#ffff00',
              stroke: '#ff0000',
              strokeThickness: 4
          });
          newHighScoreText.setOrigin(0.5);
          newHighScoreText.setDepth(2001);
          
          this.tweens.add({
              targets: newHighScoreText,
              scale: { from: 1, to: 1.15 },
              duration: 500,
              yoyo: true,
              repeat: -1
          });
      }
      
      const restartButton = this.add.ellipse(width / 2, height * 0.65, 280, 70, 0x00ff00);
      restartButton.setInteractive({ useHandCursor: true });
      restartButton.setDepth(2001);
      const restartText = this.add.text(width / 2, height * 0.65, 'TRY AGAIN', {
          fontSize: '36px',
          fontFamily: 'Impact, Arial',
          color: '#000000',
          fontStyle: 'bold'
      });
      restartText.setOrigin(0.5);
      restartText.setDepth(2002);
      
      restartButton.on('pointerover', () => {
          this.tweens.add({ targets: [restartButton, restartText], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      restartButton.on('pointerout', () => {
          this.tweens.add({ targets: [restartButton, restartText], scale: 1, duration: 150, ease: 'Back.easeOut' });
      });
      
    restartButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.scene.restart();
      });
      const menuButton = this.add.ellipse(width / 2, height * 0.8, 280, 70, 0xff0066);
      menuButton.setInteractive({ useHandCursor: true });
      menuButton.setDepth(2001);
      const menuText = this.add.text(width / 2, height * 0.8, 'MAIN MENU', {
          fontSize: '36px',
          fontFamily: 'Impact, Arial',
          color: '#ffffff',
          fontStyle: 'bold'
      });
      menuText.setOrigin(0.5);
      menuText.setDepth(2002);
      
      menuButton.on('pointerover', () => {
          this.tweens.add({ targets: [menuButton, menuText], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      menuButton.on('pointerout', () => {
          this.tweens.add({ targets: [menuButton, menuText], scale: 1, duration: 150, ease: 'Back.easeOut' });
      });
      
    menuButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      
      // Stop warning alarm immediately
      if (this.warningAlarm) this.warningAlarm.stop();
      
      this.scene.start('MenuScene');
      });
      
      // --- LEADERBOARD SUBMISSION (RIGHT SIDE) ---
      const rightX = width * 0.85;
      const submissionTitle = this.add.text(rightX, height * 0.42, 'LEADERBOARD NAME HERE', {
          fontSize: '24px',
          fontFamily: 'Impact, sans-serif',
          color: '#ffff00',
          stroke: '#ff00ff',
          strokeThickness: 4
      }).setOrigin(0.5).setDepth(2001);

      // Arcade-style glowing box
      const nameBg = this.add.rectangle(rightX, height * 0.52, 200, 60, 0x000000).setDepth(2001);
      nameBg.setStrokeStyle(4, 0x00ffff);
      
      // Box glow effect
      this.tweens.add({
          targets: nameBg,
          lineWidth: 6,
          alpha: 0.8,
          duration: 500,
          yoyo: true,
          repeat: -1
      });
      
      let playerName = 'PLAYER';
      const nameDisplay = this.add.text(rightX, height * 0.52, playerName, {
          fontSize: '32px',
          fontFamily: 'Impact, Arial',
          color: '#ffffff',
          letterSpacing: 4
      }).setOrigin(0.5).setDepth(2002);
      
      // Cursor for arcade feel
      const cursor = this.add.text(rightX, height * 0.52 + 25, '_', {
          fontSize: '24px',
          color: '#00ffff'
      }).setOrigin(0.5).setDepth(2002);
      
      this.tweens.add({
          targets: cursor,
          alpha: 0,
          duration: 400,
          yoyo: true,
          repeat: -1
      });

      let isEditing = false;
      
      // Create HTML Input Helper
      const createHTMLInput = (x, y, width, height, initialValue) => {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = initialValue === 'PLAYER' ? '' : initialValue;
          input.placeholder = 'ENTER NAME';
          input.maxLength = 10;
          
          // Style to match game aesthetic
          input.style.position = 'absolute';
          input.style.left = `${x - width/2}px`;
          input.style.top = `${y - height/2}px`;
          input.style.width = `${width}px`;
          input.style.height = `${height}px`;
          input.style.background = '#000000';
          input.style.color = '#ffffff';
          input.style.border = '2px solid #00ffff';
          input.style.fontFamily = 'Impact, sans-serif';
          input.style.fontSize = '24px';
          input.style.textAlign = 'center';
          input.style.outline = 'none';
          input.style.zIndex = '10000';
          input.style.textTransform = 'uppercase';
          
          document.body.appendChild(input);
          
          // Force focus immediately
          setTimeout(() => {
              input.focus();
              input.click(); // Help trigger keyboard on some mobile browsers
          }, 10);
          
          return input;
      };

      nameBg.setInteractive({ useHandCursor: true });
      nameBg.on('pointerdown', () => {
          if (isEditing) return;
          isEditing = true;
          this.sound.play('menu-click', { volume: 0.3 });
          nameBg.setStrokeStyle(4, 0xff00ff); // Highlight editing
          nameDisplay.setVisible(false); // Hide Phaser text while editing
          cursor.setVisible(false);
          
          // Calculate screen position for DOM element
          // We need to account for canvas scaling/positioning in the DOM
          const canvas = this.game.canvas;
          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width / this.scale.width;
          const scaleY = rect.height / this.scale.height;
          
          const domX = rect.left + (rightX * scaleX);
          const domY = rect.top + (height * 0.52 * scaleY);
          const domWidth = 200 * scaleX;
          const domHeight = 60 * scaleY;
          
          const inputElement = createHTMLInput(domX, domY, domWidth, domHeight, playerName);
          
          // Handle blur/enter to finish editing
          const finishEditing = () => {
              if (!isEditing) return; // Already finished
              
              const val = inputElement.value.toUpperCase().substring(0, 10).trim();
              playerName = val === '' ? 'PLAYER' : val;
              nameDisplay.setText(playerName);
              
              // Cleanup
              if (document.body.contains(inputElement)) {
                  document.body.removeChild(inputElement);
              }
              
              isEditing = false;
              nameDisplay.setVisible(true);
              nameBg.setStrokeStyle(4, 0x00ffff);
              cursor.setVisible(false); // Hide cursor when done
          };
          
          inputElement.addEventListener('blur', () => {
              // Small delay to allow click events on submit button to register first
              setTimeout(finishEditing, 200);
          });
          
          inputElement.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                  inputElement.blur();
              }
          });
      });

      const submitBtn = this.add.rectangle(rightX, height * 0.65, 180, 50, 0xff00ff).setDepth(2001);
      submitBtn.setStrokeStyle(3, 0xffffff);
      submitBtn.setInteractive({ useHandCursor: true });
      
      const submitText = this.add.text(rightX, height * 0.65, 'SAVE SCORE', {
          fontSize: '22px',
          fontFamily: 'Impact',
          color: '#ffffff'
      }).setOrigin(0.5).setDepth(2002);

      submitBtn.on('pointerover', () => {
          this.tweens.add({ targets: [submitBtn, submitText], scale: 1.1, duration: 100 });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      submitBtn.on('pointerout', () => {
          this.tweens.add({ targets: [submitBtn, submitText], scale: 1, duration: 100 });
      });
      submitBtn.on('pointerdown', () => {
          if (isEditing) return;
          this.sound.play('successful-hit', { volume: 0.5 });
          
          // Save to Leaderboard
          const leaderboard = JSON.parse(localStorage.getItem('shuffleRushLeaderboard') || '[]');
          leaderboard.push({
              name: playerName,
              score: this.score,
              enemies: this.enemiesDefeated,
              date: new Date().toLocaleDateString()
          });
          
          // Sort and keep top 10
          leaderboard.sort((a, b) => b.score - a.score);
          localStorage.setItem('shuffleRushLeaderboard', JSON.stringify(leaderboard.slice(0, 10)));
          
          // Visual feedback
          submitText.setText('RECORDED!');
          submitBtn.setFillStyle(0x00ff00);
          submitBtn.disableInteractive();
          nameBg.disableInteractive();
          cursor.destroy();
          
        this.showFeedback('ARCADE LEGEND!', 0x00ff00);
    });
}

celebrateHighScore() {
      const { width, height } = this.scale;
      
      // SCREEN SHAKE
      this.cameras.main.shake(800, 0.015);
      
      // CONFETTI EXPLOSION
      this.createConfetti();
      
      // "NEW HIGH SCORE!" text explosion
      const celebrationText = this.add.text(
          width / 2,
          height * 0.25,
          '★ NEW HIGH SCORE! ★',
          {
              fontSize: '64px',
              fontFamily: 'Impact, Arial',
              color: '#ffff00',
              stroke: '#ff0000',
              strokeThickness: 6,
              shadow: {
                  offsetX: 0,
                  offsetY: 0,
                  color: '#ffff00',
                  blur: 20,
                  fill: true
              }
          }
      );
      celebrationText.setOrigin(0.5);
      celebrationText.setScale(0);
      celebrationText.setDepth(1500);
      
      // Text animation
      this.tweens.add({
          targets: celebrationText,
          scale: 1.3,
          duration: 400,
          ease: 'Back.easeOut',
          onComplete: () => {
              // Pulse effect
              this.tweens.add({
                  targets: celebrationText,
                  scale: { from: 1.3, to: 1.5 },
                  duration: 400,
                  yoyo: true,
                  repeat: 2,
                  onComplete: () => {
                      // Fade out
                      this.tweens.add({
                          targets: celebrationText,
                          alpha: 0,
                          y: celebrationText.y - 50,
                          duration: 600,
                          ease: 'Cubic.easeIn',
                          onComplete: () => celebrationText.destroy()
                      });
                  }
              });
          }
      });
      
      // Flash effect with bright colors
      this.cameras.main.flash(300, 255, 255, 0);
  }
  
  increaseTempo() {
      // Cap at 300 BPM
      if (this.currentBPM >= 300) return;
      
      this.currentBPM += 10;
      this.rhythmSystem.setBPM(this.currentBPM);
      
      // Visual feedback
      const { width, height } = this.scale;
      const bpmText = this.add.text(
        width / 2,
        height * 0.3,
        `SPEED UP!\n${this.currentBPM} BPM`,
        {
          fontSize: '64px',
          fontFamily: 'Impact, Arial',
          color: '#00ffff', // Cyan for speed
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center',
          shadow: { color: '#00ffff', blur: 10, fill: true }
        }
      );
      bpmText.setOrigin(0.5);
      bpmText.setAlpha(0);
      bpmText.setDepth(2000);
      
      this.tweens.add({
        targets: bpmText,
        alpha: 1,
        scale: { from: 0.5, to: 1.2 },
        angle: { from: -5, to: 5 },
        duration: 400,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 800,
        onComplete: () => bpmText.destroy()
      });
      
      // Sound effect visual (Screen flash)
      this.cameras.main.flash(200, 0, 255, 255);
  }
  createConfetti() {
      const { width, height } = this.scale;
      const confettiColors = [
          0xff0066, // Hot Pink
          0x00ffff, // Cyan
          0xffff00, // Yellow
          0xff00ff, // Magenta
          0x00ff00, // Green
          0xff9900  // Orange
      ];
      
      // Create 100 confetti pieces
      for (let i = 0; i < 100; i++) {
          const startX = width / 2 + Phaser.Math.Between(-200, 200);
          const startY = height * 0.3;
          
          const confetti = this.add.rectangle(
              startX,
              startY,
              Phaser.Math.Between(8, 15),
              Phaser.Math.Between(8, 15),
              Phaser.Utils.Array.GetRandom(confettiColors)
          );
          confetti.setDepth(1400);
          confetti.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          
          // Explosion outward then fall down
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const velocity = Phaser.Math.Between(200, 500);
          const targetX = startX + Math.cos(angle) * velocity;
          const targetY = height + 100;
          
          // Outward explosion
          this.tweens.add({
              targets: confetti,
              x: targetX,
              y: startY + Math.sin(angle) * velocity * 0.5,
              rotation: Phaser.Math.FloatBetween(-Math.PI * 4, Math.PI * 4),
              duration: Phaser.Math.Between(600, 1000),
              ease: 'Cubic.easeOut',
              onComplete: () => {
                  // Fall down with gravity
                  this.tweens.add({
                      targets: confetti,
                      y: targetY,
                      rotation: confetti.rotation + Phaser.Math.FloatBetween(-Math.PI * 2, Math.PI * 2),
                      duration: Phaser.Math.Between(1500, 2500),
                      ease: 'Cubic.easeIn',
                      onComplete: () => confetti.destroy()
                  });
                  
                  // Side-to-side drift while falling
                  this.tweens.add({
                      targets: confetti,
                      x: confetti.x + Phaser.Math.Between(-150, 150),
                      duration: Phaser.Math.Between(1000, 2000),
                      ease: 'Sine.easeInOut',
                      yoyo: true
                  });
              }
          });
          
          // Fade out
          this.tweens.add({
              targets: confetti,
              alpha: 0,
              duration: Phaser.Math.Between(2500, 3500),
              delay: 500
          });
      }
  }
  
  update() {
    this.updateMarkerPositions();
    this._syncPlaylistSearchPosition();
  }
}

// Block 1 escape hatch: set true to restore the legacy tween-driven marker fall.
GameScene.MARKER_TWEEN_FALLBACK = false;

