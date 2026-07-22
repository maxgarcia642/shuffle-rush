/**
 * gen-placeholder-assets.mjs — dev-only helper.
 *
 * The repo ships CODE ONLY; the real ~45 art/audio files live in the Rosebud
 * export and are gitignored here. This script scans the scene files for
 * `assets/...` references and generates a stand-in for each missing one:
 *   - .png  → a small labeled solid-color PNG (valid, hand-encoded)
 *   - .mp3  → 4s WAV payload with 120 BPM tone pulses (decodeAudioData sniffs
 *             content, not extension, so Phaser/WebAudio accepts it)
 * Existing files are never overwritten, so dropping in the real assets/
 * folder always wins. Run: node tools/gen-placeholder-assets.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const assetsDir = path.join(root, 'assets');
mkdirSync(assetsDir, { recursive: true });

// ── Collect every assets/... path referenced by the code ────────────────────
const refs = new Set();
for (const f of readdirSync(root)) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/assets\/[^'"`)]+/g)) refs.add(m[0]);
}

// ── Minimal PNG encoder (truecolor, no deps) ────────────────────────────────
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();
function crc32(buf) {
    let c = ~0;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return ~c >>> 0;
}
function chunk(type, data) {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
    return out;
}
function makePng(w, h, [r, g, b]) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolor
    const raw = Buffer.alloc(h * (1 + w * 3));
    for (let y = 0; y < h; y++) {
        const row = y * (1 + w * 3);
        for (let x = 0; x < w; x++) {
            // simple border + diagonal so each placeholder is visibly "a sprite"
            const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2 || Math.abs(x - y) < 2;
            raw[row + 1 + x * 3] = edge ? 255 : r;
            raw[row + 2 + x * 3] = edge ? 255 : g;
            raw[row + 3 + x * 3] = edge ? 255 : b;
        }
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

// ── Minimal WAV with 120 BPM tone pulses (saved under the .mp3 name) ────────
function makeBeatWav(seconds = 4, sr = 44100) {
    const n = seconds * sr;
    const data = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        const beatPhase = t % 0.5; // 120 BPM
        let s = 0;
        if (beatPhase < 0.06) {
            const env = 1 - beatPhase / 0.06;
            s = Math.sin(2 * Math.PI * 880 * t) * env * 0.6;
        }
        data.writeInt16LE(Math.round(s * 32767), i * 2);
    }
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4);
    hdr.write('WAVE', 8); hdr.write('fmt ', 12);
    hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
    hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 2, 28);
    hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
    hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
    return Buffer.concat([hdr, data]);
}

// ── Generate ─────────────────────────────────────────────────────────────────
const palette = [[255, 64, 129], [0, 229, 255], [118, 255, 3], [255, 171, 0], [124, 77, 255], [29, 233, 182]];
let made = 0, skipped = 0, i = 0;
for (const ref of [...refs].sort()) {
    const rel = decodeURI(ref).slice('assets/'.length);
    const dest = path.join(assetsDir, rel);
    if (existsSync(dest)) { skipped++; continue; }
    mkdirSync(path.dirname(dest), { recursive: true });
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(rel)) {
        writeFileSync(dest, makePng(128, 128, palette[i++ % palette.length]));
    } else if (/\.(mp3|ogg|wav|m4a)$/i.test(rel)) {
        writeFileSync(dest, makeBeatWav());
    } else {
        console.warn('skip (unknown type):', rel);
        continue;
    }
    made++;
}
console.log(`placeholders written: ${made}, already present (kept): ${skipped}, refs found: ${refs.size}`);
