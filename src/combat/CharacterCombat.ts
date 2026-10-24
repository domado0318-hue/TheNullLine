import { characters, characterRules } from '../config/characters';
import type { SoundEmitter, SoundId } from '../config/audio';
import type { CharacterId } from '../config/characters';
import { auxiliaryWeapons, characterWeapons as tuning } from '../config/characterWeapons';
import type { AuxiliaryConfig } from '../config/characterWeapons';
import { combatConfig } from '../config/combat';
import { effectMotion } from '../config/effects';
import { criticalSkillIds } from '../config/skills';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import { SkillProgression } from '../experience/SkillProgression';
import type { ExperienceSystem } from '../experience/ExperienceSystem';
import type { AttackVisualEvent, Combatant, LureTarget } from './types';
import { receivedDamage } from './types';
import type { Point, CollisionWorld, Viewport } from '../world/geometry';
import { distance, isInViewport, lineIsClear, moveBody } from '../world/geometry';
import { bladeHitsBody, obstacleBulletHit } from './hitDetection';
import { segmentRoundedRectangleHit } from '../world/intersections';

interface Payload {
  damage: number;
  direct: boolean;
  ranks: readonly number[];
  knockback: number;
  strong?: boolean;
  charged?: boolean;
  hits: number;
  quietHits?: boolean;
  slow?: number;
  slowDuration?: number;
}
export interface CharacterSwing { angle: number; age: number; radius: number; range: number; length?: number; empowered?: boolean; payload: Payload; hitIds: Set<number> }
export interface CharacterMine extends Point { age: number; lifetime: number; radius: number; payload: Payload; skill?: number; triggerRange?: number }
export interface CharacterShot extends Point { age: number; vx: number; vy: number; config: AuxiliaryConfig; payload: Payload; hitIds: Set<number> }
export interface CharacterZone extends Point { age: number; tick: number; skill: number; config: AuxiliaryConfig; payload: Payload }
export interface CharacterEffect extends Point { radius: number; remaining: number; to?: Point; angle?: number; cross?: boolean; delaySeconds?: number }
interface Status { value: number; remaining: number }
interface Shield extends Status { source: string }
export interface DamageHit { target: Combatant; amount: number; critical: boolean }

/** Character attacks and skill state are independent of Phaser and the selection UI. */
export class CharacterCombat {
  onAttackVisual?: (event: AttackVisualEvent) => void;
  onSound?: SoundEmitter;
  onDamage?: (hit: DamageHit) => void;
  private readonly random: () => number;
  readonly character: CharacterId;
  readonly player: Combatant;
  readonly progression: SkillProgression;
  readonly swings: CharacterSwing[] = [];
  readonly mines: CharacterMine[] = [];
  readonly shots: CharacterShot[] = [];
  readonly zones: CharacterZone[] = [];
  readonly effects: CharacterEffect[] = [];
  readonly lures: LureTarget[] = [];
  readonly shields: Shield[] = [];
  private readonly vulnerability = new Map<number, Status>();
  private readonly slow = new Map<number, Status>();
  private readonly zoneHits = new Map<string, number>();
  private readonly auxiliaryTimers = new Map<number, number>();
  private enemies: readonly Combatant[] = [];
  private world!: CollisionWorld;
  private viewport!: Viewport;
  private time = 0;
  private mainTimer = 0;
  private attacks = 0;
  private chargeTravel = 0;
  private charged = false;
  private moving = 0;
  private stopped = 0;
  private direction = -Math.PI / 2;
  private speedBuff = 0;
  private speedBuffValue = 0;
  private healCooldown = 0;
  private shieldCooldown = 0;
  private deathCooldown = 0;
  private rechargeTimer = 0;
  private kills = 0;

