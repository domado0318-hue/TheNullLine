import { characterRules } from '../config/characters';
import type { CharacterId } from '../config/characters';
import { skills } from '../config/skills';

export type SupplyId = 'heal' | 'shield' | 'pickup';
export type SkillChoice = { kind: 'skill'; id: number } | { kind: 'supply'; id: SupplyId };
export interface SkillOffer { token: number; choices: readonly SkillChoice[] }

export class SkillProgression {
  readonly character: CharacterId;
  private ranks: number[];
  private observedLevel = 1;
  private remaining = 0;
  private sequence = 0;
  private current?: SkillOffer;
  private readonly random: () => number;

  constructor(character: CharacterId, random: () => number = Math.random) {
    this.character = character;
    this.ranks = Array(skills[character].length).fill(0);
    this.random = random;
  }
  get pending(): number { return this.remaining; }
  get levels(): readonly number[] { return this.ranks; }
  level(id: number): number { return this.ranks[id - 1] ?? 0; }
  value(id: number, secondary = false, levels = this.levels): number {
    const definition = skills[this.character][id - 1];
    return (secondary ? definition.secondary : definition.values)?.[levels[id - 1] - 1] ?? 0;
  }
  observeLevel(level: number): void {
    if (!Number.isSafeInteger(level) || level < this.observedLevel) throw new Error('skill.level: 레벨은 감소할 수 없습니다.');
    this.remaining += level - this.observedLevel;
    this.observedLevel = level;
  }
  offer(): SkillOffer | undefined {
    if (!this.remaining) return undefined;
    if (this.current) return this.current;
    const eligible = skills[this.character].filter(skill => this.level(skill.id) < characterRules.maxSkillLevel);
    const choices: SkillChoice[] = [];
    while (choices.length < characterRules.choices && eligible.length) {
      const random = this.random();
      if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error('skill.random: [0, 1) 값이 필요합니다.');
      const [selected] = eligible.splice(Math.floor(random * eligible.length), 1);
      choices.push({ kind: 'skill', id: selected.id });
    }
    for (const id of ['heal', 'shield', 'pickup'] as const) {
      if (choices.length < characterRules.choices) choices.push({ kind: 'supply', id });
    }
    this.current = { token: ++this.sequence, choices };
    return this.current;
  }
  choose(token: number, index: number): SkillChoice | undefined {
    if (!this.current || token !== this.current.token || !Number.isInteger(index)) return undefined;
    const choice = this.current.choices[index];
    if (!choice) return undefined;
    if (choice.kind === 'skill') {
      if (this.level(choice.id) >= characterRules.maxSkillLevel) return undefined;
      // New array keeps attack snapshots immutable across upgrades.
      this.ranks = this.ranks.map((rank, i) => i === choice.id - 1 ? rank + 1 : rank);
    }
    this.current = undefined;
    this.remaining--;
    return choice;
  }
}
