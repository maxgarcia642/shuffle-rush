/**
 * Sfx (Block 6) — global SFX volume routing.
 * Every scene plays one-shot SFX through the game-wide SoundManager as
 * `this.sound.play(key, { volume: X })`, where X is the shipped hand-tuned mix.
 * Music does NOT go through manager.play() — tracks/alarms use sound.add(),
 * so wrapping manager.play() scales exactly the SFX and nothing else.
 *
 * The shipped hardcoded volumes are treated as the 100%-at-default mix:
 * effective = X * sfxVol / 0.5 (sfxVol defaults to 0.5, so default = shipped).
 */

/** Pure scaling math (unit-tested): shipped volume → effective volume. */
export function scaleSfxVolume(baseVolume, sfxVol) {
  const s = Number(sfxVol);
  const setting = Number.isFinite(s) ? Math.max(0, Math.min(1, s)) : 0.5;
  const base = Number.isFinite(Number(baseVolume)) ? Number(baseVolume) : 1;
  return base * setting / 0.5;
}

/** Wrap the game-wide SoundManager so all manager.play() SFX respect sfxVol. */
export function installSfxRouting(game) {
  const manager = game.sound;
  if (!manager || manager._sfxRoutingInstalled) return;
  manager._sfxRoutingInstalled = true;
  const origPlay = manager.play.bind(manager);
  manager.play = (key, config) => {
    const cfg = { ...(config || {}) };
    cfg.volume = scaleSfxVolume(cfg.volume !== undefined ? cfg.volume : 1, game.registry.get('sfxVol'));
    return origPlay(key, cfg);
  };
}
