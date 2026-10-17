import { gameConfig } from '../config/game';
import { assertNonNegative, assertPositive } from '../config/validate';

export function advanceSimulation(deltaMilliseconds: number, update: (deltaSeconds: number) => boolean | void): void {
  assertPositive('game.simulationStepSeconds', gameConfig.simulationStepSeconds);
  assertNonNegative('simulation.delta', deltaMilliseconds);
  let remaining = deltaMilliseconds / 1000;
  while (remaining > 0) {
    const step = Math.min(remaining, gameConfig.simulationStepSeconds);
    if (remaining - step === remaining) throw new Error('game.simulationStepSeconds: 시간이 진행되기에 너무 작습니다.');
    if (update(step) === false) return;
    remaining -= step;
  }
}
