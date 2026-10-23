import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import './style.css';
import { gameConfig } from './config/game';
import { loadGameFont } from './ui/loadGameFont';

void loadGameFont().then(() => new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: gameConfig.width,
  height: gameConfig.height,
  backgroundColor: gameConfig.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, GameScene],
}));
