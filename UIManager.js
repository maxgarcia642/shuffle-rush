import Phaser from 'phaser';

export default class UIManager {
  constructor(scene, stage = 1, stageName = 'STAGE 1') {
    this.scene = scene;
    this.stage = stage;
    this.stageName = stageName;
    this.createUI();
  }

  createUI() {
    const { width, height } = this.scene.scale;

    const stageStyle = {
      fontSize: '28px',
      fontFamily: '"Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    };

    this.stageText = this.scene.add.text(width / 2, 20, `STAGE ${this.stage}: ${this.stageName}`, stageStyle);
    this.stageText.setOrigin(0.5, 0);

    const scoreStyle = {
      fontSize: '32px',
      fontFamily: '"Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    };

    this.scoreText = this.scene.add.text(20, 20, 'SCORE: 0', scoreStyle);

    const comboStyle = {
      fontSize: '44px',
      fontFamily: '"Helvetica Neue", Impact, sans-serif',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ffff00',
        blur: 15,
        fill: true
      }
    };

    this.comboText = this.scene.add.text(width - 20, 20, '', comboStyle);
    this.comboText.setOrigin(1, 0);
    this.comboText.setVisible(false);

    const instructionsStyle = {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 3,
        fill: true
      }
    };

    this.instructionsText = this.scene.add.text(
      width / 2,
      height - 30,
      'DODGE then ATTACK with SPACE!',
      instructionsStyle
    );
    this.instructionsText.setOrigin(0.5);
    this.instructionsText.setAlpha(0.8);

    this.scene.tweens.add({
      targets: this.instructionsText,
      alpha: { from: 0.8, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.dodgePrompt = null;
  }

  showDodgePrompt(key) {
    const { width, height } = this.scene.scale;

    const displayKey = key.length === 1 ? key : {
      'UP': '↑',
      'DOWN': '↓',
      'LEFT': '←',
      'RIGHT': '→'
    }[key] || key;

    const promptCircle = this.scene.add.circle(width / 2, height * 0.3, 80, 0xff0066);
    promptCircle.setStrokeStyle(6, 0xffffff);

    const promptText = this.scene.add.text(width / 2, height * 0.3, displayKey, {
      fontSize: '72px',
      fontFamily: '"Helvetica Neue", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    promptText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: [promptCircle, promptText],
      scale: { from: 1, to: 1.15 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    this.dodgePrompt = { circle: promptCircle, text: promptText };
  }

  hideDodgePrompt() {
    if (this.dodgePrompt) {
      this.dodgePrompt.circle.destroy();
      this.dodgePrompt.text.destroy();
      this.dodgePrompt = null;
    }
  }

  updateScore(score) {
    this.scoreText.setText(`SCORE: ${score}`);

    this.scene.tweens.add({
      targets: this.scoreText,
      scale: 1.1,
      duration: 100,
      yoyo: true
    });
  }

  updateCombo(combo) {
    if (combo > 0) {
      this.comboText.setVisible(true);
      this.comboText.setText(`${combo}x COMBO`);

      this.scene.tweens.add({
        targets: this.comboText,
        scale: 1.2,
        duration: 100,
        yoyo: true
      });

      if (combo > 10) {
        this.comboText.setColor('#ffff00');
        this.comboText.setStroke('#ff0000', 6);
      } else if (combo > 5) {
        this.comboText.setColor('#ff00ff');
        this.comboText.setStroke('#00ffff', 6);
      } else {
        this.comboText.setColor('#ffff00');
        this.comboText.setStroke('#000000', 6);
      }
    } else {
      this.comboText.setVisible(false);
    }
  }
}

