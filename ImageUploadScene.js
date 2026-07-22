

import Phaser from 'phaser';
import { parseGIF, decompressFrames } from 'https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm';
import LZString from 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm';
import MediaLibrary from './MediaLibrary.js';
import { search } from './SearchIndex.js';
import { LIMITS } from './MediaPipeline.js';

export default class ImageUploadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ImageUploadScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Initialize drop cooldown and batch processing flag
    this.dropCooldown = 0;
    this.dropCooldownDuration = 500; // 500ms cooldown between drops
    this.isProcessingBatch = false; // Prevent overlapping batch uploads
    
    // Block 9: honest per-file caps from MediaPipeline (the old 1GB numbers
    // were fiction — base64 in a browser dies long before that). GIFs get the
    // gif cap; plain images the image cap; audio the audio cap.
    this.MAX_IMAGE_SIZE = LIMITS.gif;   // 15MB — covers gif + image (gif is the larger)
    this.MAX_AUDIO_SIZE = LIMITS.audio; // 40MB
    this.MAX_TOTAL_UPLOAD = Number.MAX_SAFE_INTEGER; // No batch limit - rely on per-file limit instead
    
    // Debounced gallery refresh to prevent excessive rebuilding during batch uploads
    this.galleryRefreshTimer = null;
    
    // Track if storage warning has been shown to avoid spam
    this.storageWarningShown = false;
    
    // Restore custom assets from localStorage
    this.restoreCustomAssets();

    // --- 1. Vibrant Background (Soda Theme) ---
    this.colors = [
      { main: 0x00ffff, dark: 0x0099cc }, // Cyan Soda
      { main: 0x0000ff, dark: 0x000099 }, // Blue Soda
      { main: 0x9900ff, dark: 0x6600cc }, // Purple Soda
      { main: 0xff00ff, dark: 0x990099 }  // Pink Soda
    ];
    this.currentColorIndex = 0;
    
    // Liquid Wave Variables
    this.wavePhase = 0;
    this.bgGraphics = this.add.graphics();
    
    // Cycle target colors
    this.time.addEvent({
      delay: 3000,
      callback: () => {
        this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
      },
      loop: true
    });
    
    // Add light beams (God rays through the soda)
    this.createLightBeams();
    
    // Add Fizz (Bubbles)
    this.createFizzBubbles();
    // --- 2. Title & UI ---
    const title = this.add.text(width / 2, 60, 'DANCER LAB', {
      fontSize: '64px',
      fontFamily: 'Impact, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Store pulse tween reference
    this.titlePulse = this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Add interactive hover effect
    title.setInteractive();
    title.on('pointerover', () => {
        if (this.titlePulse) this.titlePulse.pause();
        this.tweens.add({ targets: title, scale: 1.2, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    title.on('pointerout', () => {
        this.tweens.add({ 
            targets: title, 
            scale: 1, 
            duration: 150, 
            ease: 'Back.easeOut',
            onComplete: () => { if (this.titlePulse) this.titlePulse.resume(); }
        });
    });

    // Check for mobile/iOS for special instructions
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = !this.sys.game.device.os.desktop;
    
    const subTextContent = isMobile 
      ? 'Upload your own images and audio to see them dance and play in-game!\n(Tip: Modern mobile phone limitations may be around 45 images and 5 mp3 files.)'
      : 'Upload your own images and audio to see them dance and play in-game!';
    
    const subText = this.add.text(width / 2, 110, subTextContent, {
      fontSize: isMobile ? '18px' : '20px',
      fontFamily: 'Arial',
      color: isMobile ? '#ffff00' : '#00ffff', // Yellow for mobile tip, Cyan for desktop
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width * 0.9 }
    }).setOrigin(0.5);
    // Add hover effect to subText (Visual only, no click)
    subText.setInteractive();
    subText.on('pointerover', () => {
        this.tweens.add({ targets: subText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    subText.on('pointerout', () => {
        this.tweens.add({ targets: subText, scale: 1, duration: 150, ease: 'Back.easeOut' });
    });
    
    // --- 3. Interaction Buttons (Moved Above Gallery) ---
    const buttonY = 210;
    
    // CREATE IMAGE BUTTON (Small, above Back to Menu)
    const createImageBtn = this.add.text(width / 2, buttonY - 50, 'CREATE IMAGE', {
        fontSize: '18px',
        fontFamily: 'Impact',
        color: '#ffffff',
        backgroundColor: '#9900ff',
        padding: { x: 15, y: 8 },
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    // Add black outline to button background
    const btnOutline = this.add.rectangle(width / 2, buttonY - 50, 
      createImageBtn.width, createImageBtn.height, 0x000000, 0);
    btnOutline.setStrokeStyle(3, 0x000000);
    btnOutline.setDepth(createImageBtn.depth - 1);
    
    createImageBtn.on('pointerover', () => {
        this.tweens.add({ targets: createImageBtn, scale: 1.1, duration: 100 });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    createImageBtn.on('pointerout', () => {
        this.tweens.add({ targets: createImageBtn, scale: 1.0, duration: 100 });
    });
    createImageBtn.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.5 });
        this.openPixelArtEditor();
    });
    
    // UPLOAD IMAGES BUTTON (Uses DOM overlay for mobile compatibility)
    const uploadImageBtn = this.createButton(width / 2 - 300, buttonY, 'UPLOAD IMAGES', 0x00ff00, () => {
        // Fallback for desktop/trusted contexts
        this.triggerFileUpload();
    });
    this.setupMobileFileUpload(
        uploadImageBtn, 
        'image/*,image/gif,image/png,image/jpeg,video/*,.gif,.png,.jpg,.jpeg,.mp4,.mov,.webm',
        (e) => this.handleImageUpload(e)
    );

    // BACK TO MENU BUTTON
    this.createButton(width / 2, buttonY, 'BACK TO MENU', 0xff0066, () => {
        this.scene.start('MenuScene');
    });
    
    // UPLOAD MUSIC BUTTON (Uses DOM overlay for mobile compatibility)
    const uploadMusicBtn = this.createButton(width / 2 + 300, buttonY, 'UPLOAD MUSIC', 0x00ffff, () => {
        // Fallback for desktop/trusted contexts
        this.triggerMusicUpload();
    });
    this.setupMobileFileUpload(
        uploadMusicBtn,
        'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/mpeg,audio/mp3,audio/wav,audio/ogg',
        (e) => this.handleMusicUpload(e)
    );
    
    // BUILT-IN ASSETS TOGGLE BUTTONS (Below other buttons, side by side)
    const toggleY = buttonY + 70;
    
    // Initialize states
    this.builtInAssetsEnabled = this.registry.get('builtInAssetsEnabled');
    if (this.builtInAssetsEnabled === undefined) {
      this.builtInAssetsEnabled = true;
      this.registry.set('builtInAssetsEnabled', true);
    }
    
    this.builtInMusicEnabled = this.registry.get('builtInMusicEnabled');
    if (this.builtInMusicEnabled === undefined) {
      this.builtInMusicEnabled = true;
      this.registry.set('builtInMusicEnabled', true);
    }
    
    // IMAGE ASSETS TOGGLE (Left)
    const customDancers = this.registry.get('customDancers') || [];
    const hasCustomImages = customDancers.length > 0;
    
    this.imageToggleButton = this.createToggleButton(
      width / 2 - 210, 
      toggleY, 
      'BUILT-IN IMAGE ASSETS',
      this.builtInAssetsEnabled,
      () => {
        this.toggleBuiltInAssets();
      },
      !hasCustomImages // disabled if no custom images
    );
    
    // MUSIC ASSETS TOGGLE (Right)
    const customTracks = this.registry.get('customTracks') || [];
    const hasCustomMusic = customTracks.length > 0;
    
    this.musicToggleButton = this.createToggleButton(
      width / 2 + 210, 
      toggleY, 
      'BUILT-IN MUSIC ASSETS',
      this.builtInMusicEnabled,
      () => {
        this.toggleBuiltInMusic();
      },
      !hasCustomMusic // disabled if no custom music
    );

    // COOLDOWN TIMER TEXT (Moved below toggle button)
    this.cooldownText = this.add.text(width / 2, toggleY + 35, '', {
        fontSize: '18px',
        fontFamily: 'Impact, Arial',
        color: '#ff6600',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    this.cooldownText.setVisible(false);
    
    // CLEAR BUTTON (Top Right) - Black background with red text, centered
    const clearBtnBg = this.add.rectangle(width - 30, 30, 280, 40, 0x000000, 1).setOrigin(1, 0);
    clearBtnBg.setStrokeStyle(3, 0xff0000, 1);
    clearBtnBg.setInteractive({ useHandCursor: true });
    clearBtnBg.setDepth(10000); // Make sure it's on top
    
    const clearBtn = this.add.text(width - 170, 50, 'CLEAR ALL CUSTOM CONTENT', {
        fontSize: '18px',
        fontFamily: 'Impact',
        color: '#ff0000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    clearBtn.setDepth(10001); // Text on top of background
    
    // Hover effects
    clearBtnBg.on('pointerover', () => {
        console.log('🔴 HOVER OVER CLEAR BUTTON');
        this.tweens.add({ targets: [clearBtnBg, clearBtn], scale: 1.1, duration: 150, ease: 'Back.easeOut' });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    
    clearBtnBg.on('pointerout', () => {
        console.log('🔴 HOVER OUT CLEAR BUTTON');
        this.tweens.add({ targets: [clearBtnBg, clearBtn], scale: 1, duration: 150, ease: 'Back.easeOut' });
    });

    clearBtnBg.on('pointerdown', (pointer) => {
        console.log('🔴🔴🔴 CLEAR BUTTON POINTERDOWN EVENT FIRED! 🔴🔴🔴');
        pointer.event.stopPropagation();
        this.sound.play('menu-click', { volume: 0.5 });
        
        // Flash the button
        this.tweens.add({
            targets: clearBtnBg,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2
        });
        
        this.clearCustomDancers();
    });
    
    // --- 4. Scrollable Gallery Area (Separate for Images and Music) ---
    this.galleryViewportY = 330;
    this.galleryViewportHeight = height - this.galleryViewportY - 20;
    
    // LEFT COLUMN - Image Gallery
    const leftMaskShape = this.make.graphics();
    leftMaskShape.fillStyle(0xffffff);
    leftMaskShape.fillRect(0, this.galleryViewportY, width / 2, this.galleryViewportHeight);
    const leftMask = leftMaskShape.createGeometryMask();
    
    this.imageGalleryContainer = this.add.container(0, 0);
    this.imageGalleryContainer.setMask(leftMask);
    
    // RIGHT COLUMN - Music Gallery
    const rightMaskShape = this.make.graphics();
    rightMaskShape.fillStyle(0xffffff);
    rightMaskShape.fillRect(width / 2, this.galleryViewportY, width / 2, this.galleryViewportHeight);
    const rightMask = rightMaskShape.createGeometryMask();
    
    this.musicGalleryContainer = this.add.container(0, 0);
    this.musicGalleryContainer.setMask(rightMask);
    
    // Scroll controls for both galleries
    this.imageScrollY = 0;
    this.musicScrollY = 0;
    this.maxImageScrollY = 0;
    this.maxMusicScrollY = 0;
    
    // Mouse wheel scrolling - detect which side
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (pointer.y > this.galleryViewportY) {
            if (pointer.x < width / 2) {
                // Left side - scroll images
                this.scrollImageGallery(deltaY * 0.5);
            } else {
                // Right side - scroll music
                this.scrollMusicGallery(deltaY * 0.5);
            }
        }
    });
    
    // Touch/drag scrolling
    this.isDragging = false;
    this.lastPointerY = 0;
    this.dragSide = null; // 'left' or 'right'
    
    this.input.on('pointerdown', (pointer) => {
        if (pointer.y > this.galleryViewportY) {
            this.isDragging = true;
            this.lastPointerY = pointer.y;
            this.dragSide = pointer.x < width / 2 ? 'left' : 'right';
        }
    });
    
    this.input.on('pointermove', (pointer) => {
        if (this.isDragging) {
            const deltaY = this.lastPointerY - pointer.y;
            
            if (this.dragSide === 'left') {
                this.scrollImageGallery(deltaY);
            } else {
                this.scrollMusicGallery(deltaY);
            }
            
            this.lastPointerY = pointer.y;
        }
    });
    
    this.input.on('pointerup', () => {
        this.isDragging = false;
        this.dragSide = null;
    });
    
    // --- 4.5 Search bar (Block 5) — DOM input over the canvas, same overlay
    // pattern as setupMobileFileUpload/updateDOMButtonPosition.
    this.searchQuery = '';
    this._createSearchInput();
    
    // --- 5. Drag and Drop Setup ---
    this.setupDragAndDrop();
    
    this.refreshGallery();
    
    // Update toggle button states on initial load
    this.updateToggleButtonStates();
  }
  
  setupDragAndDrop() {
    const { width, height } = this.scale;
    
    // Create drop zone overlay (hidden by default)
    this.dropZone = this.add.container(width / 2, height / 2);
    this.dropZone.setDepth(3000);
    this.dropZone.setVisible(false);
    
    // Semi-transparent background
    const dropBg = this.add.rectangle(0, 0, width * 0.8, height * 0.6, 0x000000, 0.9);
    dropBg.setStrokeStyle(6, 0x00ffff, 1);
    
    // Animated border glow
    const dropGlow = this.add.rectangle(0, 0, width * 0.8, height * 0.6, 0x00ffff, 0);
    dropGlow.setStrokeStyle(12, 0x00ffff, 0.5);
    
    // Drop icon
    const dropIcon = this.add.text(0, -80, '📁', {
      fontSize: '120px'
    }).setOrigin(0.5);
    
    // Drop text
    const dropText = this.add.text(0, 40, 'DROP FILES HERE', {
      fontSize: '48px',
      fontFamily: 'Impact, Arial',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
    
    // Supported formats text
    const formatText = this.add.text(0, 100, 'Images (PNG, JPG, GIF) or Audio (MP3, WAV, OGG)', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      alpha: 0.8
    }).setOrigin(0.5);
    
    this.dropZone.add([dropGlow, dropBg, dropIcon, dropText, formatText]);
    
    // Pulsing animation for drop zone
    this.dropZoneGlow = dropGlow;
    
    // Get canvas element
    const canvas = this.game.canvas;
    
    // Prevent default drag behavior on the entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      canvas.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    
    // Show drop zone when dragging files over
    canvas.addEventListener('dragenter', (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        this.showDropZone();
      }
    }, false);
    
    // Keep drop zone visible while hovering
    canvas.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        this.showDropZone();
      }
    }, false);
    
    // Hide drop zone when leaving
    canvas.addEventListener('dragleave', (e) => {
      // Only hide if we're leaving the canvas entirely
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX >= rect.right ||
          e.clientY < rect.top || e.clientY >= rect.bottom) {
        this.hideDropZone();
      }
    }, false);
    
    // Handle file drop
    canvas.addEventListener('drop', (e) => {
      this.hideDropZone();
      
      // Check cooldown to prevent rapid successive drops
      if (this.dropCooldown > 0) {
        this.showFeedback('PLEASE WAIT - COOLDOWN ACTIVE', 0xff6600);
        return;
      }
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Set cooldown AFTER files finish processing, not before
        this.handleDroppedFiles(files);
      }
    }, false);
  }
  
  showDropZone() {
    if (!this.dropZone.visible) {
      this.dropZone.setVisible(true);
      this.dropZone.setAlpha(0);
      this.dropZone.setScale(0.8);
      
      this.tweens.add({
        targets: this.dropZone,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
      
      // Start glow pulse
      if (this.dropZoneGlowTween) this.dropZoneGlowTween.stop();
      this.dropZoneGlowTween = this.tweens.add({
        targets: this.dropZoneGlow,
        alpha: { from: 0.2, to: 0.8 },
        scaleX: { from: 1, to: 1.05 },
        scaleY: { from: 1, to: 1.05 },
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    }
  }
  
  hideDropZone() {
    if (this.dropZone.visible) {
      this.tweens.add({
        targets: this.dropZone,
        alpha: 0,
        scale: 0.8,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.dropZone.setVisible(false);
          if (this.dropZoneGlowTween) {
            this.dropZoneGlowTween.stop();
            this.dropZoneGlowTween = null;
          }
        }
      });
    }
  }
  
  validateFileSize(file, isAudio = false) {
      if (!file || !file.size) return false; // Block 9: 0-byte files are junk
      const maxSize = isAudio ? this.MAX_AUDIO_SIZE : this.MAX_IMAGE_SIZE;
      return file.size <= maxSize;
  }
  
  formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  handleDroppedFiles(files) {
    // Check if we're already processing files
    if (this.isProcessingBatch) {
        console.warn('⚠️ Already processing batch, rejecting new drop');
        this.showFeedback('PLEASE WAIT - STILL PROCESSING PREVIOUS BATCH', 0xff6600);
        return;
    }
    
    // Separate files by type and validate
    const imageFiles = [];
    const audioFiles = [];
    const rejectedFiles = [];
    let totalSize = 0;
    
    files.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      // Check for image types (MIME or Extension)
      const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
      // Check for audio types (MIME or Extension)
      const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);

      if (isImage) {
        if (!this.validateFileSize(file, false)) {
          rejectedFiles.push({
            name: file.name,
            reason: `exceeds ${this.formatFileSize(this.MAX_IMAGE_SIZE)} limit`
          });
        } else {
          imageFiles.push(file);
          totalSize += file.size;
        }
      } else if (isAudio) {
        if (!this.validateFileSize(file, true)) {
          rejectedFiles.push({
            name: file.name,
            reason: `exceeds ${this.formatFileSize(this.MAX_AUDIO_SIZE)} limit`
          });
        } else {
          audioFiles.push(file);
          totalSize += file.size;
        }
      } else {
        rejectedFiles.push({
          name: file.name,
          reason: 'unsupported format'
        });
      }
    });
    
    // Check total size
    if (totalSize > this.MAX_TOTAL_UPLOAD) {
      this.showFeedback(`BATCH EXCEEDS ${this.formatFileSize(this.MAX_TOTAL_UPLOAD)} LIMIT`, 0xff0000);
      return;
    }
    
    // Show rejection feedback
    if (rejectedFiles.length > 0) {
      let message = `${rejectedFiles.length} FILE(S) REJECTED:\n`;
      rejectedFiles.slice(0, 3).forEach(f => {
        message += `• ${f.name}: ${f.reason}\n`;
      });
      if (rejectedFiles.length > 3) {
        message += `+ ${rejectedFiles.length - 3} more...`;
      }
      this.showFeedback(message.replace(/\n/g, ' '), 0xff6600);
    }
    
    // If no valid files after validation, return early
    if (imageFiles.length === 0 && audioFiles.length === 0) return;
    
    const totalFiles = imageFiles.length + audioFiles.length;
    if (totalFiles === 0) return;
    
    // Mark as processing
    this.isProcessingBatch = true;
    console.log('🔄 Starting batch processing...');
    
    // Show progress indicator
    this.showUploadProgress(0, totalFiles);
    let processedCount = 0;
    
    const updateProgress = () => {
      processedCount++;
      this.showUploadProgress(processedCount, totalFiles);
      
      // Show completion message after all files processed
      if (processedCount === totalFiles) {
        console.log('✅ Batch processing complete!');
        
        // Mark as no longer processing
        this.isProcessingBatch = false;
        
        this.hideUploadProgress();
        
        // Build completion message
        let message = '';
        if (imageFiles.length > 0 && audioFiles.length > 0) {
          const imgText = imageFiles.length === 1 ? 'image' : 'images';
          const trackText = audioFiles.length === 1 ? 'music track' : 'music tracks';
          message = `${imageFiles.length} ${imgText} and ${audioFiles.length} ${trackText} successfully uploaded!`;
        } else if (imageFiles.length > 0) {
          const imgText = imageFiles.length === 1 ? 'image' : 'images';
          message = `${imageFiles.length} ${imgText} successfully uploaded!`;
        } else if (audioFiles.length > 0) {
          const trackText = audioFiles.length === 1 ? 'music track' : 'music tracks';
          message = `${audioFiles.length} ${trackText} successfully uploaded!`;
        }
        
        this.showFeedback(message, 0x00ff00);
        
        // NOW start cooldown AFTER batch completes
        this.dropCooldown = this.dropCooldownDuration;
        
        // Refresh gallery NOW that batch is complete
        console.log('🔄 Refreshing gallery after batch completion...');
        this.time.delayedCall(200, () => {
            this.refreshGallery();
            // Update toggle button states after content added
            this.updateToggleButtonStates();
        });
        
        // Force garbage collection hint (browser may or may not honor it)
        if (window.gc) {
            console.log('🗑️ Suggesting garbage collection...');
            window.gc();
        }
      }
    };
    
    // Process images
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        const reader = new FileReader();
        const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
        
        reader.onload = async (event) => {
          try {
            if (isGif) {
              await this.addCustomGif(event.target.result, file.name);
              updateProgress();
            } else {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                try {
                  this.addCustomTexture(event.target.result, img, file.name);
                  updateProgress();
                } catch (e) {
                  console.error(`Failed to add texture ${file.name}:`, e);
                  updateProgress(); // Still count as processed to avoid hanging
                }
              };
              img.onerror = () => {
                console.error(`Failed to load image ${file.name}`);
                updateProgress(); // Still count as processed
              };
            }
          } catch (e) {
            console.error(`Failed to process ${file.name}:`, e);
            updateProgress(); // Still count as processed to avoid hanging
          }
        };
        
        reader.onerror = () => {
          console.error(`Failed to read file ${file.name}`);
          updateProgress(); // Still count as processed
        };
        
        if (isGif) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
    }
    
    // Process audio files
    if (audioFiles.length > 0) {
      audioFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            this.addCustomTrack(event.target.result, file.name);
            updateProgress();
          } catch (e) {
            console.error(`Failed to add audio ${file.name}:`, e);
            updateProgress(); // Still count as processed to avoid hanging
          }
        };
        reader.onerror = () => {
          console.error(`Failed to read audio file ${file.name}`);
          updateProgress(); // Still count as processed
        };
        reader.readAsDataURL(file);
      });
    }
  }
  scrollImageGallery(delta) {
      this.imageScrollY += delta;
      this.imageScrollY = Phaser.Math.Clamp(this.imageScrollY, 0, this.maxImageScrollY);
      this.imageGalleryContainer.y = this.galleryViewportY - this.imageScrollY;
  }
  
  scrollMusicGallery(delta) {
      this.musicScrollY += delta;
      this.musicScrollY = Phaser.Math.Clamp(this.musicScrollY, 0, this.maxMusicScrollY);
      this.musicGalleryContainer.y = this.galleryViewportY - this.musicScrollY;
  }


  drawLiquidBackground() {
    const { width, height } = this.scale;
    this.wavePhase += 0.02;
    
    const color = this.colors[this.currentColorIndex];
    
    this.bgGraphics.clear();
    
    // Base Gradient
    this.bgGraphics.fillGradientStyle(color.dark, color.dark, color.main, color.main, 1, 1, 1, 1);
    this.bgGraphics.fillRect(0, 0, width, height);
    
    // Draw 5 layers of waves for deeper liquid effect
    for(let i = 0; i < 5; i++) {
        // Alpha decreases for back layers, increases for front
        const alpha = 0.1 + (i * 0.05); 
        // Alternate fills slightly for depth
        const fillColor = i % 2 === 0 ? 0xffffff : 0xccffff;
        this.bgGraphics.fillStyle(fillColor, alpha);
        
        this.bgGraphics.beginPath();
        // Varied wave height
        const waveHeight = 30 + (i * 15) + Math.sin(this.wavePhase * 0.5) * 10;
        // Spread waves to cover more screen but keeping them distinct
        const yOffset = height * 0.15 + (i * 120); 
        
        const frequency = 0.008 + (i * 0.004);
        const speed = this.wavePhase * (0.8 + i * 0.3);
        const phaseOffset = i * 2; // Offset waves so they don't align
        
        this.bgGraphics.moveTo(0, height);
        
        // Draw wave with sine + cosine for complexity
        for(let x = 0; x <= width; x += 15) {
            const y = Math.sin(x * frequency + speed + phaseOffset) * waveHeight 
                    + Math.cos(x * frequency * 1.5 - speed) * (waveHeight * 0.3)
                    + yOffset;
            this.bgGraphics.lineTo(x, y);
        }
        
        this.bgGraphics.lineTo(width, height);
        this.bgGraphics.lineTo(0, height);
        this.bgGraphics.closePath();
        this.bgGraphics.fillPath();
    }
  }
  createButton(x, y, text, color, callback) {
    const btn = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 260, 60, color).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(4, 0xffffff);
    
    const label = this.add.text(0, 0, text, {
        fontSize: '24px',
        fontFamily: 'Impact',
        color: '#000000'
    }).setOrigin(0.5);
    
    btn.add([bg, label]);
    
    bg.on('pointerover', () => {
        this.tweens.add({ targets: btn, scale: 1.1, duration: 100 });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    
    bg.on('pointerout', () => {
        this.tweens.add({ targets: btn, scale: 1.0, duration: 100 });
    });
    
    bg.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.5 });
        callback();
    });
    
    return btn;
  }
  
  createToggleButton(x, y, labelPrefix, isEnabled, callback, isDisabled = false) {
    const btn = this.add.container(x, y);
    
    // Change appearance if disabled
    const bgColor = isDisabled ? 0x222222 : 0x333333;
    const bgAlpha = isDisabled ? 0.5 : 0.8;
    const bg = this.add.rectangle(0, 0, 400, 50, bgColor, bgAlpha);
    bg.setStrokeStyle(3, isDisabled ? 0x666666 : 0xffffff, 0.6);
    
    // Always make interactive (to show warning if disabled)
    bg.setInteractive({ useHandCursor: !isDisabled });
    
    let labelText, labelColor;
    if (isDisabled) {
      labelText = `${labelPrefix}: LOCKED`;
      labelColor = '#666666';
    } else {
      labelText = isEnabled 
        ? `${labelPrefix}: ENABLED` 
        : `${labelPrefix}: DISABLED`;
      labelColor = isEnabled ? '#00ff00' : '#ff6600';
    }
    
    const toggleLabel = this.add.text(0, 0, labelText, {
        fontSize: '18px',
        fontFamily: 'Impact',
        color: labelColor,
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // Store references on the button container
    btn.toggleLabel = toggleLabel;
    btn.labelPrefix = labelPrefix;
    btn.isDisabled = isDisabled;
    btn.bg = bg;
    
    btn.add([bg, toggleLabel]);
    
    // Only add interactivity if not disabled
    if (!isDisabled) {
      bg.on('pointerover', () => {
          this.tweens.add({ targets: btn, scale: 1.05, duration: 100 });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      
      bg.on('pointerout', () => {
          this.tweens.add({ targets: btn, scale: 1.0, duration: 100 });
      });
      
      bg.on('pointerdown', () => {
          this.sound.play('menu-click', { volume: 0.5 });
          callback();
      });
    } else {
      // Show warning when trying to click disabled button
      bg.on('pointerdown', () => {
          const isImageToggle = labelPrefix.includes('IMAGE');
          const message = isImageToggle 
            ? 'UPLOAD CUSTOM IMAGES TO UNLOCK THIS TOGGLE'
            : 'UPLOAD CUSTOM MUSIC TO UNLOCK THIS TOGGLE';
          this.showFeedback(message, 0xff6600);
      });
    }
    
    return btn;
  }
  
  setupMobileFileUpload(buttonContainer, acceptString, callback) {
    // Robust Mobile File Upload Strategy: DOM Overlay
    // Creates a transparent file input that exactly covers the Phaser button
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    
    // ═══════════════════════════════════════════════════════════════════════════
    // iOS/MOBILE SAFARI FIX for File Upload Issues:
    // ═══════════════════════════════════════════════════════════════════════════
    // Problem: iOS Safari has strict limitations on file picker:
    //   1. Photo Library selection limited to ~24 images at a time
    //   2. Files app struggles with 'accept' attribute filtering
    //   3. Audio files sometimes fail to upload with accept="audio/*"
    //
    // Solution: Remove 'accept' attribute entirely on iOS Safari
    //   - Allows Files app to work properly for all file types
    //   - User can manually select correct files (validation happens in handlers)
    //   - Desktop/Android keeps filtering for better UX
    //   - Users can tap upload button multiple times for more batches (24+24+24...)
    // ═══════════════════════════════════════════════════════════════════════════
    const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /WebKit/i.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent);
    
    if (!isMobileSafari) {
        // Desktop/Android - use accept attribute for filtering
        fileInput.accept = acceptString;
    }
    // iOS - no accept attribute (allows Files app to work, manual filtering in handler)
    
    fileInput.multiple = true;
    
    // Add capture attribute for direct camera access on mobile (optional)
    // Uncomment if you want camera shortcut: fileInput.setAttribute('capture', 'environment');
    
    // Style to be invisible but clickable
    fileInput.style.position = 'absolute';
    fileInput.style.opacity = '0';
    fileInput.style.zIndex = '1000'; // High z-index to be on top of canvas
    fileInput.style.cursor = 'pointer';
    fileInput.style.pointerEvents = 'auto'; // CRITICAL: Ensure it receives pointer events
    
    // Add to body
    document.body.appendChild(fileInput);
    
    // Proxy Hover Effects
    fileInput.addEventListener('mouseenter', () => {
        this.tweens.add({ targets: buttonContainer, scale: 1.1, duration: 100 });
        this.sound.play('menu-click', { volume: 0.2 });
    });
    
    fileInput.addEventListener('mouseleave', () => {
        this.tweens.add({ targets: buttonContainer, scale: 1.0, duration: 100 });
    });
    
    fileInput.addEventListener('mousedown', () => {
        this.sound.play('menu-click', { volume: 0.5 });
    });
    
    // Store reference for update/cleanup
    if (!this.fileInputs) this.fileInputs = [];
    this.fileInputs.push({
        element: fileInput,
        target: buttonContainer
    });
    
    // Handle File Selection
    fileInput.onchange = (e) => {
        callback(e);
        // Reset value so same file can be selected again if needed
        fileInput.value = '';
    };
    
    // Initial Position Update
    this.updateDOMButtonPosition(fileInput, buttonContainer);
  }
  
  /**
   * Block 5: live search over dancers + tracks (+ videos). A real DOM <input>
   * positioned over the canvas — reuses the fileInputs position-sync loop in
   * update() and the shutdown() cleanup, same as the upload overlays.
   */
  _createSearchInput() {
    // Invisible Phaser anchor the DOM input tracks (top-left, opposite CLEAR)
    this.searchAnchor = this.add.rectangle(160, 40, 280, 36, 0x000000, 0);
    
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '🔎 search dancers & tracks…';
    input.autocomplete = 'off';
    input.style.position = 'absolute';
    input.style.zIndex = '1000';
    input.style.background = 'rgba(0,0,0,0.75)';
    input.style.border = '2px solid #00ffff';
    input.style.borderRadius = '6px';
    input.style.color = '#ffffff';
    input.style.fontFamily = 'Arial, sans-serif';
    input.style.fontSize = '14px';
    input.style.padding = '2px 8px';
    input.style.outline = 'none';
    document.body.appendChild(input);
    
    input.addEventListener('keyup', () => {
      if (this.searchQuery !== input.value) {
        this.searchQuery = input.value;
        this.refreshGalleryDebounced(120);
      }
    });
    // 'search' inputs fire this when the ✕ clear button is pressed
    input.addEventListener('input', () => {
      if (input.value === '' && this.searchQuery !== '') {
        this.searchQuery = '';
        this.refreshGalleryDebounced(120);
      }
    });
    
    if (!this.fileInputs) this.fileInputs = [];
    this.fileInputs.push({ element: input, target: this.searchAnchor });
    this.updateDOMButtonPosition(input, this.searchAnchor);
  }

  updateDOMButtonPosition(element, target) {
    if (!this.scale || !this.scale.canvas) return;
    
    const canvas = this.scale.canvas;
    const canvasBounds = canvas.getBoundingClientRect();
    
    // Get Phaser object bounds (in game pixels)
    // Note: getBounds() returns global coordinates if container is at 0,0, which it is
    const targetBounds = target.getBounds();
    
    // Calculate scale ratio (Canvas CSS size vs Game Resolution)
    const scaleX = canvasBounds.width / this.scale.width;
    const scaleY = canvasBounds.height / this.scale.height;
    
    // Calculate Screen Coordinates
    // Left = Canvas Left + (Game X - OriginOffset) * Scale
    // Top = Canvas Top + (Game Y - OriginOffset) * Scale
    
    const left = canvasBounds.left + targetBounds.x * scaleX;
    const top = canvasBounds.top + targetBounds.y * scaleY;
    const width = targetBounds.width * scaleX;
    const height = targetBounds.height * scaleY;
    
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  }

  update() {
    // Draw animated liquid background
    this.drawLiquidBackground();
    
    // Decrease drop cooldown
    if (this.dropCooldown > 0) {
      this.dropCooldown--;
      if (this.cooldownText) {
          const seconds = Math.ceil(this.dropCooldown / 60);
          this.cooldownText.setText(`UPLOAD COOLDOWN: ${seconds}s`);
          this.cooldownText.setVisible(true);
      }
    } else {
      if (this.cooldownText && this.cooldownText.visible) {
          this.cooldownText.setVisible(false);
      }
    }
    
    // Sync DOM button positions every frame (handles resize/orientation changes)
    if (this.fileInputs) {
        this.fileInputs.forEach(item => {
            if (item.element && item.target && item.target.active) {
                this.updateDOMButtonPosition(item.element, item.target);
            }
        });
    }
  }

  // Override shutdown to clean up DOM elements
  shutdown() {
      if (this.fileInputs) {
          this.fileInputs.forEach(item => {
              if (item.element && item.element.parentNode) {
                  item.element.parentNode.removeChild(item.element);
              }
          });
          this.fileInputs = [];
      }
      super.shutdown();
  }

  updateToggleButtonStates() {
    // Check if custom content exists
    const customDancers = this.registry.get('customDancers') || [];
    const customTracks = this.registry.get('customTracks') || [];
    const hasCustomImages = customDancers.length > 0;
    const hasCustomMusic = customTracks.length > 0;
    
    // Update image toggle button
    if (this.imageToggleButton) {
      const wasDisabled = this.imageToggleButton.isDisabled;
      const shouldBeDisabled = !hasCustomImages;
      
      if (wasDisabled !== shouldBeDisabled) {
        // State changed - recreate button
        const x = this.imageToggleButton.x;
        const y = this.imageToggleButton.y;
        this.imageToggleButton.destroy();
        
        this.imageToggleButton = this.createToggleButton(
          x, y,
          'BUILT-IN IMAGE ASSETS',
          this.builtInAssetsEnabled,
          () => { this.toggleBuiltInAssets(); },
          shouldBeDisabled
        );
      }
    }
    
    // Update music toggle button
    if (this.musicToggleButton) {
      const wasDisabled = this.musicToggleButton.isDisabled;
      const shouldBeDisabled = !hasCustomMusic;
      
      if (wasDisabled !== shouldBeDisabled) {
        // State changed - recreate button
        const x = this.musicToggleButton.x;
        const y = this.musicToggleButton.y;
        this.musicToggleButton.destroy();
        
        this.musicToggleButton = this.createToggleButton(
          x, y,
          'BUILT-IN MUSIC ASSETS',
          this.builtInMusicEnabled,
          () => { this.toggleBuiltInMusic(); },
          shouldBeDisabled
        );
      }
    }
  }
  
  toggleBuiltInAssets() {
    this.builtInAssetsEnabled = !this.builtInAssetsEnabled;
    this.registry.set('builtInAssetsEnabled', this.builtInAssetsEnabled);
    
    // Update toggle button appearance
    const labelText = this.builtInAssetsEnabled 
      ? `${this.imageToggleButton.labelPrefix}: ENABLED` 
      : `${this.imageToggleButton.labelPrefix}: DISABLED`;
    const labelColor = this.builtInAssetsEnabled ? '#00ff00' : '#ff6600';
    
    this.imageToggleButton.toggleLabel.setText(labelText);
    this.imageToggleButton.toggleLabel.setColor(labelColor);
    
    // Show feedback
    const message = this.builtInAssetsEnabled 
      ? 'BUILT-IN IMAGE DANCERS ENABLED' 
      : 'ONLY CUSTOM IMAGE DANCERS WILL APPEAR';
    this.showFeedback(message, this.builtInAssetsEnabled ? 0x00ff00 : 0xff6600);
  }
  
  toggleBuiltInMusic() {
    this.builtInMusicEnabled = !this.builtInMusicEnabled;
    this.registry.set('builtInMusicEnabled', this.builtInMusicEnabled);
    
    // Update toggle button appearance
    const labelText = this.builtInMusicEnabled 
      ? `${this.musicToggleButton.labelPrefix}: ENABLED` 
      : `${this.musicToggleButton.labelPrefix}: DISABLED`;
    const labelColor = this.builtInMusicEnabled ? '#00ff00' : '#ff6600';
    
    this.musicToggleButton.toggleLabel.setText(labelText);
    this.musicToggleButton.toggleLabel.setColor(labelColor);
    
    // Show feedback
    const message = this.builtInMusicEnabled 
      ? 'BUILT-IN MUSIC TRACKS ENABLED' 
      : 'ONLY CUSTOM MUSIC WILL BE AVAILABLE';
    this.showFeedback(message, this.builtInMusicEnabled ? 0x00ff00 : 0xff6600);
  }

  createLightBeams() {
    const { width, height } = this.scale;
    for (let i = 0; i < 6; i++) {
        const beam = this.add.rectangle(
            Phaser.Math.Between(0, width), 
            height / 2, 
            Phaser.Math.Between(20, 100), 
            height * 1.5, 
            0xffffff, 
            0.1
        );
        beam.setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));
        beam.setBlendMode(Phaser.BlendModes.ADD);
        
        this.tweens.add({
            targets: beam,
            rotation: beam.rotation + 0.2,
            alpha: { from: 0.1, to: 0 },
            duration: Phaser.Math.Between(3000, 6000),
            yoyo: true,
            repeat: -1
        });
    }
  }

  createFizzBubbles() {
      const { width, height } = this.scale;
      
      // 1. MICRO FIZZ (Tiny, very fast background bubbles)
      for(let i=0; i<150; i++) {
          const bubble = this.add.circle(
              Phaser.Math.Between(0, width),
              Phaser.Math.Between(0, height),
              Phaser.Math.FloatBetween(0.5, 1.5),
              0xffffff,
              Phaser.Math.FloatBetween(0.1, 0.4)
          );
          bubble.setBlendMode(Phaser.BlendModes.ADD);
          
          this.tweens.add({
              targets: bubble,
              y: -50,
              duration: Phaser.Math.Between(1000, 2500), // Very fast
              repeat: -1,
              delay: Phaser.Math.Between(0, 2000),
              onRepeat: () => {
                  bubble.y = height + 10;
                  bubble.x = Phaser.Math.Between(0, width);
              }
          });
      }
      // 2. STANDARD BUBBLES (Normal fizz)
      for(let i=0; i<80; i++) {
          const bubble = this.add.circle(
              Phaser.Math.Between(0, width),
              Phaser.Math.Between(0, height),
              Phaser.Math.Between(2, 5),
              0xffffff,
              Phaser.Math.FloatBetween(0.3, 0.7)
          );
          
          this.tweens.add({
              targets: bubble,
              y: -50,
              duration: Phaser.Math.Between(3000, 6000),
              repeat: -1,
              delay: Phaser.Math.Between(0, 4000),
              onRepeat: () => {
                  bubble.y = height + 10;
                  bubble.x = Phaser.Math.Between(0, width);
                  bubble.setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
              }
          });
          
          // Wobble
          this.tweens.add({
              targets: bubble,
              x: '+=15',
              duration: Phaser.Math.Between(500, 1000),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
      }
      
      // 3. MACRO BLOBS (Large, slow, distinct bubbles)
      for(let i=0; i<15; i++) {
          const blob = this.add.circle(
              Phaser.Math.Between(0, width),
              Phaser.Math.Between(0, height),
              Phaser.Math.Between(8, 20),
              0xffffff,
              0.15
          );
          blob.setStrokeStyle(1, 0xffffff, 0.3);
          
          this.tweens.add({
              targets: blob,
              y: -100,
              duration: Phaser.Math.Between(6000, 10000), // Slow
              repeat: -1,
              delay: Phaser.Math.Between(0, 5000),
              onRepeat: () => {
                  blob.y = height + 50;
                  blob.x = Phaser.Math.Between(0, width);
              }
          });
          
          // Significant Wobble
          this.tweens.add({
              targets: blob,
              x: '+=40',
              scaleX: 1.1,
              scaleY: 0.9,
              duration: Phaser.Math.Between(1500, 2500),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
      }
  }

  async handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Mobile detection and limits
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const MAX_BATCH = isMobile ? 1000 : 1000; // Max 1000 images at once (same for mobile/desktop)
    
    // Validate all files first
    const validFiles = [];
    const rejectedFiles = [];
    let totalSize = 0;
    
    files.forEach(file => {
        if (!this.validateFileSize(file, false)) {
            rejectedFiles.push({
                name: file.name,
                reason: `exceeds ${this.formatFileSize(this.MAX_IMAGE_SIZE)} limit`
            });
        } else {
            validFiles.push(file);
            totalSize += file.size;
        }
    });
    
    // Mobile batch limit warning
    if (validFiles.length > MAX_BATCH) {
        this.showFeedback(`MOBILE LIMIT: Processing first ${MAX_BATCH} files only`, 0xff6600);
        validFiles.splice(MAX_BATCH); // Keep only first MAX_BATCH files
    }
    
    // Check total size
    if (totalSize > this.MAX_TOTAL_UPLOAD) {
        this.showFeedback(`BATCH EXCEEDS ${this.formatFileSize(this.MAX_TOTAL_UPLOAD)} LIMIT`, 0xff0000);
        return;
    }
    
    // Show rejection feedback if any
    if (rejectedFiles.length > 0) {
        const rejectMsg = rejectedFiles.length === 1 
            ? `${rejectedFiles[0].name}: ${rejectedFiles[0].reason}`
            : `${rejectedFiles.length} files rejected (size limits exceeded)`;
        this.showFeedback(rejectMsg, 0xff6600);
    }
    
    // SEQUENTIAL processing for mobile (prevents memory crash)
    if (validFiles.length > 0) {
        this.showUploadProgress(0, validFiles.length);
        
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
            
            try {
                if (isGif) {
                    // Read as ArrayBuffer for GIF
                    const arrayBuffer = await this.readFileAsync(file, 'arraybuffer');
                    await this.addCustomGif(arrayBuffer, file.name);
                } else {
                    // Read as DataURL for images
                    const dataUrl = await this.readFileAsync(file, 'dataurl');
                    await this.loadImageAsync(dataUrl, file.name);
                }
                
                // Update progress after each file
                this.showUploadProgress(i + 1, validFiles.length);
                
                // Small delay between files on mobile to prevent crash
                if (isMobile && i < validFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                this.showFeedback(`ERROR: ${file.name} failed to process`, 0xff0000);
            }
        }
        
        // Final feedback
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        let message = validFiles.length === 1 
            ? "IMAGE ADDED!" 
            : `${validFiles.length} IMAGES ADDED!`;
        
        // iOS-specific tip if they hit the 24 limit
        if (isIOS && validFiles.length >= 24) {
            message += " - Tap UPLOAD IMAGES again to add more!";
        }
        
        this.showFeedback(message);
        this.hideUploadProgress();
        
        // Refresh UI components immediately
        this.updateToggleButtonStates();
    }
  }
  
  // Helper: Read file as Promise
  readFileAsync(file, type = 'dataurl') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        
        if (type === 'arraybuffer') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
  }
  
  // Helper: Load image and add texture as Promise
  loadImageAsync(dataUrl, fileName = null) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            this.addCustomTexture(dataUrl, img, fileName);
            resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
  }

  // Legacy method kept for fallback but delegating to new handler
  triggerFileUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    
    // Mobile Safari fix: Remove accept attribute on iOS for better Files app compatibility
    const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /WebKit/i.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent);
    if (!isMobileSafari) {
        fileInput.accept = 'image/*,image/gif,image/png,image/jpeg,video/*,.gif,.png,.jpg,.jpeg,.mp4,.mov,.webm';
    }
    
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.onchange = (e) => {
        this.handleImageUpload(e);
        document.body.removeChild(fileInput);
    };
  }
  async handleMusicUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILE AUDIO UPLOAD HANDLER - Enhanced for FLAC and large files
    // ═══════════════════════════════════════════════════════════════════════════
    // Features:
    //   - Sequential processing to prevent mobile memory crashes
    //   - 60-second timeout per file to catch stalled reads
    //   - Detailed progress updates showing current file being processed
    //   - Enhanced error handling with specific feedback
    //   - Support for FLAC, MP3, WAV, OGG, M4A, AAC, OPUS, etc.
    //   - Automatic delays between files (longer for large files)
    //   - Success/fail tracking with detailed final report
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Mobile detection and limits
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const MAX_BATCH = isMobile ? 1000 : 1000; // Max 1000 audio files at once (same for mobile/desktop)
    
    // Separate files by type
    const audioFiles = [];
    const rejectedFiles = [];
    let totalSize = 0;
    
    files.forEach(file => {
        // Expanded audio detection for better mobile compatibility
        const fileName = file.name.toLowerCase();
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus', '.webm', '.aiff', '.ape'];
        const hasAudioExtension = audioExtensions.some(ext => fileName.endsWith(ext));
        const isAudio = file.type.startsWith('audio/') || hasAudioExtension;
        
        if (isAudio) {
            if (!this.validateFileSize(file, true)) {
                rejectedFiles.push({
                    name: file.name,
                    reason: `exceeds ${this.formatFileSize(this.MAX_AUDIO_SIZE)} limit`
                });
            } else {
                audioFiles.push(file);
                totalSize += file.size;
            }
        } else {
            rejectedFiles.push({
                name: file.name,
                reason: 'unsupported file type'
            });
        }
    });
    
    // Mobile batch limit warning
    if (audioFiles.length > MAX_BATCH) {
        this.showFeedback(`MOBILE LIMIT: Processing first ${MAX_BATCH} tracks only`, 0xff6600);
        audioFiles.splice(MAX_BATCH); // Keep only first MAX_BATCH files
    }
    
    // Check total size
    if (totalSize > this.MAX_TOTAL_UPLOAD) {
        this.showFeedback(`BATCH EXCEEDS ${this.formatFileSize(this.MAX_TOTAL_UPLOAD)} LIMIT`, 0xff0000);
        return;
    }
    
    // Show rejection feedback if any
    if (rejectedFiles.length > 0) {
        const rejectMsg = rejectedFiles.length === 1 
            ? `${rejectedFiles[0].name}: ${rejectedFiles[0].reason}`
            : `${rejectedFiles.length} files rejected`;
        this.showFeedback(rejectMsg, 0xff6600);
    }
    
    // SEQUENTIAL processing for mobile (prevents memory crash)
    if (audioFiles.length > 0) {
        // Warn about large files
        const largeFiles = audioFiles.filter(f => f.size > 50 * 1024 * 1024); // >50MB
        if (largeFiles.length > 0) {
            const largeFileNames = largeFiles.map(f => `${f.name} (${this.formatFileSize(f.size)})`).join(', ');
            console.warn(`⚠️ Large files detected: ${largeFileNames}`);
            this.showFeedback(`Processing ${largeFiles.length} large file(s) - This may take a while...`, 0xff6600);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause to show message
        }
        
        this.showUploadProgress(0, audioFiles.length);
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            
            // Log file info for debugging
            console.log(`📀 Processing audio ${i + 1}/${audioFiles.length}: ${file.name} (${this.formatFileSize(file.size)})`);
            
            try {
                // Show which file is being processed
                this.showUploadProgress(i, audioFiles.length, `Processing: ${file.name.substring(0, 30)}...`);
                
                // Read as DataURL for audio with timeout protection
                const dataUrl = await Promise.race([
                    this.readFileAsync(file, 'dataurl'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('File read timeout (60s)')), 60000)
                    )
                ]);
                
                // Validate dataUrl before processing
                if (!dataUrl || !dataUrl.startsWith('data:')) {
                    throw new Error('Invalid data URL generated');
                }
                
                console.log(`✓ File read successfully: ${file.name} (${dataUrl.length} chars)`);
                
                // Add to game with error handling
                this.addCustomTrack(dataUrl, file.name);
                successCount++;
                
                // Update progress after each file
                this.showUploadProgress(i + 1, audioFiles.length);
                
                // Longer delay for mobile, especially for large files
                if (isMobile) {
                    const delayTime = file.size > 10 * 1024 * 1024 ? 500 : 200; // 500ms for files >10MB
                    if (i < audioFiles.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delayTime));
                    }
                }
                
            } catch (error) {
                console.error(`❌ Failed to process ${file.name}:`, error);
                failCount++;
                
                // Show specific error message
                const errorMsg = error.message.includes('timeout') 
                    ? `${file.name}: File too large or slow to read`
                    : `${file.name}: Processing failed`;
                this.showFeedback(errorMsg, 0xff0000);
                
                // Update progress anyway to keep moving
                this.showUploadProgress(i + 1, audioFiles.length);
                
                // Brief pause before continuing
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Final feedback with detailed results
        let msg;
        if (audioFiles.length === 1) {
            msg = successCount > 0 ? "TRACK ADDED!" : "TRACK FAILED TO UPLOAD";
        } else {
            if (failCount === 0) {
                msg = `${successCount} TRACKS ADDED!`;
            } else if (successCount === 0) {
                msg = `ALL ${failCount} TRACKS FAILED - Try smaller files or different formats`;
            } else {
                msg = `${successCount} TRACKS ADDED, ${failCount} FAILED`;
            }
        }
        
        const feedbackColor = successCount > 0 ? 0x00ff00 : 0xff0000;
        this.showFeedback(msg, feedbackColor);
        this.hideUploadProgress();
        
        // Refresh UI components immediately if any succeeded
        if (successCount > 0) {
            this.updateToggleButtonStates();
        }
    }
  }

  // Legacy method kept for fallback but delegating to new handler
  triggerMusicUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    
    // Mobile Safari fix: Remove accept attribute on iOS for better Files app compatibility
    const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /WebKit/i.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent);
    if (!isMobileSafari) {
        fileInput.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/mpeg,audio/mp3,audio/wav,audio/ogg';
    }
    
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.click();
    
    fileInput.onchange = (e) => {
        this.handleMusicUpload(e);
        document.body.removeChild(fileInput);
    };
  }
  addCustomTrack(base64Data, fileName) {
      const title = fileName.replace(/\.[^/.]+$/, "");
      
      console.log(`🎵 Adding track to registry: ${fileName} (data length: ${base64Data.length})`);
      
      // Check if a track with this title already exists
      let customTracks = this.registry.get('customTracks') || [];
      const audioData = this.registry.get('customAudioData') || {};
      
      const existingTrack = customTracks.find(t => t.title === title);
      let key;
      
      if (existingTrack) {
          // Replace existing track with same name
          key = existingTrack.key;
          console.log(`🔄 Replacing existing track: ${title}`);
          
          // Remove old audio from cache
          if (this.cache.audio.exists(key)) {
              this.cache.audio.remove(key);
          }
      } else {
          // Generate unique key for new track
          const timestamp = new Date().getTime();
          const random = Math.floor(Math.random() * 10000);
          key = `custom-track-${timestamp}-${random}`;
          
          // Add new track metadata
          customTracks.push({
              key: key,
              title: title,
              artist: 'Custom Upload'
          });
          console.log(`✓ New track key generated: ${key}`);
      }
      
      // Store updated track list
      try {
          this.registry.set('customTracks', customTracks);
          console.log(`✓ Track metadata saved to registry (${customTracks.length} total tracks)`);
      } catch (e) {
          console.error('❌ Failed to save track metadata:', e);
          throw new Error(`Failed to save track metadata: ${e.message}`);
      }
      
      // Store audio data (replacing if duplicate)
      audioData[key] = base64Data;
      
      try {
          this.registry.set('customAudioData', audioData);
          console.log(`✓ Audio data saved to registry for ${key}`);
      } catch (e) {
          console.error('❌ Failed to persist audio data to registry:', e);
          // Don't throw - track is still in customTracks, data will be in memory
          console.warn(`⚠️ Track ${key} will be available this session only (not persisted)`);
      }
      
      // Decode audio asynchronously in background (non-blocking)
      const decodeDelay = Math.random() * 100;
      setTimeout(() => {
          try {
              console.log(`🔊 Attempting to decode audio for ${key}...`);
              this.sound.decodeAudio(key, base64Data);
              console.log(`✓ Audio decode started for ${key}`);
          } catch (e) {
              console.error(`❌ Failed to decode audio for ${fileName}:`, e);
          }
      }, decodeDelay);
      
      // Refresh gallery (debounced for batch uploads)
      this.refreshGalleryDebounced();
      
      console.log(`✅ Track processing complete: ${fileName}`);
  }
  resizeImageIfNeeded(img, minHeight = 1000, quality = 0.8) {
      // Calculate dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const aspectRatio = width / height;
      
      // Check if image is too small (height < minimum)
      // For this game, we want high quality silhouettes, so we upscale if needed
      if (height < minHeight) {
          height = minHeight;
          width = height * aspectRatio;
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // CRITICAL: Use PNG to preserve transparency for dancer silhouettes
      // We check if the input image source hints at PNG or if it likely has transparency
      // For this project, we'll default to PNG for dancers to ensure they work as silhouettes
      return canvas.toDataURL('image/png');
  }
  
  addCustomTexture(base64Data, originalImg = null, fileName = null) {
      // Resize image if needed to optimize storage
      let processedData = base64Data;
      if (originalImg) {
          processedData = this.resizeImageIfNeeded(originalImg);
      }
      
      let customDancers = this.registry.get('customDancers') || [];
      const imageData = this.registry.get('customImageData') || {};
      
      // 1. Content Fingerprinting
      const fingerprint = processedData.substring(0, 500);
      const contentDuplicateKey = Object.keys(imageData).find(k => {
          const existingData = imageData[k];
          return existingData && existingData.substring(0, 500) === fingerprint;
      });
      
      // 2. Filename Matching (only if fileName provided)
      let nameDuplicateKey = null;
      if (fileName) {
          const nameToMatch = fileName.toLowerCase();
          // We can't easily map keys back to filenames unless we store them, 
          // but if the content matches, we've already found it.
      }
      
      const duplicateKey = contentDuplicateKey || nameDuplicateKey;
      
      if (duplicateKey) {
          console.log(`🔄 Duplicate detected, replacing old entry: ${duplicateKey}`);
          
          // Remove old key from dancers list
          customDancers = customDancers.filter(k => k !== duplicateKey);
          
          // Cleanup old texture safely after a delay to avoid Phaser race conditions
          const oldKey = duplicateKey;
          this.time.delayedCall(100, () => {
              if (this.textures.exists(oldKey)) {
                  this.textures.remove(oldKey);
              }
          });
          
          // Remove from data storage
          delete imageData[duplicateKey];
      }
      
      // ALWAYS generate a fresh key to avoid Phaser internal key-reuse bugs
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 10000);
      const newKey = `custom-dancer-${timestamp}-${random}`;
      
      // Add new key to dancers list
      customDancers.push(newKey);
      
      // Add to Phaser Texture Manager
      this.textures.addBase64(newKey, processedData);
      
      // Store image data
      imageData[newKey] = processedData;
      this.registry.set('customImageData', imageData);
      
      // Update dancers list in registry
      try {
          this.registry.set('customDancers', customDancers);
      } catch (e) {
          // Quota error already handled by main.js listener
      }
      
      // Refresh Gallery (debounced to handle batch uploads efficiently)
      this.refreshGalleryDebounced();
  }
  
  async addCustomGif(arrayBuffer, fileName) {
    try {
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);
      
      console.log(`🎬 Processing GIF: ${fileName}, ${frames.length} frames`);
      
      // Check for existing GIF with same name
      let customDancers = this.registry.get('customDancers') || [];
      const customAnims = this.registry.get('customAnimations') || {};
      const imageData = this.registry.get('customImageData') || {};
      
      // Search for existing GIF by checking if it has animation data
      const gifName = fileName.replace(/\.[^/.]+$/, "");
      
      // Look for a duplicate key by name (GIF keys often include the original filename or parts of it)
      // Actually, since keys are random, we'll store the filename in the metadata for future matching.
      // For now, let's match by looking at customAnimations keys that exist in customDancers
      const existingGifKey = Object.keys(customAnims).find(k => {
          const anim = customAnims[k];
          return anim && anim.fileName === fileName;
      });
      
      let key;
      let isReplacement = false;
      
      if (existingGifKey) {
          key = existingGifKey;
          isReplacement = true;
          console.log(`🔄 Replacing existing GIF: ${key}`);
          
          // Cleanup old animation and textures safely after a delay
          const oldKey = key;
          const oldAnimData = customAnims[oldKey];
          
          this.time.delayedCall(100, () => {
              const oldAnimKey = `${oldKey}-anim`;
              if (this.anims.exists(oldAnimKey)) {
                  this.anims.remove(oldAnimKey);
              }
              
              if (oldAnimData && oldAnimData.frameKeys) {
                  oldAnimData.frameKeys.forEach(frameKey => {
                      if (this.textures.exists(frameKey)) {
                          this.textures.remove(frameKey);
                      }
                  });
              }
              
              if (this.textures.exists(oldKey)) {
                  this.textures.remove(oldKey);
              }
          });
          
          // Remove from dancers list so we don't have duplicates
          customDancers = customDancers.filter(k => k !== oldKey);
          delete customAnims[oldKey];
      }
      
      // ALWAYS generate a fresh key for the new GIF
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 10000);
      const newKey = `custom-dancer-${timestamp}-${random}`;
      key = newKey; // Use the new key for everything below
      
      // Calculate scaling if needed (minimum height 1000px)
      // Use first frame dimensions if lsds is unavailable
      const originalWidth = gif.lsds?.width || frames[0]?.dims?.width || 400;
      const originalHeight = gif.lsds?.height || frames[0]?.dims?.height || 400;
      const minHeight = 1000;
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      let scaleFactor = 1;

      if (originalHeight < minHeight) {
          scaleFactor = minHeight / originalHeight;
          targetHeight = minHeight;
          targetWidth = originalWidth * scaleFactor;
          console.log(`📏 GIF upscaling applied: ${originalHeight}px → ${targetHeight}px (scale: ${scaleFactor.toFixed(2)})`);
      }

      // We'll need a temp canvas for the original sized frame before upscaling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalWidth;
      tempCanvas.height = originalHeight;
      const tempCtx = tempCanvas.getContext('2d');

      // Helper to process a frame into a base64 string (with scaling)
      const processFrame = (frame) => {
          // Clear temp canvas for new frame
          tempCtx.clearRect(0, 0, originalWidth, originalHeight);
          
          // Create imageData for the patch
          const patchData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
          patchData.data.set(frame.patch);
          
          // Draw patch onto temp canvas at its correct offset
          tempCtx.putImageData(patchData, frame.dims.left, frame.dims.top);
          
          // Now draw from tempCanvas to the targetCanvas (which might be upscaled)
          const targetCanvas = document.createElement('canvas');
          targetCanvas.width = targetWidth;
          targetCanvas.height = targetHeight;
          const targetCtx = targetCanvas.getContext('2d');
          
          if (scaleFactor !== 1) {
              targetCtx.imageSmoothingEnabled = true;
              targetCtx.imageSmoothingQuality = 'high';
              targetCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
          } else {
              targetCtx.drawImage(tempCanvas, 0, 0);
          }
          
          return targetCanvas.toDataURL('image/png');
      };

      // Process all frames for animation
      const frameKeys = [];
      const frameData = []; // Store base64 data for cross-scene texture recreation
      
      for (let i = 0; i < frames.length; i++) {
        const frameBase64 = processFrame(frames[i]);
        const frameKey = `${key}-frame-${i}`;
        
        this.textures.addBase64(frameKey, frameBase64);
        frameKeys.push({ key: frameKey, delay: frames[i].delay });
        frameData.push({ key: frameKey, base64: frameBase64 });
      }
      
      const firstFrameBase64 = frameData[0].base64;
      
      console.log(`✓ Created ${frameKeys.length} upscaled frame textures for ${key}`);
      
      // Create animation
      const animKey = `${key}-anim`;
      this.anims.create({
        key: animKey,
        frames: frameKeys.map(f => ({ key: f.key })),
        frameRate: 1000 / (frames[0].delay || 100),
        repeat: -1
      });
      
      console.log(`✓ Created animation: ${animKey}, frameRate: ${1000 / (frames[0].delay || 100)}`);
      
      // Store metadata about this animation in the registry WITH base64 data
      // customAnims was already declared at the beginning of this function
      customAnims[key] = {
        fileName: fileName, // Store for duplicate matching
        frameKeys: frameKeys.map(f => f.key),
        frameData: frameData, // Include base64 data for cross-scene recreation
        frameRate: 1000 / (frames[0].delay || 100)
      };
      try {
          this.registry.set('customAnimations', customAnims);
      } catch (e) {
          // Quota error handled by main.js listener
      }
      
      console.log(`✓ Stored animation metadata with ${frameData.length} frame base64 strings for ${key}`);
      
      // Add main texture to manager
      this.textures.addBase64(key, firstFrameBase64);
      
      // Add to custom dancers list
      customDancers.push(key);
      
      try {
          this.registry.set('customDancers', customDancers);
      } catch (e) {
          // Quota error handled by main.js listener
      }
      
      console.log(`✓ GIF ${isReplacement ? 'replaced' : 'added'}: ${key}`);
      
      this.refreshGalleryDebounced();
    } catch (e) {
      console.error('Failed to process GIF:', e);
      this.showFeedback('FAILED TO PROCESS GIF', 0xff0000);
    }
  }
  
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  
  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64.split(',')[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  removeCustomDancer(keyToRemove) {
      console.log(`🗑️ Removing dancer: ${keyToRemove}`);
      let customDancers = this.registry.get('customDancers') || [];
      customDancers = customDancers.filter(key => key !== keyToRemove);
      
      // Remove from persistent storage (registry triggers auto-save)
      const imageData = this.registry.get('customImageData') || {};
      delete imageData[keyToRemove];
      
      // Immediately trigger UI update
      this.registry.set('customDancers', customDancers);
      this.registry.set('customImageData', imageData);
      
      // Stop rendering the items immediately to avoid "isGLTexture" crash
      this.refreshGallery();
      
      // Update toggle buttons after removing content
      this.updateToggleButtonStates();
      
      // Cleanup texture after a safer delay
      this.time.delayedCall(300, () => {
          if (this.textures.exists(keyToRemove)) {
              this.textures.remove(keyToRemove);
              console.log(`✓ Texture removed from manager: ${keyToRemove}`);
          }
      });
      
      this.showFeedback("IMAGE REMOVED");
  }

  clearCustomDancers() {
      console.log('🗑️🗑️🗑️ CLEAR ALL BUTTON FUNCTION CALLED! 🗑️🗑️🗑️');
      
      const customDancers = this.registry.get('customDancers') || [];
      const customAnims = this.registry.get('customAnimations') || {};
      const customTracks = this.registry.get('customTracks') || [];
      
      console.log(`📊 Before clear: ${customDancers.length} images, ${customTracks.length} tracks`);
      
      if (customDancers.length === 0 && customTracks.length === 0) {
          console.log('❌ Nothing to clear');
          this.showFeedback("NO CONTENT TO CLEAR", 0xff6600);
          return;
      }
      
      const totalToDelete = customDancers.length + customTracks.length;
      
      // Show custom confirmation UI instead of browser confirm
      this.showDeleteConfirmation(totalToDelete, customDancers, customAnims, customTracks);
  }
  
  showDeleteConfirmation(total, customDancers, customAnims, customTracks) {
      const { width, height } = this.scale;
      
      console.log('🔔 Showing custom confirmation dialog...');
      
      // Create confirmation overlay
      const confirmOverlay = this.add.container(width / 2, height / 2);
      confirmOverlay.setDepth(25000);
      
      const bgOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
      bgOverlay.setInteractive(); // Block clicks behind
      
      const confirmBg = this.add.rectangle(0, 0, 600, 300, 0x222222, 1);
      confirmBg.setStrokeStyle(6, 0xff0000, 1);
      
      const title = this.add.text(0, -100, '⚠️ DELETE ALL CONTENT? ⚠️', {
          fontSize: '32px',
          fontFamily: 'Impact',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 5
      }).setOrigin(0.5);
      
      // Count text centered between title and warning
      const countText = this.add.text(0, -40, `${customDancers.length} images\n${customTracks.length} music tracks`, {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#ffff00',
          align: 'center',
          lineSpacing: 5
      }).setOrigin(0.5);
      
      // Warning text lower down
      const warningText = this.add.text(0, 10, 'This CANNOT be undone!', {
          fontSize: '22px',
          fontFamily: 'Impact',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 3
      }).setOrigin(0.5);
      
      // YES button
      const yesBg = this.add.rectangle(-130, 80, 200, 60, 0xff0000, 1);
      yesBg.setStrokeStyle(3, 0xffffff, 1);
      yesBg.setInteractive({ useHandCursor: true });
      
      const yesText = this.add.text(-130, 80, 'YES, DELETE', {
          fontSize: '24px',
          fontFamily: 'Impact',
          color: '#ffffff'
      }).setOrigin(0.5);
      
      // NO button
      const noBg = this.add.rectangle(130, 80, 200, 60, 0x333333, 1);
      noBg.setStrokeStyle(3, 0xffffff, 1);
      noBg.setInteractive({ useHandCursor: true });
      
      const noText = this.add.text(130, 80, 'CANCEL', {
          fontSize: '24px',
          fontFamily: 'Impact',
          color: '#ffffff'
      }).setOrigin(0.5);
      
      confirmOverlay.add([bgOverlay, confirmBg, title, countText, warningText, yesBg, yesText, noBg, noText]);
      
      // Hover effects
      yesBg.on('pointerover', () => {
          this.tweens.add({ targets: [yesBg, yesText], scale: 1.1, duration: 100 });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      yesBg.on('pointerout', () => {
          this.tweens.add({ targets: [yesBg, yesText], scale: 1.0, duration: 100 });
      });
      
      noBg.on('pointerover', () => {
          this.tweens.add({ targets: [noBg, noText], scale: 1.1, duration: 100 });
          this.sound.play('menu-click', { volume: 0.2 });
      });
      noBg.on('pointerout', () => {
          this.tweens.add({ targets: [noBg, noText], scale: 1.0, duration: 100 });
      });
      
      // YES clicked - DELETE
      yesBg.on('pointerdown', () => {
          console.log('✅ User clicked YES - DELETING');
          this.sound.play('menu-click', { volume: 0.5 });
          
          // Remove confirmation overlay
          confirmOverlay.destroy();
          
          // Start deletion
          this.showDeletionProgress(total, customDancers, customAnims, customTracks);
      });
      
      // NO clicked - CANCEL
      noBg.on('pointerdown', () => {
          console.log('❌ User clicked CANCEL');
          this.sound.play('menu-click', { volume: 0.5 });
          
          // Remove confirmation overlay
          confirmOverlay.destroy();
          
          this.showFeedback("DELETION CANCELLED", 0xff6600);
      });
  }
  
  showDeletionProgress(total, customDancers, customAnims, customTracks) {
      const { width, height } = this.scale;
      
      // IMMEDIATELY clear gallery to stop rendering old textures
      console.log('🗑️ Step 0: Clearing gallery display IMMEDIATELY...');
      this.imageGalleryContainer.removeAll(true);
      this.musicGalleryContainer.removeAll(true);
      if (this.emptyText) {
          this.emptyText.destroy();
          this.emptyText = null;
      }
      
      // Create progress overlay
      const overlay = this.add.container(width / 2, height / 2);
      overlay.setDepth(20000);
      
      const bg = this.add.rectangle(0, 0, 500, 200, 0x000000, 0.95);
      bg.setStrokeStyle(4, 0xff0000, 1);
      
      const title = this.add.text(0, -60, '🗑️ DELETING ALL CONTENT 🗑️', {
          fontSize: '28px',
          fontFamily: 'Impact',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 4
      }).setOrigin(0.5);
      
      const progressBg = this.add.rectangle(0, 0, 400, 30, 0x333333, 1);
      progressBg.setStrokeStyle(2, 0xffffff, 0.5);
      
      const progressBar = this.add.rectangle(-200, 0, 0, 26, 0xff0000, 1);
      progressBar.setOrigin(0, 0.5);
      
      const progressText = this.add.text(0, 50, '0 / ' + total, {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#ffffff'
      }).setOrigin(0.5);
      
      overlay.add([bg, title, progressBg, progressBar, progressText]);
      
      // Delete items one by one with progress
      let deleted = 0;
      
      // Clear registry FIRST
      console.log('🗑️ Step 1: Clearing registry...');
      this.registry.set('customDancers', []);
      this.registry.set('customImageData', {});
      this.registry.set('customAnimations', {});
      this.registry.set('customTracks', []);
      this.registry.set('customAudioData', {});
      
      // Clear localStorage
      console.log('🗑️ Step 2: Clearing localStorage...');
      try {
          localStorage.removeItem('shuffleRushCustomDancers');
          localStorage.removeItem('shuffleRushCustomDancers_lz');
          localStorage.removeItem('shuffleRushCustomImageData');
          localStorage.removeItem('shuffleRushCustomImageData_lz');
          localStorage.removeItem('shuffleRushCustomAnimations');
          localStorage.removeItem('shuffleRushCustomAnimations_lz');
          localStorage.removeItem('shuffleRushCustomTracks');
          localStorage.removeItem('shuffleRushCustomTracks_lz');
          localStorage.removeItem('shuffleRushCustomAudioData');
          localStorage.removeItem('shuffleRushCustomAudioData_lz');
          console.log('✓ localStorage cleared');
      } catch (e) {
          console.error('Failed to clear localStorage:', e);
      }
      
      // Delete textures with progress bar
      console.log('🗑️ Step 3: Deleting textures and audio...');
      const deleteNext = () => {
          if (deleted < total) {
              // Delete dancers
              if (deleted < customDancers.length) {
                  const key = customDancers[deleted];
                  
                  // Delete GIF frames FIRST (before main texture)
                  if (customAnims[key] && customAnims[key].frameKeys) {
                      customAnims[key].frameKeys.forEach(frameKey => {
                          if (this.textures.exists(frameKey)) {
                              try {
                                  this.textures.remove(frameKey);
                              } catch (e) {
                                  console.warn(`Failed to remove frame ${frameKey}:`, e);
                              }
                          }
                      });
                  }
                  
                  // Then delete main texture
                  if (this.textures.exists(key)) {
                      try {
                          this.textures.remove(key);
                      } catch (e) {
                          console.warn(`Failed to remove texture ${key}:`, e);
                      }
                  }
              } else {
                  // Delete tracks
                  const trackIndex = deleted - customDancers.length;
                  if (trackIndex < customTracks.length) {
                      const track = customTracks[trackIndex];
                      if (this.cache.audio.exists(track.key)) {
                          try {
                              this.cache.audio.remove(track.key);
                          } catch (e) {
                              console.warn(`Failed to remove audio ${track.key}:`, e);
                          }
                      }
                  }
              }
              
              deleted++;
              
              // Update progress bar
              const progress = deleted / total;
              progressBar.width = 400 * progress;
              progressText.setText(deleted + ' / ' + total);
              
              // Continue deletion
              this.time.delayedCall(10, deleteNext);
          } else {
              // All done!
              console.log('✅ ALL ITEMS DELETED!');
              
              // Update UI to show success
              title.setText('✅ DELETION COMPLETE! ✅');
              title.setColor('#00ff00');
              progressBar.setFillStyle(0x00ff00);
              
              // Refresh gallery to show empty state
              this.refreshGallery();
              
              // Update toggle buttons after deletion
              this.updateToggleButtonStates();
              
              // Close overlay after 1 second
              this.time.delayedCall(1000, () => {
                  this.tweens.add({
                      targets: overlay,
                      alpha: 0,
                      duration: 300,
                      onComplete: () => overlay.destroy()
                  });
                  
                  this.showFeedback(`ALL ${total} ITEMS DELETED!`, 0x00ff00);
              });
          }
      };
      
      // Start deletion
      deleteNext();
  }

  removeCustomTrack(keyToRemove) {
      console.log(`🗑️ Removing track: ${keyToRemove}`);
      let customTracks = this.registry.get('customTracks') || [];
      customTracks = customTracks.filter(track => track.key !== keyToRemove);
      
      // Remove from persistent storage
      const audioData = this.registry.get('customAudioData') || {};
      delete audioData[keyToRemove];
      
      this.registry.set('customTracks', customTracks);
      this.registry.set('customAudioData', audioData);
      
      // Immediately refresh UI
      this.refreshGallery();
      
      // Update toggle buttons after removing content
      this.updateToggleButtonStates();
      
      // Cleanup audio after delay
      this.time.delayedCall(300, () => {
          if (this.cache.audio.exists(keyToRemove)) {
              this.cache.audio.remove(keyToRemove);
              console.log(`✓ Audio removed from cache: ${keyToRemove}`);
          }
      });
      
      this.showFeedback("TRACK REMOVED");
  }
  
  /** Block 3: remove a video from the library (registry list + stored blob). */
  removeCustomVideo(keyToRemove) {
      console.log(`🗑️ Removing video: ${keyToRemove}`);
      const customVideos = (this.registry.get('customVideos') || []).filter(v => v.key !== keyToRemove);
      this.registry.set('customVideos', customVideos);
      if (this.registry.get('selectedVideoKey') === keyToRemove) {
          this.registry.set('selectedVideoKey', null);
      }
      MediaLibrary.deleteBlob('video:' + keyToRemove).catch(e => console.warn('video blob delete failed:', e));
      const thumbKey = 'vthumb-' + keyToRemove;
      if (this.textures.exists(thumbKey)) this.textures.remove(thumbKey);
      this.refreshGallery();
      this.showFeedback("VIDEO REMOVED");
  }
  
  /**
   * Block 3: grab one frame from a stored video blob as a preview texture
   * ('vthumb-<key>'), via a temporary <video> + canvas (no VideoActor needed —
   * we want a single frame, not a live texture). Refreshes the gallery when done.
   */
  async _ensureVideoThumb(videoKey) {
      const thumbKey = 'vthumb-' + videoKey;
      if (this.textures.exists(thumbKey)) return;
      if (!this._thumbsInFlight) this._thumbsInFlight = new Set();
      if (this._thumbsInFlight.has(videoKey)) return;
      this._thumbsInFlight.add(videoKey);
      
      let url = null;
      const video = document.createElement('video');
      const cleanup = () => {
          video.remove();
          if (url) URL.revokeObjectURL(url);
          this._thumbsInFlight.delete(videoKey);
      };
      try {
          const blob = await MediaLibrary.getBlob('video:' + videoKey);
          if (!blob) { cleanup(); return; }
          url = URL.createObjectURL(blob);
          video.muted = true;
          video.playsInline = true;
          video.style.display = 'none';
          video.src = url;
          document.body.appendChild(video);
          
          await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('thumb timeout')), 8000);
              video.onloadeddata = () => { clearTimeout(timeout); resolve(); };
              video.onerror = () => { clearTimeout(timeout); reject(new Error('video error')); };
          });
          // Seek a moment in so the frame isn't a black lead-in
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
          await new Promise(resolve => {
              const timeout = setTimeout(resolve, 2000);
              video.onseeked = () => { clearTimeout(timeout); resolve(); };
          });
          
          const scale = Math.min(1, 160 / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.max(2, Math.round(video.videoWidth * scale));
          const h = Math.max(2, Math.round(video.videoHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(video, 0, 0, w, h);
          cleanup();
          
          if (this.textures.exists(thumbKey)) this.textures.remove(thumbKey);
          this.textures.addBase64(thumbKey, canvas.toDataURL('image/jpeg', 0.7));
          // addBase64 is async — refresh the gallery once the texture lands
          this.textures.once('addtexture-' + thumbKey, () => {
              if (this.scene.isActive()) this.refreshGalleryDebounced(100);
          });
      } catch (e) {
          console.warn(`video thumb failed for ${videoKey}:`, e.message || e);
          cleanup();
      }
  }
  
  async restoreCustomAssets() {
      console.log('=== ImageUploadScene: Restoring Custom Assets ===');
      
      // Load from registry (which is already populated from localStorage in main.js preBoot)
      let imageData = this.registry.get('customImageData') || {};
      let customDancers = this.registry.get('customDancers') || [];
      let customAnimations = this.registry.get('customAnimations') || {};
      let audioData = this.registry.get('customAudioData') || {};
      let customTracks = this.registry.get('customTracks') || [];
      
      console.log(`📦 Restoring: ${customDancers.length} dancers, ${customTracks.length} tracks`);
      
      // Restore custom images
      let successCount = 0;
      let failCount = 0;
      const failedKeys = [];
      
      for (const key of customDancers) {
          // Check if this is a GIF animation (stored in customAnimations)
          const animData = customAnimations[key];
          
          if (animData && animData.frameData && animData.frameData.length > 0) {
              // This is a GIF - restore from customAnimations
              if (!this.textures.exists(key)) {
                  try {
                      // Recreate frame textures from stored base64 data
                      animData.frameData.forEach(frameInfo => {
                          if (!this.textures.exists(frameInfo.key)) {
                              this.textures.addBase64(frameInfo.key, frameInfo.base64);
                          }
                      });
                      
                      // Add first frame as main texture
                      this.textures.addBase64(key, animData.frameData[0].base64);
                      
                      // Create animation
                      const animKey = `${key}-anim`;
                      if (!this.anims.exists(animKey)) {
                          this.anims.create({
                              key: animKey,
                              frames: animData.frameKeys.map(fk => ({ key: fk })),
                              frameRate: animData.frameRate || 10,
                              repeat: -1
                          });
                      }
                      
                      console.log('✓ Restored GIF animation:', key, `(${animData.frameData.length} frames)`);
                      successCount++;
                  } catch (e) {
                      console.error('Failed to restore GIF animation:', key, e);
                      failedKeys.push(key);
                      failCount++;
                  }
              }
          } else if (imageData[key]) {
              // This is a static image - restore from customImageData
              if (!this.textures.exists(key)) {
                  try {
                      // Validate base64 data
                      if (imageData[key].startsWith('data:image/')) {
                          if (imageData[key].startsWith('data:image/gif')) {
                              // Old GIF format - should not happen with new code
                              console.warn('Found old GIF in customImageData for:', key, '- skipping (data is in customAnimations)');
                              // Don't treat as failure - the GIF data should be in customAnimations
                              successCount++;
                          } else {
                              // Static image
                              this.textures.addBase64(key, imageData[key]);
                              console.log('✓ Restored texture:', key);
                              successCount++;
                          }
                      } else {
                          console.error('Invalid base64 format for:', key);
                          failedKeys.push(key);
                          failCount++;
                      }
                  } catch (e) {
                      console.error('Failed to restore texture:', key, e);
                      failedKeys.push(key);
                      failCount++;
                  }
              } else {
                  // Texture already exists (might have been restored earlier), count as success
                  successCount++;
              }
          } else {
              // GHOST ENTRY: No data exists for this key
              console.warn('👻 Ghost entry detected (no data):', key);
              failedKeys.push(key);
              failCount++;
          }
      }
      
      // Clean up failed/ghost entries from registry AND imageData
      if (failedKeys.length > 0) {
          console.log(`🧹 Cleaning up ${failedKeys.length} ghost/corrupted entries...`);
          
          // Remove from dancers list
          const cleanedDancers = customDancers.filter(key => !failedKeys.includes(key));
          this.registry.set('customDancers', cleanedDancers);
          
          // Remove from imageData
          failedKeys.forEach(key => {
              delete imageData[key];
              delete customAnimations[key];
          });
          this.registry.set('customImageData', imageData);
          this.registry.set('customAnimations', customAnimations);
          
          console.log(`✓ Cleaned up ${failedKeys.length} corrupted/ghost entries`);
      }
      
      console.log(`✓ Restored ${successCount} images, ${failCount} ghost entries removed`);
      
      // Restore custom audio - also clean up ghost entries
      const failedTracks = [];
      customTracks.forEach(track => {
          if (audioData[track.key]) {
              if (!this.cache.audio.exists(track.key)) {
                  try {
                      this.sound.decodeAudio(track.key, audioData[track.key]);
                      console.log('✓ Restored audio:', track.key);
                  } catch (e) {
                      console.error('Failed to restore audio:', track.key, e);
                      failedTracks.push(track.key);
                  }
              }
          } else {
              // Ghost track entry
              console.warn('👻 Ghost track detected (no data):', track.key);
              failedTracks.push(track.key);
          }
      });
      
      // Clean up ghost tracks
      if (failedTracks.length > 0) {
          console.log(`🧹 Cleaning up ${failedTracks.length} ghost tracks...`);
          const cleanedTracks = customTracks.filter(t => !failedTracks.includes(t.key));
          this.registry.set('customTracks', cleanedTracks);
          
          failedTracks.forEach(key => {
              delete audioData[key];
          });
          this.registry.set('customAudioData', audioData);
          
          console.log(`✓ Cleaned up ${failedTracks.length} ghost tracks`);
      }
      
      console.log('=== Custom Assets Restored ===');
  }
  
  showUploadProgress(current, total, statusMessage = null) {
      if (!this.uploadProgressContainer) {
          const { width, height } = this.scale;
          
          // Create container for progress UI
          this.uploadProgressContainer = this.add.container(width / 2, height / 2);
          this.uploadProgressContainer.setDepth(3000);
          
          // Semi-transparent background (slightly taller for status message)
          const bg = this.add.rectangle(0, 0, 500, 150, 0x000000, 0.85);
          bg.setStrokeStyle(3, 0x00ffff, 1);
          
          // Title text
          this.uploadProgressTitle = this.add.text(0, -50, 'PROCESSING FILES...', {
              fontSize: '24px',
              fontFamily: 'Impact',
              color: '#00ffff',
              stroke: '#000000',
              strokeThickness: 3
          }).setOrigin(0.5);
          
          // Status message text (for current file being processed)
          this.uploadProgressStatus = this.add.text(0, -20, '', {
              fontSize: '14px',
              fontFamily: 'Arial',
              color: '#ffff00',
              wordWrap: { width: 480 },
              align: 'center'
          }).setOrigin(0.5);
          
          // Progress bar background
          const barBg = this.add.rectangle(0, 15, 300, 20, 0x222222, 1);
          barBg.setStrokeStyle(2, 0x00ffff, 0.5);
          
          // Progress bar fill
          this.uploadProgressBar = this.add.rectangle(-150, 15, 0, 16, 0x00ff00, 1);
          
          // Progress text (X / Y)
          this.uploadProgressText = this.add.text(0, 50, `${current} / ${total}`, {
              fontSize: '18px',
              fontFamily: 'Arial',
              color: '#ffffff'
          }).setOrigin(0.5);
          
          // Store total for updates
          this.uploadProgressTotal = total;
          
          this.uploadProgressContainer.add([bg, this.uploadProgressTitle, this.uploadProgressStatus, barBg, this.uploadProgressBar, this.uploadProgressText]);
          
          // Pulse animation
          this.tweens.add({
              targets: this.uploadProgressTitle,
              scale: { from: 1, to: 1.05 },
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
      }
      
      // Update progress bar
      const progress = (current / total);
      const barWidth = 300 * progress;
      
      // Fix: Set origin to Left-Center so it grows from left
      this.uploadProgressBar.setOrigin(0, 0.5);
      this.uploadProgressBar.setPosition(-150, 15);
      this.uploadProgressBar.width = barWidth;
      
      // Update text
      this.uploadProgressText.setText(`${current} / ${total}`);
      
      // Update status message if provided
      if (this.uploadProgressStatus && statusMessage) {
          this.uploadProgressStatus.setText(statusMessage);
      }
      
      // Animate progress bar fill color based on progress
      const hue = progress < 0.5 ? 0xff0000 : progress < 0.8 ? 0xffff00 : 0x00ff00;
      this.uploadProgressBar.setFillStyle(hue);
  }
  
  hideUploadProgress() {
      if (this.uploadProgressContainer) {
          this.tweens.add({
              targets: this.uploadProgressContainer,
              alpha: 0,
              scale: 0.8,
              duration: 300,
              ease: 'Back.easeIn',
              onComplete: () => {
                  if (this.uploadProgressContainer) {
                      this.uploadProgressContainer.destroy();
                      this.uploadProgressContainer = null;
                      this.uploadProgressBar = null;
                      this.uploadProgressText = null;
                  }
              }
          });
      }
  }

  showFeedback(text, color = 0xffff00) {
      if (!this.activeFeedbacks) this.activeFeedbacks = [];
      // Clean up inactive messages
      this.activeFeedbacks = this.activeFeedbacks.filter(m => m.active);

      const colorHex = '#' + color.toString(16).padStart(6, '0');
      
      // Create text object first to measure height
      const msg = this.add.text(this.scale.width/2, 0, text, {
          fontSize: '42px',
          fontFamily: 'Impact',
          color: colorHex,
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center',
          wordWrap: { width: this.scale.width * 0.8 }
      }).setOrigin(0.5).setDepth(3100);

      // Calculate vertical position to stack messages
      let targetY = this.scale.height * 0.55;
      if (this.activeFeedbacks.length > 0) {
          const lastMsg = this.activeFeedbacks[this.activeFeedbacks.length - 1];
          // Stack below the last message with padding
          targetY = lastMsg.y + (lastMsg.displayHeight / 2) + (msg.displayHeight / 2) + 40;
      }
      msg.y = targetY;
      
      this.activeFeedbacks.push(msg);

      // Entrance Animation
      msg.setScale(0);
      this.tweens.add({
          targets: msg,
          scale: 1,
          duration: 400,
          ease: 'Back.easeOut'
      });
      
      // Stay visible for 3 seconds then fade out
      this.time.delayedCall(3000, () => {
          if (msg.active) {
              this.tweens.add({
                  targets: msg,
                  alpha: 0,
                  y: msg.y - 30,
                  duration: 500,
                  onComplete: () => msg.destroy()
              });
          }
      });
  }

  // Debounced refresh to prevent excessive rebuilding during batch operations
  refreshGalleryDebounced(delay = 100) {
      // Don't schedule refresh if we're processing a batch
      if (this.isProcessingBatch) {
          console.log('⚠️ Debounced refresh skipped - batch is processing');
          return;
      }
      
      if (this.galleryRefreshTimer) {
          this.galleryRefreshTimer.remove();
      }
      this.galleryRefreshTimer = this.time.delayedCall(delay, () => {
          this.refreshGallery();
          this.galleryRefreshTimer = null;
      });
  }
  
  refreshGallery() {
      // Safety check - don't refresh during batch processing
      if (this.isProcessingBatch) {
          console.log('⚠️ Skipping gallery refresh - batch is still processing');
          return;
      }
      
      // Stop all tweens on children before destroying to prevent onUpdate callbacks on destroyed objects
      try {
          this.imageGalleryContainer.each(child => {
              this.tweens.getTweensOf(child).forEach(tween => tween.stop());
              if (child.list) {
                  child.each(subChild => {
                      this.tweens.getTweensOf(subChild).forEach(tween => tween.stop());
                  });
              }
          });
          
          this.musicGalleryContainer.each(child => {
              this.tweens.getTweensOf(child).forEach(tween => tween.stop());
              if (child.list) {
                  child.each(subChild => {
                      this.tweens.getTweensOf(subChild).forEach(tween => tween.stop());
                  });
              }
          });
      } catch (e) {
          console.warn('Error stopping tweens:', e);
      }
      
      this.imageGalleryContainer.removeAll(true);
      this.musicGalleryContainer.removeAll(true);
      
      if (this.emptyText) {
          this.emptyText.destroy();
          this.emptyText = null;
      }
      
      let customDancers = this.registry.get('customDancers') || [];
      let customTracks = this.registry.get('customTracks') || [];
      let customVideos = this.registry.get('customVideos') || [];
      const { width, height } = this.scale;
      
      // Block 5: live search filter (dancers by key/filename, tracks by
      // title/artist weighted, videos by name). Empty query = full lists.
      const q = (this.searchQuery || '').trim();
      if (q) {
          customDancers = search(customDancers.map(key => ({ key })), q, [{ name: 'key', weight: 1 }]).map(o => o.key);
          customTracks = search(customTracks, q, [{ name: 'title', weight: 2 }, { name: 'artist', weight: 1 }]);
          customVideos = search(customVideos, q, [{ name: 'name', weight: 1 }]);
      }
      
      if (q && customDancers.length === 0 && customTracks.length === 0 && customVideos.length === 0) {
          this.emptyText = this.add.text(width/2, this.galleryViewportY + this.galleryViewportHeight/2, `No matches for "${q}"`, {
              fontSize: '24px',
              fontFamily: 'Arial',
              color: '#ffff00',
              align: 'center'
          }).setOrigin(0.5);
          return;
      }
      
      if (customDancers.length === 0 && customTracks.length === 0 && customVideos.length === 0) {
          // Add to scene directly (not masked container)
          this.emptyText = this.add.text(width/2, this.galleryViewportY + this.galleryViewportHeight/2, "No Custom Files Uploaded Yet\nFeel Free to Batch Drag and Drop", {
              fontSize: '28px',
              fontFamily: 'Arial',
              color: '#ffffff',
              alpha: 0.6,
              align: 'center',
              wordWrap: { width: width * 0.6 }
          }).setOrigin(0.5);
          
          // Add hover effect to empty gallery text
          this.emptyText.setInteractive();
          this.emptyText.on('pointerover', () => {
              this.tweens.add({ targets: this.emptyText, scale: 1.1, duration: 150, ease: 'Back.easeOut' });
              this.sound.play('menu-click', { volume: 0.2 });
          });
          this.emptyText.on('pointerout', () => {
              this.tweens.add({ targets: this.emptyText, scale: 1, duration: 150, ease: 'Back.easeOut' });
          });
          
          return;
      }
      
      // TWO COLUMN LAYOUT: Images on left, Music on right
      const leftColumnX = 150;
      const rightColumnX = width / 2 + 50;
      const startY = 0; // Start at 0 since container handles positioning
      
      // Helper to handle unified hover scaling with sub-elements (like delete btn)
      const setupItemHover = (container, hitAreas, scaleTarget = 1.05) => {
          let isHovered = false;
          let scaleTimer = null;
          
          const scaleUp = () => {
              isHovered = true;
              if (scaleTimer) {
                  scaleTimer.remove();
                  scaleTimer = null;
              }
              this.tweens.add({
                  targets: container,
                  scale: scaleTarget,
                  duration: 150,
                  ease: 'Back.easeOut'
              });
              
              // Find glow in container children if it exists and boost it
              const glow = container.list.find(c => c.isGlow);
              if (glow) {
                   this.tweens.add({ targets: glow, alpha: 0.3, duration: 150 });
              }
          };
          
          const scaleDown = () => {
              isHovered = false;
              // Delay scale down slightly to prevent flickering when moving between elements
              scaleTimer = this.time.delayedCall(50, () => {
                  if (!isHovered) {
                      this.tweens.add({
                          targets: container,
                          scale: 1.0,
                          duration: 150,
                          ease: 'Back.easeOut'
                      });
                      const glow = container.list.find(c => c.isGlow);
                      if (glow) {
                           this.tweens.add({ targets: glow, alpha: 0.1, duration: 150 });
                      }
                  }
              });
          };
          
          hitAreas.forEach(area => {
              area.on('pointerover', () => {
                  // Only play sound if transitioning from non-hovered state
                  if (!isHovered) this.sound.play('menu-click', { volume: 0.2 });
                  scaleUp();
              });
              area.on('pointerout', scaleDown);
          });
      };
      // --- LEFT COLUMN: IMAGE GALLERY ---
      if (customDancers.length > 0) {
          const imageStartY = startY + 100;
          const gap = 110;
          const cols = 3;
          
          customDancers.forEach((key, index) => {
              const col = index % cols;
              const row = Math.floor(index / cols);
              
              const x = leftColumnX + col * gap;
              const y = imageStartY + row * gap;
              
              // Only create item if texture actually exists and is valid
              if (!this.textures.exists(key) || !this.textures.get(key)) {
                  console.warn(`Skipping invalid texture: ${key}`);
                  return; // Skip this item entirely
              }
              
              // Create item container
              const itemContainer = this.add.container(x, y);
              
              // Container frame with glow
              const frame = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.7);
              frame.setStrokeStyle(3, 0x00ffff, 0.8);
              
              // Glow effect
              const glow = this.add.rectangle(0, 0, 100, 100, 0x00ffff, 0.1);
              glow.setStrokeStyle(1, 0x00ffff, 0.3);
              glow.isGlow = true; // Tag for helper
              
              // Interactive hit area for hover
              const hitArea = this.add.rectangle(0, 0, 100, 100, 0x000000, 0).setInteractive({ useHandCursor: true });
              
              itemContainer.add([glow, frame]);
              
              // Add image
              const img = this.add.image(0, 0, key);
              if (img.width && img.height) {
                  const scale = Math.min(85 / img.width, 85 / img.height);
                  img.setScale(scale);
                  itemContainer.add(img);
                  
                  // Delete Button
                  const deleteBtn = this.add.text(42, -42, '×', {
                      fontSize: '24px',
                      fontFamily: 'Arial',
                      color: '#ff0000',
                      fontStyle: 'bold',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      padding: { x: 6, y: 2 }
                  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                  
                  deleteBtn.on('pointerdown', (pointer) => {
                      pointer.event.stopPropagation();
                      this.sound.play('menu-click', { volume: 0.5 });
                      this.removeCustomDancer(key);
                  });
                  
                  itemContainer.add(deleteBtn);
                  itemContainer.add(hitArea);
                  
                  // Setup unified hover
                  setupItemHover(itemContainer, [hitArea, deleteBtn]);
                  
                  // Move deleteBtn to top
                  if (itemContainer.list.length > 0) {
                      const del = itemContainer.list.find(c => c.text === '×');
                      if(del) itemContainer.bringToTop(del);
                  }
                  
                  // Add to gallery
                  this.imageGalleryContainer.add(itemContainer);
              } else {
                  // Invalid image dimensions - destroy everything and skip
                  img.destroy();
                  itemContainer.destroy();
                  console.warn(`Skipping item with invalid dimensions: ${key}`);
              }
          });
      }
      
      // --- RIGHT COLUMN: MUSIC GALLERY ---
      if (customTracks.length > 0) {
          const musicStartY = startY + 60;
          const trackGapY = 60;
          const maxVisibleTracks = 8;
          
          customTracks.forEach((track, index) => {
              const trackY = musicStartY + (index * trackGapY);
              
              // Create item container at center of track slot
              const itemContainer = this.add.container(rightColumnX + 150, trackY);
              
              // Track Container Background with glow (Local coords 0,0)
              const trackBg = this.add.rectangle(0, 0, 380, 50, 0x000000, 0.7);
              trackBg.setStrokeStyle(2, 0xff00ff, 0.8);
              
              const trackGlow = this.add.rectangle(0, 0, 380, 50, 0xff00ff, 0.1);
              trackGlow.isGlow = true;
              
              // Interactive hit area for track hover
              const trackHitArea = this.add.rectangle(0, 0, 380, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
              
              itemContainer.add([trackGlow, trackBg]);
              
              // Calculate offsets relative to center (rightColumnX + 150)
              // Original Text X was rightColumnX + 10. Center is rightColumnX + 150. Diff is -140.
              const textOffsetX = -140;
              
              // Music icon and title
              const trackText = this.add.text(textOffsetX, 0, `♫ ${track.title}`, {
                  fontSize: '18px',
                  fontFamily: 'Arial',
                  color: '#ffffff',
                  fontStyle: 'bold'
              }).setOrigin(0, 0.5);
              
              // Check if text is too long
              const maxWidth = 260;
              const hoverElements = [trackHitArea];
              
              if (trackText.width > maxWidth) {
                  // Crop text to fit box
                  trackText.setCrop(0, 0, maxWidth, trackText.height);
                  
                  // Add interactive area for scrolling (Local coords)
                  const scrollHitArea = this.add.rectangle(textOffsetX, 0, maxWidth, 30, 0x000000, 0);
                  scrollHitArea.setOrigin(0, 0.5);
                  scrollHitArea.setInteractive({ useHandCursor: true });
                  
                  hoverElements.push(scrollHitArea);
                  
                  // Initialize custom scroll property
                  trackText.scrollValue = 0;
                  const totalScroll = trackText.width - maxWidth + 20;
                  const originalX = trackText.x;
                  
                  // Scroll on hover
                  scrollHitArea.on('pointerover', () => {
                      if (trackText.scrollTween) trackText.scrollTween.stop();
                      
                      trackText.scrollTween = this.tweens.add({
                          targets: trackText,
                          scrollValue: totalScroll,
                          duration: totalScroll * 20,
                          ease: 'Linear',
                          onUpdate: () => {
                              const scroll = trackText.scrollValue;
                              trackText.x = originalX - scroll;
                              trackText.setCrop(scroll, 0, maxWidth, trackText.height);
                          }
                      });
                  });
                  
                  // Reset on hover out
                  scrollHitArea.on('pointerout', () => {
                      if (trackText.scrollTween) trackText.scrollTween.stop();
                      
                      trackText.scrollTween = this.tweens.add({
                          targets: trackText,
                          scrollValue: 0,
                          duration: 500,
                          ease: 'Cubic.easeOut',
                          onUpdate: () => {
                              const scroll = trackText.scrollValue;
                              trackText.x = originalX - scroll;
                              trackText.setCrop(scroll, 0, maxWidth, trackText.height);
                          }
                      });
                  });
                  
                  itemContainer.add(scrollHitArea);
              }
              
              // Artist/source text
              const artistText = this.add.text(textOffsetX, 15, track.artist, {
                  fontSize: '14px',
                  fontFamily: 'Arial',
                  color: '#cccccc'
              }).setOrigin(0, 0.5);
              
              // Delete Button (Offset: 300 - 150 = 150)
              const deleteBtn = this.add.text(150, 0, '×', {
                  fontSize: '28px',
                  fontFamily: 'Arial',
                  color: '#ff0000',
                  fontStyle: 'bold',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: { x: 8, y: 2 }
                  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                  
                  hoverElements.push(deleteBtn);
                  deleteBtn.on('pointerdown', (pointer) => {
                      pointer.event.stopPropagation();
                      this.sound.play('menu-click', { volume: 0.5 });
                      this.removeCustomTrack(track.key);
                  });
              
              itemContainer.add([trackText, artistText, deleteBtn, trackHitArea]);
              
              // Re-order trackHitArea to be behind interactive elements if needed, 
              // or just rely on unified hover logic.
              itemContainer.sendToBack(trackHitArea);
              itemContainer.sendToBack(trackBg);
              itemContainer.sendToBack(trackGlow);
              setupItemHover(itemContainer, hoverElements);
              this.musicGalleryContainer.add(itemContainer);
          });
          
          // Add scroll indicator if too many tracks
          if (customTracks.length > maxVisibleTracks) {
              const scrollHint = this.add.text(rightColumnX + 150, musicStartY + (maxVisibleTracks * trackGapY) + 20, 
                  '↓ More tracks below ↓', {
                  fontSize: '16px',
                  fontFamily: 'Arial',
                  color: '#ffff00',
                  alpha: 0.7
              }).setOrigin(0.5);
              
              this.tweens.add({
                  targets: scrollHint,
                  alpha: { from: 0.4, to: 1 },
                  y: scrollHint.y + 5,
                  duration: 800,
                  yoyo: true,
                  repeat: -1
              });
              
              this.musicGalleryContainer.add(scrollHint);
          }
      }
      
      // --- RIGHT COLUMN (below tracks): VIDEO GALLERY (Block 3) ---
      // Videos upload in Settings (kept there — the flow works on iOS); this
      // gallery lists them with preview/delete/select. GameScene prefers
      // registry selectedVideoKey over "latest upload".
      let videoSectionHeight = 0;
      if (customVideos.length > 0) {
          const videosStartY = startY + 60 + (customTracks.length * 60) + 30;
          const vGap = 78;
          const selectedKey = this.registry.get('selectedVideoKey') || null;
          
          const header = this.add.text(rightColumnX + 150, videosStartY - 8, '— VIDEOS —', {
              fontSize: '20px',
              fontFamily: 'Impact, Arial',
              color: '#00ff99',
              stroke: '#000000',
              strokeThickness: 3
          }).setOrigin(0.5);
          this.musicGalleryContainer.add(header);
          
          customVideos.forEach((vid, index) => {
              const vidY = videosStartY + 30 + (index * vGap) + vGap / 2 - 10;
              const isSelected = selectedKey === vid.key;
              
              const itemContainer = this.add.container(rightColumnX + 150, vidY);
              
              const vidGlow = this.add.rectangle(0, 0, 380, 68, 0x00ff99, 0.1);
              vidGlow.isGlow = true;
              const vidBg = this.add.rectangle(0, 0, 380, 68, 0x000000, 0.7);
              vidBg.setStrokeStyle(isSelected ? 4 : 2, isSelected ? 0x00ff99 : 0x0099ff, 0.9);
              const vidHitArea = this.add.rectangle(0, 0, 380, 68, 0x000000, 0).setInteractive({ useHandCursor: true });
              
              itemContainer.add([vidGlow, vidBg]);
              
              // Thumbnail slot (frame grabbed async — see _ensureVideoThumb)
              const thumbKey = 'vthumb-' + vid.key;
              const thumbFrame = this.add.rectangle(-140, 0, 84, 54, 0x111133, 1).setStrokeStyle(1, 0x00ff99, 0.5);
              itemContainer.add(thumbFrame);
              if (this.textures.exists(thumbKey)) {
                  const thumb = this.add.image(-140, 0, thumbKey);
                  thumb.setScale(Math.min(80 / thumb.width, 50 / thumb.height));
                  itemContainer.add(thumb);
              } else {
                  const placeholder = this.add.text(-140, 0, '▶', { fontSize: '24px', color: '#00ff99' }).setOrigin(0.5);
                  itemContainer.add(placeholder);
                  this._ensureVideoThumb(vid.key);
              }
              
              const nameText = this.add.text(-88, -12, vid.name && vid.name.length > 22 ? vid.name.slice(0, 21) + '…' : (vid.name || vid.key), {
                  fontSize: '16px',
                  fontFamily: 'Arial',
                  color: '#ffffff',
                  fontStyle: 'bold'
              }).setOrigin(0, 0.5);
              const metaText = this.add.text(-88, 10, `${vid.duration || '?'}s · ${vid.w || '?'}×${vid.h || '?'}`, {
                  fontSize: '13px',
                  fontFamily: 'Arial',
                  color: '#cccccc'
              }).setOrigin(0, 0.5);
              
              // SELECT button — writes registry selectedVideoKey
              const selectBtn = this.add.text(108, 0, isSelected ? '✓ IN USE' : 'SELECT', {
                  fontSize: '15px',
                  fontFamily: 'Impact, Arial',
                  color: isSelected ? '#000000' : '#00ff99',
                  backgroundColor: isSelected ? '#00ff99' : 'rgba(0,0,0,0.8)',
                  padding: { x: 8, y: 4 }
              }).setOrigin(0.5).setInteractive({ useHandCursor: true });
              selectBtn.on('pointerdown', (pointer) => {
                  pointer.event.stopPropagation();
                  this.sound.play('menu-click', { volume: 0.5 });
                  this.registry.set('selectedVideoKey', isSelected ? null : vid.key);
                  this.refreshGalleryDebounced(50);
              });
              
              const deleteBtn = this.add.text(168, 0, '×', {
                  fontSize: '28px',
                  fontFamily: 'Arial',
                  color: '#ff0000',
                  fontStyle: 'bold',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: { x: 8, y: 2 }
              }).setOrigin(0.5).setInteractive({ useHandCursor: true });
              deleteBtn.on('pointerdown', (pointer) => {
                  pointer.event.stopPropagation();
                  this.sound.play('menu-click', { volume: 0.5 });
                  this.removeCustomVideo(vid.key);
              });
              
              itemContainer.add([nameText, metaText, selectBtn, deleteBtn, vidHitArea]);
              itemContainer.sendToBack(vidHitArea);
              itemContainer.sendToBack(vidBg);
              itemContainer.sendToBack(vidGlow);
              setupItemHover(itemContainer, [vidHitArea, selectBtn, deleteBtn]);
              this.musicGalleryContainer.add(itemContainer);
          });
          
          videoSectionHeight = 30 + 30 + customVideos.length * vGap;
      }
      
      // Calculate content heights for independent scrolling
      const imageRows = Math.ceil(customDancers.length / 3);
      const imageContentHeight = customDancers.length > 0 ? (startY + 100 + imageRows * 110) : 0;
      const trackContentHeight = (customTracks.length > 0 || customVideos.length > 0)
          ? (startY + 60 + customTracks.length * 60 + videoSectionHeight) : 0;
      
      // Update max scroll for each gallery independently
      this.maxImageScrollY = Math.max(0, imageContentHeight - this.galleryViewportHeight);
      this.maxMusicScrollY = Math.max(0, trackContentHeight - this.galleryViewportHeight);
      
      // Reset scroll positions
      this.imageScrollY = 0;
      this.musicScrollY = 0;
      this.imageGalleryContainer.y = this.galleryViewportY;
      this.musicGalleryContainer.y = this.galleryViewportY;
  }
  
  openPixelArtEditor() {
    const { width, height } = this.scale;
    
    // Create overlay container
    this.pixelEditorOverlay = this.add.container(0, 0).setDepth(5000);
    
    // Dark background overlay
    const bgOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    bgOverlay.setInteractive();
    this.pixelEditorOverlay.add(bgOverlay);
    
    // Editor panel
    const panelWidth = 700;
    const panelHeight = 650;
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x222222, 1);
    panel.setStrokeStyle(4, 0x00ffff);
    this.pixelEditorOverlay.add(panel);
    
    // Title
    const title = this.add.text(width / 2, height / 2 - 290, 'PIXEL ART EDITOR', {
      fontSize: '32px',
      fontFamily: 'Impact',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    title.on('pointerover', () => {
      this.tweens.add({ targets: title, scale: 1.05, duration: 100 });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    title.on('pointerout', () => {
      this.tweens.add({ targets: title, scale: 1.0, duration: 100 });
    });
    
    this.pixelEditorOverlay.add(title);
    
    // Grid setup (50x50 pixels)
    const gridSize = 50;
    const pixelSize = 6; // Reduced from 8 to fit panel vertically
    const gridTotalSize = gridSize * pixelSize;
    const gridStartX = width / 2 - gridTotalSize / 2;
    const gridStartY = height / 2 - 240; // Shifted up further to fit buttons
    
    // Initialize pixel data
    this.pixelData = [];
    for (let y = 0; y < gridSize; y++) {
      this.pixelData[y] = [];
      for (let x = 0; x < gridSize; x++) {
        this.pixelData[y][x] = 0xffffff; // Default white
      }
    }
    
    // Current color and tool
    this.currentColor = 0x000000;
    this.currentTool = 'brush'; // 'brush', 'bucket', 'eraser'
    
    // History Management
    this.editorHistory = [];
    this.historyIndex = -1;
    this.saveHistoryState(); // Initial state
    
    // Generate 100-color palette (10x10 grid)
    const palette = this.generateColorPalette(100);
    
    const colorBoxSize = 16;
    const colorBoxGap = 2;
    const colorsPerRow = 10;
    const paletteWidth = colorsPerRow * (colorBoxSize + colorBoxGap);
    
    const paletteY = gridStartY + gridTotalSize + 20; // Placed 20px below the grid
    const paletteStartX = width / 2 - (paletteWidth / 2); // Perfectly centered
    
    this.colorBoxes = [];
    
    palette.forEach((color, index) => {
      const row = Math.floor(index / colorsPerRow);
      const col = index % colorsPerRow;
      
      const colorBox = this.add.rectangle(
        paletteStartX + col * (colorBoxSize + colorBoxGap),
        paletteY + row * (colorBoxSize + colorBoxGap),
        colorBoxSize,
        colorBoxSize,
        color
      ).setInteractive({ useHandCursor: true });
      
      colorBox.setStrokeStyle(2, this.currentColor === color ? 0x00ffff : 0x444444);
      colorBox.colorValue = color;
      
      colorBox.on('pointerover', () => {
        if (this.currentColor !== color) {
          colorBox.setStrokeStyle(2, 0xffffff);
        }
        this.sound.play('menu-click', { volume: 0.1 });
      });
      
      colorBox.on('pointerout', () => {
        if (this.currentColor !== color) {
          colorBox.setStrokeStyle(2, 0x444444);
        }
      });
      
      colorBox.on('pointerdown', () => {
        this.currentColor = color;
        this.sound.play('menu-click', { volume: 0.3 });
        
        // Update all color box borders
        this.colorBoxes.forEach(box => {
          if (box.colorValue === color) {
            box.setStrokeStyle(2, 0x00ffff);
          } else {
            box.setStrokeStyle(2, 0x444444);
          }
        });
      });
      
      this.colorBoxes.push(colorBox);
      this.pixelEditorOverlay.add(colorBox);
    });
    
    // Tool buttons (Left Sidebar)
    const toolX = gridStartX - 70; // Positioned to the left of the grid
    const toolStartY_Tools = gridStartY + 10;
    
    const tools = [
      { name: 'BRUSH', value: 'brush', color: 0x00ff00 },
      { name: 'BUCKET', value: 'bucket', color: 0x00ffff },
      { name: 'ERASER', value: 'eraser', color: 0xff6600 }
    ];
    
    this.toolButtons = [];
    
    tools.forEach((tool, index) => {
      const toolBtn = this.add.text(
        toolX,
        toolStartY_Tools + index * 50, // Stacked vertically
        tool.name,
        {
          fontSize: '14px',
          fontFamily: 'Impact',
          color: '#ffffff', // Always white
          backgroundColor: this.currentTool === tool.value ? `#${tool.color.toString(16).padStart(6, '0')}` : '#333333',
          padding: { x: 10, y: 8 },
          stroke: '#000000',
          strokeThickness: 2,
          fixedWidth: 80,
          align: 'center'
        }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      toolBtn.toolValue = tool.value;
      toolBtn.toolColor = tool.color;
      
      toolBtn.on('pointerover', () => {
        if (this.currentTool !== tool.value) {
          this.tweens.add({ targets: toolBtn, scale: 1.1, duration: 100 });
        }
        this.sound.play('menu-click', { volume: 0.2 });
      });
      
      toolBtn.on('pointerout', () => {
        if (this.currentTool !== tool.value) {
          this.tweens.add({ targets: toolBtn, scale: 1.0, duration: 100 });
        }
      });
      
      toolBtn.on('pointerdown', () => {
        this.currentTool = tool.value;
        this.sound.play('menu-click', { volume: 0.4 });
        
        // Update all tool buttons
        this.toolButtons.forEach(btn => {
          if (btn.toolValue === tool.value) {
            btn.setColor('#ffffff'); // Keep white
            btn.setBackgroundColor(`#${btn.toolColor.toString(16).padStart(6, '0')}`);
            btn.setScale(1.0);
          } else {
            btn.setColor('#ffffff');
            btn.setBackgroundColor('#333333');
          }
        });
      });
      
      this.toolButtons.push(toolBtn);
      this.pixelEditorOverlay.add(toolBtn);
    });

    // History Buttons (Below Tools)
    const historyY = toolStartY_Tools + (tools.length * 50) + 20;
    
    // UNDO Button
    const undoBtn = this.add.text(toolX, historyY, 'UNDO', {
      fontSize: '14px',
      fontFamily: 'Impact',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 8 },
      stroke: '#000000',
      strokeThickness: 2,
      fixedWidth: 80,
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    undoBtn.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.3 });
        this.undoAction();
    });
    this.pixelEditorOverlay.add(undoBtn);

    // REDO Button
    const redoBtn = this.add.text(toolX, historyY + 50, 'REDO', {
      fontSize: '14px',
      fontFamily: 'Impact',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 8 },
      stroke: '#000000',
      strokeThickness: 2,
      fixedWidth: 80,
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    redoBtn.on('pointerdown', () => {
        this.sound.play('menu-click', { volume: 0.3 });
        this.redoAction();
    });
    this.pixelEditorOverlay.add(redoBtn);

    // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
    const kbHandler = (event) => {
        if (!this.pixelEditorOverlay || !this.pixelEditorOverlay.visible) return;
        if (event.ctrlKey || event.metaKey) {
            if (event.key === 'z') {
                event.preventDefault();
                this.undoAction();
            } else if (event.key === 'y') {
                event.preventDefault();
                this.redoAction();
            }
        }
    };
    window.addEventListener('keydown', kbHandler);
    this.pixelEditorOverlay.on('destroy', () => window.removeEventListener('keydown', kbHandler));
    
    // Main Grid Border (Black Box Outline)
    const gridBorder = this.add.rectangle(
      gridStartX + gridTotalSize / 2, 
      gridStartY + gridTotalSize / 2, 
      gridTotalSize + 4, 
      gridTotalSize + 4, 
      0x000000, 
      0
    );
    gridBorder.setStrokeStyle(4, 0x000000, 1);
    this.pixelEditorOverlay.add(gridBorder);

    // Drawing grid
    this.pixelGrid = [];
    this.isDrawing = false;
    this.lastDrawPos = null;
    
    for (let y = 0; y < gridSize; y++) {
      this.pixelGrid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        const px = gridStartX + x * pixelSize;
        const py = gridStartY + y * pixelSize;
        
        const pixel = this.add.rectangle(px, py, pixelSize, pixelSize, 0xffffff);
        pixel.setOrigin(0, 0);
        pixel.setStrokeStyle(0.5, 0x000000, 0.1);
        
        this.pixelGrid[y][x] = pixel;
        this.pixelEditorOverlay.add(pixel);
      }
    }

    // High-performance Input Handler for smooth dragging
    const gridRect = new Phaser.Geom.Rectangle(gridStartX, gridStartY, gridTotalSize, gridTotalSize);
    
    this.input.on('pointerdown', (pointer) => {
        if (this.pixelEditorOverlay && this.pixelEditorOverlay.visible && gridRect.contains(pointer.x, pointer.y)) {
            // Save state before starting a new action
            this.saveHistoryState();
            
            this.isDrawing = true;
            const gx = Math.floor((pointer.x - gridStartX) / pixelSize);
            const gy = Math.floor((pointer.y - gridStartY) / pixelSize);
            
            if (this.currentTool === 'bucket') {
                this.floodFill(gx, gy, this.pixelData[gy][gx], this.currentColor);
            } else {
                this.applyToolAt(gx, gy);
                this.lastDrawPos = { x: gx, y: gy };
            }
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (this.isDrawing && this.pixelEditorOverlay && this.pixelEditorOverlay.visible) {
            const gx = Math.floor((pointer.x - gridStartX) / pixelSize);
            const gy = Math.floor((pointer.y - gridStartY) / pixelSize);
            
            // Boundary check
            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
                if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
                    if (this.lastDrawPos) {
                        // Interpolate points between last pos and current pos for smooth dragging
                        this.drawLine(this.lastDrawPos.x, this.lastDrawPos.y, gx, gy);
                    } else {
                        this.applyToolAt(gx, gy);
                    }
                    this.lastDrawPos = { x: gx, y: gy };
                }
            } else {
                this.lastDrawPos = null; // Reset if we leave grid
            }
        }
    });
    
    this.input.on('pointerup', () => {
      this.isDrawing = false;
      this.lastDrawPos = null;
    });
    
    // Buttons
    const buttonY = paletteY + (10 * (colorBoxSize + colorBoxGap)) + 25; // Compact spacing
    
    // SAVE button
    const saveBtn = this.add.text(width / 2 - 100, buttonY, 'SAVE', {
      fontSize: '24px',
      fontFamily: 'Impact',
      color: '#000000',
      backgroundColor: '#00ff00',
      padding: { x: 30, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    saveBtn.on('pointerover', () => {
      this.tweens.add({ targets: saveBtn, scale: 1.1, duration: 100 });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    saveBtn.on('pointerout', () => {
      this.tweens.add({ targets: saveBtn, scale: 1.0, duration: 100 });
    });
    saveBtn.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.5 });
      this.savePixelArt(gridSize);
      this.closePixelArtEditor();
    });
    
    this.pixelEditorOverlay.add(saveBtn);
    
    // CLEAR button
    const clearBtn = this.add.text(width / 2, buttonY, 'CLEAR', {
      fontSize: '24px',
      fontFamily: 'Impact',
      color: '#000000',
      backgroundColor: '#ffaa00',
      padding: { x: 30, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    clearBtn.on('pointerover', () => {
      this.tweens.add({ targets: clearBtn, scale: 1.1, duration: 100 });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    clearBtn.on('pointerout', () => {
      this.tweens.add({ targets: clearBtn, scale: 1.0, duration: 100 });
    });
    clearBtn.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.5 });
      
      // Save state before clearing
      this.saveHistoryState();
      
      // Clear all pixels to white
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          this.pixelGrid[y][x].setFillStyle(0xffffff);
          this.pixelData[y][x] = 0xffffff;
        }
      }
    });
    
    this.pixelEditorOverlay.add(clearBtn);
    
    // CLOSE button
    const closeBtn = this.add.text(width / 2 + 100, buttonY, 'CLOSE', {
      fontSize: '24px',
      fontFamily: 'Impact',
      color: '#ffffff',
      backgroundColor: '#ff0066',
      padding: { x: 30, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => {
      this.tweens.add({ targets: closeBtn, scale: 1.1, duration: 100 });
      this.sound.play('menu-click', { volume: 0.2 });
    });
    closeBtn.on('pointerout', () => {
      this.tweens.add({ targets: closeBtn, scale: 1.0, duration: 100 });
    });
    closeBtn.on('pointerdown', () => {
      this.sound.play('menu-click', { volume: 0.5 });
      this.closePixelArtEditor();
    });
    
    this.pixelEditorOverlay.add(closeBtn);
    
    // Animate in
    this.pixelEditorOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.pixelEditorOverlay,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }
  
  closePixelArtEditor() {
    if (this.pixelEditorOverlay) {
      this.tweens.add({
        targets: this.pixelEditorOverlay,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.pixelEditorOverlay.destroy();
          this.pixelEditorOverlay = null;
          this.pixelGrid = null;
          this.pixelData = null;
        }
      });
    }
  }
  
  saveHistoryState() {
    // Limit history size to 20 states to save memory
    const MAX_HISTORY = 20;
    
    // If we've undone things, truncate the future history before saving new state
    if (this.historyIndex < this.editorHistory.length - 1) {
        this.editorHistory = this.editorHistory.slice(0, this.historyIndex + 1);
    }
    
    // Save deep copy of pixelData
    const state = this.pixelData.map(row => [...row]);
    this.editorHistory.push(state);
    
    if (this.editorHistory.length > MAX_HISTORY) {
        this.editorHistory.shift();
    } else {
        this.historyIndex++;
    }
  }

  undoAction() {
    if (this.historyIndex > 0) {
        this.historyIndex--;
        this.restoreHistoryState(this.editorHistory[this.historyIndex]);
        this.showFeedback('UNDO');
    }
  }

  redoAction() {
    if (this.historyIndex < this.editorHistory.length - 1) {
        this.historyIndex++;
        this.restoreHistoryState(this.editorHistory[this.historyIndex]);
        this.showFeedback('REDO');
    }
  }

  restoreHistoryState(state) {
    if (!state) return;
    
    // Update data and grid visuals
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            const color = state[y][x];
            this.pixelData[y][x] = color;
            if (this.pixelGrid[y][x]) {
                this.pixelGrid[y][x].setFillStyle(color);
            }
        }
    }
  }

  savePixelArt(gridSize) {
    // Create a canvas to render the pixel art
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');
    
    // Draw each pixel
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const color = this.pixelData[y][x];
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    // Convert to base64 and add to custom textures
    const base64Data = canvas.toDataURL('image/png');
    
    // Create a temporary image to pass to addCustomTexture
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      this.addCustomTexture(base64Data, img);
      this.showFeedback('PIXEL ART SAVED!', 0x00ff00);
      
      // Refresh UI components immediately
      this.updateToggleButtonStates();
    };
  }
  
  generateColorPalette(count) {
    const colors = [];
    
    // Add grayscale (10 shades)
    for (let i = 0; i < 10; i++) {
      const shade = Math.floor((i / 9) * 255);
      colors.push((shade << 16) | (shade << 8) | shade);
    }
    
    // Add vibrant colors across hue spectrum
    const remainingColors = count - 10;
    const hueStep = 360 / remainingColors;
    
    for (let i = 0; i < remainingColors; i++) {
      const hue = i * hueStep;
      // Vary saturation and lightness for variety
      const saturation = 70 + (i % 3) * 15; // 70%, 85%, 100%
      const lightness = 40 + (Math.floor(i / 3) % 3) * 15; // 40%, 55%, 70%
      
      const rgb = this.hslToRgb(hue, saturation, lightness);
      colors.push(rgb);
    }
    
    return colors;
  }
  
  hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  }
  
  paintPixel(x, y) {
    if (this.pixelGrid && this.pixelGrid[y] && this.pixelGrid[y][x]) {
        this.pixelGrid[y][x].setFillStyle(this.currentColor);
        this.pixelData[y][x] = this.currentColor;
    }
  }
  
  erasePixel(x, y) {
    if (this.pixelGrid && this.pixelGrid[y] && this.pixelGrid[y][x]) {
        this.pixelGrid[y][x].setFillStyle(0xffffff);
        this.pixelData[y][x] = 0xffffff;
    }
  }

  applyToolAt(x, y) {
      if (this.currentTool === 'brush') {
          this.paintPixel(x, y);
      } else if (this.currentTool === 'eraser') {
          this.erasePixel(x, y);
      }
  }

  drawLine(x1, y1, x2, y2) {
      // Bresenham's line algorithm for perfect pixel-art strokes
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = (x1 < x2) ? 1 : -1;
      const sy = (y1 < y2) ? 1 : -1;
      let err = dx - dy;

      while (true) {
          this.applyToolAt(x1, y1);
          if (x1 === x2 && y1 === y2) break;
          const e2 = 2 * err;
          if (e2 > -dy) {
              err -= dy;
              x1 += sx;
          }
          if (e2 < dx) {
              err += dx;
              y1 += sy;
          }
      }
  }
  
  exportDancerPack() {
    const pack = {
        customDancers: this.registry.get('customDancers') || [],
        customImageData: this.registry.get('customImageData') || {},
        customAnimations: this.registry.get('customAnimations') || {},
        customTracks: this.registry.get('customTracks') || [],
        customAudioData: this.registry.get('customAudioData') || {}
    };

    const packString = JSON.stringify(pack);
    const compressed = LZString.compressToEncodedURIComponent(packString);
    
    // Create a temporary text area to copy to clipboard
    const textArea = document.createElement("textarea");
    textArea.value = compressed;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        this.showFeedback('PACK COPIED TO CLIPBOARD!', 0x00ffff);
        alert('Dancer Pack exported!\n\nA compressed string has been copied to your clipboard.\nShare it with friends to let them import your creations.');
    } catch (err) {
        console.error('Export failed:', err);
        this.showFeedback('EXPORT FAILED', 0xff0000);
    }
    
    document.body.removeChild(textArea);
  }

  async importDancerPack() {
    const compressed = prompt('Paste a Dancer Pack string here to import:');
    if (!compressed) return;

    try {
        this.showFeedback('IMPORTING PACK...', 0xffff00);
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (!decompressed) throw new Error('Decompression failed');

        const pack = JSON.parse(decompressed);
        
        // Merge with existing data
        const dancers = [...(this.registry.get('customDancers') || []), ...(pack.customDancers || [])];
        const imageData = { ...(this.registry.get('customImageData') || {}), ...(pack.customImageData || {}) };
        const animations = { ...(this.registry.get('customAnimations') || {}), ...(pack.customAnimations || {}) };
        const tracks = [...(this.registry.get('customTracks') || []), ...(pack.customTracks || [])];
        const audioData = { ...(this.registry.get('customAudioData') || {}), ...(pack.customAudioData || {}) };

        // Remove duplicates based on key
        const uniqueDancers = [...new Set(dancers)];
        const uniqueTracks = [];
        const seenTrackKeys = new Set();
        tracks.forEach(t => {
            if (!seenTrackKeys.has(t.key)) {
                seenTrackKeys.add(t.key);
                uniqueTracks.push(t);
            }
        });

        // Update registry (this triggers auto-save via main.js listeners)
        this.registry.set('customDancers', uniqueDancers);
        this.registry.set('customImageData', imageData);
        this.registry.set('customAnimations', animations);
        this.registry.set('customTracks', uniqueTracks);
        this.registry.set('customAudioData', audioData);

        this.showFeedback('PACK IMPORTED SUCCESSFULLY!', 0x00ff00);
        
        // Refresh local scene assets
        await this.restoreCustomAssets();
        this.refreshGallery();
        
    } catch (err) {
        console.error('Import failed:', err);
        this.showFeedback('INVALID PACK STRING', 0xff0000);
        alert('Failed to import Dancer Pack. Please ensure you pasted the correct string.');
    }
  }

  floodFill(x, y, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    
    const gridSize = this.pixelData.length;
    const stack = [[x, y]];
    
    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      
      if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) continue;
      if (this.pixelData[cy][cx] !== targetColor) continue;
      
      this.pixelGrid[cy][cx].setFillStyle(replacementColor);
      this.pixelData[cy][cx] = replacementColor;
      
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }
  }
}

