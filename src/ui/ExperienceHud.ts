import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import type { ExperienceSystem } from '../experience/ExperienceSystem';

export class ExperienceHud {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const config = uiConfig.experience;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(config.depth);
    this.level = scene.add.text(config.x, config.y, '', {
      fontFamily: uiConfig.fontFamily, fontSize: config.levelFontSize, color: uiConfig.textColor,
    }).setScrollFactor(0).setDepth(config.depth + 1);
    this.progress = scene.add.text(config.x + config.barWidth / 2, config.y + config.levelHeight + config.barGap + config.barHeight / 2, '', {
      fontFamily: uiConfig.fontFamily, fontSize: config.barFontSize, color: uiConfig.textColor,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(config.depth + 1);
  }

  update(experience: ExperienceSystem): void {
    const config = uiConfig.experience;
    const y = config.y + config.levelHeight + config.barGap;
    const ratio = experience.currentExperience / experience.requiredExperience;
    this.level.setText(`${config.levelPrefix} ${experience.level}`);
    this.progress.setText(`${experience.currentExperience} / ${experience.requiredExperience}`);
    this.graphics.clear();
    this.graphics.fillStyle(config.backgroundColor).fillRect(config.x, y, config.barWidth, config.barHeight);
    this.graphics.fillStyle(config.fillColor).fillRect(config.x, y, config.barWidth * ratio, config.barHeight);
    this.graphics.lineStyle(config.borderWidth, config.borderColor).strokeRect(config.x, y, config.barWidth, config.barHeight);
  }
}
