/**
 * ThemeManager — six Frutiger Metro / Vectordelia palettes (v2).
 * The game's effect generators (neon cycling, light beams, gradients, lanes,
 * silhouette glow) currently pull from hardcoded color arrays. Themes make
 * those data-driven. Player/Enemy already expose setThemeColor() — themes feed
 * it. Persisted via MediaLibrary kv; applied at scene create.
 */
export const THEMES = {
  neonRush: {   // the shipped look — default, unchanged feel
    label: 'NEON RUSH',
    neon: [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00, 0xff6600, 0xff0099],
    lanes: [0xff3366, 0x33ccff, 0xffcc00],
    bgTop: 0x1a0033, bgBottom: 0x000011,
    beam: 0x00ffff, glow: 0xff00ff,
    floaters: ['♪', '♫', '✦', '◆'],
    particle: 0x00ffff
  },
  vaporDusk: {
    label: 'VAPOR DUSK',
    neon: [0xff71ce, 0x01cdfe, 0x05ffa1, 0xb967ff, 0xfffb96],
    lanes: [0xff71ce, 0x01cdfe, 0x05ffa1],
    bgTop: 0x2d1b4e, bgBottom: 0x0f0524,
    beam: 0xb967ff, glow: 0xff71ce,
    floaters: ['▲', '◡', '✧', '♡'],
    particle: 0x01cdfe
  },
  metroGlass: {
    label: 'METRO GLASS',
    neon: [0x7fd4ff, 0xa2f5bf, 0xffffff, 0x9ecbff, 0x6ee7d8],
    lanes: [0x7fd4ff, 0x6ee7d8, 0xa2f5bf],
    bgTop: 0x0b2740, bgBottom: 0x02101f,
    beam: 0x7fd4ff, glow: 0xa2f5bf,
    floaters: ['○', '◌', '✦', '♪'],
    particle: 0x9ecbff
  },
  sunsetDrive: {
    label: 'SUNSET DRIVE',
    neon: [0xff9e00, 0xff5400, 0xff0054, 0x9e0059, 0xffbd00],
    lanes: [0xff5400, 0xffbd00, 0xff0054],
    bgTop: 0x3d0a3f, bgBottom: 0x12030f,
    beam: 0xff9e00, glow: 0xff0054,
    floaters: ['◢', '◣', '✦', '♪'],
    particle: 0xffbd00
  },
  acidPop: {
    label: 'ACID POP',
    neon: [0xccff00, 0xff00cc, 0x00ffcc, 0xffee00, 0x66ff00],
    lanes: [0xccff00, 0x00ffcc, 0xff00cc],
    bgTop: 0x101c00, bgBottom: 0x030800,
    beam: 0xccff00, glow: 0x00ffcc,
    floaters: ['✶', '✳', '♪', '◆'],
    particle: 0xccff00
  },
  monoIce: {
    label: 'MONO ICE',
    neon: [0xffffff, 0xcfd8dc, 0x90a4ae, 0xeceff1, 0xb0bec5],
    lanes: [0xffffff, 0xb0bec5, 0x90a4ae],
    bgTop: 0x1c262b, bgBottom: 0x05080a,
    floaters: ['·', '✦', '○', '♪'],
    beam: 0xffffff, glow: 0xcfd8dc,
    particle: 0xffffff
  }
};

const ThemeManager = {
  currentId: 'neonRush',
  get current() { return THEMES[this.currentId] || THEMES.neonRush; },
  ids() { return Object.keys(THEMES); },

  init(registry) {
    const saved = registry?.get('themeId');
    if (saved && THEMES[saved]) this.currentId = saved;
  },

  set(id, registry) {
    if (!THEMES[id]) return false;
    this.currentId = id;
    if (registry) registry.set('themeId', id);          // main.js persists via kv bridge
    return true;
  },

  /** Apply to a live GameScene's known systems (best-effort, all optional). */
  applyToGameScene(scene) {
    const t = this.current;
    if (Array.isArray(scene.neonColors)) scene.neonColors = t.neon.slice();
    if (Array.isArray(scene.laneConfig)) {
      scene.laneConfig.forEach((lane, i) => { if (t.lanes[i] != null) lane.color = t.lanes[i]; });
    }
    if (scene.player?.setThemeColor) scene.player.setThemeColor(t.glow);
    if (scene.enemy?.setThemeColor) scene.enemy.setThemeColor(t.neon[0]);
  }
};
export default ThemeManager;
