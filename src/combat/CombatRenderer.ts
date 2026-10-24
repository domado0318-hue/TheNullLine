import type Phaser from 'phaser';
import type { CombatSystem } from './CombatSystem';
import { EffectSprites } from './EffectSprites';
import { effectArt as art, effectMotion as motion } from '../config/effects';

export class CombatRenderer {
  private readonly fx: EffectSprites;
  private readonly trails: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.fx = new EffectSprites(scene); this.trails=scene.add.graphics().setDepth(art.groundDepth+1); }
  sync(combat: CombatSystem): void {
    this.trails.clear();
    this.fx.begin();
    for (const sword of combat.swords) {
      const size = sword.weapon.bladeLength * art.paddingScale;
      const ownerX=sword.x-Math.cos(sword.angle)*sword.weapon.orbitRadius;
      const ownerY=sword.y-Math.sin(sword.angle)*sword.weapon.orbitRadius;
      const progress=Math.max(0,Math.min(1,sword.age/motion.swordTrailSeconds));
      const trailAge=Math.min(sword.age,motion.swordTrailSeconds);
      const start=sword.angle-sword.weapon.angularSpeed*trailAge;
      const end=sword.angle;
      this.trails.lineStyle(motion.swordTrailWidth,sword.faction==='player'?motion.playerTrailColor:motion.enemyTrailColor,progress*.55)
        .beginPath().arc(ownerX,ownerY,sword.weapon.orbitRadius,start,end).strokePath();
      this.fx.draw(sword.faction === 'player' ? 'saw' : 'enemyCut', sword.x, sword.y, size, size, sword.angle);
    }
    for (const bullet of combat.bullets) {
      const angle=Math.atan2(bullet.velocityY,bullet.velocityX),length=motion.bulletTrailPixels;
      const x=bullet.x-Math.cos(angle)*length,y=bullet.y-Math.sin(angle)*length;
      this.trails.lineStyle(2,bullet.faction==='player'?motion.playerTrailColor:motion.enemyTrailColor,motion.bulletTrailAlpha).lineBetween(x,y,bullet.x,y);
      this.fx.draw(bullet.faction === 'player' ? 'rivet' : 'shard', bullet.x, bullet.y,
        bullet.weapon.radius * 2 * art.projectileScale, bullet.weapon.radius * 2 * art.projectileScale, angle);
    }
    this.fx.end();
  }
}
