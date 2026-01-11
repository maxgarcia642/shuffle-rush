import Phaser from 'phaser';

export default class RhythmSystem extends Phaser.Events.EventEmitter {
  constructor(scene, bpm = 120) {
    super();
    this.scene = scene;
    this.bpm = bpm;
    this.beatInterval = (60 / bpm) * 1000; // milliseconds per beat
    this.isPlaying = false;
    this.beatTimer = null;
  }

  start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.beatTimer = this.scene.time.addEvent({
      delay: this.beatInterval,
      callback: () => {
        this.emit('beat');
      },
      loop: true
    });
  }

  stop() {
    this.isPlaying = false;
    if (this.beatTimer) {
      this.beatTimer.remove();
      this.beatTimer = null;
    }
  }

  setBPM(newBPM) {
    this.bpm = newBPM;
    this.beatInterval = (60 / newBPM) * 1000;
    
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }
}