  constructor(character: CharacterId, player: Combatant, random: () => number = Math.random) {
    this.character = character;
    this.player = player;
    this.random = random;
    this.progression = new SkillProgression(character, random);
    assertNonNegative('combat.criticalChance', combatConfig.criticalChance);
    if (combatConfig.criticalChance > 1) throw new Error('combat.criticalChance: 1 이하여야 합니다.');
    assertPositive('combat.criticalMultiplier', combatConfig.criticalMultiplier);
    if (combatConfig.criticalMultiplier < 1) throw new Error('combat.criticalMultiplier: 1 이상이어야 합니다.');
    assertPositive('character.interval', tuning[character].interval);
    assertPositive('character.sword.duration', tuning.mechanic.duration);
    assertPositive('character.sword.angleStep', tuning.mechanic.angleStep);
    assertInteger('character.carrier.maximum', tuning.carrier.maximum, 1);
    assertInteger('character.carrier.scrapMaximum', tuning.carrier.scrapMaximum, 1);
    assertInteger('character.signal.branchCount', tuning.signal.branchCount, 0);
    assertInteger('character.signal.overloadMinimum', tuning.signal.overloadMinimum, 1);
    assertPositive('character.carrier.lifetime', tuning.carrier.lifetime);
    assertPositive('character.zoneTick', tuning.zoneTick);
    for (const [index, auxiliary] of auxiliaryWeapons[character].entries()) {
      if (auxiliary.kind === 'passive') continue;
      assertPositive(`character.auxiliary[${index}].interval`, auxiliary.interval);
      if (['projectile', 'zone', 'trap'].includes(auxiliary.kind)) assertPositive(`character.auxiliary[${index}].lifetime`, auxiliary.lifetime);
      if (auxiliary.kind === 'projectile') {
        assertPositive(`character.auxiliary[${index}].speed`, auxiliary.speed);
        assertInteger(`character.auxiliary[${index}].pierce`, auxiliary.pierce, 1);
      }
    }
    player.maxHp = player.hp = characters[character].maxHp;
    player.attackDamage = characterRules.attackDamage;
    if (character === 'carrier') this.mainTimer = tuning.carrier.interval;
  }

  private v(id: number, ranks = this.progression.levels, secondary = false): number {
    return this.progression.value(id, secondary, ranks);
  }
  get color(): number { return characters[this.character].color; }
  get criticalChance(): number { return this.chance(this.progression.levels); }
  get criticalMultiplier(): number { return this.multiplier(this.progression.levels); }
  private chance(ranks: readonly number[]): number {
    return Math.min(1, combatConfig.criticalChance + this.v(criticalSkillIds.chance, ranks) / 100);
  }
  private multiplier(ranks: readonly number[]): number {
    return combatConfig.criticalMultiplier + this.v(criticalSkillIds.multiplier, ranks);
  }
  get movementSpeed(): number {
    return characters[this.character].speed * (1 + (this.v(17) + (this.speedBuff > 0 ? this.speedBuffValue : 0)) / 100);
  }
  get pickupRadius(): number { return characterRules.pickupRadius + this.v(18); }
  get shieldAmount(): number { return this.shields.reduce((sum, shield) => sum + shield.value, 0); }
  get isCharged(): boolean { return this.charged; }
  get chargeRatio(): number { return this.charged ? 1 : this.chargeTravel / this.chargeDistance(); }
  private interval(): number {
    const base = tuning[this.character].interval;
    assertPositive('character.interval', base);
    return base * (1 - Math.min(characterRules.maximumReduction, this.v(2) / 100));
  }
  private chargeDistance(): number {
    const result = this.character === 'carrier' ? this.v(4) || tuning.carrier.chargeDistance : tuning[this.character].chargeDistance;
    assertPositive('character.chargeDistance', result);
    return result;
  }
  private chargeEnabled(): boolean {
    return this.character === 'carrier' || this.progression.level(this.character === 'mechanic' ? 11 : 15) > 0;
  }

  choose(token: number, index: number, experience: ExperienceSystem): boolean {
    const previous = this.progression.levels;
    const previousInterval = this.interval();
    const choice = this.progression.choose(token, index);
    if (!choice) return false;
    if (choice.kind === 'supply') {
      if (choice.id === 'heal') this.heal(this.player.maxHp * characterRules.supplyHeal);
      if (choice.id === 'shield') this.shield('supply', this.player.maxHp * characterRules.supplyShield, characterRules.supplyShieldSeconds);
      if (choice.id === 'pickup') { experience.attractWithin(this.player, characterRules.supplyPickupRadius); this.onSound?.('magnet_collect'); }
      return true;
    }
    this.mainTimer *= this.interval() / previousInterval;
    const hpIncrease = this.v(16) - this.v(16, previous);
    this.player.maxHp += hpIncrease;
    this.heal(hpIncrease);
    if (choice.id >= 7 && choice.id <= 10 && !previous[choice.id - 1] && auxiliaryWeapons[this.character][choice.id - 7].kind !== 'passive') {
      this.auxiliaryTimers.set(choice.id, auxiliaryWeapons[this.character][choice.id - 7].interval);
    }
    if (this.character === 'signal' && choice.id === 20 && !previous[19]) {
      this.rechargeTimer = tuning.signal.healDelay + tuning.signal.healInterval;
    }
    if (!this.charged && this.chargeEnabled() && this.chargeTravel >= this.chargeDistance()) { this.charged = true; this.chargeTravel = 0; this.onSound?.('charge_ready'); }
    return true;
  }

