import Phaser from 'phaser';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = 50;
    this.maxHealth = 50;
    this.baseX = x; // Store original X position
    this.baseY = y;
    
    // Alternate between all dancer images
    this.dancerImages = [];
    
    // Check if built-in assets are enabled
    const builtInEnabled = scene.registry.get('builtInAssetsEnabled');
    const shouldUseBuiltIn = builtInEnabled !== false; // Default to true if not set
    
    if (shouldUseBuiltIn) {
        const excluded = [2, 4, 5, 6, 7, 10, 15, 21, 23, 24, 26, 27, 28, 31];
        for (let i = 1; i <= 40; i++) {
            if (!excluded.includes(i)) this.dancerImages.push(`dancer-${i}`);
        }
    }
    
    // Check for custom uploaded images
    const customDancers = scene.registry.get('customDancers') || [];
    if (customDancers.length > 0) {
        // Add custom dancers to the pool
        this.dancerImages = [...this.dancerImages, ...customDancers];
    }
    
    // Set initial image key (use first available dancer)
    this.currentImageKey = this.dancerImages.length > 0 ? this.dancerImages[0] : 'dancer-1';
    
    // Scale multipliers for different assets to keep size consistent
    this.scaleMultipliers = {
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
    // Create player sprite
    this.sprite = scene.add.sprite(x, y, this.currentImageKey);
    this.updateSpriteScale(); // Set initial scale
    
    // Check if this dancer has a GIF animation
    const customAnims = scene.registry.get('customAnimations') || {};
    console.log(`🎮 Player checking for animation: ${this.currentImageKey}`);
    console.log(`Available animations:`, Object.keys(customAnims));
    
    this.baseTint = 0x00ffff;
    this.sprite.setTint(this.baseTint);
    
    // Add glow effect
    this.glow = scene.add.sprite(x, y, this.currentImageKey);
    this.updateGlowScale(); // Set initial scale
    
    // Check for animations AFTER both sprite and glow are created
    if (customAnims[this.currentImageKey]) {
        const animKey = `${this.currentImageKey}-anim`;
        const animation = scene.anims.get(animKey);
        if (animation && animation.frames && animation.frames.length > 0) {
            try {
                this.sprite.play(animKey);
                this.glow.play(animKey);
                console.log(`✓ Player playing animation: ${animKey}`);
            } catch (e) {
                console.warn(`⚠️ Player error playing ${animKey}:`, e);
            }
        } else {
            console.warn(`⚠️ Player: Animation ${animKey} not ready or invalid`);
        }
    } else {
        console.log(`No animation for ${this.currentImageKey}`);
    }
    this.glow.setAlpha(0.3);
    this.glow.setTint(this.baseTint);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    // Rhythmic bopping animation with PNG swaps
    this.bopTween = scene.tweens.add({
      targets: [this.sprite, this.glow],
      y: y - 20,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Cubic.easeInOut',
      onYoyo: () => {
        // Change PNG when reaching top of bop
        this.swapDancerImage();
      },
      onRepeat: () => {
        // Change PNG when reaching bottom of bop
        this.swapDancerImage();
      }
    });

    // Glow pulse
    // Initial glow setup
    this.setComboIntensity(0);
    // Health bar
    this.healthBarBg = scene.add.rectangle(x, y - 120, 100, 10, 0x000000, 0.5);
    this.healthBar = scene.add.rectangle(x - 50, y - 120, 100, 10, 0x00ff00);
    this.healthBar.setOrigin(0, 0.5);
    
    // Heal Progress Bar (Tiny bar below health)
    this.healBarBg = scene.add.rectangle(x, y - 105, 100, 4, 0x000000, 0.5);
    this.healBar = scene.add.rectangle(x - 50, y - 105, 0, 4, 0x00ffff); // Cyan for heal progress
    this.healBar.setOrigin(0, 0.5);
    
    this.healIcon = scene.add.text(x - 65, y - 105, '+', {
        fontSize: '16px',
        color: '#00ffff',
        fontFamily: 'Impact, Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Start random acrobatic effects
    this.startRandomFlourishes();
  }
  
  updateHealProgress(current, max) {
      const percent = Math.min(1, current / max);
      
      // Flash the bar when full
      if (current >= max || (current === 0 && this.healBar.width > 0)) {
           this.scene.tweens.add({
               targets: [this.healBar, this.healIcon],
               alpha: 0.2,
               duration: 100,
               yoyo: true,
               repeat: 1
           });
      }
      
      this.scene.tweens.add({
          targets: this.healBar,
          width: 100 * percent,
          duration: 200,
          ease: 'Sine.easeOut'
      });
  }
  startRandomFlourishes() {
    const doFlourish = () => {
        if (!this.scene || !this.sprite.scene) return;
        
        const type = Phaser.Math.Between(0, 5); // MORE MOVE TYPES
        
        if (type === 0) {
            // 360 Spin
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                rotation: Math.PI * 2,
                duration: 400,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.sprite.setRotation(0);
                    this.glow.setRotation(0);
                }
            });
        } else if (type === 1) {
            // Horizontal Flip (3D Turn effect)
            const currentSX = this.sprite.scaleX;
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                scaleX: -currentSX,
                duration: 500,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        } else if (type === 2) {
            // Barrel Roll
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                rotation: -Math.PI * 2,
                scale: { from: this.sprite.scale * 1.2, to: this.sprite.scale },
                duration: 500,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    this.sprite.setRotation(0);
                    this.glow.setRotation(0);
                    this.updateSpriteScale();
                    this.updateGlowScale();
                }
            });
        } else if (type === 3) {
            // Double Spin (FAST)
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                rotation: Math.PI * 4,
                duration: 700,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    this.sprite.setRotation(0);
                    this.glow.setRotation(0);
                }
            });
        } else if (type === 4) {
            // Hop Jump
            const baseY = this.baseY;
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                y: baseY - 100,
                duration: 300,
                ease: 'Cubic.easeOut',
                yoyo: true
            });
        } else {
            // Twist & Flip Combo
            const currentSX = this.sprite.scaleX;
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                rotation: Math.PI,
                scaleX: -currentSX,
                duration: 500,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.sprite.setRotation(0);
                    this.glow.setRotation(0);
                }
            });
        }
        
        // MUCH MORE FREQUENT - every 2-4 seconds!
        this.scene.time.delayedCall(Phaser.Math.Between(2000, 4000), doFlourish);
    };
    
    // START IMMEDIATELY - 500ms-2s delay
    this.scene.time.delayedCall(Phaser.Math.Between(500, 2000), doFlourish);
  }
  swapDancerImage() {
    // Safety check: ensure sprites still exist and scene is active
    if (!this.sprite || !this.glow || !this.scene || !this.sprite.scene) {
      return;
    }
    
    // Determine which image the enemy is using to avoid duplicates
    let forbiddenImage = '';
    if (this.scene.enemy && this.scene.enemy.sprite) {
        forbiddenImage = this.scene.enemy.sprite.texture.key;
    }
    // Filter available images: exclude current one AND exclude enemy's current one
    const available = this.dancerImages.filter(key => 
        key !== this.currentImageKey && key !== forbiddenImage
    );
    // Pick a random new image
    if (available.length > 0) {
        this.currentImageKey = Phaser.Utils.Array.GetRandom(available);
    }
    this.sprite.setTexture(this.currentImageKey);
    this.glow.setTexture(this.currentImageKey);
    
    // Check for GIF animation
    const customAnims = this.scene.registry.get('customAnimations') || {};
    if (customAnims[this.currentImageKey]) {
        const animKey = `${this.currentImageKey}-anim`;
        const animation = this.scene.anims.get(animKey);
        if (animation && animation.frames && animation.frames.length > 0) {
            this.sprite.play(animKey);
            this.glow.play(animKey);
        }
    } else {
        if (this.sprite.anims) this.sprite.anims.stop();
        if (this.glow.anims) this.glow.anims.stop();
    }
    
    // Update scales for the new texture
    this.updateSpriteScale();
    this.updateGlowScale();
    
    // Refresh the combo pulse so it uses the new scale multiplier immediately
    // If we are in a combo, we want to maintain the intensity but update the base scale
    if (this.currentComboIntensity > 0) {
        this.setComboIntensity(this.currentComboIntensity);
    }
  }
  
  getScaleMultiplier(key) {
    return this.scaleMultipliers[key] || 0.6;
  }
  
  updateSpriteScale() {
    const baseScale = 0.25;
    this.sprite.setScale(baseScale * this.getScaleMultiplier(this.currentImageKey));
  }
  
  updateGlowScale() {
    const baseScale = 0.27;
    this.glow.setScale(baseScale * this.getScaleMultiplier(this.currentImageKey));
  }
  
  setThemeColor(color) {
    this.baseTint = color;
    this.sprite.setTint(color);
    this.glow.setTint(color);
  }
  
  setComboIntensity(intensity) {
    this.currentComboIntensity = intensity; // Store for texture swaps
    
    // Remove old pulse tween if it exists
    if (this.glowPulseTween) {
        this.glowPulseTween.remove();
    }
    
    // Get current correct scale for this specific asset
    const currentMult = this.getScaleMultiplier(this.currentImageKey);
    const baseGlowScale = 0.27 * currentMult;
    
    // Base values increase with intensity
    const minAlpha = 0.3 + (intensity * 0.4); 
    const maxAlpha = 0.6 + (intensity * 0.4);
    const duration = 800 - (intensity * 400);
    const scaleBoostRatio = 1.0 + (intensity * 0.3); // Scale up by 0% to 30%
    
    // Create new pulse tween using RELATIVE scale based on current asset
    this.glowPulseTween = this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: minAlpha, to: maxAlpha },
      scale: { from: baseGlowScale, to: baseGlowScale * scaleBoostRatio },
      duration: duration,
      yoyo: true,
      repeat: -1
    });
  }
  
  dance() {
    // Quick dance animation
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      rotation: 0.2,
      duration: 100,
      yoyo: true,
      repeat: 1
    });
  }
  attack(damageMultiplier = 1) {
    const scene = this.scene;
    
    // Swap PNG on attack!
    this.swapDancerImage();
    
    // Create motion trail (Ghost effect)
    this.createMotionTrail();
    // Attack animation
    scene.tweens.add({
      targets: [this.sprite, this.glow],
      x: this.sprite.x + 150, // Lunging forward more
      scale: (this.sprite.scaleX || 0.25) * 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut', // More punchy ease
      onComplete: () => {
        // Ensure sprites return to original position
        this.sprite.setX(this.baseX);
        this.glow.setX(this.baseX);
        this.healthBar.setX(this.baseX - 50);
        this.healthBarBg.setX(this.baseX);
        if (this.healBar) {
            this.healBar.setX(this.baseX - 50);
            this.healBarBg.setX(this.baseX);
            this.healIcon.setX(this.baseX - 65);
        }
      }
    });
    // Flash effect (ensure alpha returns to 1)
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.sprite.setAlpha(1);
      }
    });

    // Create attack burst
    const burst = scene.add.image(this.sprite.x + 100, this.sprite.y, 'attack-burst');
    burst.setScale(0.15 * damageMultiplier);
    burst.setAlpha(0.8);
    burst.setTint(this.baseTint);
    burst.setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: burst,
      scale: 0.5 * damageMultiplier,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy()
    });
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    // Update health bar visual
    const healthPercent = this.health / this.maxHealth;
    this.scene.tweens.add({
      targets: this.healthBar,
      width: 100 * healthPercent,
      duration: 300
    });
    
    // Update color based on health
    if (healthPercent > 0.5) {
      this.healthBar.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBar.setFillStyle(0xffff00);
    } else {
      this.healthBar.setFillStyle(0xff0000);
    }
    
    // Healing flash effect
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      tint: 0x00ff00,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        this.sprite.setTint(this.baseTint);
        this.glow.setTint(this.baseTint);
      }
    });
    // Floating heart text particle
    const healText = this.scene.add.text(
        this.sprite.x, 
        this.sprite.y - 60, 
        `+${amount} HP ♥`, 
        {
            fontSize: '36px',
            fontFamily: 'Impact, Arial',
            color: '#00ff00',
            stroke: '#ffffff',
            strokeThickness: 3,
            shadow: { blur: 5, color: '#00ff00', fill: true }
        }
    );
    healText.setOrigin(0.5);
    healText.setDepth(200);
    
    // Add multiple mini hearts for extra particle effect
    for(let i=0; i<5; i++) {
        const heart = this.scene.add.text(
            this.sprite.x + Phaser.Math.Between(-30, 30),
            this.sprite.y - 40 + Phaser.Math.Between(-20, 20),
            '♥',
            {
                fontSize: '24px',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        heart.setDepth(199);
        
        this.scene.tweens.add({
            targets: heart,
            y: heart.y - Phaser.Math.Between(60, 100),
            x: heart.x + Phaser.Math.Between(-40, 40),
            alpha: 0,
            scale: { from: 1, to: 0.5 },
            duration: Phaser.Math.Between(800, 1200),
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
        });
    }
    this.scene.tweens.add({
        targets: healText,
        y: healText.y - 120,
        alpha: 0,
        scale: 1.5,
        duration: 1500,
        ease: 'Back.easeOut',
        onComplete: () => healText.destroy()
    });
    
    // Check health status after healing
    this.checkLowHealth();
  }
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.scene.tweens.add({
      targets: this.healthBar,
      width: 100 * healthPercent,
      duration: 300
    });
    // Change health bar color
    if (healthPercent > 0.5) {
      this.healthBar.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBar.setFillStyle(0xffff00);
    } else {
      this.healthBar.setFillStyle(0xff0000);
    }
    // Damage flash (ensure alpha returns to 1)
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.sprite.setTint(this.baseTint);
        this.glow.setTint(this.baseTint);
        // Ensure sprites are fully visible
        this.sprite.setAlpha(1);
        this.glow.setAlpha(0.3);
      }
    });
    // Shake sprite (preserve position after)
    const originalX = this.sprite.x;
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      x: this.sprite.x - 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        // Ensure sprites return to original position
        this.sprite.setX(originalX);
        this.glow.setX(originalX);
      }
    });
    
    // Check health status after damage
    this.checkLowHealth();
  }
  
  checkLowHealth() {
      // Trigger warning at 20% or less health
      const isLow = (this.health / this.maxHealth) <= 0.2;
      if (this.scene && this.scene.setLowHealthState) {
          this.scene.setLowHealthState(isLow);
      }
  }
  createMotionTrail() {
      // Create a few static copies that fade out
      for(let i = 0; i < 3; i++) {
          const ghost = this.scene.add.image(this.sprite.x, this.sprite.y, this.currentImageKey);
          ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
          ghost.setTint(this.baseTint);
          ghost.setAlpha(0.4);
          ghost.setBlendMode(Phaser.BlendModes.ADD);
          
          this.scene.tweens.add({
              targets: ghost,
              x: this.sprite.x + (i * 40), // Offset slightly
              alpha: 0,
              scaleX: ghost.scaleX * 1.2,
              scaleY: ghost.scaleY * 1.2,
              duration: 300 + (i * 100),
              ease: 'Sine.easeOut',
              onComplete: () => ghost.destroy()
          });
      }
  }
}

