import Phaser from 'phaser';
import { showTitleScreen } from '../ui/GameOverlay';
import { OpeningCutscene } from '../ui/OpeningCutscene';
import { preloadOpeningArt } from '../ui/OpeningArtwork';
import { gameAudio } from '../audio/GameAudio';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  preload(): void { preloadOpeningArt(this); }

  create(): void {
    gameAudio(this).menu();
    showTitleScreen(this, () => {
      new OpeningCutscene(this, () => this.scene.start('GameScene'));
    });
  }
}
