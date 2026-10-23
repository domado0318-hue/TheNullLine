import { audioConfig as c, soundCatalog, soundGroups, musicForStage } from '../config/audio';
import type { MusicId, SoundGroup, SoundId } from '../config/audio';

export interface AudioVoice {
  readonly ended: boolean;
  fade(gain: number, seconds: number): void;
  stop(afterSeconds?: number): void;
}
export interface AudioOutput {
  now(): number;
  play(id: SoundId | MusicId, gain: number, loop: boolean, pan: number): AudioVoice | undefined;
}
interface Effect { voice: AudioVoice; group: SoundGroup; priority: number }
interface Music { voice: AudioVoice; id: MusicId }

/** Playback policy is independent of the browser, Phaser and combat simulation. */
export class AudioDirector {
  private effects: Effect[] = [];
  private music?: Music;
  private fading?: AudioVoice;
  private requested?: MusicId;
  private readonly lastSound = new Map<SoundId, number>();
  private readonly lastGroup = new Map<SoundGroup, number>();
  private selecting = false;
  private mode: 'menu' | 'combat' | 'result' = 'menu';
  private listener = { x: 0, y: 0 };
  private stage = -1;
  private readonly output: AudioOutput;
  constructor(output: AudioOutput) { this.output = output; }

  listen(at: { x: number; y: number }): void { this.listener = { ...at }; }
  play = (id: SoundId, at?: { x: number; y: number }): boolean => {
    const [group, volume, gap] = soundCatalog[id];
    if (this.mode !== 'combat' && !['ui', 'event'].includes(group)) return false;
    if (this.selecting && !['ui', 'event', 'status'].includes(group)) return false;
    const policy = soundGroups[group], now = this.output.now();
    if (now - (this.lastSound.get(id) ?? -Infinity) < gap || now - (this.lastGroup.get(group) ?? -Infinity) < policy.gap) return false;
    let gain = volume * c.effectGain, pan = 0;
    if (at) {
      const dx = at.x - this.listener.x, distance = Math.hypot(dx, at.y - this.listener.y);
      const limit = group === 'warning' ? c.warningDistance : c.maxDistance;
      if (distance >= limit) return false;
      gain *= 1 - Math.max(0, distance - c.fullDistance) / (limit - c.fullDistance);
      pan = Math.max(-c.maxPan, Math.min(c.maxPan, dx / c.panDistance * c.maxPan));
    }
    this.effects = this.effects.filter(e => !e.voice.ended);
    const family = this.effects.filter(e => e.group === group);
    if (family.length >= policy.cap) return false;
    const victim = this.effects.length >= c.maxEffects
      ? [...this.effects].sort((a, b) => a.priority - b.priority)[0] : undefined;
    if (victim && victim.priority >= policy.priority) return false;
    const voice = this.output.play(id, gain, false, pan);
    if (!voice) return false; // Missing/locked assets never queue stale combat sounds.
    if (victim) { victim.voice.stop(); this.effects.splice(this.effects.indexOf(victim), 1); }
    this.effects.push({ voice, group, priority: policy.priority });
    this.lastSound.set(id, now); this.lastGroup.set(group, now);
    return true;
  };
  menu(): void {
    this.stopEffects(); this.selecting = false; this.mode = 'menu'; this.stage = -1;
    this.setMusic('title');
  }
  combat(stage: number): void {
    this.mode = 'combat';
    const changed = this.stage !== stage; this.stage = stage;
    const id = musicForStage(stage);
    this.setMusic(id, id.startsWith('boss') ? c.bossFadeSeconds : c.crossfadeSeconds);
    if (changed) this.play(id.startsWith('boss') ? 'boss_enter' : 'wave_start');
  }
  selection(value: boolean): void {
    if (value === this.selecting) return;
    this.selecting = value;
    if (value) {
      // Short one-shots are discarded; no expired warnings replay after the menu.
      this.effects = this.effects.filter(e => {
        if (e.group === 'ui') return true;
        e.voice.stop(); return false;
      });
      this.play('level_up');
    }
    this.music?.voice.fade(this.musicGain(), c.duckSeconds);
  }
  bossDefeated(): void { this.stopEffects(); this.play('boss_defeat'); this.setMusic(undefined, c.bossFadeSeconds); }
  result(victory: boolean): void {
    if (this.mode === 'result') return;
    this.stopEffects(); this.selecting = false; this.mode = 'result';
    this.setMusic(undefined, c.resultFadeSeconds);
    this.play(victory ? 'cue_victory_still_alive' : 'cue_defeat_record_closed');
  }
  private musicGain(): number { return c.musicGain * (this.selecting ? c.selectionGain : 1); }
  setMusic(id?: MusicId, seconds: number = c.crossfadeSeconds): void {
    this.requested = id;
    if (this.music && this.music.id === id && !this.music.voice.ended) return;
    if (!id) {
      this.fading?.stop(); this.fading = this.music?.voice;
      this.fading?.fade(0, seconds); this.fading?.stop(seconds); this.music = undefined; return;
    }
    const voice = this.output.play(id, 0, true, 0);
    if (!voice) return; // Retain old music until the requested buffer is ready.
    this.fading?.stop(); this.fading = this.music?.voice;
    this.fading?.fade(0, seconds); this.fading?.stop(seconds);
    this.music = { id, voice }; voice.fade(this.musicGain(), seconds);
  }
  refresh(): void { if (this.requested) this.setMusic(this.requested); }
  stopEffects(): void {
    for (const e of this.effects) e.voice.stop();
    this.effects = []; this.lastGroup.clear(); this.lastSound.clear();
  }
  destroy(): void { this.stopEffects(); this.music?.voice.stop(); this.fading?.stop(); this.music = undefined; this.fading = undefined; this.requested = undefined; }
}
