import type Phaser from 'phaser';
import type { CharacterId } from '../config/characters';
import { playerEyeColors, playerLightConfig } from '../config/playerLight';
import { assertInteger, assertPositive } from '../config/validate';

/** A local additive glow, anchored to each drawn eye rather than the body center. */
export class PlayerEyeLight {
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setDepth(playerLightConfig.depth).setBlendMode('ADD').setVisible(false);
  }

  sync(view: Phaser.GameObjects.Image, character: CharacterId, alive: boolean): void {
    const { eye } = view.frame.customData as { eye?: { x: number; y: number } | null };
    const config = playerLightConfig;
    this.glow.clear().setVisible(config.enabled && view.visible && alive && !!eye);
    if (!config.enabled || !view.visible || !alive || !eye) return;
    assertPositive('playerLight.radius', config.radius);
    assertPositive('playerLight.coreRadius', config.coreRadius);
    assertInteger('playerLight.rings', config.rings, 1);
    const x = view.x + ((view.flipX ? 1 - eye.x : eye.x) - view.originX) * view.displayWidth;
    const y = view.y + (eye.y - view.originY) * view.displayHeight;
    this.glow.setPosition(x, y);
    for (let ring = config.rings; ring > 0; ring--) {
      this.glow.fillStyle(playerEyeColors[character], config.haloAlpha / config.rings);
      this.glow.fillCircle(0, 0, config.radius * ring / config.rings);
    }
    this.glow.fillStyle(0xffffff, config.coreAlpha).fillCircle(0, 0, config.coreRadius);
  }
}
