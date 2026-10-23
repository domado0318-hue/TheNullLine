import Phaser from 'phaser';
import { playerConfig } from '../config/player';
import { moveBody } from '../world/geometry';
import type { Body, CollisionWorld } from '../world/geometry';
import { createCombatant } from '../combat/types';
import type { Combatant } from '../combat/types';
import type { CharacterId } from '../config/characters';
import { playerArt, playerArtConfig } from '../config/playerArt';
import { combatConfig } from '../config/combat';
import { PlayerAnimation } from './PlayerAnimation';
import { PlayerEyeLight } from './PlayerEyeLight';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class PlayerController {
  readonly body: Combatant;
  readonly view: Phaser.GameObjects.Image;
  readonly animation = new PlayerAnimation();
  private readonly keys: MovementKeys;
  private readonly eyeLight: PlayerEyeLight;
  private character: CharacterId = 'mechanic';

  constructor(scene: Phaser.Scene, world: CollisionWorld) {
    this.body = createCombatant({ id: 0, x: world.width / 2, y: world.height / 2, size: playerConfig.size }, 'player', playerConfig.maxHp, playerConfig.attackDamage);
    this.view = scene.add.image(this.body.x, this.body.y, playerArt.mechanic.key, '0')
      .setDisplaySize(playerArtConfig.displaySize, playerArtConfig.displaySize).setDepth(playerArtConfig.depth).setVisible(false);
    this.eyeLight = new PlayerEyeLight(scene);
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for player movement.');
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(deltaSeconds: number, world: CollisionWorld, enemies: readonly Body[], speed = playerConfig.movementSpeed): void {
    if (this.body.hp <= 0) return;
    const x = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const y = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    const length = Math.hypot(x, y);
    const before = { x: this.body.x, y: this.body.y };
    if (length) {
      const travel = speed * deltaSeconds;
      moveBody(this.body, x / length * travel, y / length * travel, world, enemies);
    }
    this.animation.update(deltaSeconds, x, y, this.body.x - before.x, this.body.y - before.y);
    this.view.setPosition(this.body.x, this.body.y);
  }

  setCharacter(id: CharacterId): void {
    this.character = id;
    this.view.setTexture(playerArt[id].key, '0').setDisplaySize(playerArtConfig.displaySize, playerArtConfig.displaySize).setVisible(true);
  }

  syncView(): void {
    this.view.setPosition(this.body.x, this.body.y);
    this.view.setFrame(this.animation.frameFor(this.character)).setFlipX(this.animation.flipX);
    const size = playerArtConfig.displaySize, breath = this.animation.idleBreath;
    const height = size + breath * playerArtConfig.idleHeightPixels;
    this.view.setDisplaySize(size + breath * playerArtConfig.idleWidthPixels, height);
    // Pin the drawn soles without moving the image position followed by the camera.
    this.view.setOrigin(.5, playerArtConfig.footAnchor - (playerArtConfig.footAnchor - .5) * size / height);
    const elapsed = combatConfig.hitFlashSeconds - this.body.hitFlashSeconds;
    if (this.body.hitFlashSeconds > 0 && Math.floor(elapsed / combatConfig.flashIntervalSeconds) % 2 === 0) this.view.setTintFill(combatConfig.hitColor);
    else this.view.clearTint();
    this.eyeLight.sync(this.view, this.character, this.body.hp > 0);
  }
}
