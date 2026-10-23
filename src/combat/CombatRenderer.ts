import type Phaser from 'phaser';
import type { CombatSystem } from './CombatSystem';
import { EffectSprites } from './EffectSprites';
import { effectArt as art } from '../config/effects';

export class CombatRenderer {
  private readonly fx: EffectSprites;
  constructor(scene: Phaser.Scene) { this.fx = new EffectSprites(scene); }
  sync(combat: CombatSystem): void {
    this.fx.begin();
    for (const sword of combat.swords) {
      const size = sword.weapon.bladeLength * art.paddingScale;
      this.fx.draw(sword.faction === 'player' ? 'saw' : 'enemyCut', sword.x, sword.y, size, size, sword.angle);
    }
    for (const bullet of combat.bullets) this.fx.draw(bullet.faction === 'player' ? 'rivet' : 'shard', bullet.x, bullet.y,
      bullet.weapon.radius * 2 * art.projectileScale, bullet.weapon.radius * 2 * art.projectileScale, Math.atan2(bullet.velocityY, bullet.velocityX));
    this.fx.end();
  }
}
