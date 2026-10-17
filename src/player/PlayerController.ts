import Phaser from 'phaser';
import { playerConfig } from '../config/player';
import { moveBody } from '../world/geometry';
import type { Body, CollisionWorld } from '../world/geometry';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class PlayerController {
  readonly body: Body;
  readonly view: Phaser.GameObjects.Rectangle;
  private readonly keys: MovementKeys;

  constructor(scene: Phaser.Scene, world: CollisionWorld) {
    this.body = { id: 0, x: world.width / 2, y: world.height / 2, size: playerConfig.size };
    this.view = scene.add.rectangle(this.body.x, this.body.y, playerConfig.size, playerConfig.size, playerConfig.color);
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for player movement.');
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(deltaSeconds: number, world: CollisionWorld, enemies: readonly Body[]): void {
    const x = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const y = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    const length = Math.hypot(x, y);
    if (!length) return;
    const travel = playerConfig.movementSpeed * deltaSeconds;
    moveBody(this.body, x / length * travel, y / length * travel, world, enemies);
    this.view.setPosition(this.body.x, this.body.y);
  }

  syncView(): void {
    this.view.setPosition(this.body.x, this.body.y);
  }
}
