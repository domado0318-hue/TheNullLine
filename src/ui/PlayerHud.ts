import type Phaser from 'phaser';
import type { CharacterCombat } from '../combat/CharacterCombat';
import { skills } from '../config/skills';
import { uiConfig } from '../config/ui';
import { railwayColor, setRailwayIcon } from './RailwayPanel';
import { skillIcon } from './RailwayIcons';

/** Screen-space signs only. The combat renderer retains world-space effects. */
export class PlayerHud {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly icons: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene) {
    const c = uiConfig.railway;
    const depth = uiConfig.experience.depth;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    const text = (x: number, y: number, size: number, color = c.ink) => scene.add.text(x, y, '', {
      fontFamily: uiConfig.fontFamily, fontSize: size, color, fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth + 2);
    this.icons = Array.from({ length: skills.mechanic.length }, (_, i) => scene.add.image(
      c.slotX + i % c.slotColumns * (c.slotSize + c.slotGap) + c.slotSize / 2,
      c.slotY + Math.floor(i / c.slotColumns) * (c.slotSize + c.slotGap) + c.slotSize * .36,
      uiConfig.art.iconsKey, 'saw',
    ).setScrollFactor(0).setDepth(depth + 1).setVisible(false));
    this.labels = Array.from({ length: skills.mechanic.length }, (_, i) => text(
      c.slotX + i % c.slotColumns * (c.slotSize + c.slotGap) + c.slotSize / 2,
      c.slotY + Math.floor(i / c.slotColumns) * (c.slotSize + c.slotGap) + c.slotSize - c.slotFontSize,
      c.slotFontSize, c.enamel,
    ).setOrigin(.5, 0).setVisible(false));
  }

  sync(combat: CharacterCombat): void {
    const c = uiConfig.railway, g = this.graphics;
    g.clear();
    const owned = skills[combat.character].filter(skill => combat.progression.level(skill.id));
    this.labels.forEach(label => label.setVisible(false));
    this.icons.forEach(icon => icon.setVisible(false));
    owned.forEach((skill, index) => {
      const x = c.slotX + index % c.slotColumns * (c.slotSize + c.slotGap);
      const y = c.slotY + Math.floor(index / c.slotColumns) * (c.slotSize + c.slotGap);
      g.fillStyle(railwayColor(c.teal), .9).fillRect(x, y, c.slotSize, c.slotSize);
      g.lineStyle(1, railwayColor(c.edge)).strokeRect(x, y, c.slotSize, c.slotSize);
      setRailwayIcon(this.icons[index], skillIcon(combat.character, skill.id), c.slotSize * .6);
      this.icons[index].setVisible(true);
      const rank = combat.progression.level(skill.id);
      this.labels[index].setText(`${skill.name.slice(0, 2)} ${rank}`).setVisible(true);
    });
  }
}
