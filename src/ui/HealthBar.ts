import Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import { clamp } from '../world/geometry';
import type { Combatant } from '../combat/types';

export class HealthBar {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(uiConfig.healthBar.depth);
  }

  update(actor: Combatant): void {
    const config = uiConfig.healthBar;
    const width = actor.size + config.widthPadding;
    const x = actor.x - width / 2;
    const y = actor.y - actor.size / 2 - config.gap - config.height;
    this.graphics.clear();
    this.graphics.fillStyle(config.backgroundColor).fillRect(x, y, width, config.height);
    this.graphics.fillStyle(actor.faction === 'player' ? config.playerColor : config.enemyColor);
    this.graphics.fillRect(x, y, width * clamp(actor.hp / actor.maxHp, 0, 1), config.height);
    this.graphics.lineStyle(config.borderWidth, config.borderColor).strokeRect(x, y, width, config.height);
  }

  destroy(): void { this.graphics.destroy(); }
}
