export default class StageManager {
  constructor(stage) {
    this.stage = stage;
    this.stageData = {
      1: {
        name: 'GROOVE STARTER',
        bpm: 110,
        enemyHealth: 100,
        playerDamage: 25,
        color: 0xff0066
      },
      2: {
        name: 'BEAT WARRIOR',
        bpm: 120,
        enemyHealth: 150,
        playerDamage: 20,
        color: 0x00ff99
      },
      3: {
        name: 'RHYTHM MASTER',
        bpm: 130,
        enemyHealth: 200,
        playerDamage: 18,
        color: 0xffcc00
      },
      4: {
        name: 'SHUFFLE KING',
        bpm: 140,
        enemyHealth: 250,
        playerDamage: 16,
        color: 0x0099ff
      },
      5: {
        name: 'FINAL RUSH',
        bpm: 150,
        enemyHealth: 300,
        playerDamage: 15,
        color: 0xff00ff
      }
    };
  }

  getStageName() {
    return this.stageData[this.stage]?.name || 'UNKNOWN';
  }

  getStageBPM() {
    return this.stageData[this.stage]?.bpm || 120;
  }

  getEnemyHealth() {
    return this.stageData[this.stage]?.enemyHealth || 100;
  }

  getPlayerDamage() {
    return this.stageData[this.stage]?.playerDamage || 20;
  }

  getStageColor() {
    return this.stageData[this.stage]?.color || 0xff0066;
  }
}

