import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import type { ExperienceSystem } from '../experience/ExperienceSystem';
import { createRailwayPanel, railwayColor } from './RailwayPanel';
import { clamp } from '../world/geometry';

export class ExperienceHud {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const config = uiConfig.experience;
    const c = uiConfig.railway;
    createRailwayPanel(scene, config.x, config.y, config.levelWidth + config.barWidth + c.hudPadding * 2, config.barHeight + c.hudPadding * 2);
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(config.depth);
    this.level = scene.add.text(config.x + c.hudPadding, config.y + c.hudPadding + config.barHeight / 2, '', {
      fontFamily: uiConfig.fontFamily, fontSize: config.levelFontSize, color: c.ink, fontStyle: 'bold',
    }).setOrigin(0, .5).setScrollFactor(0).setDepth(config.depth + 1);
    this.progress = scene.add.text(config.x + c.hudPadding + config.levelWidth + config.barWidth / 2, config.y + c.hudPadding + config.barHeight / 2, '', {
      fontFamily: uiConfig.fontFamily, fontSize: config.barFontSize, color: c.enamel, fontStyle: 'bold',
      stroke: c.ink, strokeThickness: c.barTextStroke,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(config.depth + 1);
  }

  update(experience: ExperienceSystem): void {
    const config = uiConfig.experience;
    const c = uiConfig.railway;
    const x = config.x + c.hudPadding + config.levelWidth;
    const y = config.y + c.hudPadding;
    const ratio = clamp(experience.currentExperience / experience.requiredExperience, 0, 1);
    this.level.setText(`${config.levelPrefix} ${experience.level}`);
    this.progress.setText(`EXP ${experience.currentExperience} / ${experience.requiredExperience}`);
    this.graphics.clear();
    this.graphics.fillStyle(railwayColor(c.ink)).fillRect(x, y, config.barWidth, config.barHeight);
    this.graphics.fillStyle(config.fillColor).fillRect(x, y, config.barWidth * ratio, config.barHeight);
  }
}
