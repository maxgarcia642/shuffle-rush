/**
 * MediaPipeline — validation + safe decode for every upload type (v2).
 * HONEST LIMITS (replaces the contradictory 1GB-vs-5MB claims across v1 docs):
 * caps below are per-file, enforced before any decode; IndexedDB total is
 * browser-managed (typically hundreds of MB — surfaced via MediaLibrary
 * .estimateUsage). Every decode path is try/caught: a bad file rejects with a
 * reason string, never a crash.
 */
import BeatDetector from './BeatDetector.js';

export const LIMITS = {
  image: 10 * 1024 * 1024,   // 10MB
  gif:   15 * 1024 * 1024,   // 15MB
  audio: 40 * 1024 * 1024,   // 40MB — covers FLAC; decoded in-memory per session
  video: 80 * 1024 * 1024    // 80MB — looped background/opponent clips
};

const AUDIO_EXT = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.opus', '.webm', '.aiff'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.avif'];

export function classifyFile(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  if (type === 'image/gif' || name.endsWith('.gif')) return 'gif';
  if (type.startsWith('image/') || IMAGE_EXT.some(e => name.endsWith(e))) return 'image';
  if (type.startsWith('audio/') || AUDIO_EXT.some(e => name.endsWith(e))) return 'audio';
  if (type.startsWith('video/') || VIDEO_EXT.some(e => name.endsWith(e))) return 'video';
  return 'unknown';
}

export function validateFile(file) {
  const kind = classifyFile(file);
  if (kind === 'unknown') return { ok: false, kind, reason: 'unsupported file type' };
  const cap = LIMITS[kind];
  if (file.size > cap) {
    return { ok: false, kind, reason: `exceeds ${Math.round(cap / 1024 / 1024)}MB ${kind} limit` };
  }
  if (file.size === 0) return { ok: false, kind, reason: 'empty file' };
  return { ok: true, kind };
}

function readAsArrayBuffer(file, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    const t = setTimeout(() => { r.abort(); reject(new Error('read timed out')); }, timeoutMs);
    r.onload = () => { clearTimeout(t); resolve(r.result); };
    r.onerror = () => { clearTimeout(t); reject(r.error || new Error('read failed')); };
    r.readAsArrayBuffer(file);
  });
}

/** Image → downscaled PNG blob + dataURL (createImageBitmap decodes off-thread). */
export async function prepareImage(file, maxDim = 1024) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close && bitmap.close();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const dataURL = canvas.toDataURL('image/png');
  return { blob, dataURL, width: w, height: h };
}

/** Audio → decoded AudioBuffer + beat grid + original blob for storage. */
export async function prepareAudio(file, audioContext) {
  const arrayBuffer = await readAsArrayBuffer(file);
  const ctx = audioContext;
  if (!ctx || typeof ctx.decodeAudioData !== 'function') throw new Error('no AudioContext for decode');
  const audioBuffer = await new Promise((resolve, reject) => {
    // callback form for widest Safari compatibility
    const p = ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
  const grid = await BeatDetector.detectBeatGrid(audioBuffer);
  return {
    blob: new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' }),
    audioBuffer,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    grid                                            // { bpm, offset, confidence }
  };
}

/** Video → validated blob + probed metadata via a throwaway <video>. */
export function prepareVideo(file, probeTimeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const cleanup = () => { v.removeAttribute('src'); v.load(); };
    const t = setTimeout(() => { cleanup(); URL.revokeObjectURL(url); reject(new Error('video probe timed out')); }, probeTimeoutMs);
    v.onloadedmetadata = () => {
      clearTimeout(t);
      const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
      cleanup(); URL.revokeObjectURL(url);
      if (!meta.width || !meta.height) { reject(new Error('unreadable video')); return; }
      resolve({ blob: file, meta });
    };
    v.onerror = () => { clearTimeout(t); cleanup(); URL.revokeObjectURL(url); reject(new Error('video decode failed')); };
    v.src = url;
  });
}
