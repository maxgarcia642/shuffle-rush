export default class BeatDetector {
  /**
   * Detects BPM from an AudioBuffer
   * @param {AudioBuffer} audioBuffer 
   * @returns {Promise<number>} Detected BPM
   */
  static async detectBPM(audioBuffer) {
    return new Promise((resolve) => {
      try {
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Filter to focus on kicks/low frequencies (standard for BPM detection)
        const lowpass = offlineContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(150, 0);
        lowpass.Q.setValueAtTime(1, 0);

        const highpass = offlineContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(40, 0);
        highpass.Q.setValueAtTime(1, 0);

        source.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(offlineContext.destination);

        source.start(0);
        
        offlineContext.startRendering().then((renderedBuffer) => {
          const peaks = this.getPeaks([renderedBuffer.getChannelData(0)]);
          const groups = this.getIntervals(peaks);

          const topBPMs = groups.sort((a, b) => b.count - a.count).splice(0, 5);
          
          if (topBPMs.length > 0) {
            // Pick the most likely BPM, usually between 60 and 180
            // Often BPM detection returns double or half tempo, so we try to normalize it
            let bpm = topBPMs[0].tempo;
            while (bpm < 70) bpm *= 2;
            while (bpm > 180) bpm /= 2;
            
            console.log(`🎵 BPM Detected: ${bpm.toFixed(2)} (Raw: ${topBPMs[0].tempo.toFixed(2)})`);
            resolve(Math.round(bpm));
          } else {
            console.warn('Could not detect BPM, defaulting to 120');
            resolve(120);
          }
        });
      } catch (e) {
        console.error('BPM Detection Error:', e);
        resolve(120);
      }
    });
  }

  static getPeaks(data) {
    const partSize = 22050; // 0.5s at 44.1khz
    const peaks = [];
    
    for (let i = 0; i < data[0].length; i += partSize) {
      let max = 0;
      let pos = i;
      for (let j = i; j < i + partSize; j++) {
        const volume = Math.abs(data[0][j]);
        if (!max || (volume > max.volume)) {
          max = { position: j, volume: volume };
        }
      }
      peaks.push(max);
    }

    // Sort peaks by volume
    peaks.sort((a, b) => b.volume - a.volume);
    
    // Take the top 25% peaks
    const topPeaks = peaks.splice(0, peaks.length * 0.25);
    
    // Sort back by position
    topPeaks.sort((a, b) => a.position - b.position);
    
    return topPeaks;
  }

  static getIntervals(peaks) {
    const groups = [];
    
    peaks.forEach((peak, index) => {
      for (let i = 1; (index + i) < peaks.length && i < 10; i++) {
        const group = {
          tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
          count: 1
        };

        // Normalize tempo to 120-ish range if it's way off
        while (group.tempo < 70) group.tempo *= 2;
        while (group.tempo > 180) group.tempo /= 2;

        const existingGroup = groups.find(g => Math.abs(g.tempo - group.tempo) < 2);
        
        if (existingGroup) {
          existingGroup.count++;
        } else {
          groups.push(group);
        }
      }
    });
    
    return groups;
  }
}
