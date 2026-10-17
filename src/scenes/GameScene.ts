import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 외부 이미지 없이 플레이어를 나타내는 48×48 사각형을 표시합니다.
    this.add.rectangle(centerX, centerY, 48, 48, 0x5ee6a8);
  }
}
