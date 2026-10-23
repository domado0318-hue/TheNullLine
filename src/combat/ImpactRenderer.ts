import type Phaser from 'phaser';
import type { Combatant } from './types';
import { effectArt as art, effectMotion as motion } from '../config/effects';
import { EffectSprites } from './EffectSprites';
import { effectEnvelope } from './EffectMotion';

interface Impact { id: number; x: number; y: number; age: number; lifetime: number; size: number }
/** Observe each simulation step, including victims removed before rendering. */
export class ImpactRenderer {
  private readonly hp = new Map<number, number>();
  private readonly impacts: Impact[] = [];
  private readonly fx: EffectSprites;
  constructor(scene: Phaser.Scene) { this.fx = new EffectSprites(scene); }
  observe(delta: number, actors: readonly Combatant[]): void {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].age += delta;
      if (this.impacts[i].age >= this.impacts[i].lifetime) this.impacts.splice(i, 1);
    }
    const alive = new Set<number>();
    for (const actor of actors) {
      const previous = this.hp.get(actor.id);
      if (actor.hp <= 0) {
        // A killing blow clears earlier hit sparks too; only the body fades.
        for (let i = this.impacts.length - 1; i >= 0; i--) if (this.impacts[i].id === actor.id) this.impacts.splice(i, 1);
      } else if (previous !== undefined && actor.hp < previous) {
        this.impacts.push({ id: actor.id, x: actor.x, y: actor.y, age: 0, lifetime: art.impactSeconds,
          size: art.impactSize });
      }
      if (actor.hp > 0) { this.hp.set(actor.id, actor.hp); alive.add(actor.id); }
    }
    for (const id of this.hp.keys()) if (!alive.has(id)) this.hp.delete(id);
  }
  sync(): void {
    this.fx.begin();
    for (const hit of this.impacts) {
      const envelope = effectEnvelope(hit.age, hit.lifetime);
      const size = hit.size * envelope.scale * (1 + motion.impactGrowth * hit.age / hit.lifetime);
      this.fx.draw('hit', hit.x, hit.y, size, size, 0, envelope.alpha * motion.coreAlpha);
    }
    this.fx.end();
  }
}
