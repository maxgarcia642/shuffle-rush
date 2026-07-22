/** Shuffle Rush v2 — pure-logic unit tests (node, no browser). */
import { ConductorMath } from '../Conductor.js';
import BeatDetector, { findPeaks, computeTempoCandidates, fitOffset } from '../BeatDetector.js';
import { validateFile, classifyFile, LIMITS } from '../MediaPipeline.js';
import PowerupManager from '../Powerups.js';
import { search } from '../SearchIndex.js';
import { scaleSfxVolume } from '../Sfx.js';
import LeaderboardService, { insertScore, normalizeReplay, ReplayRecorder } from '../LeaderboardService.js';
import { validateChart, sortNotes, spawnCursor, ChartRecorder } from '../ChartFormat.js';

let pass = 0, fail = 0;
function t(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

console.log('── ConductorMath ──');
t('beatLenMs(120) = 500', ConductorMath.beatLenMs(120) === 500);
t('gridDelta on-grid = 0', Math.abs(ConductorMath.gridDelta(2000, 120, 0)) < 1e-9);
t('gridDelta +40ms late', Math.abs(ConductorMath.gridDelta(2040, 120, 0) - 40) < 1e-9);
t('gridDelta -40ms early (wraps)', Math.abs(ConductorMath.gridDelta(1960, 120, 0) + 40) < 1e-9);
t('gridDelta honors offset', Math.abs(ConductorMath.gridDelta(2100, 120, 100)) < 1e-9);
const W = { perfect: 100, good: 200, ok: 300 };
t('judge 45ms = perfect', ConductorMath.judge(45, W) === 'perfect');
t('judge 100ms boundary = perfect', ConductorMath.judge(100, W) === 'perfect');
t('judge -150ms = good', ConductorMath.judge(-150, W) === 'good');
t('judge 250ms = ok', ConductorMath.judge(250, W) === 'ok');
t('judge 301ms = miss', ConductorMath.judge(301, W) === 'miss');

console.log('── ConductorMath.markerY (Block 1: time-driven marker fall) ──');
// spawn at y=150, line at y=650, 1000ms travel, targetTime=5000
t('markerY at spawn (t=4000) = spawnY', ConductorMath.markerY(4000, 5000, 1000, 150, 650) === 150);
t('markerY halfway (t=4500) = midpoint', ConductorMath.markerY(4500, 5000, 1000, 150, 650) === 400);
t('markerY at targetTime = targetY (ON the line)', ConductorMath.markerY(5000, 5000, 1000, 150, 650) === 650);
t('markerY before spawn clamps to spawnY', ConductorMath.markerY(3000, 5000, 1000, 150, 650) === 150);
t('markerY overshoot caps at 1.15', ConductorMath.markerY(9999, 5000, 1000, 150, 650) === 150 + 500 * 1.15);

console.log('── BeatDetector (synthetic 128 BPM @ 48kHz click track) ──');
{
  const sr = 48000, bpm = 128, beatLen = 60 / bpm, offset = 0.25, seconds = 12;
  const data = new Float32Array(sr * seconds);
  for (let b = 0; offset + b * beatLen < seconds; b++) {
    const pos = Math.round((offset + b * beatLen) * sr);
    for (let j = 0; j < 200 && pos + j < data.length; j++) data[pos + j] = 1 - j / 200; // decaying click
  }
  const peaks = findPeaks(data, sr);
  t('finds peaks', peaks.length >= 10, `got ${peaks.length}`);
  const cands = computeTempoCandidates(peaks, sr);
  const top = cands[0]?.tempo;
  t(`tempo ≈128 at TRUE 48kHz (got ${top})`, Math.abs(top - 128) <= 2);
  // The v1 bug, demonstrated: same intervals scored at hardcoded 44100
  const wrong = Math.round((60 * 44100) / (beatLen * sr));
  t(`v1 hardcoded-rate math would say ${wrong} (≈8% off) — fixed`, Math.abs(wrong - 128) > 5);
  const peakSecs = peaks.map(p => p.position / sr);
  const fit = fitOffset(peakSecs, top);
  t(`offset ≈0.25s recovered (got ${fit.offset.toFixed(3)})`, Math.abs(fit.offset - offset) < 0.05);
  // fallback path (no OfflineAudioContext in node): full detectBeatGrid on a stub AudioBuffer
  const stubBuffer = { length: data.length, sampleRate: sr, duration: seconds, getChannelData: () => data };
  const grid = await BeatDetector.detectBeatGrid(stubBuffer);
  t(`detectBeatGrid fallback bpm (got ${grid.bpm})`, Math.abs(grid.bpm - 128) <= 2);
  t('confidence reported', grid.confidence > 0);
}

console.log('── MediaPipeline.validateFile ──');
const F = (name, type, size) => ({ name, type, size });
t('mp3 ok', validateFile(F('a.mp3', 'audio/mpeg', 5e6)).ok);
t('flac classified audio', classifyFile(F('a.flac', '', 1e6)) === 'audio');
t('audio over 40MB rejected', !validateFile(F('a.wav', 'audio/wav', LIMITS.audio + 1)).ok);
t('gif classified gif', classifyFile(F('d.gif', 'image/gif', 1e6)) === 'gif');
t('mp4 ok under cap', validateFile(F('v.mp4', 'video/mp4', 50e6)).ok);
t('video over 80MB rejected', !validateFile(F('v.mp4', 'video/mp4', LIMITS.video + 1)).ok);
t('exe rejected', !validateFile(F('x.exe', 'application/x-dos', 100)).ok);
t('empty file rejected', !validateFile(F('a.mp3', 'audio/mpeg', 0)).ok);

console.log('── PowerupManager (fake clock) ──');
{
  let now = 1000;
  const healed = [];
  const pm = new PowerupManager({ player: { heal: n => healed.push(n) } }, { nowFn: () => now });
  t('baseline windowScale 1', pm.windowScale() === 1);
  pm.apply('time_dilator');
  t('dilator active → 1.4', pm.windowScale() === 1.4);
  now += 10001;
  t('dilator expired → 1', pm.windowScale() === 1);
  pm.apply('double_down');
  t('double_down → 2x', pm.scoreMult() === 2);
  pm.apply('groove_shield');
  t('shield consumes once', pm.consumeShield() === true && pm.consumeShield() === false);
  pm.apply('combo_keeper');
  t('combo keeper consumes once', pm.consumeComboKeeper() === true && pm.consumeComboKeeper() === false);
  pm.apply('second_wind');
  t('second wind heals 25', healed[0] === 25);
  pm.apply('slow_groove');
  t('slow groove → 1.25 travel', pm.travelScale() === 1.25);
}

console.log('── SearchIndex ──');
{
  const items = [
    { title: 'Rave Planet', artist: 'Matrika' },
    { title: 'Supercell', artist: 'Tatami' },
    { title: 'Find Home', artist: 'Arenas' }
  ];
  const keys = [{ name: 'title', weight: 2 }, { name: 'artist', weight: 1 }];
  t('exact title first', search(items, 'supercell', keys)[0].title === 'Supercell');
  t('prefix match', search(items, 'rav', keys)[0].title === 'Rave Planet');
  t('artist match', search(items, 'tatami', keys)[0].artist === 'Tatami');
  t('subsequence match', search(items, 'fnd hm'.replace(' ',''), keys)[0].title === 'Find Home');
  t('no match empty', search(items, 'zzzz', keys).length === 0);
  t('empty query returns all', search(items, '', keys).length === 3);
}

console.log('── Sfx.scaleSfxVolume (Block 6: sfxVol routing) ──');
t('default sfxVol 0.5 keeps shipped mix', scaleSfxVolume(0.8, 0.5) === 0.8);
t('sfxVol 0 mutes', scaleSfxVolume(0.8, 0) === 0);
t('sfxVol 1 doubles shipped mix', scaleSfxVolume(0.25, 1) === 0.5);
t('missing sfxVol treated as default', scaleSfxVolume(0.6, undefined) === 0.6);
t('missing base volume treated as 1', Math.abs(scaleSfxVolume(undefined, 0.5) - 1) < 1e-9);

console.log('── LeaderboardService (Block 7: pure logic + local guard) ──');
{
  const l1 = insertScore([], { name: 'A', score: 100, at: 1 });
  t('insert into empty', l1.length === 1 && l1[0].score === 100);
  const l2 = insertScore(l1, { name: 'B', score: 300, at: 2 });
  t('higher score sorts first', l2[0].name === 'B');
  let big = [];
  for (let i = 0; i < 15; i++) big = insertScore(big, { name: 'P' + i, score: i * 10, at: i });
  t('caps at 10 entries', big.length === 10);
  t('keeps the highest 10', big[9].score === 50 && big[0].score === 140);
  t('rejects junk entries', insertScore([], { name: 'X', score: 'nope' }).length === 0);
  
  t('normalizeReplay drops malformed events', normalizeReplay([[100, 1, 'perfect'], 'junk', [null, 0, 'x'], [200.6, 2, 'miss']]).length === 2);
  t('normalizeReplay rounds times', normalizeReplay([[200.6, 2, 'miss']])[0][0] === 201);
  
  let fakeNow = 5000;
  const rec = new ReplayRecorder(() => fakeNow);
  rec.start();
  fakeNow = 5450; rec.record(1, 'perfect');
  fakeNow = 5900; rec.record(2, 'miss');
  const replay = rec.finish();
  t('recorder produces relative timestamps', replay.events[0][0] === 450 && replay.events[1][0] === 900);
  t('recorder captures lane + judgment', replay.events[0][1] === 1 && replay.events[1][2] === 'miss');
  
  // Guard: no config file exists in this checkout → configure() must resolve
  // false (local mode) and never throw. This proves the itch.io/no-creds path.
  const remote = await LeaderboardService.configure();
  t('configure() without config → local mode, no throw', remote === false && LeaderboardService.isRemote() === false);
  // Local storage stub so submit/top10 run under Node
  const mem = {};
  LeaderboardService._storage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  await LeaderboardService.submitScore({ name: 'NODE', score: 777, enemies: 3 });
  const top = await LeaderboardService.top10();
  t('local submit + top10 roundtrip', top.length === 1 && top[0].score === 777 && top[0].name === 'NODE');
}

console.log('── ChartFormat (Block 8: authored charts groundwork) ──');
{
  const good = { meta: { title: 'T', artist: 'A', bpm: 128, offset: 0.25 }, notes: [[500, 0, 'Q'], [1000, 2, 'P']] };
  t('valid chart accepted', validateChart(good).ok);
  t('missing meta rejected', !validateChart({ notes: [] }).ok);
  t('bad bpm rejected', !validateChart({ meta: { bpm: 0 }, notes: [] }).ok);
  t('bad lane rejected', !validateChart({ meta: { bpm: 120 }, notes: [[100, 5, 'Q']] }).ok);
  t('bad time rejected', !validateChart({ meta: { bpm: 120 }, notes: [[-5, 0, 'Q']] }).ok);
  
  const unsorted = [[900, 1, 'B'], [100, 0, 'A'], [500, 2, 'C']];
  t('sortNotes orders by time', sortNotes(unsorted).map(n => n[0]).join(',') === '100,500,900');
  
  const notes = [[500, 0, 'Q'], [1000, 1, 'W'], [2000, 2, 'P']];
  t('spawnCursor: nothing due yet', spawnCursor(notes, 0, 0, 400) === 0);
  t('spawnCursor: first note due (500-400<=100)', spawnCursor(notes, 0, 100, 400) === 1);
  t('spawnCursor: two due mid-song', spawnCursor(notes, 0, 700, 400) === 2);
  t('spawnCursor: resumes from index', spawnCursor(notes, 2, 5000, 400) === 3);
  
  const rec = new ChartRecorder({ title: 'rec', bpm: 140 });
  rec.start();
  rec.record(880.4, 1, 'W');
  rec.record(440.2, 0, 'Q');
  rec.record(-10, 0, 'X'); // rejected
  const chart = rec.stop();
  t('recorder rounds + sorts + drops bad times', chart.notes.length === 2 && chart.notes[0][0] === 440 && chart.notes[1][0] === 880);
  t('recorded chart validates', validateChart(chart).ok);
  t('recorder keeps meta', chart.meta.bpm === 140 && chart.meta.title === 'rec');
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
