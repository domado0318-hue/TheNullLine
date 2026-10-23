import type Phaser from 'phaser';
import type { DamageHit } from './CharacterCombat';
import { damageNumberConfig as config } from '../config/damageNumbers';
import { uiConfig } from '../config/ui';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';

interface FloatingNumber {
  text: Phaser.GameObjects.Text;
  age: number;
  x: number;
  y: number;
  lane: number;
  critical: boolean;
}

/** World-space text; simulation time also pauses the numbers during level-up. */
export class DamageNumberRenderer {
  private readonly entries: FloatingNumber[] = [];
  private sequence = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    assertInteger('damageNumbers.maximum', config.maximum, 1);
    assertPositive('damageNumbers.lifetime', config.lifetime);
    assertPositive('damageNumbers.popSeconds', config.popSeconds);
    assertNonNegative('damageNumbers.fadeStart', config.fadeStart);
    if (config.fadeStart >= 1) throw new Error('damageNumbers.fadeStart: 1 미만이어야 합니다.');
    this.scene = scene;
    scene.events.once('shutdown', () => this.destroy());
  }

  show(hit: DamageHit, topOffset = hit.target.size / 2): void {
    if (!Number.isFinite(hit.amount) || hit.amount <= 0) return;
    let entry = this.entries.find(value => value.age >= config.lifetime);
    if (!entry && this.entries.length < config.maximum) {
      const text = this.scene.add.text(0, 0, '', {
        fontFamily: uiConfig.fontFamily, fontStyle: 'bold',
        strokeThickness: config.strokeThickness,
      }).setOrigin(.5, 1).setDepth(config.depth);
      text.setResolution(2);
      entry = { text, age: 0, x: 0, y: 0, lane: 0, critical: false };
      this.entries.push(entry);
    }
    entry ??= this.entries.reduce((oldest, value) => value.age > oldest.age ? value : oldest);
    const received = hit.target.faction === 'player';
    const lane = received ? 0 : this.sequence++ % 3 - 1;
    Object.assign(entry, { age: 0, x: hit.target.x + lane * config.laneGap,
      y: hit.target.y - topOffset - config.topGap, lane, critical: hit.critical });
    // Display post-mitigation hit strength (including overkill), rounded only for text.
    entry.text.setText(`${received ? '-' : ''}${Math.max(1, Math.round(hit.amount))}${hit.critical ? '!' : ''}`)
      .setFontSize(received ? config.receivedFontSize : hit.critical ? config.criticalFontSize : config.fontSize)
      .setColor(received ? config.receivedColor : hit.critical ? config.criticalColor : config.color)
      .setStroke(received ? config.receivedStroke : hit.critical ? config.criticalStroke : config.stroke, config.strokeThickness)
      .setVisible(true);
    this.render(entry);
  }

  update(delta: number): void {
    for (const entry of this.entries) {
      if (entry.age >= config.lifetime) continue;
      entry.age += delta;
      if (entry.age >= config.lifetime) entry.text.setVisible(false);
      else this.render(entry);
    }
  }

  private render(entry: FloatingNumber): void {
    const progress = entry.age / config.lifetime;
    const pop = Math.max(0, 1 - entry.age / config.popSeconds);
    entry.text.setPosition(entry.x + entry.lane * config.drift * progress, entry.y - config.rise * progress)
      .setScale(1 + ((entry.critical ? config.criticalPopScale : config.popScale) - 1) * pop)
      .setAlpha(1 - Math.max(0, (progress - config.fadeStart) / (1 - config.fadeStart)));
  }

  destroy(): void {
    for (const entry of this.entries) entry.text.destroy();
    this.entries.length = 0;
  }
}