  /** Run after voluntary Player movement and before Enemy AI, once per simulation step. */
  prepare(delta: number, beforeMovement: Point, enemies: readonly Combatant[]): void {
    assertNonNegative('character.delta', delta);
    this.enemies = enemies;
    this.time += delta;
    const travelled = distance(beforeMovement, this.player);
    if (travelled > Number.EPSILON) {
      this.direction = Math.atan2(this.player.y - beforeMovement.y, this.player.x - beforeMovement.x);
      this.moving += delta;
      this.stopped = 0;
      if (this.chargeEnabled() && !this.charged) {
        this.chargeTravel += travelled;
        if (this.chargeTravel >= this.chargeDistance()) { this.charged = true; this.chargeTravel = 0; this.onSound?.('charge_ready'); }
      }
    } else {
      this.stopped += delta;
      if (this.stopped >= tuning.carrier.stoppedSeconds) this.moving = 0;
    }
    this.mainTimer = Math.max(0, this.mainTimer - delta);
    this.speedBuff = Math.max(0, this.speedBuff - delta);
    this.healCooldown = Math.max(0, this.healCooldown - delta);
    this.shieldCooldown = Math.max(0, this.shieldCooldown - delta);
    this.deathCooldown = Math.max(0, this.deathCooldown - delta);
    this.rechargeTimer -= delta;
    for (const [id, timer] of this.auxiliaryTimers) this.auxiliaryTimers.set(id, Math.max(0, timer - delta));
    for (let i = this.lures.length - 1; i >= 0; i--) {
      this.lures[i].remaining -= delta;
      if (this.lures[i].remaining <= 0) this.lures.splice(i, 1);
    }
    for (let i = this.shields.length - 1; i >= 0; i--) {
      this.shields[i].remaining -= delta;
      if (this.shields[i].remaining <= 0) this.shields.splice(i, 1);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].remaining -= delta;
      if (this.effects[i].remaining <= 0) this.effects.splice(i, 1);
    }
    const alive = new Set(enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.id));
    for (const statuses of [this.vulnerability, this.slow]) {
      for (const [id, state] of statuses) {
        state.remaining -= delta;
        if (state.remaining <= 0 || !alive.has(id)) statuses.delete(id);
      }
    }
    for (const enemy of enemies) enemy.movementMultiplier = 1 - Math.min(characterRules.maximumSlow, (this.slow.get(enemy.id)?.value ?? 0) / 100);
    for (const [key, expiry] of this.zoneHits) if (expiry <= this.time) this.zoneHits.delete(key);
  }

  /** Called by the shared enemy combat pipeline before HP is deducted. */
  defend(damage: number): number {
    const shieldBefore = this.shieldAmount;
    let reduction = this.v(19);
    if (this.character === 'mechanic' && this.enemies.filter(enemy => enemy.hp > 0 && distance(this.player, enemy) <= tuning.mechanic.crowdRadius).length >= tuning.mechanic.crowdCount) reduction += this.v(12);
    if (this.character === 'carrier' && this.moving >= tuning.carrier.movingSeconds) reduction += this.v(13);
    let remaining = damage * (1 - Math.min(characterRules.maximumReduction, reduction / 100));
    this.shields.sort((a, b) => a.remaining - b.remaining);
    for (const shield of this.shields) {
      const used = Math.min(shield.value, remaining);
      shield.value -= used;
      remaining -= used;
    }
    for (let i = this.shields.length - 1; i >= 0; i--) if (this.shields[i].value <= 0) this.shields.splice(i, 1);
    if (remaining > 0) this.rechargeTimer = tuning.signal.healDelay + tuning.signal.healInterval;
    if (remaining > 0) this.onSound?.('player_hit');
    // Both enemy attack pipelines call this only after hit / invulnerability checks.
    if (remaining > 0) this.onDamage?.({ target: this.player, amount: remaining, critical: false });
    if (shieldBefore > this.shieldAmount) this.onSound?.(this.shieldAmount > 0 ? 'shield_hit' : 'shield_break');
    return remaining;
  }

  update(delta: number, world: CollisionWorld, viewport: Viewport): void {
    assertNonNegative('character.delta', delta);
    if (this.player.hp <= 0) return;
    this.world = world;
    this.viewport = viewport;
    this.updateSwings(delta);
    this.updateMines(delta);
    this.updateShots(delta);
    this.updateZones(delta);
    if (this.mainTimer <= Number.EPSILON && this.fireMain()) this.mainTimer = this.interval();
    for (const [id, remaining] of this.auxiliaryTimers) {
      if (remaining <= Number.EPSILON && this.fireAuxiliary(id)) this.auxiliaryTimers.set(id, auxiliaryWeapons[this.character][id - 7].interval);
    }
    if (this.character === 'signal' && this.v(20) && this.rechargeTimer <= Number.EPSILON) {
      this.heal(this.v(20));
      this.rechargeTimer = tuning.signal.healInterval;
    }
  }

  private valid(from: Point, range: number, screen = true): Combatant[] {
    return this.enemies.filter(enemy => enemy.hp > 0 && distance(from, enemy) <= range
      && (!screen || isInViewport(enemy, enemy.size, this.viewport)) && lineIsClear(from, enemy, 0, this.world, []))
      .sort((a, b) => distance(from, a) - distance(from, b) || a.id - b.id);
  }
  private payload(damage: number, direct: boolean, knockback = 0): Payload {
    return { damage, direct, knockback, ranks: this.progression.levels, hits: 0 };
  }
  private useCharge(): boolean {
    const result = this.charged;
    if (result) { this.charged = false; this.chargeTravel = 0; }
    return result;
  }
  private fireMain(): boolean {
    if (this.character === 'carrier') {
      const config = tuning.carrier;
      const charged = this.useCharge();
      const damage = this.player.attackDamage * config.damage * (1 + (this.v(1) + (charged ? this.v(11) || config.chargeBonus : 0)) / 100);
      const payload = { ...this.payload(damage, true, this.v(6) || config.knockback), charged };
      const maximum = this.v(5) || config.maximum;
      assertInteger('character.carrier.maximum', maximum, 1);
      const mainMines = this.mines.filter(mine => !mine.skill);
      if (mainMines.length >= maximum) this.mines.splice(this.mines.indexOf(mainMines[0]), 1);
      this.mines.push({ x: this.player.x, y: this.player.y, age: 0, lifetime: this.v(5, undefined, true) || config.lifetime, radius: this.v(3) || config.blastRadius, payload });
      this.onAttackVisual?.({ ownerId: this.player.id, kind: 'mine', angle: this.direction, strong: charged });
      this.onSound?.('carrier_place', this.player);
      return true;
    }
    if (this.character === 'mechanic') {
      const config = tuning.mechanic;
      const strong = this.attacks + 1 >= (this.v(4) || config.strongEvery);
      const extension = strong ? this.v(9) : 0;
      const range = config.range + this.v(3) + extension;
      const target = this.valid(this.player, range)[0];
      if (!target) return false;
      this.attacks++;
      if (strong) this.attacks = 0;
      const charged = this.useCharge();
      const bonus = this.v(1) + (strong ? (this.v(4, undefined, true) || config.strongBonus) + this.v(9, undefined, true) : 0) + (charged ? this.v(11) : 0);
      const payload = { ...this.payload(this.player.attackDamage * (1 + bonus / 100), true, strong ? this.v(5) || config.strongKnockback : config.knockback), strong, charged };
      this.swings.push({ angle: Math.atan2(target.y - this.player.y, target.x - this.player.x), age: 0, radius: config.radius + this.v(3), range,
        length: config.length + extension * 2, empowered: extension > 0, payload, hitIds: new Set() });
      this.onAttackVisual?.({ ownerId: this.player.id, kind: 'blade', angle: Math.atan2(target.y - this.player.y, target.x - this.player.x), strong: strong || charged });
      this.onSound?.('mechanic_cutter', this.player);
      return true;
    }
    const config = tuning.signal;
    const first = this.valid(this.player, this.v(4) || config.range)[0];
    if (!first) return false;
    const path = [first];
    const relays = new Map<Combatant, Point>();
    const count = this.v(3) || config.chainCount;
    const range = this.v(4, undefined, true) || config.chainRange;
    while (path.length < count) {
      const last = path[path.length - 1];
      let next = this.valid(last, range).find(enemy => !path.includes(enemy));
      if (!next) {
        for (const zone of this.zones.filter(zone => zone.skill === 9 && zone.age < zone.config.lifetime)) {
          if (distance(last, zone) > range || !lineIsClear(last, zone, 0, this.world, [])) continue;
          next = this.valid(zone, range).find(enemy => !path.includes(enemy));
          if (next) { relays.set(next, { x: zone.x, y: zone.y }); break; }
        }
      }
      if (!next) break;
      path.push(next);
    }
    const crowd = this.valid(first, config.crowdRadius).length >= config.crowdCount;
    const bonus = this.v(1) + (crowd ? this.v(11) : 0) + (path.length === 1 ? this.v(12) : 0);
    const payload = { ...this.payload(this.player.attackDamage * (1 + bonus / 100), true), charged: this.useCharge() };
    this.onAttackVisual?.({ ownerId: this.player.id, kind: 'chain', angle: Math.atan2(first.y - this.player.y, first.x - this.player.x), strong: payload.charged ?? false });
    // Fix branch targets before damage, deaths or knockback can alter this discharge.
    const branches = this.v(8) ? this.valid(first, range).filter(enemy => !path.includes(enemy)).slice(0, config.branchCount) : [];
    this.onSound?.('signal_discharge', this.player);
    let from: Point = this.player;
    const retention = (this.v(5) || config.retention) / 100;
    for (let i = 0; i < path.length; i++) {
      if (i === 1) this.onSound?.('signal_chain', path[i]);
      const relay = relays.get(path[i]);
      if (relay) { this.arc(from, relay, i * effectMotion.chainStepSeconds); from = relay; }
      this.arc(from, path[i], i * effectMotion.chainStepSeconds);
      this.hit(path[i], payload, from, payload.damage * retention ** i);
      from = path[i];
    }
    for (const target of branches) {
      this.arc(first, target, path.length * effectMotion.chainStepSeconds);
      this.hit(target, payload, first, payload.damage * this.v(8) / 100);
    }
    if (this.v(10) && path.length >= config.overloadMinimum) {
      const last = path[path.length - 1];
      this.area(last, config.overloadRadius, this.payload(payload.damage * this.v(10) / 100, false));
      for (const target of this.valid(last, config.overloadRadius)) if (target !== last) this.arc(last, target);
      this.onSound?.('electric_pulse', last);
    }
    return true;
  }

  private arc(from: Point, to: Point, delaySeconds = 0): void {
    this.effects.push({ x: from.x, y: from.y, to: { x: to.x, y: to.y }, radius: 0, remaining: tuning.effectDuration + delaySeconds, delaySeconds });
  }

  private updateSwings(delta: number): void {
    const config = tuning.mechanic;
    assertPositive('character.sword.angleStep', config.angleStep);
    assertPositive('character.sword.duration', config.duration);
    for (let i = this.swings.length - 1; i >= 0; i--) {
      const swing = this.swings[i];
      const step = Math.min(delta, config.duration - swing.age);
      const rotation = Math.PI * 2 * step / config.duration;
      const samples = Math.max(1, Math.ceil(rotation / config.angleStep));
      for (let sample = 0; sample <= samples; sample++) {
        const angle = swing.angle + rotation * sample / samples;
        const center = { x: this.player.x + Math.cos(angle) * swing.radius, y: this.player.y + Math.sin(angle) * swing.radius };
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || swing.hitIds.has(enemy.id) || distance(this.player, enemy) > swing.range) continue;
          if (bladeHitsBody(center, angle, swing.length ?? config.length, config.width, enemy) && lineIsClear(this.player, enemy, 0, this.world, [])) {
            swing.hitIds.add(enemy.id);
            this.hit(enemy, swing.payload, this.player);
          }
        }
      }
      swing.angle += rotation;
      swing.age += step;
      if (swing.age >= config.duration - Number.EPSILON) this.swings.splice(i, 1);
    }
  }

  private updateMines(delta: number): void {
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      const previousAge = mine.age;
      mine.age += delta;
      if (mine.age >= mine.lifetime - Number.EPSILON) { this.mines.splice(i, 1); continue; }
      if (previousAge < tuning.carrier.armSeconds && mine.age >= tuning.carrier.armSeconds) this.onSound?.('carrier_arm', mine);
    }
    const armed = (mine: CharacterMine) => mine.age + Number.EPSILON >= tuning.carrier.armSeconds;
    const queue = this.mines.filter(mine => armed(mine) && this.valid(mine, mine.triggerRange ?? tuning.carrier.triggerRange, false).length);
    while (queue.length) {
      const mine = queue.shift()!;
      const index = this.mines.indexOf(mine);
      if (index < 0) continue;
      this.mines.splice(index, 1);
      const linkRange = this.v(10, mine.payload.ranks);
      if (linkRange) for (const next of this.mines) {
        if (armed(next) && !queue.includes(next) && distance(mine, next) <= linkRange && lineIsClear(mine, next, 0, this.world, [])) queue.push(next);
      }
      this.onSound?.(mine.payload.charged ? 'carrier_blast_charged' : 'carrier_blast', mine);
      this.area(mine, mine.radius, mine.payload);
    }
  }

  private fireAuxiliary(id: number): boolean {
    const config = auxiliaryWeapons[this.character][id - 7];
    if (config.kind === 'passive') return false;
    const payload = this.payload(this.player.attackDamage * this.v(id) / 100, false, config.knockback);
    payload.quietHits = config.kind === 'zone';
    if (this.character === 'signal' && id === 7) {
      payload.slow = tuning.signal.pulseSlow; payload.slowDuration = tuning.signal.pulseSlowDuration;
    }
    if (this.character === 'carrier' && id === 8) {
      payload.slow = tuning.carrier.trailSlow; payload.slowDuration = tuning.carrier.trailSlowDuration;
    }
    const target = config.targeted ? this.valid(this.player, config.range)[0] : undefined;
    if (config.targeted && !target) return false;
    if (config.kind === 'lure') {
      this.lures.splice(0, this.lures.length, { x: this.player.x, y: this.player.y, radius: this.v(id), remaining: this.v(id, undefined, true) });
    } else if (config.kind === 'trap') {
      const traps = this.mines.filter(mine => mine.skill === id);
      if (traps.length >= tuning.carrier.scrapMaximum) this.mines.splice(this.mines.indexOf(traps[0]), 1);
      payload.direct = true;
      payload.damage *= 1 + this.v(1) / 100;
      payload.knockback = this.v(6) || tuning.carrier.knockback;
      this.mines.push({ x: this.player.x, y: this.player.y, age: 0, lifetime: config.lifetime,
        radius: config.radius + (this.v(3) ? this.v(3) - tuning.carrier.blastRadius : 0),
        triggerRange: config.range, skill: id, payload });
      this.onAttackVisual?.({ ownerId: this.player.id, kind: 'mine', angle: this.direction, strong: false });
    } else if (config.kind === 'slash' && target) {
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      this.onAttackVisual?.({ ownerId: this.player.id, kind: 'slash', angle, strong: payload.charged ?? false });
      for (const enemy of this.valid(this.player, config.range).filter(enemy => this.inCone(enemy, angle))) {
        this.hit(enemy, payload, this.player);
      }
      this.effects.push({ x: this.player.x, y: this.player.y, radius: config.radius,
        remaining: tuning.effectDuration, angle, cross: true });
    } else if (config.kind === 'projectile' && target) {
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      this.onAttackVisual?.({ ownerId: this.player.id, kind: 'projectile', angle, strong: payload.charged ?? false });
      const gap = this.player.size / 2 + config.radius + tuning.projectileGap;
      this.shots.push({ x: this.player.x + Math.cos(angle) * gap, y: this.player.y + Math.sin(angle) * gap,
        vx: Math.cos(angle) * config.speed, vy: Math.sin(angle) * config.speed, age: 0, config: { ...config }, payload, hitIds: new Set() });
    } else if (config.kind === 'zone') {
      const origin = target ?? this.player;
      this.zones.push({ x: origin.x, y: origin.y, age: 0, tick: 0, config: { ...config }, payload, skill: id });
    } else {
      const rear = this.direction + Math.PI;
      const targets = this.valid(this.player, config.range).filter(enemy => config.kind !== 'cone' || this.inCone(enemy, rear));
      if (!targets.length) return false;
      for (const enemy of targets) this.hit(enemy, payload, this.player);
      this.effects.push({ x: this.player.x, y: this.player.y, radius: config.radius, remaining: tuning.effectDuration, angle: config.kind === 'cone' ? rear : undefined });
    }
    const sounds: Record<CharacterId, SoundId[]> = {
      mechanic: ['mechanic_cutter', 'pressure_pulse', 'mechanic_cutter', 'heat_zone_start'],
      signal: ['electric_pulse', 'signal_chain', 'beacon_start', 'electric_pulse'],
      carrier: ['carrier_place', 'leak_start', 'carrier_arm', 'carrier_blast'],
    };
    this.onSound?.(sounds[this.character][id - 7], target ?? this.player);
    return true;
  }
  private inCone(target: Point, angle: number): boolean {
    const difference = Math.atan2(target.y - this.player.y, target.x - this.player.x) - angle;
    return Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))) <= Math.PI / 4;
  }

  private updateShots(delta: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      const step = Math.min(delta, shot.config.lifetime - shot.age);
      const from = { x: shot.x, y: shot.y };
      const to = { x: shot.x + shot.vx * step, y: shot.y + shot.vy * step };
      let wall = Infinity;
      for (const obstacle of this.world.obstacles) wall = Math.min(wall, obstacleBulletHit(from, to, shot.config.radius, obstacle) ?? Infinity);
      for (const axis of this.world.unbounded ? [] : ['x', 'y'] as const) {
        const low = shot.config.radius;
        const high = (axis === 'x' ? this.world.width : this.world.height) - low;
        if (from[axis] < low || from[axis] > high) wall = 0;
        else if (to[axis] < low || to[axis] > high) wall = Math.min(wall, ((to[axis] < low ? low : high) - from[axis]) / (to[axis] - from[axis]));
      }
      const contacts = this.enemies.filter(enemy => enemy.hp > 0 && !shot.hitIds.has(enemy.id)).map(enemy => ({ enemy,
        t: segmentRoundedRectangleHit(from, to, enemy, enemy.size / 2, enemy.size / 2, shot.config.radius) ?? Infinity,
      })).filter(contact => contact.t < wall && contact.t <= 1).sort((a, b) => a.t - b.t || a.enemy.id - b.enemy.id);
      for (const { enemy, t } of contacts) {
        shot.hitIds.add(enemy.id);
        if (shot.config.explosion) {
          this.onSound?.('capacitor_blast', enemy);
          this.area({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, shot.config.explosion, shot.payload);
        }
        else this.hit(enemy, shot.payload, from);
        if (shot.hitIds.size >= shot.config.pierce) break;
      }
      shot.x = to.x;
      shot.y = to.y;
      shot.age += step;
      if (wall <= 1 || shot.hitIds.size >= shot.config.pierce || shot.age >= shot.config.lifetime - Number.EPSILON) this.shots.splice(i, 1);
    }
  }

  private updateZones(delta: number): void {
    assertPositive('character.zoneTick', tuning.zoneTick);
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      const step = Math.min(delta, zone.config.lifetime - zone.age);
      zone.age += step;
      zone.tick += step;
      if (zone.tick + Number.EPSILON >= tuning.zoneTick) {
        zone.tick -= tuning.zoneTick;
        for (const target of this.valid(zone, zone.config.radius, false)) {
          const key = `${zone.skill}:${target.id}`;
          if ((this.zoneHits.get(key) ?? 0) > this.time + Number.EPSILON) continue;
          const strongest = this.zones.filter(other => other.skill === zone.skill && distance(other, target) <= other.config.radius && lineIsClear(other, target, 0, this.world, []))
            .reduce((best, other) => other.payload.damage > best.damage ? other.payload : best, zone.payload);
          this.hit(target, strongest, zone);
          this.zoneHits.set(key, this.time + tuning.zoneTick);
        }
      }
      if (zone.age >= zone.config.lifetime - Number.EPSILON) this.zones.splice(i, 1);
    }
  }

  private area(center: Point, radius: number, payload: Payload): void {
    const targets = this.valid(center, radius, false);
    this.effects.push({ x: center.x, y: center.y, radius, remaining: tuning.effectDuration });
    for (const enemy of targets) this.hit(enemy, payload, center);
  }
  private setStatus(map: Map<number, Status>, enemy: Combatant, value: number, duration: number): void {
    if (!value) return;
    const old = map.get(enemy.id);
    map.set(enemy.id, { value: Math.max(value, old?.value ?? 0), remaining: duration });
  }
  private hit(enemy: Combatant, payload: Payload, from: Point, damage = payload.damage): void {
    if (enemy.hp <= 0 || this.player.hp <= 0) return;
    const vulnerability = Math.min(characterRules.maximumVulnerability, (this.vulnerability.get(enemy.id)?.value ?? 0) / 100);
    const roll = this.random();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('combat.random: [0, 1) 값이 필요합니다.');
    const critical = roll < this.chance(payload.ranks);
    const rawDamage = damage * (1 + vulnerability) * (critical ? this.multiplier(payload.ranks) : 1);
    const appliedDamage = receivedDamage(enemy, from, rawDamage);
    enemy.hp = Math.max(0, enemy.hp - appliedDamage);
    if (appliedDamage > 0) this.onDamage?.({ target: enemy, amount: appliedDamage, critical });
    enemy.hitFlashSeconds = combatConfig.hitFlashSeconds;
    payload.hits++;
    if (payload.direct && this.character === 'mechanic' && payload.strong && payload.hits === 1) this.onSound?.('mechanic_strong', enemy);
    else if (!payload.quietHits && appliedDamage < rawDamage) this.onSound?.('enemy_guard', enemy);
    else if (!payload.quietHits && appliedDamage > 0) {
      const archetype = (enemy as Combatant & { archetype?: string }).archetype;
      this.onSound?.(['E09', 'E16', 'X03', 'B02', 'B03'].includes(archetype ?? '') ? 'enemy_hit_metal' : 'enemy_hit_soft', enemy);
    }
    const v = (id: number) => this.v(id, payload.ranks);
    if (payload.slow) this.setStatus(this.slow, enemy, payload.slow, payload.slowDuration ?? 0);
    if (payload.direct) {
      if (this.character !== 'carrier') this.setStatus(this.vulnerability, enemy, v(6), tuning.vulnerabilityDuration);
      if (this.character === 'signal' && payload.charged) this.setStatus(this.slow, enemy, tuning.signal.slow, v(15));
      if (this.character === 'carrier') this.setStatus(this.slow, enemy, v(12), tuning.carrier.slowDuration);
      if (this.character === 'mechanic' && payload.strong && payload.hits === 1) {
        this.shield('skill', v(13), tuning.mechanic.shieldDuration);
        if (v(15) && this.healCooldown <= 0) { this.heal(v(15)); this.healCooldown = tuning.mechanic.healCooldown; }
      }
      if (this.character === 'signal' && payload.hits === tuning.signal.crowdCount && v(13) && this.shieldCooldown <= 0) {
        this.shield('skill', v(13), tuning.signal.shieldDuration);
        this.shieldCooldown = tuning.signal.shieldCooldown;
      }
      if (this.character === 'carrier' && payload.hits === tuning.carrier.shieldCount && v(14) && this.shieldCooldown <= 0) {
        this.shield('skill', v(14), tuning.carrier.shieldDuration);
        this.shieldCooldown = tuning.carrier.shieldCooldown;
      }
    }
    if (enemy.hp <= 0) {
      if (this.character !== 'signal' && this.v(20)) {
        this.kills++;
        if (this.kills >= tuning[this.character].killCount) { this.kills = 0; this.heal(this.v(20)); }
      }
      if (payload.direct && this.character !== 'signal') {
        this.speedBuffValue = v(this.character === 'mechanic' ? 14 : 15);
        this.speedBuff = tuning.killSpeedDuration;
      }
      if (payload.direct && this.character === 'signal' && v(14) && this.deathCooldown <= 0) {
        this.deathCooldown = tuning.signal.deathCooldown;
        this.onSound?.('capacitor_blast', enemy);
        this.area(enemy, tuning.signal.deathRadius, this.payload(this.player.attackDamage * v(14) / 100, false));
      }
    } else if (payload.knockback) {
      const length = distance(from, enemy);
      moveBody(enemy, (length ? (enemy.x - from.x) / length : 1) * payload.knockback,
        (length ? (enemy.y - from.y) / length : 0) * payload.knockback, this.world,
        [this.player, ...this.enemies.filter(other => other !== enemy && other.hp > 0)]);
    }
  }
  private heal(amount: number): void {
    if (amount > 0 && this.player.hp > 0 && this.player.hp < this.player.maxHp) this.onSound?.('heal');
    if (this.player.hp > 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }
  private shield(source: string, amount: number, duration: number): void {
    if (!amount || this.player.hp <= 0) return;
    const old = this.shields.findIndex(shield => shield.source === source);
    if (old >= 0) this.shields.splice(old, 1);
    this.shields.push({ source, value: amount, remaining: duration });
    this.onSound?.('shield_gain');
  }
}
