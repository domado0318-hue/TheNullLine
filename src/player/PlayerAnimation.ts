import { playerArtConfig, playerIdlePoses } from '../config/playerArt';
import type { CharacterId } from '../config/characters';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';

export type PlayerFacing = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

/** Simulation-driven frames freeze naturally during skill selection and defeat. */
export class PlayerAnimation {
  facing: PlayerFacing = 'front';
  moving = false;
  private elapsed = 0;

  update(seconds: number, inputX: number, inputY: number, movedX: number, movedY: number): void {
    assertPositive('playerArt.frameRate', playerArtConfig.frameRate);
    assertInteger('playerArt.framesPerDirection', playerArtConfig.framesPerDirection, 1);
    assertPositive('playerArt.idleCycleSeconds', playerArtConfig.idleCycleSeconds);
    assertNonNegative('playerArt.idleHeightPixels', playerArtConfig.idleHeightPixels);
    assertNonNegative('playerArt.idleWidthPixels', playerArtConfig.idleWidthPixels);
    const moving = Math.hypot(movedX, movedY) > 1e-6;
    const x = moving ? movedX : inputX, y = moving ? movedY : inputY;
    // Ignore coordinate subtraction roundoff, and follow actual wall sliding.
    const horizontal = Math.abs(x) > 1e-6, vertical = Math.abs(y) > 1e-6;
    const facing = horizontal && vertical
      ? y < 0 ? (x < 0 ? 'back-left' : 'back-right') : (x < 0 ? 'front-left' : 'front-right')
      : horizontal ? (x < 0 ? 'left' : 'right') : vertical ? (y < 0 ? 'back' : 'front') : this.facing;
    if (facing !== this.facing || moving !== this.moving) this.elapsed = 0;
    this.elapsed += seconds;
    this.facing = facing;
    this.moving = moving;
  }

  get flipX(): boolean { return this.facing === 'left' || this.facing === 'front-left' || this.facing === 'back-left'; }
  get frame(): string {
    return this.frameFor('mechanic');
  }

  get idleBreath(): number {
    return this.moving ? 0 : (1 - Math.cos(this.elapsed / playerArtConfig.idleCycleSeconds * Math.PI * 2)) / 2;
  }

  frameFor(character: CharacterId): string {
    const count = playerArtConfig.framesPerDirection;
    const row = this.facing === 'front' ? 0 : this.facing === 'back' ? 4
      : this.facing === 'front-left' || this.facing === 'front-right' ? 1
      : this.facing === 'back-left' || this.facing === 'back-right' ? 3 : 2;
    return String(row * count + (this.moving ? Math.floor(this.elapsed * playerArtConfig.frameRate) % count : playerIdlePoses[character][row]));
  }
}
