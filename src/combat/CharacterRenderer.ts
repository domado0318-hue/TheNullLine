import type Phaser from 'phaser';
import type { CharacterCombat } from './CharacterCombat';
import { characterWeapons } from '../config/characterWeapons';
import { effectArt as art, effectMotion as motion, effectGround as ground } from '../config/effects';
import { uiConfig } from '../config/ui';
import { PlayerHud } from '../ui/PlayerHud';
import { EffectSprites } from './EffectSprites';
import { effectEnvelope, smoothEffect } from './EffectMotion';

export class CharacterRenderer {
  private readonly fx: EffectSprites;
  private readonly hud: PlayerHud;
  constructor(scene: Phaser.Scene) { this.fx = new EffectSprites(scene); this.hud = new PlayerHud(scene); }
  sync(combat: CharacterCombat): void {
    const fx = this.fx;
    fx.begin();
    for (const lure of combat.lures) {
      const pulse = (lure.remaining * motion.lurePulseHz) % 1;
      fx.ring(lure.x, lure.y, lure.radius * (1 - pulse), motion.lureRingAlpha * pulse, ground.metal, true);
      fx.draw('mine', lure.x, lure.y, motion.lureSize, motion.lureSize, 0, 1, art.groundDepth);
      fx.draw('shield', lure.x, lure.y, motion.lureSize, motion.lureSize, -lure.remaining, motion.shieldAlpha, art.groundDepth);
    }
    for (const zone of combat.zones) {
      const envelope = effectEnvelope(zone.age, zone.config.lifetime, motion.zoneEnterSeconds, motion.zoneExitSeconds);
      const diameter = Math.min(zone.config.radius * 2 * art.paddingScale, ground.stampSize);
      const alpha = motion.zoneAlpha * envelope.alpha;
      const color = combat.character === 'carrier' ? ground.poison : combat.character === 'signal' ? ground.signal : ground.metal;
      fx.ring(zone.x,zone.y,zone.config.radius,alpha,color,true);
      fx.draw(combat.character === 'carrier' ? 'poison' : 'pulse', zone.x, zone.y, diameter, diameter, zone.age * motion.zoneRotation, alpha * ground.stampAlpha, art.groundDepth);
      if (combat.character === 'signal') fx.line('lightning',
        {x:zone.x-zone.config.radius,y:zone.y},{x:zone.x+zone.config.radius,y:zone.y},art.boltWidth,alpha);
    }
    for (const mine of combat.mines) {
      const armed = mine.age >= characterWeapons.carrier.armSeconds;
      const size = art.mineSize * (mine.payload.charged ? art.paddingScale : 1);
      const ready = smoothEffect(mine.age / characterWeapons.carrier.armSeconds);
      fx.draw('mine', mine.x, mine.y, size, size, 0, art.warningAlpha + (1 - art.warningAlpha) * ready, art.groundDepth);
      if (armed) fx.draw('shield', mine.x, mine.y, size, size, mine.age, art.warningAlpha + Math.sin(mine.age * art.pulseHz * Math.PI * 2) * art.pulseAlpha, art.groundDepth);
    }
    for (const shot of combat.shots) fx.draw(combat.character === 'mechanic' ? (shot.config.pierce > 1 ? 'saw' : 'rivet') : combat.character === 'signal' ? 'bolt' : 'capsule',
      shot.x, shot.y, shot.config.radius * 2 * art.projectileScale, shot.config.radius * 2 * art.projectileScale, Math.atan2(shot.vy, shot.vx));
    for (const swing of combat.swings) {
      const x = combat.player.x + Math.cos(swing.angle) * swing.radius, y = combat.player.y + Math.sin(swing.angle) * swing.radius;
      const size = (swing.length ?? characterWeapons.mechanic.length) * art.paddingScale;
      if (swing.empowered) {
        const envelope = effectEnvelope(swing.age, characterWeapons.mechanic.duration);
        const diameter = swing.range * 2 * art.paddingScale;
        fx.draw('cut', combat.player.x, combat.player.y, diameter, diameter, swing.angle, envelope.alpha * motion.strongTrailAlpha);
      }
      fx.draw('saw', x, y, size, size, swing.age * motion.sawSpinSpeed);
    }
    for (const effect of combat.effects) {
      const age = characterWeapons.effectDuration - effect.remaining;
      const envelope = effectEnvelope(age, characterWeapons.effectDuration);
      if (effect.to) fx.line('lightning', effect, effect.to, art.boltWidth, envelope.alpha);
      else {
        const diameter = effect.radius * 2;
        const size = Math.min(diameter, motion.coreDiameter) * art.paddingScale * envelope.scale;
        if (effect.angle !== undefined) {
          const reach = effect.radius * envelope.scale / 2;
          const angles = effect.cross ? [effect.angle - motion.crossSlashAngle, effect.angle + motion.crossSlashAngle] : [effect.angle];
          const slashSize = effect.cross ? effect.radius * art.paddingScale * envelope.scale : size;
          for (const angle of angles) fx.draw('cut', effect.x + Math.cos(effect.angle) * reach, effect.y + Math.sin(effect.angle) * reach,
            slashSize, slashSize, angle, envelope.alpha * motion.slashAlpha);
        } else {
          const ringSize = Math.min(diameter * art.paddingScale, ground.stampSize) * envelope.spread;
          fx.ring(effect.x,effect.y,effect.radius*envelope.spread,envelope.alpha*motion.ringAlpha);
          fx.draw('pulse', effect.x, effect.y, ringSize, ringSize, 0, envelope.alpha * motion.ringAlpha * ground.stampAlpha, art.groundDepth);
          fx.draw(combat.character === 'carrier' ? 'explosion' : 'hit', effect.x, effect.y,
            size, size, 0, envelope.alpha * motion.coreAlpha);
        }
      }
    }
    if (combat.shieldAmount > 0) {
      const size = uiConfig.characterHud.shieldRadius * 2 * art.paddingScale;
      fx.draw('shield', combat.player.x, combat.player.y, size, size, 0, motion.shieldAlpha);
    }
    fx.end();
    this.hud.sync(combat);
  }
}
