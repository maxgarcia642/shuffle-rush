import Phaser from 'phaser';
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
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
  
  restoreCustomImages() {
    // Restore custom static images from registry
    const customImageData = this.registry.get('customImageData') || {};
    const customDancers = this.registry.get('customDancers') || [];
    
    let restoredCount = 0;
    
    customDancers.forEach(key => {
      // Check if this is NOT a GIF (GIFs are handled by restoreGIFAnimations)
      const customAnims = this.registry.get('customAnimations') || {};
      const isGif = customAnims[key] && customAnims[key].frameData;
      
      if (!isGif && customImageData[key]) {
        // This is a static image - restore it if texture doesn't exist
        if (!this.textures.exists(key)) {
          try {
            this.textures.addBase64(key, customImageData[key]);
            restoredCount++;
          } catch (e) {
            console.warn(`Failed to restore custom image ${key}:`, e);
          }
        }
      }
    });
    
    if (restoredCount > 0) {
      console.log(`✓ MenuScene: Restored ${restoredCount} custom images`);
    }
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
          console.log(`✓ MenuScene: Recreated ${animData.frameData.length} frame textures for ${key}`);
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
          console.log(`✓ MenuScene: Restored animation ${animKey} with ${animData.frameKeys.length} frames`);
        } else {
          console.warn(`⚠️ MenuScene: Cannot restore animation ${animKey} - frame textures still missing`);
          console.log(`Missing frames for ${key}:`, animData.frameKeys.filter(fk => !this.textures.exists(fk)));
        }
      }
    });
  }
  
  preload() {
    // Load multiple silhouette variations for dynamic swapping
    this.load.image('beat-circle', 'https://rosebud.ai/assets/beatCircleUI.png?MECs');
    this.load.image('dancer-1', 'https://rosebud.ai/assets/ipod_1.png?Ev5j');
    this.load.image('dancer-3', 'https://rosebud.ai/assets/3416ffd35c26a1752542c0bc288ff84f.png?Eg0q');
    // dancer-5 removed
    // dancer-6 removed
    // dancer-7 removed
    this.load.image('dancer-8', 'https://rosebud.ai/assets/48e6419460e1089bfbbf469f66d5b857.png?6LnL');
    this.load.image('dancer-9', 'https://rosebud.ai/assets/openart-image_5h9r7RHC_1766769844463_raw.png?mBoh');
    this.load.image('dancer-11', 'https://rosebud.ai/assets/openart-image_Cj7r3IF8_1766772364490_raw.png?0YIj');
    this.load.image('dancer-12', 'https://rosebud.ai/assets/openart-image_eC_NokeU_1766772858600_raw.png?1B6r');
    this.load.image('dancer-13', 'https://rosebud.ai/assets/openart-image_bOVZ_q4e_1766769708364_raw.png?JTXh');
    this.load.image('dancer-14', 'https://rosebud.ai/assets/openart-image_ej6hcmYK_1766773004301_raw.png?XBXq');
    // dancer-15 removed
    this.load.image('dancer-16', 'https://rosebud.ai/assets/openart-image_L0o4fC_g_1766769308945_raw.png?qTri');
    this.load.image('dancer-17', 'https://rosebud.ai/assets/openart-image_fN9NwtaK_1766769352930_raw.png?YwNB');
    this.load.image('dancer-18', 'https://rosebud.ai/assets/openart-image_NhN1g02R_1766769862487_raw.png?uDSp');
    this.load.image('dancer-19', 'https://rosebud.ai/assets/openart-image_NAjwcTbH_1766769722191_raw.png?wrmV');
    this.load.image('dancer-20', 'https://rosebud.ai/assets/openart-image_N16K-OfJ_1766769295833_raw.png?sGUk');
    // dancer-21 removed
    this.load.image('dancer-22', 'https://rosebud.ai/assets/openart-image_oa5yTAi5_1766772352539_raw.png?IYcu');
    // dancer-23 removed
    // dancer-24 removed
    this.load.image('dancer-25', 'https://rosebud.ai/assets/openart-image_VrPRs7pd_1766769720970_raw.png?W5Ur');
    // dancer-26 removed
    // dancer-27 removed
    this.load.image('dancer-29', 'https://rosebud.ai/assets/openart-image_1_AKYK0s_1766769096571_raw.png?Sunk');
    this.load.image('dancer-30', 'https://rosebud.ai/assets/e868c390b62d4df3bb1bdd17395fe41e.png?H2PC');
    this.load.image('dancer-32', 'https://rosebud.ai/assets/metro girl.png?t5OE');
    this.load.image('dancer-33', 'https://rosebud.ai/assets/openart-image_k-Mxai4w_1766769199781_raw.png?7hrz');
    this.load.image('dancer-34', 'https://rosebud.ai/assets/openart-image_S1Am0XLb_1766769052493_raw.png?wSCB');
    this.load.image('dancer-35', 'https://rosebud.ai/assets/openart-image_vRQgO9cG_1766768971563_raw.png?O3Mx');
    this.load.image('dancer-36', 'https://rosebud.ai/assets/openart-image_zAZyPC3U_1766768967253_raw.png?AFXg');
    this.load.image('dancer-37', 'https://rosebud.ai/assets/1ef1da67fdd7c4342f74ffd5dcee1c4c (1).png?iT5f');
    this.load.image('dancer-38', 'https://rosebud.ai/assets/openart-image_C28fK6GG_1766802182766_raw.png?uOiT');
    this.load.image('dancer-39', 'https://rosebud.ai/assets/openart-image_L2S8R2Yu_1766801528984_raw.png?B8K5');
    this.load.image('dancer-40', 'https://rosebud.ai/assets/openart-image_qM4ezQai_1766803187306_raw.png?B71T');
    this.load.audio('bgm-menu', 'https://rosebud.ai/assets/Back 2 Back by One Wave.mp3?3fMD');
    this.load.audio('menu-click', 'https://rosebud.ai/assets/Menu Click by Leszek_Szary of freesound_community.mp3?cDI3');
  }
  create() {
    // Upscale built-in dancer assets if needed
    this.upscaleBuiltInDancers();
    
    // Restore custom images from registry
    this.restoreCustomImages();
    
    // Restore GIF animations for this scene
    this.restoreGIFAnimations();
    
    // Seamless Music Logic
    let music = this.sound.get('bgm-menu');
    if (!music) {
        music = this.sound.add('bgm-menu', { loop: true, volume: 0.5 });
        music.play();
    } else if (!music.isPlaying) {
        music.play();
        music.volume = 0.5; // Reset volume in case it was faded out previously
    }
    this.activeDancerImages = []; // Track used images for duplicate prevention
    const { width, height } = this.scale;
    
    // Dynamic color-changing background (iPod commercial style)
    this.colors = [
      { main: 0xff0066, dark: 0x990044 }, // Hot Pink
      { main: 0x00ff99, dark: 0x009966 }, // Electric Green
      { main: 0xff9900, dark: 0xcc6600 }, // Vibrant Orange
      { main: 0x0099ff, dark: 0x0066cc }, // Electric Blue
      { main: 0xff00ff, dark: 0x990099 }  // Magenta
    ];
    this.currentColorIndex = 0;
    
    // Vibrant gradient background (iPod style with energy)
    this.bgGraphics = this.add.graphics();
    this.updateBackground();
    
    // Add center glow
    this.centerGlow = this.add.rectangle(width / 2, height / 2, width * 0.8, height * 0.8, 0xff0066, 0.3);
    this.centerGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Add animated color pulses
    this.colorPulse = this.add.rectangle(width / 2, height / 2, width, height, 0xff0066, 0.15);
    this.tweens.add({
      targets: this.colorPulse,
      alpha: { from: 0.1, to: 0.25 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Pulse the center glow too
    this.tweens.add({
      targets: this.centerGlow,
      alpha: { from: 0.2, to: 0.4 },
      scale: { from: 0.95, to: 1.05 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Change background color every 1.5 seconds (faster!)
    this.time.addEvent({
      delay: 1500,
      callback: () => this.changeBackgroundColor(),
      loop: true
    });
    
    // Add radial gradient overlay
    this.createRadialGradient();
    
    // Add rotating light beams
    this.createLightBeams();
    
    // Add pulsing vignette
    this.createVignette();
    
    // Add floating particle effects
    this.createParticleEffects();
    
    // Add animated screen border glow
    this.createScreenBorderGlow();
    // Create dancing silhouettes (iPod commercial style with real images)
    this.createDancingSilhouettes();
    // Big bold title - SHUFFLE RUSH
    const titleStyle = {
      fontSize: '120px',
      fontFamily: 'Impact, "Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: '4px'
    };
    this.title = this.add.text(width / 2, height * 0.25, 'SHUFFLE\nRUSH', titleStyle);
    this.title.setOrigin(0.5);
    this.title.setAlign('center');
    this.title.setLineSpacing(10);
    this.title.setInteractive({ useHandCursor: true });
    
    // Title hover effect
    this.title.on('pointerover', () => {
        this.tweens.add({ targets: this.title, scale: 1.15, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.title.on('pointerout', () => {
        this.tweens.add({ targets: this.title, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // Subtle title pulse
    this.tweens.add({
      targets: this.title,
      scale: { from: 1, to: 1.02 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Tagline
    const taglineStyle = {
      fontSize: '28px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'normal'
    };
    
    this.tagline = this.add.text(width / 2, height * 0.45, 'Dodge to the Beat. Rush the Rhythm.', taglineStyle);
    this.tagline.setOrigin(0.5);
    this.tagline.setAlpha(0.95);
    
    // Interactive hover pop for Tagline
    this.tagline.setInteractive();
    this.tagline.on('pointerover', () => {
        this.tweens.add({ targets: this.tagline, scale: 1.15, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.tagline.on('pointerout', () => {
        this.tweens.add({ targets: this.tagline, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    // Add smooth 3D levitation to tagline
    this.tweens.add({
      targets: this.tagline,
      y: this.tagline.y - 8,
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.tagline,
      x: this.tagline.x + 5,
      rotation: 0.02,
      duration: 4500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500
    });
    // Glossy white button with pink text (iPod style)
    const buttonBg = this.add.ellipse(width / 2, height * 0.65, 280, 75, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });
    // Glossy highlight on button
    const buttonHighlight = this.add.ellipse(width / 2, height * 0.65 - 8, 240, 30, 0xffffff, 0.4);
    const buttonText = this.add.text(width / 2, height * 0.65, 'START', {
      fontSize: '42px',
      fontFamily: 'Impact, sans-serif',
      color: '#ff0066',
      fontStyle: 'bold'
    });
    buttonText.setOrigin(0.5);

    // Button interactions
    buttonBg.on('pointerover', () => {
      this.tweens.add({
        targets: [buttonBg, buttonHighlight, buttonText],
        scale: 1.08,
        duration: 150,
        ease: 'Back.easeOut'
      });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    buttonBg.on('pointerout', () => {
      this.tweens.add({
        targets: [buttonBg, buttonHighlight, buttonText],
        scale: 1,
        duration: 150
      });
    });
    buttonBg.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.cameras.main.fadeOut(400, 255, 0, 102); // Fade to pink
      
      // Fade out music when starting game
      const music = this.sound.get('bgm-menu');
      if (music && music.isPlaying) {
          this.tweens.add({
              targets: music,
              volume: 0,
              duration: 400
          });
      }
      
      this.time.delayedCall(400, () => {
        if (music) music.stop();
        this.scene.start('GameScene');
      });
    });
    
    // Credits button
    const creditsButton = this.add.text(width - 20, height - 20, 'CREDITS', {
      fontSize: '20px',
      fontFamily: '"Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    creditsButton.setOrigin(1, 1);
    creditsButton.setInteractive({ useHandCursor: true });
    creditsButton.setAlpha(0.7);
    
    creditsButton.on('pointerover', () => {
      creditsButton.setAlpha(1);
      this.tweens.add({
        targets: creditsButton,
        scale: 1.1,
        duration: 150
      });
    });
    
    creditsButton.on('pointerout', () => {
      creditsButton.setAlpha(0.7);
      this.tweens.add({
        targets: creditsButton,
        scale: 1,
        duration: 150
      });
    });
    
    creditsButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.cameras.main.fadeOut(400, 255, 0, 102);
      this.time.delayedCall(400, () => {
        this.scene.start('CreditsScene');
      });
    });
    
    // Instructions at bottom
    // Stats display
    const highScore = parseInt(localStorage.getItem('shuffleRushHighScore') || '0');
    const totalEnemies = parseInt(localStorage.getItem('shuffleRushTotalEnemies') || '0');
    
    const statsStyle = {
      fontSize: '24px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    };
    
    this.statsText = this.add.text(
      width / 2,
      height * 0.78,
      `HIGH SCORE: ${highScore}\nENEMIES DEFEATED: ${totalEnemies}`,
      statsStyle
    );
    this.statsText.setOrigin(0.5);
    this.statsText.setLineSpacing(8);
    this.statsText.setAlpha(0.9);
    
    // Pulse effect for stats (store reference to pause/resume)
    this.statsPulse = this.tweens.add({
      targets: this.statsText,
      scale: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Interactive hover pop for Stats
    this.statsText.setInteractive();
    this.statsText.on('pointerover', () => {
        if (this.statsPulse) this.statsPulse.pause();
        this.tweens.add({ targets: this.statsText, scale: 1.2, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.statsText.on('pointerout', () => {
        this.tweens.add({ 
            targets: this.statsText, 
            scale: 1, 
            duration: 150, 
            ease: 'Back.easeOut',
            onComplete: () => { if (this.statsPulse) this.statsPulse.resume(); }
        });
    });
    
    const instructionsStyle = {
      fontSize: '18px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#ffffff',
      align: 'center'
    };
    
    this.instructions = this.add.text(
      width / 2,
      height * 0.90,
      'Press ANY KEY or TAP to hit the beat!',
      instructionsStyle
    );
    this.instructions.setOrigin(0.5);
    this.instructions.setAlpha(0.85);
    
    // Interactive hover pop for Instructions
    this.instructions.setInteractive();
    this.instructions.on('pointerover', () => {
        this.tweens.add({ targets: this.instructions, scale: 1.15, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    this.instructions.on('pointerout', () => {
        this.tweens.add({ targets: this.instructions, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    // DANCER LAB Button (Bottom Left) - Redesigned Hexagon
    this.createHexButton(150, height - 70, 'DANCER\nLAB', 0x00ffff, () => {
      this.cameras.main.fadeOut(400, 0, 255, 255);
      this.time.delayedCall(400, () => {
        this.scene.start('ImageUploadScene');
      });
    });
    
    // LEADERBOARD Button (Bottom Right) - Rectangle Design
    this.createLeaderboardButton(width - 100, height - 120);
    
    // DONATE Button (Top Right)
    this.createDonateButton(width - 120, 40);
    
    // Fade in
    this.cameras.main.fadeIn(500, 255, 0, 102); // Fade from pink
  }
  
  createHexButton(x, y, label, color, callback) {
    // Hexagon dimensions
    const hexRadius = 70;
    const hexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      hexPoints.push({
        x: Math.cos(angle) * hexRadius,
        y: Math.sin(angle) * hexRadius
      });
    }
    
    const glow = this.add.polygon(x, y, hexPoints, color, 0.4);
    glow.setScale(1.15);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(9);
    
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.6 },
      scale: { from: 1.15, to: 1.25 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    const bg = this.add.polygon(x, y, hexPoints, 0x000000, 0.8);
    bg.setStrokeStyle(4, color, 1);
    bg.setDepth(10);
    bg.setInteractive(new Phaser.Geom.Polygon(hexPoints), Phaser.Geom.Polygon.Contains);
    bg.input.cursor = 'pointer';
    
    const accent = this.add.polygon(x, y, hexPoints, color, 0.15);
    accent.setScale(0.85);
    accent.setDepth(10);
    
    // Offset for Dancer Lab specifically
    const offsetX = (label === 'DANCER\nLAB') ? -55 : 0;
    const offsetY = (label === 'DANCER\nLAB') ? -70 : 0;
    
    const text = this.add.text(x + offsetX, y + offsetY, label, {
      fontSize: (label === 'DANCER\nLAB') ? '28px' : '20px',
      fontFamily: 'Impact, sans-serif',
      color: '#' + color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: -2
    });
    text.setOrigin(0.5);
    text.setDepth(11);
    
    bg.on('pointerover', () => {
      this.tweens.add({ targets: [bg, accent, text], scale: 1.1, duration: 200, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.8, duration: 200 });
      bg.setFillStyle(color, 0.3);
      bg.setStrokeStyle(5, 0xffffff, 1);
      text.setColor('#ffffff');
      this.sound.play('menu-click', { volume: 0.2 });
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({ targets: [bg, accent, text], scale: 1, duration: 200 });
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.4, duration: 200 });
      bg.setFillStyle(0x000000, 0.8);
      bg.setStrokeStyle(4, color, 1);
      text.setColor('#' + color.toString(16).padStart(6, '0'));
    });
    
    bg.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      callback();
    });
  }

  createLeaderboardButton(x, y) {
    const width = 140;
    const height = 80;
    const color = 0xff00ff;
    
    // Glow layer
    const glow = this.add.rectangle(x, y, width + 10, height + 10, color, 0.4);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(9);
    
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.6 },
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Main background
    const bg = this.add.rectangle(x, y, width, height, 0x000000, 0.8);
    bg.setStrokeStyle(4, color, 1);
    bg.setDepth(10);
    bg.setInteractive({ useHandCursor: true });
    
    // Inner accent
    const accent = this.add.rectangle(x, y, width - 10, height - 10, color, 0.15);
    accent.setDepth(10);
    
    // Text positioned more to the left and up
    const text = this.add.text(x + 5, y - 5, 'LEADERBOARD', {
      fontSize: '20px',
      fontFamily: 'Impact, sans-serif',
      color: '#ff00ff',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: -2
    });
    text.setOrigin(0.5);
    text.setDepth(11);
    
    bg.on('pointerover', () => {
      this.tweens.add({ targets: [bg, accent, text], scale: 1.1, duration: 200, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, scaleX: 1.2, scaleY: 1.2, alpha: 0.8, duration: 200 });
      bg.setFillStyle(color, 0.3);
      bg.setStrokeStyle(5, 0xffffff, 1);
      text.setColor('#ffffff');
      this.sound.play('menu-click', { volume: 0.2 });
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({ targets: [bg, accent, text], scale: 1, duration: 200 });
      this.tweens.add({ targets: glow, scaleX: 1, scaleY: 1, alpha: 0.4, duration: 200 });
      bg.setFillStyle(0x000000, 0.8);
      bg.setStrokeStyle(4, color, 1);
      text.setColor('#ff00ff');
    });
    
    bg.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.showLeaderboard();
    });
  }

  showLeaderboard() {
    const { width, height } = this.scale;
    const container = this.add.container(0, 0).setDepth(2000);
    
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85).setInteractive();
    container.add(overlay);
    
    const panelWidth = 550;
    const panelHeight = 650;
    const panel = this.add.rectangle(width/2, height/2, panelWidth, panelHeight, 0x111111);
    panel.setStrokeStyle(4, 0xff00ff);
    container.add(panel);
    
    const title = this.add.text(width/2, height/2 - panelHeight/2 + 50, 'HALL OF FAME', {
        fontSize: '48px',
        fontFamily: 'Impact, sans-serif',
        color: '#ff00ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    title.on('pointerover', () => {
        this.tweens.add({ targets: title, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.3 });
    });
    title.on('pointerout', () => {
        this.tweens.add({ targets: title, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    container.add(title);
    
    // List Mask Area
    const listY = height/2 - panelHeight/2 + 120;
    const listHeight = panelHeight - 220;
    const listMask = this.add.graphics();
    listMask.fillStyle(0xffffff);
    listMask.fillRect(width/2 - panelWidth/2, listY, panelWidth, listHeight);
    listMask.setVisible(false); // Hide the source graphics
    const mask = listMask.createGeometryMask();

    const listContainer = this.add.container(0, 0);
    listContainer.setMask(mask);
    container.add([listMask, listContainer]);

    const refreshList = () => {
        listContainer.removeAll(true);
        const leaderboard = JSON.parse(localStorage.getItem('shuffleRushLeaderboard') || '[]');
        
        if (leaderboard.length === 0) {
            const noData = this.add.text(width/2, height/2, 'NO RECORDS YET', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5);
            listContainer.add(noData);
            return 0;
        } else {
            leaderboard.forEach((entry, i) => {
                const entryY = listY + (i * 45);
                const rankText = this.add.text(width/2 - 200, entryY, `${i+1}.`, { fontSize: '20px', color: '#ff00ff', fontFamily: 'Impact' });
                const nameText = this.add.text(width/2 - 150, entryY, entry.name.toUpperCase(), { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial' });
                const scoreText = this.add.text(width/2 + 150, entryY, entry.score.toLocaleString(), { fontSize: '20px', color: '#00ffff', fontFamily: 'Impact' }).setOrigin(1, 0);
                listContainer.add([rankText, nameText, scoreText]);
            });
            return leaderboard.length * 45;
        }
    };

    let totalListHeight = refreshList();
    
    // Scrolling Logic
    let isDragging = false;
    let startY = 0;
    let startScrollY = 0;

    const onPointerMove = (pointer) => {
        if (!isDragging || totalListHeight <= listHeight) return;
        const diff = pointer.y - startY;
        let newY = startScrollY + diff;
        
        const minY = -(totalListHeight - listHeight);
        if (newY > 0) newY = 0;
        if (newY < minY) newY = minY;
        
        listContainer.y = newY;
    };

    const onPointerUp = () => {
        isDragging = false;
    };

    overlay.on('pointerdown', (pointer) => {
        isDragging = true;
        startY = pointer.y;
        startScrollY = listContainer.y;
    });

    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);

    // Mouse Wheel
    const onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (totalListHeight <= listHeight) return;
        let newY = listContainer.y - deltaY;
        const minY = -(totalListHeight - listHeight);
        if (newY > 0) newY = 0;
        if (newY < minY) newY = minY;
        listContainer.y = newY;
    };
    this.input.on('wheel', onWheel);
    
    // Buttons
    const btnY = height/2 + panelHeight/2 - 50;
    
    const closeBtn = this.add.text(width/2 - 80, btnY, 'CLOSE', {
        fontSize: '32px',
        fontFamily: 'Impact',
        color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => {
        closeBtn.setScale(1.1);
        this.sound.play('menu-click', { volume: 0.2 });
    });
    closeBtn.on('pointerout', () => closeBtn.setScale(1));
    closeBtn.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.3 });
        // Clean up all listeners
        this.input.off('wheel', onWheel);
        this.input.off('pointermove', onPointerMove);
        this.input.off('pointerup', onPointerUp);
        container.destroy();
    });
    
    const clearBtn = this.add.text(width/2 + 80, btnY, 'CLEAR', {
        fontSize: '32px',
        fontFamily: 'Impact',
        color: '#ff0000'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    let confirmClear = false;
    let clearTimer = null;

    clearBtn.on('pointerover', () => {
        clearBtn.setScale(1.1);
        this.sound.play('menu-click', { volume: 0.2 });
    });
    clearBtn.on('pointerout', () => clearBtn.setScale(1));
    clearBtn.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.3 });
        
        if (!confirmClear) {
            confirmClear = true;
            clearBtn.setText('SURE?');
            clearBtn.setColor('#ffff00');
            
            // Reset after 3 seconds if not clicked again
            if (clearTimer) clearTimer.remove();
            clearTimer = this.time.delayedCall(3000, () => {
                confirmClear = false;
                if (clearBtn.scene) {
                    clearBtn.setText('CLEAR');
                    clearBtn.setColor('#ff0000');
                }
            });
        } else {
            // Actually clear
            localStorage.removeItem('shuffleRushLeaderboard');
            totalListHeight = refreshList();
            listContainer.y = 0;
            confirmClear = false;
            clearBtn.setText('CLEARED!');
            clearBtn.setColor('#00ff00');
            clearBtn.disableInteractive();
            
            if (clearTimer) clearTimer.remove();
            this.time.delayedCall(2000, () => {
                if (clearBtn.scene) {
                    clearBtn.setText('CLEAR');
                    clearBtn.setColor('#ff0000');
                    clearBtn.setInteractive();
                }
            });
        }
    });

    container.add([closeBtn, clearBtn]);
  }
  
  updateBackground() {
    const { width, height } = this.scale;
    const currentColor = this.colors[this.currentColorIndex];
    
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(
      currentColor.main, currentColor.main,
      currentColor.dark, currentColor.dark,
      1, 1, 1, 1
    );
    this.bgGraphics.fillRect(0, 0, width, height);
  }
  
  changeBackgroundColor() {
    this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
    const newColor = this.colors[this.currentColorIndex];
    
    // Smooth color transition on overlay elements
    this.tweens.add({
      targets: this.centerGlow,
      fillColor: { from: this.centerGlow.fillColor, to: newColor.main },
      duration: 1000,
      ease: 'Sine.easeInOut'
    });
    
    this.tweens.add({
      targets: this.colorPulse,
      fillColor: { from: this.colorPulse.fillColor, to: newColor.main },
      duration: 1000,
      ease: 'Sine.easeInOut'
    });
    
    // Update background
    this.updateBackground();
  }
  
  createParticleEffects() {
    const { width, height } = this.scale;
    
    // Create MORE star/sparkle particles (increased from 20 to 40)
    for (let i = 0; i < 40; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 6),
        0xffffff,
        Phaser.Math.FloatBetween(0.4, 0.9)
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Twinkle animation
      this.tweens.add({
        targets: particle,
        alpha: { from: 0.3, to: 1 },
        scale: { from: 0.5, to: 1.4 },
        duration: Phaser.Math.Between(800, 1800),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000)
      });
      
      // More pronounced floating motion
      this.tweens.add({
        targets: particle,
        y: particle.y + Phaser.Math.Between(-80, 80),
        x: particle.x + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(2500, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Add rotating beat circle effects
    for (let i = 0; i < 8; i++) {
      const beatCircle = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(50, height - 50),
        'beat-circle'
      );
      beatCircle.setScale(Phaser.Math.FloatBetween(0.03, 0.06));
      beatCircle.setAlpha(Phaser.Math.FloatBetween(0.15, 0.35));
      beatCircle.setTint(Phaser.Math.Between(0, 1) ? 0xff0066 : 0x00ffff);
      beatCircle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Rotation
      this.tweens.add({
        targets: beatCircle,
        rotation: Math.PI * 2,
        duration: Phaser.Math.Between(8000, 15000),
        repeat: -1,
        ease: 'Linear'
      });
      
      // Floating
      this.tweens.add({
        targets: beatCircle,
        y: beatCircle.y + Phaser.Math.Between(-100, 100),
        x: beatCircle.x + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Pulse
      this.tweens.add({
        targets: beatCircle,
        scale: beatCircle.scaleX * 1.3,
        alpha: { from: beatCircle.alpha, to: beatCircle.alpha * 0.5 },
        duration: Phaser.Math.Between(2000, 3500),
        yoyo: true,
        repeat: -1
      });
    }
    
    // Add MORE shooting star particles
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(Phaser.Math.Between(0, 5000), () => {
        this.createShootingStar();
      });
    }
  }
  
  createShootingStar() {
    const { width, height } = this.scale;
    const startX = Phaser.Math.Between(-100, width + 100);
    const startY = Phaser.Math.Between(-50, height / 2);
    
    const star = this.add.circle(startX, startY, 4, 0xffffff);
    star.setBlendMode(Phaser.BlendModes.ADD);
    
    // Trail effect
    const trail = this.add.graphics();
    trail.lineStyle(3, 0xffffff, 0.6);
    trail.setBlendMode(Phaser.BlendModes.ADD);
    
    this.tweens.add({
      targets: star,
      x: startX + Phaser.Math.Between(-400, 400),
      y: startY + Phaser.Math.Between(300, 600),
      alpha: 0,
      duration: Phaser.Math.Between(1000, 2000),
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        trail.clear();
        trail.lineStyle(3, 0xffffff, star.alpha * 0.6);
        trail.lineBetween(startX, startY, star.x, star.y);
      },
      onComplete: () => {
        star.destroy();
        trail.destroy();
        // Create another one
        this.time.delayedCall(Phaser.Math.Between(2000, 6000), () => {
          this.createShootingStar();
        });
      }
    });
  }
  
  createRadialGradient() {
    const { width, height } = this.scale;
    const radialGlow = this.add.graphics();
    radialGlow.setDepth(-2);
    
    // Create multiple radial circles
    for (let i = 3; i > 0; i--) {
      radialGlow.fillStyle(0xffffff, 0.03 * i);
      radialGlow.fillCircle(width / 2, height / 2, (width * 0.8) * i / 3);
    }
    
    this.tweens.add({
      targets: radialGlow,
      alpha: { from: 0.5, to: 1 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  createLightBeams() {
    const { width, height } = this.scale;
    
    for (let i = 0; i < 8; i++) {
      const beam = this.add.graphics();
      beam.setDepth(-1);
      
      const angle = (Math.PI * 2 / 8) * i;
      const length = Math.max(width, height);
      
      beam.fillStyle(0xffffff, 0.06);
      beam.beginPath();
      beam.moveTo(width / 2, height / 2);
      beam.lineTo(
        width / 2 + Math.cos(angle) * length,
        height / 2 + Math.sin(angle) * length
      );
      beam.lineTo(
        width / 2 + Math.cos(angle + 0.3) * length,
        height / 2 + Math.sin(angle + 0.3) * length
      );
      beam.closePath();
      beam.fillPath();
      beam.setBlendMode(Phaser.BlendModes.ADD);
      
      // Rotate beams
      this.tweens.add({
        targets: beam,
        angle: 360,
        duration: 30000 + (i * 2000),
        repeat: -1,
        ease: 'Linear'
      });
      
      // Pulse alpha
      this.tweens.add({
        targets: beam,
        alpha: { from: 0.3, to: 0.7 },
        duration: 2000 + (i * 300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  createVignette() {
    const { width, height } = this.scale;
    const vignette = this.add.graphics();
    vignette.setDepth(999);
    
    // Edge darkening gradient
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0, 0, 0.4);
    vignette.fillRect(0, 0, width, height);
    
    this.tweens.add({
      targets: vignette,
      alpha: { from: 0.6, to: 0.8 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  createScreenBorderGlow() {
    const { width, height } = this.scale;
    
    // Top glow
    const topGlow = this.add.rectangle(width / 2, 0, width, 8, 0xffffff, 0.4);
    topGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Bottom glow
    const bottomGlow = this.add.rectangle(width / 2, height, width, 8, 0xffffff, 0.4);
    bottomGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Left glow
    const leftGlow = this.add.rectangle(0, height / 2, 8, height, 0xffffff, 0.4);
    leftGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Right glow
    const rightGlow = this.add.rectangle(width, height / 2, 8, height, 0xffffff, 0.4);
    rightGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    [topGlow, bottomGlow, leftGlow, rightGlow].forEach((glow, i) => {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.2, to: 0.6 },
        scaleY: glow.scaleY * 1.5,
        scaleX: glow.scaleX * 1.5,
        duration: 1500 + (i * 200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }
  createDancingSilhouettes() {
    const { width, height } = this.scale;
    
    // Create 5 dancing silhouettes using real images (authentic iPod style)
    const positions = [
      { x: width * 0.15, y: height * 0.65, scale: 0.18, flip: false },
      { x: width * 0.30, y: height * 0.62, scale: 0.16, flip: true },
      { x: width * 0.50, y: height * 0.58, scale: 0.20, flip: false },
      { x: width * 0.70, y: height * 0.64, scale: 0.17, flip: true },
      { x: width * 0.85, y: height * 0.60, scale: 0.19, flip: false }
    ];
    this.dancers = [];
    positions.forEach((pos, i) => {
      // Assign initial unique images
      const initialImageKey = this.getUniqueDancerImage();
      
      // Skip if no dancers available
      if (initialImageKey === null) return;
      
      const dancer = this.createSilhouetteDancer(pos.x, pos.y, pos.scale, pos.flip, initialImageKey, i);
      
      // Only add if dancer was created successfully
      if (dancer !== null) {
        this.dancers.push(dancer);
      }
    });
  }
  getUniqueDancerImage() {
    // Full roster of dancers
    const allDancers = [];
    
    // Check if built-in assets are enabled
    const builtInEnabled = this.registry.get('builtInAssetsEnabled');
    const shouldUseBuiltIn = builtInEnabled !== false; // Default to true if not set
    
    if (shouldUseBuiltIn) {
        const excluded = [2, 4, 5, 6, 7, 10, 15, 21, 23, 24, 26, 27, 28, 31];
        for (let i = 1; i <= 40; i++) {
            if (!excluded.includes(i)) allDancers.push(`dancer-${i}`);
        }
    }
    
    // Add custom dancers from Dancer Lab
    const customDancers = this.registry.get('customDancers') || [];
    const allDancersWithCustom = [...allDancers, ...customDancers];
    
    // If no dancers available at all, return null
    if (allDancersWithCustom.length === 0) {
      console.warn('⚠️ No dancers available (built-in disabled and no custom dancers)');
      return null;
    }
    
    // Filter out currently active images
    const available = allDancersWithCustom.filter(key => !this.activeDancerImages.includes(key));
    
    // Pick random or fallback
    const key = available.length > 0 
      ? Phaser.Utils.Array.GetRandom(available)
      : Phaser.Utils.Array.GetRandom(allDancersWithCustom);
      
    this.activeDancerImages.push(key);
    return key;
  }
  createSilhouetteDancer(x, y, scale, flip, initialImageKey, index) {
    const allDancers = [];
    
    // Check if built-in assets are enabled
    const builtInEnabled = this.registry.get('builtInAssetsEnabled');
    const shouldUseBuiltIn = builtInEnabled !== false; // Default to true if not set
    
    if (shouldUseBuiltIn) {
        const excluded = [2, 4, 5, 6, 7, 10, 15, 21, 23, 24, 26, 27, 28, 31];
        for (let i = 1; i <= 40; i++) {
            if (!excluded.includes(i)) allDancers.push(`dancer-${i}`);
        }
    }
    let currentImageKey = initialImageKey;
    
    // Map of scale adjustments to normalize sizes
    const scaleMultipliers = {
      'dancer-1': 0.6, 'dancer-3': 0.65,
      'dancer-6': 0.58, 'dancer-7': 0.62, 'dancer-8': 0.68, 'dancer-9': 0.52,
      'dancer-11': 0.6, 'dancer-12': 0.6, 'dancer-13': 0.6, 'dancer-14': 0.6, 'dancer-15': 0.6,
      'dancer-16': 0.6, 'dancer-17': 0.6, 'dancer-18': 0.6, 'dancer-19': 0.6, 'dancer-20': 0.6,
      'dancer-22': 0.6, 'dancer-24': 0.6, 'dancer-25': 0.6,
      'dancer-26': 0.6, 'dancer-27': 0.6, 'dancer-29': 0.6, 'dancer-30': 0.6,
      'dancer-32': 0.6, 'dancer-33': 0.6, 'dancer-34': 0.6, 'dancer-35': 0.6,
      'dancer-36': 0.6, 'dancer-37': 0.6,
      'dancer-38': 0.6, 'dancer-39': 0.6, 'dancer-40': 0.6
    };
    const getMultiplier = (key) => scaleMultipliers[key] || 0.6;
    
    // Initial Setup
    const dancerImage = currentImageKey;
    
    // Validate texture exists before creating sprite
    if (!this.textures.exists(dancerImage)) {
      console.warn(`⚠️ Texture ${dancerImage} doesn't exist, skipping dancer creation`);
      return null; // Return null if texture missing
    }
    
    const initialMultiplier = getMultiplier(dancerImage);
    const dancer = this.add.sprite(x, y, dancerImage);
    
    // Check for GIF animation
    const customAnims = this.registry.get('customAnimations') || {};
    console.log(`🎭 MenuScene checking animation for: ${dancerImage}`);
    if (customAnims[dancerImage]) {
        const animKey = `${dancerImage}-anim`;
        
        // Safety check: only play if animation exists AND has valid frames
        const animation = this.anims.get(animKey);
        if (animation && animation.frames && animation.frames.length > 0) {
            try {
                dancer.play(animKey);
                console.log(`✓ MenuScene dancer playing animation: ${animKey}`);
            } catch (e) {
                console.warn(`⚠️ Error playing animation ${animKey}:`, e);
            }
        } else {
            console.warn(`⚠️ Animation ${animKey} not ready or invalid in MenuScene!`);
        }
    }
    
    // Determine base scales (Flip handled by negative X scale for consistency with Pulse)
    // Note: We avoid setFlipX here to rely purely on scale tweening logic
    const baseScaleX = scale * initialMultiplier * (flip ? -1 : 1);
    const baseScaleY = scale * initialMultiplier;
    
    dancer.setScale(baseScaleX, baseScaleY);
    
    // Check if this is a custom uploaded dancer
    const customDancers = this.registry.get('customDancers') || [];
    const isCustomDancer = customDancers.includes(dancerImage);
    
    if (isCustomDancer) {
      // Custom dancers show with their original colors (no tint)
      dancer.setTint(0xffffff);
    } else {
      // Built-in dancers are black silhouettes
      dancer.setTint(0x000000);
    }
    dancer.setDepth(0);
    
    // Add colorful glow behind silhouette
    const glow = this.add.sprite(x, y, dancerImage);
    glow.setScale(scale * 1.15 * initialMultiplier * (flip ? -1 : 1), scale * 1.15 * initialMultiplier);
    
    if (customAnims[dancerImage]) {
        const animKey = `${dancerImage}-anim`;
        const animation = this.anims.get(animKey);
        if (animation && animation.frames && animation.frames.length > 0) {
            glow.play(animKey);
        }
    }
    
    glow.setTint(0xffffff);
    glow.setAlpha(0.4);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(-1);
    const baseDelay = index * 180;
    // Pulse Helper Function
    const startPulse = (target, bX, bY) => {
        if (target.scaleTween) target.scaleTween.stop();
        target.scaleTween = this.tweens.add({
          targets: target,
          scaleX: bX * 1.05,
          scaleY: bY * 1.05,
          duration: 700 + index * 60,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
    };
    // Initial Pulse
    dancer.scaleTween = this.tweens.add({
        targets: dancer,
        scaleX: baseScaleX * 1.05,
        scaleY: baseScaleY * 1.05,
        duration: 700 + index * 60,
        yoyo: true,
        repeat: -1,
        delay: baseDelay + 100,
        ease: 'Sine.easeInOut'
    });
    // Swap Timer
    this.time.addEvent({
      delay: 2000 + index * 300,
      callback: () => {
        // Remove old image from active list
        const oldIndex = this.activeDancerImages.indexOf(currentImageKey);
        if (oldIndex > -1) this.activeDancerImages.splice(oldIndex, 1);
        // Get new unique image
        const newImage = this.getUniqueDancerImage();
        currentImageKey = newImage;
        
        const multiplier = getMultiplier(newImage);
        
        dancer.setTexture(newImage);
        glow.setTexture(newImage);
        
        // Check for GIF animation on the new image
        const animsRegistry = this.registry.get('customAnimations') || {};
        if (animsRegistry[newImage]) {
            const animKey = `${newImage}-anim`;
            const animation = this.anims.get(animKey);
            if (animation && animation.frames && animation.frames.length > 0) {
                dancer.play(animKey);
                glow.play(animKey);
            }
        } else {
            if (dancer.anims) dancer.anims.stop();
            if (glow.anims) glow.anims.stop();
        }
        
        // Apply correct tint for custom vs built-in dancers
        const customDancersCheck = this.registry.get('customDancers') || [];
        if (customDancersCheck.includes(newImage)) {
          dancer.setTint(0xffffff);
        } else {
          dancer.setTint(0x000000);
        }
        
        // Calculate new base scales
        const newBaseScaleX = scale * multiplier * (flip ? -1 : 1);
        const newBaseScaleY = scale * multiplier;
        
        dancer.setScale(newBaseScaleX, newBaseScaleY);
        glow.setScale(scale * 1.15 * multiplier * (flip ? -1 : 1), scale * 1.15 * multiplier);
        
        // Restart pulse with new dimensions
        startPulse(dancer, newBaseScaleX, newBaseScaleY);
      },
      loop: true
    });
    
    // Dynamic dancing motion (Sway)
    this.tweens.add({
      targets: [dancer, glow],
      rotation: { from: -0.15, to: 0.15 },
      duration: 800 + index * 80,
      yoyo: true,
      repeat: -1,
      delay: baseDelay,
      ease: 'Sine.easeInOut'
    });
    
    // Energetic bounce
    this.tweens.add({
      targets: [dancer, glow],
      y: y - 30,
      duration: 600 + index * 50,
      yoyo: true,
      repeat: -1,
      delay: baseDelay,
      ease: 'Cubic.easeOut'
    });
    
    // Glow pulse
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.6 },
      duration: 500 + index * 40,
      yoyo: true,
      repeat: -1,
      delay: baseDelay + 200,
      ease: 'Sine.easeInOut'
    });
    
    // Random Special Effects (Spins, Jumps, Turns)
    const triggerSpecialEffect = () => {
        if (!dancer.scene) return; // Safety check
        
        const type = Phaser.Math.Between(0, 3);
        
        if (type === 0) {
            // SPIN (2D Cartwheel style)
            // This interrupts the sway tween, so we recreate it after
            this.tweens.add({
                targets: [dancer, glow],
                rotation: dancer.rotation + Math.PI * 2,
                duration: 700,
                ease: 'Back.easeOut',
                onComplete: () => {
                    // Resume sway
                    this.tweens.add({
                      targets: [dancer, glow],
                      rotation: { from: -0.15, to: 0.15 },
                      duration: 800 + index * 80,
                      yoyo: true,
                      repeat: -1,
                      ease: 'Sine.easeInOut'
                    });
                }
            });
        } else if (type === 1) {
            // JUMP (High bounce)
            // Interrupts the normal bounce
            this.tweens.add({
                targets: [dancer, glow],
                y: y - 100,
                duration: 500,
                yoyo: true,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Resume normal bounce
                    this.tweens.add({
                      targets: [dancer, glow],
                      y: y - 30,
                      duration: 600 + index * 50,
                      yoyo: true,
                      repeat: -1,
                      delay: baseDelay,
                      ease: 'Cubic.easeOut'
                    });
                }
            });
        } else if (type === 2) {
            // DOUBLE SPIN (Rapid energy release)
            this.tweens.add({
                targets: [dancer, glow],
                rotation: dancer.rotation - Math.PI * 4,
                duration: 1000,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    // Resume sway
                    this.tweens.add({
                      targets: [dancer, glow],
                      rotation: { from: -0.15, to: 0.15 },
                      duration: 800 + index * 80,
                      yoyo: true,
                      repeat: -1,
                      ease: 'Sine.easeInOut'
                    });
                }
            });
        } else {
            // 3D PIROUETTE (Turn around Y axis)
            // Need to pause the scale pulse tween to avoid conflict
            if (dancer.scaleTween) dancer.scaleTween.pause();
            
            const currentSX = dancer.scaleX;
            this.tweens.add({
                targets: [dancer, glow],
                scaleX: -currentSX, // Flip horizontally (simulate turning back)
                duration: 600,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    if (dancer.scaleTween) dancer.scaleTween.resume();
                }
            });
        }
        
        // Schedule next random move (LESS OFTEN now)
        this.time.delayedCall(Phaser.Math.Between(10000, 25000), triggerSpecialEffect);
    };
    // Start random effects loop with offset
    this.time.delayedCall(Phaser.Math.Between(5000, 15000), triggerSpecialEffect);
    return { dancer, glow };
  }
  update() {
    // Dancers are animated via tweens
  }

  createDonateButton(x, y) {
    const color = 0xffff00; // Yellow
    const width = 200;
    const height = 40;
    
    const container = this.add.container(x, y);
    
    // Glow layer
    const glow = this.add.rectangle(0, 0, width + 8, height + 8, color, 0.4);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(9);
    
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.5 },
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    bg.setStrokeStyle(2, color, 1);
    bg.setDepth(10);
    bg.setInteractive({ useHandCursor: true });
    
    const text = this.add.text(0, 0, '☕ DONATE / BUY TEA', {
      fontSize: '14px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffff00',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    text.setDepth(11);
    
    container.add([glow, bg, text]);
    
    bg.on('pointerover', () => {
      this.tweens.add({ targets: [bg, text], scale: 1.05, duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.7, duration: 150 });
      bg.setFillStyle(color, 0.2);
      bg.setStrokeStyle(4, 0xffffff, 1);
      text.setColor('#ffffff');
      this.sound.play('menu-click', { volume: 0.2 });
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({ targets: [bg, text], scale: 1, duration: 150 });
      this.tweens.add({ targets: glow, scale: 1, alpha: 0.4, duration: 150 });
      bg.setFillStyle(0x000000, 0.8);
      bg.setStrokeStyle(2, color, 1);
      text.setColor('#ffff00');
    });
    
    bg.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      this.sound.play('menu-click', { volume: 0.3 });
    });
    
    // Use pointerup for better mobile compatibility
    bg.on('pointerup', (pointer) => {
      pointer.event.stopPropagation();
      
      const url = 'https://buymeacoffee.com/maxgarcia642';
      const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text);
        } else {
          // Fallback
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          return new Promise((resolve, reject) => {
            try {
              document.execCommand('copy');
              resolve();
            } catch (err) {
              reject(err);
            } finally {
              document.body.removeChild(textArea);
            }
          });
        }
      };

      copyToClipboard(url).then(() => {
          // Show "COPIED!" feedback
          const originalText = text.text;
          text.setText('LINK COPIED!');
          text.setColor('#00ff00');
          bg.setStrokeStyle(4, 0x00ff00, 1);
          
          this.time.delayedCall(2000, () => {
              if (text.scene) {
                  text.setText(originalText);
                  text.setColor('#ffff00');
                  bg.setStrokeStyle(2, 0xffff00, 1);
              }
          });
      }).catch(err => {
          console.error('Failed to copy', err);
          // If copy fails, fallback to open (last resort) but only on desktop to be safe
          if (!this.sys.game.device.os.android && !this.sys.game.device.os.iOS) {
              window.open(url, '_blank');
          }
      });
    });
  }
}
