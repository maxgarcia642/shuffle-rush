/**
 * RhythmSystem — COMPATIBILITY SHIM (v2).
 * The old implementation drove beats from scene.time.addEvent (Phaser's
 * game-loop timer): it drifted under frame drops and setBPM() restarted the
 * timer mid-song, resetting phase. Every scene keeps its existing
 * `new RhythmSystem(scene, bpm)` call — the guts are now the audio-clock
 * Conductor. Do not add logic here; extend Conductor instead.
 */
import Conductor from './Conductor.js';
export default class RhythmSystem extends Conductor {}
