# Audio

- Playback policy belongs in `AudioDirector`; browser audio, asset loading, unlock handling, and game-level ownership belong in `GameAudio`. Keep policy logic independent of Phaser and browser APIs where practical.
- Audio tuning values, sound catalogs, groups, file mappings, and stage music selection belong in `config/audio.ts`. Keep durations in seconds, distances in px, and gains as documented normalized values.
- A user gesture unlocks playback. Hidden pages suspend audio; returning to a visible page may resume it only after audio has been unlocked. Remove event listeners and close the audio context when the game is destroyed.
- Keep one audio director per game across title, opening, character selection, combat, and result scenes. Scene transitions must not create duplicate music owners or leave obsolete voices playing.
- Missing or not-yet-decoded assets must not queue stale combat sounds. A requested music track may wait for its asset while retaining the currently playing track; a late asset load must not restore music that is no longer requested.
- Preserve sound group cooldowns, per-group caps, the global effect cap, priority replacement, distance attenuation, stereo panning, selection ducking, and cleanup on result/restart. Audio failure must not stop gameplay.
- Route gameplay sound events from the system that owns the event. Emit one sound per meaningful action, not once per affected target or repeated simulation substep.

## Regression checks

- Verify gesture unlock, visibility suspend/resume, and listener/context cleanup on game destruction.
- Verify title/opening/selection transitions keep a single music owner, crossfades do not accumulate voices, and late asset completion cannot revive an outdated track or effect.
- Verify group cooldowns/caps, global cap and priority replacement, world-distance/pan bounds, selection ducking, and effect/music cleanup on result and restart.
- Verify combat, enemy hazard, and experience collection events emit sounds at the actual event time and do not repeat per target, pellet, or simulation step.
- Run the relevant audio tests in `tests/audio.test.cjs`; distinguish browser playback/listening checks from automated policy tests when reporting verification.
