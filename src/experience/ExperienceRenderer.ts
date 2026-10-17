import type Phaser from 'phaser';
import { experienceConfig } from '../config/experience';
import type { ExperienceSystem } from './ExperienceSystem';

export class ExperienceRenderer {
  private readonly views = new Map<number, Phaser.GameObjects.Star>();
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  sync(experience: ExperienceSystem): void {
    const config = experienceConfig.icon;
    const liveIds = new Set<number>();
    for (const drop of experience.drops) {
      liveIds.add(drop.id);
      let view = this.views.get(drop.id);
      if (!view) {
        view = this.scene.add.star(drop.x, drop.y, config.points, config.innerRadius, config.outerRadius, config.color).setDepth(config.depth);
        this.views.set(drop.id, view);
      }
      view.setPosition(drop.x, drop.y);
    }
    for (const [id, view] of this.views) {
      if (!liveIds.has(id)) { view.destroy(); this.views.delete(id); }
    }
  }
}
