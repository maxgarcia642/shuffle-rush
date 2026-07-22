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
    particle: 0x00ffff,
    halftone: 0x333333, // shipped dot-grid gray
    // shipped MenuScene/CreditsScene "iPod commercial" liquid palette
    menuColors: [
      { main: 0xff0066, dark: 0x990044 },
      { main: 0x00ff99, dark: 0x009966 },
      { main: 0xff9900, dark: 0xcc6600 },
      { main: 0x0099ff, dark: 0x0066cc },
      { main: 0xff00ff, dark: 0x990099 }
    ]
  },
  vaporDusk: {
    label: 'VAPOR DUSK',
    neon: [0xff71ce, 0x01cdfe, 0x05ffa1, 0xb967ff, 0xfffb96],
    lanes: [0xff71ce, 0x01cdfe, 0x05ffa1],
    bgTop: 0x2d1b4e, bgBottom: 0x0f0524,
    beam: 0xb967ff, glow: 0xff71ce,
    floaters: ['▲', '◡', '✧', '♡'],
    particle: 0x01cdfe,
    halftone: 0x2d2244,
    menuColors: [
      { main: 0xff71ce, dark: 0x99447c },
      { main: 0x01cdfe, dark: 0x017b98 },
      { main: 0x05ffa1, dark: 0x039961 },
      { main: 0xb967ff, dark: 0x6f3d99 },
      { main: 0xfffb96, dark: 0x99975a }
    ]
  },
  metroGlass: {
    label: 'METRO GLASS',
    neon: [0x7fd4ff, 0xa2f5bf, 0xffffff, 0x9ecbff, 0x6ee7d8],
    lanes: [0x7fd4ff, 0x6ee7d8, 0xa2f5bf],
    bgTop: 0x0b2740, bgBottom: 0x02101f,
    beam: 0x7fd4ff, glow: 0xa2f5bf,
    floaters: ['○', '◌', '✦', '♪'],
    particle: 0x9ecbff,
    halftone: 0x1d3a4d,
    menuColors: [
      { main: 0x7fd4ff, dark: 0x4c7f99 },
      { main: 0x6ee7d8, dark: 0x428a81 },
      { main: 0xa2f5bf, dark: 0x619373 },
      { main: 0x9ecbff, dark: 0x5f7a99 },
      { main: 0xffffff, dark: 0x999999 }
    ]
  },
  sunsetDrive: {
    label: 'SUNSET DRIVE',
    neon: [0xff9e00, 0xff5400, 0xff0054, 0x9e0059, 0xffbd00],
    lanes: [0xff5400, 0xffbd00, 0xff0054],
    bgTop: 0x3d0a3f, bgBottom: 0x12030f,
    beam: 0xff9e00, glow: 0xff0054,
    floaters: ['◢', '◣', '✦', '♪'],
    particle: 0xffbd00,
    halftone: 0x3a1a2e,
    menuColors: [
      { main: 0xff9e00, dark: 0x995e00 },
      { main: 0xff5400, dark: 0x993200 },
      { main: 0xff0054, dark: 0x990032 },
      { main: 0xffbd00, dark: 0x997100 },
      { main: 0x9e0059, dark: 0x5e0035 }
    ]
  },
  acidPop: {
    label: 'ACID POP',
    neon: [0xccff00, 0xff00cc, 0x00ffcc, 0xffee00, 0x66ff00],
    lanes: [0xccff00, 0x00ffcc, 0xff00cc],
    bgTop: 0x101c00, bgBottom: 0x030800,
    beam: 0xccff00, glow: 0x00ffcc,
    floaters: ['✶', '✳', '♪', '◆'],
    particle: 0xccff00,
    halftone: 0x27330a,
    menuColors: [
      { main: 0xccff00, dark: 0x7a9900 },
      { main: 0xff00cc, dark: 0x99007a },
      { main: 0x00ffcc, dark: 0x00997a },
      { main: 0xffee00, dark: 0x998e00 },
      { main: 0x66ff00, dark: 0x3d9900 }
    ]
  },
  monoIce: {
    label: 'MONO ICE',
    neon: [0xffffff, 0xcfd8dc, 0x90a4ae, 0xeceff1, 0xb0bec5],
    lanes: [0xffffff, 0xb0bec5, 0x90a4ae],
    bgTop: 0x1c262b, bgBottom: 0x05080a,
    floaters: ['·', '✦', '○', '♪'],
    beam: 0xffffff, glow: 0xcfd8dc,
    particle: 0xffffff,
    halftone: 0x37474f,
    menuColors: [
      { main: 0xffffff, dark: 0x999999 },
      { main: 0xb0bec5, dark: 0x6a7276 },
      { main: 0x90a4ae, dark: 0x566268 },
      { main: 0xcfd8dc, dark: 0x7c8284 },
      { main: 0xeceff1, dark: 0x8d8f91 }
    ]
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
