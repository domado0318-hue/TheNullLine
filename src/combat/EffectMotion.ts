import { effectMotion as motion } from '../config/effects';
import { assertPositive } from '../config/validate';

export function smoothEffect(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Simulation time only: pausing or rendering a frame twice cannot advance VFX. */
export function effectEnvelope(age: number, lifetime: number, enter = motion.enterSeconds, exit = motion.exitSeconds): { alpha: number; scale: number; spread: number } {
  assertPositive('effects.enterSeconds', enter);
  assertPositive('effects.exitSeconds', exit);
  assertPositive('effects.growthPortion', motion.growthPortion);
  if (lifetime <= 0) return { alpha: 0, scale: motion.startScale, spread: motion.ringStartScale };
  const alpha = smoothEffect(age / Math.min(enter, lifetime / 5))
    * smoothEffect((lifetime - age) / Math.min(exit, lifetime * 0.45));
  const growth = smoothEffect(age / (lifetime * motion.growthPortion));
  return { alpha, scale: motion.startScale + (1 - motion.startScale) * growth,
    spread: motion.ringStartScale + (1 - motion.ringStartScale) * growth };
}
