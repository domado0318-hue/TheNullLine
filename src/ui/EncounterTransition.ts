import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import { journeyStage } from '../config/journey';
import { assertNonNegative, assertPositive } from '../config/validate';
import type { StageEnemySystem } from '../enemies/StageEnemySystem';

/** Presentation clock advances while the scene's gameplay simulation is stopped. */
export class EncounterTransition {
  private readonly shade: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private stage = -1;
  private wave = -1;
  private remaining = 0;
  private queue: { title: string; detail: string }[] = [];

  constructor(scene: Phaser.Scene) {
    const c = uiConfig.encounterTransition;
    assertPositive('ui.encounterTransition.seconds', c.seconds);
    const x = scene.scale.width / 2, y = scene.scale.height / 2;
    this.shade = scene.add.graphics().setScrollFactor(0).setDepth(c.depth)
      .fillStyle(uiConfig.overlayColor, c.backgroundAlpha).fillRect(0, 0, scene.scale.width, scene.scale.height).setVisible(false);
    const text = (atY: number, size: number, color: string) => scene.add.text(x, atY, '', {
      fontFamily: uiConfig.fontFamily, fontSize: size, color, align: 'center',
    }).setOrigin(.5).setScrollFactor(0).setDepth(c.depth + 1).setVisible(false);
    this.title = text(y, c.fontSize, uiConfig.railway.enamel);
    this.detail = text(y + c.detailOffsetY, c.detailFontSize, uiConfig.railway.route);
  }

  observe(system: StageEnemySystem): boolean {
    if (system.complete || this.stage === system.stage && this.wave === system.wave) return false;
    if (this.stage !== system.stage) this.queue.push({ title: `Stage ${system.stage + 1}`, detail: journeyStage(system.stage).name });
    this.queue.push({ title: `Wave ${system.wave + 1}`, detail: '전투 시작' });
    this.stage = system.stage;
    this.wave = system.wave;
    this.showNext();
    return true;
  }

  /** Consume the whole paused frame, including the final frame, to avoid catch-up. */
  update(deltaMilliseconds: number): boolean {
    if (this.remaining <= 0) return false;
    assertNonNegative('ui.encounterTransition.delta', deltaMilliseconds);
    this.remaining = Math.max(0, this.remaining - deltaMilliseconds / 1000);
    if (this.remaining === 0) this.showNext();
    return true;
  }

  private showNext(): void {
    const next = this.queue.shift();
    this.shade.setVisible(!!next);
    this.title.setVisible(!!next);
    this.detail.setVisible(!!next);
    if (!next) return;
    this.title.setText(next.title);
    this.detail.setText(next.detail);
    this.remaining = uiConfig.encounterTransition.seconds;
  }
}
