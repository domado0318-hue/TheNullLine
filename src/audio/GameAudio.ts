import type Phaser from 'phaser';
import { audioConfig, musicFiles, soundCatalog, soundUrl } from '../config/audio';
import type { MusicId, SoundId } from '../config/audio';
import { AudioDirector } from './AudioDirector';
import type { AudioOutput, AudioVoice } from './AudioDirector';

class BrowserAudio implements AudioOutput {
  private readonly context = new AudioContext();
  private readonly master = this.context.createGain();
  private readonly buffers = new Map<string, AudioBuffer>();
  private unlocked = false;
  private disposed = false;
  onReady = () => {};
  constructor() {
    this.master.gain.value = audioConfig.masterGain;
    // A final limiter catches coincident peaks, beyond the director's voice limits.
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = audioConfig.limiterThreshold; limiter.knee.value = audioConfig.limiterKnee; limiter.ratio.value = audioConfig.limiterRatio;
    limiter.attack.value = audioConfig.limiterAttack; limiter.release.value = audioConfig.limiterRelease;
    this.master.connect(limiter); limiter.connect(this.context.destination);
    window.addEventListener('pointerdown', this.unlock, { capture: true });
    window.addEventListener('click', this.unlock, { capture: true });
    window.addEventListener('keydown', this.unlock, { capture: true });
    document.addEventListener('visibilitychange', this.visibility);
    const files = [
      ...Object.keys(soundCatalog).map(id => [id, soundUrl(id as SoundId)]),
      ...Object.entries(musicFiles).map(([id, file]) => [id, `/assets/audio/bgm/${file}.ogg`]),
    ];
    for (const [id, url] of files) {
      void fetch(url).then(response => { if (!response.ok) throw new Error(`${response.status} ${url}`); return response.arrayBuffer(); })
        .then(bytes => this.context.decodeAudioData(bytes)).then(buffer => {
          if (this.disposed) return;
          this.buffers.set(id, buffer); this.onReady();
        }).catch(error => { if (!this.disposed) console.warn('Audio asset unavailable:', url, error); });
    }
  }
  private readonly unlock = (): void => {
    this.unlocked = true;
    if (!document.hidden) void this.context.resume().then(() => this.onReady()).catch(() => {});
  };
  private readonly visibility = (): void => {
    if (document.hidden) void this.context.suspend().catch(() => {});
    else if (this.unlocked) void this.context.resume().then(() => this.onReady()).catch(() => {});
  };
  now(): number { return this.context.currentTime; }
  play(id: SoundId | MusicId, gain: number, loop: boolean, pan: number): AudioVoice | undefined {
    const buffer = this.buffers.get(id);
    if (this.disposed || !buffer || this.context.state !== 'running' || document.hidden) return;
    const source = this.context.createBufferSource(), volume = this.context.createGain(), position = this.context.createStereoPanner();
    source.buffer = buffer; source.loop = loop; volume.gain.value = gain; position.pan.value = pan;
    source.connect(volume); volume.connect(position); position.connect(this.master);
    let ended = false;
    source.onended = () => { ended = true; source.disconnect(); volume.disconnect(); position.disconnect(); };
    source.start();
    return {
      get ended() { return ended; },
      fade: (value, seconds) => {
        if (ended) return;
        const now = this.now(); volume.gain.cancelAndHoldAtTime(now);
        volume.gain.linearRampToValueAtTime(value, now + seconds);
      },
      stop: (seconds = 0) => {
        if (ended) return;
        if (!seconds) ended = true;
        source.stop(this.now() + seconds);
      },
    };
  }
  destroy(): void {
    this.disposed = true;
    window.removeEventListener('pointerdown', this.unlock, { capture: true }); window.removeEventListener('keydown', this.unlock, { capture: true });
    window.removeEventListener('click', this.unlock, { capture: true });
    document.removeEventListener('visibilitychange', this.visibility); void this.context.close(); this.buffers.clear();
  }
}
const directors = new WeakMap<object, AudioDirector>();
/** One owner per game: title -> opening -> character selection preserves music. */
export function gameAudio(scene: Phaser.Scene): AudioDirector {
  let director = directors.get(scene.game);
  if (!director) {
    const browser = typeof AudioContext !== 'undefined' && typeof window !== 'undefined' ? new BrowserAudio() : undefined;
    director = new AudioDirector(browser ?? { now: () => 0, play: () => undefined });
    if (browser) browser.onReady = () => director!.refresh();
    directors.set(scene.game, director);
    scene.game.events?.once('destroy', () => { director!.destroy(); browser?.destroy(); directors.delete(scene.game); });
  }
  return director;
}
