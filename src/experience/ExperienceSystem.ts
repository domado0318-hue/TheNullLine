import { experienceConfig } from '../config/experience';
import type { EnemyExperienceCategory, ExperienceConfig } from '../config/experience';
import type { Point } from '../world/geometry';
import type { SoundEmitter } from '../config/audio';

export interface ExperienceDrop extends Point {
  id: number;
  value: number;
  attracted: boolean;
  speed: number;
}

interface DefeatedSource extends Point {
  hp: number;
  experienceCategory: EnemyExperienceCategory;
}

function validateConfig(config: ExperienceConfig): void {
  const positive = (name: string, value: number) => {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`experience.${name}: 0보다 큰 유한수가 필요합니다.`);
  };
  if (!Number.isSafeInteger(config.maxLevel) || config.maxLevel < 1) throw new Error('experience.maxLevel: 1 이상의 정수가 필요합니다.');
  if (config.requiredExperience.length !== config.maxLevel) throw new Error('experience.requiredExperience: maxLevel과 표 길이가 같아야 합니다.');
  config.requiredExperience.forEach((value, index) => {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`experience.requiredExperience[${index}]: 양의 안전한 정수가 필요합니다.`);
  });
  if (!Number.isFinite(config.beyondMaxLevelMultiplier) || config.beyondMaxLevelMultiplier <= 1) {
    throw new Error('experience.beyondMaxLevelMultiplier: 1보다 큰 유한수가 필요합니다.');
  }
  for (const [category, value] of Object.entries(config.rewards)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`experience.rewards.${category}: 0 이상의 안전한 정수가 필요합니다.`);
  }
  for (const key of ['attractionRadius', 'collectionRadius', 'initialSpeed', 'maximumSpeed'] as const) positive(`pickup.${key}`, config.pickup[key]);
  if (!Number.isFinite(config.pickup.acceleration) || config.pickup.acceleration < 0) throw new Error('experience.pickup.acceleration: 0 이상의 유한수가 필요합니다.');
  if (config.pickup.collectionRadius > config.pickup.attractionRadius) throw new Error('experience.pickup.collectionRadius: attractionRadius 이하여야 합니다.');
  if (config.pickup.initialSpeed > config.pickup.maximumSpeed) throw new Error('experience.pickup.initialSpeed: maximumSpeed 이하여야 합니다.');
  positive('icon.innerRadius', config.icon.innerRadius);
  positive('icon.outerRadius', config.icon.outerRadius);
  if (config.icon.innerRadius >= config.icon.outerRadius) throw new Error('experience.icon.innerRadius: outerRadius보다 작아야 합니다.');
  if (!Number.isSafeInteger(config.icon.points) || config.icon.points < 3) throw new Error('experience.icon.points: 3 이상의 정수가 필요합니다.');
}

export class ExperienceSystem {
  onSound?: SoundEmitter;
  readonly drops: ExperienceDrop[] = [];
  private nextDropId = 1;
  private currentLevel = 1;
  private experience = 0;
  private readonly config: ExperienceConfig;

  constructor(config: ExperienceConfig = experienceConfig) {
    validateConfig(config);
    this.config = config;
  }

  get level(): number { return this.currentLevel; }
  get currentExperience(): number { return this.experience; }
  get requiredExperience(): number { return this.requiredForLevel(this.level); }

  requiredForLevel(level: number): number {
    if (!Number.isSafeInteger(level) || level < 1) throw new Error('experience.level: 1 이상의 안전한 정수가 필요합니다.');
    if (level <= this.config.maxLevel) return this.config.requiredExperience[level - 1];
    const last = this.config.requiredExperience[this.config.maxLevel - 1];
    // Very large levels saturate safely instead of producing Infinity in the HUD.
    return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(last * this.config.beyondMaxLevelMultiplier ** (level - this.config.maxLevel)));
  }

  dropFromDefeated(enemies: readonly DefeatedSource[]): void {
    // Call only with the batch removed by EnemySystem, never the live actor list.
    for (const enemy of enemies) {
      if (enemy.hp > 0) continue;
      const value = this.config.rewards[enemy.experienceCategory];
      if (value <= 0) continue;
      this.drops.push({ id: this.nextDropId++, x: enemy.x, y: enemy.y, value, attracted: false, speed: this.config.pickup.initialSpeed });
    }
  }

  addExperience(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(this.experience + amount)) {
      throw new Error('experience.amount: 합계가 안전한 정수 범위에 있는 0 이상의 정수가 필요합니다.');
    }
    this.experience += amount;
    while (this.experience >= this.requiredExperience) {
      this.experience -= this.requiredExperience;
      this.currentLevel++;
    }
  }

  attractWithin(player: Point, radius: number): void {
    for (const drop of this.drops) if (Math.hypot(drop.x - player.x, drop.y - player.y) <= radius) drop.attracted = true;
  }

  update(deltaSeconds: number, player: Point, attractionRadius = this.config.pickup.attractionRadius): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error('experience.deltaSeconds: 0 이상의 유한수가 필요합니다.');
    const pickup = this.config.pickup;
    for (let index = this.drops.length - 1; index >= 0; index--) {
      const drop = this.drops[index];
      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const length = Math.hypot(dx, dy);
      if (length <= attractionRadius) drop.attracted = true;
      if (!drop.attracted) continue;
      const nextSpeed = Math.min(pickup.maximumSpeed, drop.speed + pickup.acceleration * deltaSeconds);
      // Integrate acceleration, including the part of the frame at maximum speed.
      const acceleratingTime = pickup.acceleration > 0 ? Math.min(deltaSeconds, (pickup.maximumSpeed - drop.speed) / pickup.acceleration) : 0;
      const travel = (drop.speed + nextSpeed) / 2 * acceleratingTime + nextSpeed * (deltaSeconds - acceleratingTime);
      drop.speed = nextSpeed;
      if (length <= pickup.collectionRadius || travel >= length - pickup.collectionRadius) {
        this.addExperience(drop.value);
        this.onSound?.('xp_pickup');
        this.drops.splice(index, 1);
      } else if (length > 0) {
        // Pickups are nonphysical and can pass scenery while being attracted.
        drop.x += dx / length * travel;
        drop.y += dy / length * travel;
      }
    }
  }
}
