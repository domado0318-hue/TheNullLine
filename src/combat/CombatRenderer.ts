import Phaser from 'phaser';
import type { CombatSystem } from './CombatSystem';

export class CombatRenderer {
  private readonly views = new Map<number, Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc>();
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  sync(combat: CombatSystem): void {
    const liveIds = new Set<number>();
    for (const sword of combat.swords) {
      liveIds.add(sword.id);
      let view = this.views.get(sword.id);
      if (!view) {
        view = this.scene.add.rectangle(sword.x, sword.y, sword.weapon.bladeLength, sword.weapon.bladeWidth, sword.weapon.color);
        this.views.set(sword.id, view);
      }
      view.setPosition(sword.x, sword.y).setRotation(sword.angle);
    }
    for (const bullet of combat.bullets) {
      liveIds.add(bullet.id);
      let view = this.views.get(bullet.id);
      if (!view) {
        view = this.scene.add.circle(bullet.x, bullet.y, bullet.weapon.radius, bullet.weapon.color);
        this.views.set(bullet.id, view);
      }
      view.setPosition(bullet.x, bullet.y);
    }
    for (const [id, view] of this.views) {
      if (!liveIds.has(id)) { view.destroy(); this.views.delete(id); }
    }
  }
}
