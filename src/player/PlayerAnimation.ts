import { playerArtConfig, playerIdlePoses } from '../config/playerArt';
import type { CharacterId } from '../config/characters';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';

export type PlayerFacing = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

/** Simulation-driven frames freeze naturally during skill selection and defeat. */
export class PlayerAnimation {
  facing: PlayerFacing = 'front';
  moving = false;
  private elapsed = 0;
  private attackElapsed = 0;
  private attackAngle = 0;
  private attackScale = 1;

  startAttack(angle: number, strong = false): void {
    this.attackElapsed = playerArtConfig.attackMotionSeconds;
    this.attackAngle = angle;
    this.attackScale = strong ? playerArtConfig.strongAttackScale : 1;
  }
  cancelAttack(): void { this.attackElapsed = 0; this.attackScale = 1; }

  update(seconds: number, inputX: number, inputY: number, movedX: number, movedY: number): void {
    assertPositive('playerArt.frameRate', playerArtConfig.frameRate);
    assertInteger('playerArt.framesPerDirection', playerArtConfig.framesPerDirection, 1);
    assertPositive('playerArt.idleCycleSeconds', playerArtConfig.idleCycleSeconds);
    assertNonNegative('playerArt.idleHeightPixels', playerArtConfig.idleHeightPixels);
    assertNonNegative('playerArt.idleWidthPixels', playerArtConfig.idleWidthPixels);
    assertPositive('playerArt.attackMotionSeconds', playerArtConfig.attackMotionSeconds);
    assertNonNegative('playerArt.attackReachPixels', playerArtConfig.attackReachPixels);
    assertNonNegative('playerArt.attackTiltRadians', playerArtConfig.attackTiltRadians);
    assertPositive('playerArt.strongAttackScale', playerArtConfig.strongAttackScale);
    const moving = Math.hypot(movedX, movedY) > 1e-6;
    const x = moving ? movedX : inputX, y = moving ? movedY : inputY;
    // Ignore coordinate subtraction roundoff, and follow actual wall sliding.
    const horizontal = Math.abs(x) > 1e-6, vertical = Math.abs(y) > 1e-6;
    const facing = horizontal && vertical
      ? y < 0 ? (x < 0 ? 'back-left' : 'back-right') : (x < 0 ? 'front-left' : 'front-right')
      : horizontal ? (x < 0 ? 'left' : 'right') : vertical ? (y < 0 ? 'back' : 'front') : this.facing;
    if (facing !== this.facing || moving !== this.moving) this.elapsed = 0;
    this.elapsed += seconds;
    this.attackElapsed = Math.max(0, this.attackElapsed - seconds);
    if(this.attackElapsed<Number.EPSILON)this.attackElapsed=0;
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

  get attackProgress(): number {
    if (this.attackElapsed <= 0) return 0;
    const progress = 1 - this.attackElapsed / playerArtConfig.attackMotionSeconds;
    return progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  }
  get attackOffsetX(): number { return Math.cos(this.attackAngle) * playerArtConfig.attackReachPixels * this.attackProgress; }
  get attackOffsetY(): number { return Math.sin(this.attackAngle) * playerArtConfig.attackReachPixels * this.attackProgress; }
  get attackRotation(): number { return Math.sin(this.attackProgress * Math.PI) * playerArtConfig.attackTiltRadians * Math.cos(this.attackAngle); }
  get attackScaleFactor(): number { return 1 + (this.attackScale - 1) * this.attackProgress; }

  frameFor(character: CharacterId): string {
    const count = playerArtConfig.framesPerDirection;
    const row = this.facing === 'front' ? 0 : this.facing === 'back' ? 4
      : this.facing === 'front-left' || this.facing === 'front-right' ? 1
      : this.facing === 'back-left' || this.facing === 'back-right' ? 3 : 2;
    return String(row * count + (this.moving ? Math.floor(this.elapsed * playerArtConfig.frameRate) % count : playerIdlePoses[character][row]));
  }
}
