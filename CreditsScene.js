

import Phaser from 'phaser';

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CreditsScene' });
  }

  preload() {
    this.load.audio('menu-click', 'https://rosebud.ai/assets/Menu Click by Leszek_Szary of freesound_community.mp3?cDI3');
  }
  create() {
    const { width, height } = this.scale;
    // Dynamic color-changing background (Vibrant like Menu!)
    this.colors = [
      { main: 0xff0066, dark: 0x990044 }, // Hot Pink
      { main: 0x00ff99, dark: 0x009966 }, // Electric Green
      { main: 0xff9900, dark: 0xcc6600 }, // Vibrant Orange
      { main: 0x0099ff, dark: 0x0066cc }, // Electric Blue
      { main: 0xff00ff, dark: 0x990099 }  // Magenta
    ];
    this.currentColorIndex = 0;
    this.bgGraphics = this.add.graphics();
    this.updateBackground();
    // Pulse the background colors
    this.time.addEvent({
      delay: 2000,
      callback: () => this.changeBackgroundColor(),
      loop: true
    });
    // Title
    const titleStyle = {
      fontSize: '80px',
      fontFamily: 'Impact, "Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    };

    const title = this.add.text(width / 2, height * 0.15, 'CREDITS', titleStyle);
    title.setOrigin(0.5);

    // Game Title
    const gameInfoStyle = {
      fontSize: '36px',
      fontFamily: '"Helvetica Neue", sans-serif',
      color: '#ffffff',
      align: 'center'
    };

    const gameInfo = this.add.text(
      width / 2,
      height * 0.3,
      'SHUFFLE RUSH\nRhythm Battle Game',
      gameInfoStyle
    );
    gameInfo.setOrigin(0.5);
    gameInfo.setLineSpacing(10);

    // Creator Section with LinkedIn placeholder
    const creatorStyle = {
      fontSize: '28px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 15
    };

    const creatorText = this.add.text(
      width / 2,
      height * 0.48,
      'Created by Maximiliano Garcia\nwith help from Rosebud AI',
      creatorStyle
    );
    creatorText.setOrigin(0.5);
    creatorText.setLineSpacing(15);
    // LinkedIn Button (Clickable)
    const linkedInIcon = this.add.text(width / 2, height * 0.60, 'in', {
      fontSize: '44px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#0077b5',
      fontStyle: 'bold',
      backgroundColor: '#ffffff',
      padding: { x: 12, y: 8 }
    });
    linkedInIcon.setOrigin(0.5);
    linkedInIcon.setInteractive({ useHandCursor: true });
    
    // Button interactions
    linkedInIcon.on('pointerover', () => {
        this.tweens.add({ targets: linkedInIcon, scale: 1.1, duration: 100 });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    linkedInIcon.on('pointerout', () => {
        this.tweens.add({ targets: linkedInIcon, scale: 1, duration: 100 });
    });
    linkedInIcon.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        this.sound.play('menu-click', { volume: 0.3 });
    });
    
    // Use pointerup for better mobile compatibility
    linkedInIcon.on('pointerup', (pointer) => {
        pointer.event.stopPropagation();
        
        const url = 'https://www.linkedin.com/in/maximiliano-garcia642/';
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
             // Visual feedback
             const originalColor = linkedInIcon.style.color;
             const originalText = connectText.text;
             
             linkedInIcon.setColor('#00ff00');
             connectText.setText('LINK COPIED TO CLIPBOARD!');
             connectText.setColor('#00ff00');
             
             this.time.delayedCall(2000, () => {
                 if (linkedInIcon.scene) {
                     linkedInIcon.setColor('#0077b5');
                     connectText.setText(originalText);
                     connectText.setColor('#ffffff');
                 }
             });
        }).catch(err => {
            console.error('Failed to copy', err);
            // Fallback for desktop only
            if (!this.sys.game.device.os.android && !this.sys.game.device.os.iOS) {
                window.open(url, '_blank');
            }
        });
    });
    // "Connect on LinkedIn" text below button
    const connectText = this.add.text(
        width / 2,
        height * 0.68,
        'Connect with Me on LinkedIn',
        {
            fontSize: '20px',
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            color: '#ffffff',
            align: 'center'
        }
    );
    connectText.setOrigin(0.5);
    // Additional credits
    const additionalStyle = {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: width * 0.8 }
    };
    // Music/SFX Credits
    const musicCreditsText = this.add.text(
      width / 2,
      height * 0.75,
      'Community-made royalty free music (like the menu theme - Back 2 Back by One Wave) and sound effects from premiumbeat.com and pixabay.com.',
      additionalStyle
    );
    musicCreditsText.setOrigin(0.5);
    musicCreditsText.setLineSpacing(6);
    const disclaimerText = 'The assets generated for this project were done so in good faith and inspiration from the frutiger metro era.';
    const additionalCredits = this.add.text(
      width / 2,
      height * 0.83,
      disclaimerText,
      additionalStyle
    );
    additionalCredits.setOrigin(0.5);
    additionalCredits.setLineSpacing(8);
    // Back button
    const backButton = this.add.ellipse(width / 2, height * 0.92, 200, 60, 0xffffff);
    backButton.setInteractive({ useHandCursor: true });
    const backHighlight = this.add.ellipse(width / 2, height * 0.92 - 6, 170, 25, 0xffffff, 0.4);
    const backText = this.add.text(width / 2, height * 0.92, 'BACK', {
      fontSize: '32px',
      fontFamily: 'Impact, sans-serif',
      color: '#ff0066',
      fontStyle: 'bold'
    });
    backText.setOrigin(0.5);

    // Button interactions
    backButton.on('pointerover', () => {
      this.tweens.add({
        targets: [backButton, backHighlight, backText],
        scale: 1.08,
        duration: 150,
        ease: 'Back.easeOut'
      });
      this.sound.play('menu-click', { volume: 0.2 });
    });

    backButton.on('pointerout', () => {
      this.tweens.add({
        targets: [backButton, backHighlight, backText],
        scale: 1,
        duration: 150
      });
    });

    backButton.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.3 });
      this.cameras.main.fadeOut(400, 255, 0, 102);
      this.time.delayedCall(400, () => {
        this.scene.start('MenuScene');
      });
    });
    
    // Add radial gradient overlay
    this.createRadialGradient();
    
    // Add rotating light beams
    this.createLightBeams();
    
    // Add pulsing vignette
    this.createVignette();
    
    // Add screen border glow
    this.createScreenBorderGlow();
    // MORE Floating particles for visual interest (Increased from 50 to 100)
    for (let i = 0; i < 100; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 6), // Slightly larger variation
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 0.8)
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Random tint for some particles
      if (Phaser.Math.Between(0, 10) > 7) {
        particle.setFillStyle(0xffff00);
      }
      
      this.tweens.add({
        targets: particle,
        alpha: { from: 0.2, to: 0.9 },
        scale: { from: 0.8, to: 1.5 }, // Adding scale pulse
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1
      });
      
      this.tweens.add({
        targets: particle,
        y: particle.y + Phaser.Math.Between(-100, 100), // More movement
        x: particle.x + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(2500, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Add light orbs floating around
    for (let i = 0; i < 10; i++) {
      const orb = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(15, 35),
        0xffffff,
        0.3
      );
      orb.setBlendMode(Phaser.BlendModes.ADD);
      
      this.tweens.add({
        targets: orb,
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
        alpha: { from: 0.2, to: 0.6 },
        scale: { from: 0.8, to: 1.4 },
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Add 3D Levitation Effect to text elements
    const floatingElements = [
      { target: title, depth: 1.0 },
      { target: gameInfo, depth: 0.8 },
      { target: creatorText, depth: 0.8 },
      { target: linkedInIcon, depth: 0.6 },
      { target: connectText, depth: 0.6 },
      { target: musicCreditsText, depth: 0.5 },
      { target: additionalCredits, depth: 0.4 }
    ];
    floatingElements.forEach((item, index) => {
      const { target, depth } = item;
      const startY = target.y;
      // Vertical "Breathing" motion
      this.tweens.add({
        targets: target,
        y: startY - (12 * depth),
        duration: 3500 + (index * 600), // Slower, smoother duration
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: index * 250
      });
      // Avoid scaling/rotating the interactive button to prevent hit area issues/conflicts
      if (target !== linkedInIcon && target !== backButton) {
        // Subtle horizontal sway for 3D feel
        this.tweens.add({
          targets: target,
          x: target.x + (index % 2 === 0 ? 6 : -6) * depth,
          rotation: (index % 2 === 0 ? 0.025 : -0.025) * depth,
          duration: 5000 + (index * 800), // Slower, more graceful sway
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: index * 300
        });
      }
    });
    // Add interactive hover effects to non-button text elements (Fun "Pop" effect)
    const interactiveTexts = [title, gameInfo, creatorText, connectText, musicCreditsText, additionalCredits];
    
    interactiveTexts.forEach(text => {
        text.setInteractive();
        text.on('pointerover', () => {
            this.tweens.add({ targets: text, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
            this.sound.play('menu-click', { volume: 0.2 });
        });
        text.on('pointerout', () => {
            this.tweens.add({ targets: text, scale: 1, duration: 150, ease: 'Back.easeOut' });
        });
    });
    // Fade in
    this.cameras.main.fadeIn(500, 255, 0, 102);
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
    this.updateBackground();
  }
  
  createRadialGradient() {
    const { width, height } = this.scale;
    const radialGlow = this.add.graphics();
    radialGlow.setDepth(-2);
    
    for (let i = 3; i > 0; i--) {
      radialGlow.fillStyle(0xffffff, 0.05 * i);
      radialGlow.fillCircle(width / 2, height / 2, (width * 0.6) * i / 3);
    }
    
    this.tweens.add({
      targets: radialGlow,
      alpha: { from: 0.6, to: 1 },
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  createLightBeams() {
    const { width, height } = this.scale;
    
    for (let i = 0; i < 12; i++) {
      const beam = this.add.graphics();
      beam.setDepth(-1);
      
      const angle = (Math.PI * 2 / 12) * i;
      const length = Math.max(width, height) * 1.2;
      
      beam.fillStyle(0xffffff, 0.04);
      beam.beginPath();
      beam.moveTo(width / 2, height / 2);
      beam.lineTo(
        width / 2 + Math.cos(angle) * length,
        height / 2 + Math.sin(angle) * length
      );
      beam.lineTo(
        width / 2 + Math.cos(angle + 0.2) * length,
        height / 2 + Math.sin(angle + 0.2) * length
      );
      beam.closePath();
      beam.fillPath();
      beam.setBlendMode(Phaser.BlendModes.ADD);
      
      this.tweens.add({
        targets: beam,
        angle: i % 2 === 0 ? 360 : -360,
        duration: 40000 + (i * 2000),
        repeat: -1,
        ease: 'Linear'
      });
    }
  }
  
  createVignette() {
    const { width, height } = this.scale;
    const vignette = this.add.graphics();
    vignette.setDepth(998);
    
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0, 0, 0.4);
    vignette.fillRect(0, 0, width, height);
  }
  
  createScreenBorderGlow() {
    const { width, height } = this.scale;
    
    const topGlow = this.add.rectangle(width / 2, 0, width, 6, 0xffffff, 0.4);
    topGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    const bottomGlow = this.add.rectangle(width / 2, height, width, 6, 0xffffff, 0.4);
    bottomGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    const leftGlow = this.add.rectangle(0, height / 2, 6, height, 0xffffff, 0.4);
    leftGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    const rightGlow = this.add.rectangle(width, height / 2, 6, height, 0xffffff, 0.4);
    rightGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    [topGlow, bottomGlow, leftGlow, rightGlow].forEach((glow, i) => {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.2, to: 0.7 },
        duration: 1800 + (i * 250),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }
}
