import Phaser from 'phaser';
export default class Enemy {
  constructor(scene, x, y, maxHealth = 100) {
    this.scene = scene;
    this.health = maxHealth;
    this.maxHealth = maxHealth;
    this.baseX = x; // Store original X position
    this.baseY = y;
    
    // Use all available dancer images
    this.enemyImages = [];
    
    // Check if built-in assets are enabled
    const builtInEnabled = scene.registry.get('builtInAssetsEnabled');
    const shouldUseBuiltIn = builtInEnabled !== false; // Default to true if not set
    
    if (shouldUseBuiltIn) {
        const excluded = [2, 4, 5, 6, 7, 10, 15, 21, 23, 24, 26, 27, 28, 31];
        for (let i = 1; i <= 40; i++) {
            if (!excluded.includes(i)) this.enemyImages.push(`dancer-${i}`);
        }
    }
    
    // Check for custom uploaded images
    const customDancers = scene.registry.get('customDancers') || [];
    if (customDancers.length > 0) {
        // Add custom dancers to the pool
        this.enemyImages = [...this.enemyImages, ...customDancers];
    }
    
    // Set initial image key (use first available dancer)
    this.currentImageKey = this.enemyImages.length > 0 ? this.enemyImages[0] : 'dancer-1';
    
    // Scale multipliers to normalize different asset sizes
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
    // Create enemy sprite
    this.sprite = scene.add.sprite(x, y, this.currentImageKey);
    this.updateSpriteScale();
    
    // Check if this dancer has a GIF animation
    const customAnims = scene.registry.get('customAnimations') || {};
    if (customAnims[this.currentImageKey]) {
        const animKey = `${this.currentImageKey}-anim`;
        const animation = scene.anims.get(animKey);
        if (animation && animation.frames && animation.frames.length > 0) {
            try {
                this.sprite.play(animKey);
                if (this.glow) this.glow.play(animKey);
            } catch (e) {
                console.warn(`⚠️ Enemy error playing ${animKey}:`, e);
            }
        }
    }
    
    this.baseTint = 0xff0066;
    this.sprite.setTint(this.baseTint);
    // Add glow effect
    this.glow = scene.add.sprite(x, y, this.currentImageKey);
    this.updateGlowScale();
    
    this.glow.setAlpha(0.3);
    this.glow.setTint(this.baseTint);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    // Rhythmic bopping animation with PNG swaps
    this.bopTween = scene.tweens.add({
      targets: [this.sprite, this.glow],
      y: y - 20,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Cubic.easeInOut',
      onYoyo: () => {
        // Change PNG when reaching top of bop
        this.swapEnemyImage();
      },
      onRepeat: () => {
        // Change PNG when reaching bottom of bop
        this.swapEnemyImage();
      }
    });

    // Glow pulse
    // Initial glow setup
    this.setComboIntensity(0);
    // Health bar
    this.healthBarBg = scene.add.rectangle(x, y - 120, 100, 10, 0x000000, 0.5);
    this.healthBar = scene.add.rectangle(x - 50, y - 120, 100, 10, 0xff0000);
    this.healthBar.setOrigin(0, 0.5);
    
    // Miss Progress Bar (Orange bar below health)
    this.missBarBg = scene.add.rectangle(x, y - 105, 100, 4, 0x000000, 0.5);
    this.missBar = scene.add.rectangle(x - 50, y - 105, 0, 4, 0xffaa00); // Orange
    this.missBar.setOrigin(0, 0.5);
    
    this.missIcon = scene.add.text(x + 65, y - 105, '-', {
        fontSize: '20px',
        color: '#ffaa00',
        fontFamily: 'Impact, Arial',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    // Start random acrobatic effects
    this.startRandomFlourishes();
  }
  
  updateMissProgress(current, max) {
      const percent = Math.min(1, current / max);
      
      // Flash the bar when full
      if (current >= max || (current === 0 && this.missBar.width > 0)) {
           this.scene.tweens.add({
               targets: [this.missBar, this.missIcon],
               alpha: 0.2,
               duration: 100,
               yoyo: true,
               repeat: 1
           });
      }
      
      this.scene.tweens.add({
          targets: this.missBar,
          width: 100 * percent,
          duration: 200,
          ease: 'Sine.easeOut'
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
    
    // Floating text
    const healText = this.scene.add.text(
        this.sprite.x, 
        this.sprite.y - 60, 
        `+${amount} HP`, 
        {
            fontSize: '32px',
            fontFamily: 'Impact, Arial',
            color: '#00ff00',
            stroke: '#ffffff',
            strokeThickness: 3
        }
    );
    healText.setOrigin(0.5);
    healText.setDepth(200);
    
    this.scene.tweens.add({
        targets: healText,
        y: healText.y - 80,
        alpha: 0,
        duration: 1000,
        ease: 'Back.easeOut',
        onComplete: () => healText.destroy()
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
                rotation: -Math.PI * 2,
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
                rotation: Math.PI * 2,
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
                rotation: -Math.PI * 4,
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
                rotation: -Math.PI,
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
  swapEnemyImage() {
    // Safety check: ensure sprites still exist and scene is active
    if (!this.sprite || !this.glow || !this.scene || !this.sprite.scene) {
      return;
    }
    
    // Check what player is wearing to avoid duplicates
    let forbiddenImage = '';
    if (this.scene.player && this.scene.player.sprite) {
        forbiddenImage = this.scene.player.sprite.texture.key;
    }
    // Filter available images
    const available = this.enemyImages.filter(key => 
        key !== this.currentImageKey && key !== forbiddenImage
    );
    // Pick random
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
    
    // Update scales for new texture
    this.updateSpriteScale();
    this.updateGlowScale();
    
    // Refresh combo pulse with new scale
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
    this.currentComboIntensity = intensity;
    if (this.glowPulseTween) {
        this.glowPulseTween.remove();
    }
    
    // Get current correct scale for this specific asset
    const currentMult = this.getScaleMultiplier(this.currentImageKey);
    const baseGlowScale = 0.27 * currentMult;
    
    const minAlpha = 0.3 + (intensity * 0.4);
    const maxAlpha = 0.6 + (intensity * 0.4);
    const duration = 900 - (intensity * 400);
    const scaleBoostRatio = 1.0 + (intensity * 0.3);
    
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
      rotation: -0.2,
      duration: 100,
      yoyo: true,
      repeat: 1
    });
  }
  attack() {
    const scene = this.scene;
    
    // Swap PNG on attack!
    this.swapEnemyImage();
    // Create motion trail
    this.createMotionTrail();
    // Attack animation
    scene.tweens.add({
      targets: [this.sprite, this.glow],
      x: this.sprite.x - 150, // Lunge
      scale: (this.sprite.scaleX || 0.25) * 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Ensure sprites return to original position
        this.sprite.setX(this.baseX);
        this.glow.setX(this.baseX);
        this.healthBar.setX(this.baseX - 50);
        this.healthBarBg.setX(this.baseX);
        if (this.missBar) {
            this.missBar.setX(this.baseX - 50);
            this.missBarBg.setX(this.baseX);
            this.missIcon.setX(this.baseX + 65);
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
    const burst = scene.add.image(this.sprite.x - 100, this.sprite.y, 'attack-burst');
    burst.setScale(0.2);
    burst.setAlpha(0.8);
    burst.setTint(this.baseTint);
    burst.setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: burst,
      scale: 0.4,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy()
    });
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    // Swap PNG when taking damage!
    this.swapEnemyImage();
    
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.scene.tweens.add({
      targets: this.healthBar,
      width: 100 * healthPercent,
      duration: 300
    });

    // Damage flash
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      tint: 0xffffff,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.sprite.setTint(this.baseTint);
        this.glow.setTint(this.baseTint);
      }
    });

    // Shake sprite (preserve position after)
    const originalX = this.sprite.x;
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      x: this.sprite.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        // Ensure sprites return to original position
        this.sprite.setX(this.baseX);
        this.glow.setX(this.baseX);
        this.healthBar.setX(this.baseX - 50);
        this.healthBarBg.setX(this.baseX);
        if (this.missBar) {
            this.missBar.setX(this.baseX - 50);
            this.missBarBg.setX(this.baseX);
            this.missIcon.setX(this.baseX + 65);
        }
      }
    });

    // Death check
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    const scene = this.scene;
    
    // Play death sound
    scene.sound.play('enemy-death', { volume: 0.6 });
    
    // Stop all active tweens to prevent conflicts
    if (this.bopTween) {
      this.bopTween.stop();
      this.bopTween = null;
    }
    
    if (this.glowPulseTween) {
      this.glowPulseTween.stop();
      this.glowPulseTween = null;
    }
    
    // Brief flash effect - keep sprites fully visible
    scene.tweens.add({
      targets: this.sprite,
      tint: 0xffffff,
      duration: 150,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Ensure full visibility
        this.sprite.setAlpha(1);
        this.sprite.setTint(this.baseTint);
        this.glow.setAlpha(0.3);
        this.glow.setTint(this.baseTint);
      }
    });
  }
  createMotionTrail() {
      for(let i = 0; i < 3; i++) {
          const ghost = this.scene.add.image(this.sprite.x, this.sprite.y, this.currentImageKey);
          ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
          ghost.setTint(this.baseTint);
          ghost.setAlpha(0.4);
          ghost.setBlendMode(Phaser.BlendModes.ADD);
          
          this.scene.tweens.add({
              targets: ghost,
              x: this.sprite.x - (i * 40),
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
