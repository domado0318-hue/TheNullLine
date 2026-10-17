import Phaser from 'phaser';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private movementKeys!: MovementKeys;
  private readonly movementDirection = new Phaser.Math.Vector2();
  private readonly movementSpeed = 300; // Pixels per second.

  constructor() {
    super('GameScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 외부 이미지 없이 플레이어를 나타내는 48×48 사각형을 표시합니다.
    this.player = this.add.rectangle(centerX, centerY, 48, 48, 0x5ee6a8);

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is required for player movement.');
    }

    this.movementKeys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(_time: number, delta: number): void {
    const { up, down, left, right } = this.movementKeys;

    this.movementDirection.set(
      Number(right.isDown) - Number(left.isDown),
      Number(down.isDown) - Number(up.isDown),
    );

    if (this.movementDirection.lengthSq() === 0) {
      return;
    }

    // Normalize diagonals, then convert speed to this frame's travel distance.
    this.movementDirection.normalize().scale(this.movementSpeed * delta / 1000);

    const halfWidth = this.player.displayWidth / 2;
    const halfHeight = this.player.displayHeight / 2;

    this.player.setPosition(
      Phaser.Math.Clamp(
        this.player.x + this.movementDirection.x,
        halfWidth,
        this.scale.width - halfWidth,
      ),
      Phaser.Math.Clamp(
        this.player.y + this.movementDirection.y,
        halfHeight,
        this.scale.height - halfHeight,
      ),
    );
  }
}
