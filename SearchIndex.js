/**
 * SearchIndex — tiny dependency-free fuzzy search (v2).
 * For filtering tracks / dancers / themes in galleries. Scoring: exact >
 * prefix > substring > subsequence, with per-key weights. Fuse.js-class
 * behavior at ~60 lines; swap to real Fuse (already in the repo research)
 * only if libraries grow past a few thousand entries.
 */
function scoreText(text, q) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const idx = t.indexOf(q);
  if (idx >= 0) return 60 - Math.min(20, idx);
  // subsequence
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  if (qi === q.length) return 30 - Math.min(15, t.length - q.length);
  return 0;
}

export function search(items, query, keys) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items.slice();
  const keyList = keys && keys.length ? keys : [{ name: null, weight: 1 }];
  return items
    .map(item => {
      let best = 0;
      for (const k of keyList) {
        const raw = k.name ? item[k.name] : item;
        const val = Array.isArray(raw) ? raw.join(' ') : raw;
        best = Math.max(best, scoreText(val, q) * (k.weight || 1));
      }
      return { item, score: best };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}
export default { search };
