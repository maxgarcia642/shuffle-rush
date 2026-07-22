/**
 * BeatDetector v2 — sample-rate-safe BPM + first-beat OFFSET estimation.
 * Fixes from v1 (verified bugs): tempo math hardcoded 44100 (any 48kHz upload
 * detected ~8.8% wrong) and no offset was ever computed, so a correct tempo
 * could still sit off-phase. Pipeline unchanged in spirit: lowpass render via
 * OfflineAudioContext → peak picking → interval histogram → tempo grouping —
 * now plus a grid-phase fit for offset. Pure helpers are exported for tests.
 */
export function findPeaks(data, sampleRate, thresholdRatio = 0.7) {
  const partSize = Math.max(1, Math.floor(sampleRate / 2));      // 0.5s windows at TRUE rate
  const parts = Math.floor(data.length / partSize);
  const peaks = [];
  for (let i = 0; i < parts; i++) {
    let max = null;
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      const vol = Math.abs(data[j]);
      if (!max || vol > max.volume) max = { position: j, volume: vol };
    }
    if (max) peaks.push(max);
  }
  peaks.sort((a, b) => b.volume - a.volume);
  const kept = peaks.slice(0, Math.max(1, Math.round(peaks.length * thresholdRatio)));
  kept.sort((a, b) => a.position - b.position);
  return kept;
}

export function computeTempoCandidates(peaks, sampleRate) {
  const groups = [];
  peaks.forEach((peak, index) => {
    for (let i = 1; index + i < peaks.length && i < 10; i++) {
      const intervalSamples = peaks[index + i].position - peak.position;
      if (intervalSamples <= 0) continue;
      let tempo = (60 * sampleRate) / intervalSamples;             // TRUE sample rate
      while (tempo < 90) tempo *= 2;                               // fold into danceable range
      while (tempo > 180) tempo /= 2;
      tempo = Math.round(tempo);
      const group = groups.find(g => g.tempo === tempo);
      if (group) group.count++;
      else groups.push({ tempo, count: 1 });
    }
  });
  return groups.sort((a, b) => b.count - a.count);
}

/** Fit grid phase: offset (sec, in [0, beatLen)) maximizing peak alignment. */
export function fitOffset(peakPositionsSec, bpm, stepMs = 5) {
  if (!peakPositionsSec.length || !bpm) return { offset: 0, score: 0 };
  const beatLen = 60 / bpm;
  let best = { offset: 0, score: -1 };
  for (let offMs = 0; offMs < beatLen * 1000; offMs += stepMs) {
    const off = offMs / 1000;
    let score = 0;
    for (const p of peakPositionsSec) {
      let ph = ((p - off) % beatLen + beatLen) % beatLen;
      if (ph > beatLen / 2) ph = beatLen - ph;                     // distance to nearest line
      if (ph < 0.05) score += 1 - ph / 0.05;                       // 50ms alignment credit
    }
    if (score > best.score) best = { offset: off, score };
  }
  return best;
}

export default class BeatDetector {
  /** Legacy API — returns a number. Kept because GameScene awaits it today. */
  static async detectBPM(audioBuffer) {
    const grid = await BeatDetector.detectBeatGrid(audioBuffer);
    return grid.bpm;
  }

  /** New API — { bpm, offset (sec), confidence (0..1) }. */
  static async detectBeatGrid(audioBuffer) {
    const fallback = { bpm: 120, offset: 0, confidence: 0 };
    try {
      if (!audioBuffer || !audioBuffer.length) return fallback;
      const sr = audioBuffer.sampleRate || 44100;
      let channelData;
      if (typeof OfflineAudioContext !== 'undefined') {
        const offline = new OfflineAudioContext(1, audioBuffer.length, sr);
        const source = offline.createBufferSource();
        source.buffer = audioBuffer;
        const filter = offline.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;                              // isolate the kick
        source.connect(filter);
        filter.connect(offline.destination);
        source.start(0);
        const rendered = await offline.startRendering();
        channelData = rendered.getChannelData(0);
      } else {
        channelData = audioBuffer.getChannelData(0);               // test/node path
      }
      const peaks = findPeaks(channelData, sr);
      if (peaks.length < 4) return fallback;
      const candidates = computeTempoCandidates(peaks, sr);
      if (!candidates.length) return fallback;
      const top = candidates[0];
      const total = candidates.reduce((a, g) => a + g.count, 0) || 1;
      const peakSecs = peaks.map(p => p.position / sr);
      const { offset } = fitOffset(peakSecs, top.tempo);
      return {
        bpm: Math.max(60, Math.min(200, top.tempo)),
        offset,
        confidence: Math.min(1, top.count / total * 2)
      };
    } catch (e) {
      console.warn('BeatDetector: analysis failed, using fallback 120 BPM', e);
      return fallback;
    }
  }
}
