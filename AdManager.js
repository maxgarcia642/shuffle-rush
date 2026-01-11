import Phaser from 'phaser';

export default class AdManager {
  constructor(scene) {
    this.scene = scene;
  }

  showAdBreak(callback) {
    const { width, height } = this.scene.scale;

    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.95);
    overlay.setDepth(1000);

    const adStyle = {
      fontSize: '64px',
      fontFamily: '"Helvetica Neue", Impact, sans-serif',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    };

    const adText = this.scene.add.text(
      width / 2,
      height * 0.35,
      '[ AD BREAK ]',
      adStyle
    );
    adText.setOrigin(0.5);
    adText.setDepth(1001);
    adText.setAlpha(0);

    const adSubtext = this.scene.add.text(
      width / 2,
      height * 0.5,
      'Commercial Placeholder\n\nBrought to you by\nShuffle Rush™',
      {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
        align: 'center'
      }
    );
    adSubtext.setOrigin(0.5);
    adSubtext.setDepth(1001);
    adSubtext.setAlpha(0);

    let countdown = 3;
    const countdownText = this.scene.add.text(
      width / 2,
      height * 0.7,
      `Skip in ${countdown}...`,
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff'
      }
    );
    countdownText.setOrigin(0.5);
    countdownText.setDepth(1001);
    countdownText.setAlpha(0);

    this.scene.tweens.add({
      targets: [adText, adSubtext, countdownText],
      alpha: 1,
      duration: 500
    });

    this.scene.tweens.add({
      targets: adText,
      scale: { from: 1, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    const timer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        countdown--;
        if (countdown > 0) {
          countdownText.setText(`Skip in ${countdown}...`);
        } else {
          countdownText.setText('Click to continue');
          countdownText.setColor('#00ff99');

          this.scene.tweens.add({
            targets: countdownText,
            scale: { from: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1
          });

          overlay.setInteractive({ useHandCursor: true });
          overlay.once('pointerdown', () => {
            this.scene.tweens.add({
              targets: [overlay, adText, adSubtext, countdownText],
              alpha: 0,
              duration: 500,
              onComplete: () => {
                overlay.destroy();
                adText.destroy();
                adSubtext.destroy();
                countdownText.destroy();
                if (callback) callback();
              }
            });
          });
        }
      },
      repeat: 3
    });
  }
}

