import Phaser from 'phaser';
import { preloadRailwayArt } from '../ui/RailwayPanel';
import { enemyArtConfig, enemyRoster } from '../config/enemyRoster';
import { advanceSimulation } from './advanceSimulation';
import { StageEnemySystem } from '../enemies/StageEnemySystem';
import { EnemyRenderer } from '../enemies/EnemyRenderer';
import { EncounterHud } from '../ui/EncounterHud';
import { EncounterTransition } from '../ui/EncounterTransition';
import { PlayerController } from '../player/PlayerController';
import { PlatformWorld } from '../world/PlatformWorld';
import { PlatformWorldView, preloadPlatform } from '../world/PlatformWorldView';
import type { Viewport } from '../world/geometry';
import { CombatSystem } from '../combat/CombatSystem';
import { CombatRenderer } from '../combat/CombatRenderer';
import type { Combatant } from '../combat/types';
import { HealthBar } from '../ui/HealthBar';
import { showDefeat, showCharacterSelection, showSkillSelection, showVictory } from '../ui/GameOverlay';
import { CharacterCombat } from '../combat/CharacterCombat';
import { CharacterRenderer } from '../combat/CharacterRenderer';
import { ExperienceSystem } from '../experience/ExperienceSystem';
import { ExperienceRenderer } from '../experience/ExperienceRenderer';
import { ExperienceHud } from '../ui/ExperienceHud';
import { playerArt } from '../config/playerArt';
import { assertInteger } from '../config/validate';
import { preloadEffects } from '../combat/EffectSprites';
import { ImpactRenderer } from '../combat/ImpactRenderer';
import { DamageNumberRenderer } from '../combat/DamageNumberRenderer';
import { gameAudio } from '../audio/GameAudio';
import type { AudioDirector } from '../audio/AudioDirector';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private enemySystem!: StageEnemySystem;
  private world!: PlatformWorld;
  private worldView!: PlatformWorldView;
  private enemyRenderer!: EnemyRenderer;
  private encounterHud!: EncounterHud;
  private encounterTransition!: EncounterTransition;
  private readonly healthBars = new Map<number, HealthBar>();
  private combat?: CombatSystem;
  private combatRenderer!: CombatRenderer;
  private defeated = false;
  private experience!: ExperienceSystem;
  private experienceRenderer!: ExperienceRenderer;
  private experienceHud!: ExperienceHud;
  private character?: CharacterCombat;
  private characterRenderer!: CharacterRenderer;
  private selectingSkill = false;
  private impactRenderer!: ImpactRenderer;
  private damageNumbers!: DamageNumberRenderer;
  private audio!: AudioDirector;

  constructor() { super('GameScene'); }

  preload(): void {
    assertInteger('enemyArt.count',enemyArtConfig.count,1);
    preloadRailwayArt(this);
    for (const art of Object.values(playerArt)) {
      if (!this.textures.exists(art.key)) this.load.atlas(art.key, art.sheet, art.atlas);
    }
    for(let i=0;i<enemyArtConfig.count;i++) {
      const key=enemyArtConfig.keyPrefix+i;
      if(!this.textures.exists(key))this.load.atlas(key,`${enemyArtConfig.path}sheet-${i}.png`,`${enemyArtConfig.path}sheet-${i}.json`);
    }
    preloadPlatform(this);
    preloadEffects(this);
  }

  create(): void {
    this.audio = gameAudio(this);
    this.audio.menu();
    this.events.once('shutdown', () => this.audio.stopEffects());
    this.healthBars.clear();
    this.combat = undefined;
    this.defeated = false;
    this.character = undefined;
    this.selectingSkill = false;
    this.experience = new ExperienceSystem();
    this.experience.onSound = this.audio.play;
    this.experienceRenderer = new ExperienceRenderer(this);
    this.experienceHud = new ExperienceHud(this);
    this.experienceHud.update(this.experience);
    this.world = new PlatformWorld();
    this.player = new PlayerController(this, this.world);
    this.worldView = new PlatformWorldView(this, this.world);
    const bounds = this.world.bounds;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.startFollow(this.player.view);
    this.enemySystem = new StageEnemySystem(this.world);
    this.enemySystem.initialize(this.player.body, this.getViewport());
    this.enemySystem.onSound = this.audio.play;
    this.enemySystem.attacks.onSound = this.audio.play;
    this.enemyRenderer = new EnemyRenderer(this);
    this.encounterHud = new EncounterHud(this);
    this.encounterTransition = new EncounterTransition(this);
    this.combatRenderer = new CombatRenderer(this);
    this.characterRenderer = new CharacterRenderer(this);
    this.impactRenderer = new ImpactRenderer(this);
    this.damageNumbers = new DamageNumberRenderer(this);
    this.renderActors();
    showCharacterSelection(this, (id) => {
      this.character = new CharacterCombat(id, this.player.body);
      this.character.onSound = this.audio.play;
      this.character.onDamage = hit => {
        const enemy = hit.target as Combatant & { archetype?: keyof typeof enemyRoster };
        const topOffset = enemy.archetype ? enemyRoster[enemy.archetype]?.height * enemyArtConfig.originY : undefined;
        this.damageNumbers.show(hit, topOffset);
      };
      this.audio.listen(this.player.body);
      this.audio.combat(this.enemySystem.stage);
      this.player.setCharacter(id);
      this.renderActors();
      this.characterRenderer.sync(this.character);
      this.combat = new CombatSystem(undefined, damage => this.character!.defend(damage));
      this.encounterTransition.observe(this.enemySystem);
    });
  }

  update(_time: number, delta: number): void {
    const combat = this.combat;
    const character = this.character;
    if (this.defeated) {
      // Finish body fades beneath the result screen, without advancing gameplay.
      advanceSimulation(delta, step => { this.enemyRenderer.updateDeaths(step, []); });
      this.enemyRenderer.sync(this.enemySystem, this.player.body.y);
      return;
    }
    if (!combat || !character || this.selectingSkill) return;
    if (this.encounterTransition.update(delta)) return;
    character.progression.observeLevel(this.experience.level);
    if (character.progression.pending) { this.openSkillSelection(); return; }
    // Small steps retain frame-independent speed and prevent collision tunnelling.
    advanceSimulation(delta, (step) => {
      this.damageNumbers.update(step);
      this.audio.listen(this.player.body);
      const beforeMovement = { x: this.player.body.x, y: this.player.body.y };
      this.player.update(step, this.world, this.enemySystem.enemies, character.movementSpeed);
      character.prepare(step, beforeMovement, this.enemySystem.enemies);
      const viewport = this.getViewport();
      this.enemySystem.update(step, this.player.body, viewport, character.lures);
      // Stop this frame before newly spawned enemies can deal or receive damage.
      if (this.encounterTransition.observe(this.enemySystem)) return false;
      // Register newly spawned actors before their first possible hit.
      this.impactRenderer.observe(0, [this.player.body, ...this.enemySystem.enemies]);
      combat.update(step, this.player.body, this.enemySystem.enemies, this.world, viewport);
      this.enemySystem.updateAttacks(step,this.player.body,damage=>character.defend(damage));
      character.update(step, this.world, viewport);
      this.impactRenderer.observe(step, [this.player.body, ...this.enemySystem.enemies]);
      const dead = this.enemySystem.removeDefeated();
      this.enemyRenderer.updateDeaths(step, dead);
      if (dead.some(enemy => enemy.archetype.startsWith('B'))) this.audio.bossDefeated();
      else for (const enemy of dead) this.audio.play('enemy_defeat', enemy);
      this.experience.dropFromDefeated(dead);
      if (this.player.body.hp > 0) this.experience.update(step, this.player.body, character.pickupRadius);
      character.progression.observeLevel(this.experience.level);
      return this.player.body.hp > 0 && !character.progression.pending && !this.enemySystem.complete;
    });
    this.renderActors();
    this.combatRenderer.sync(combat);
    this.experienceRenderer.sync(this.experience);
    this.experienceHud.update(this.experience);
    this.characterRenderer.sync(character);
    this.impactRenderer.sync();
    // Keep the boss defeat gap quiet; change tracks only when the next stage begins.
    if (this.enemySystem.countdown <= 0 && !this.enemySystem.complete) this.audio.combat(this.enemySystem.stage);
    if (this.player.body.hp <= 0) {
      this.defeated = true;
      this.audio.result(false);
      showDefeat(this);
    } else if (this.enemySystem.complete) {
      this.defeated=true;
      this.audio.result(true);
      showVictory(this);
    } else if (character.progression.pending) this.openSkillSelection();
  }

  private openSkillSelection(): void {
    const character = this.character;
    const offer = character?.progression.offer();
    if (!character || !offer || this.selectingSkill) return;
    this.selectingSkill = true;
    this.audio.selection(true);
    showSkillSelection(this, character, offer, index => {
      character.choose(offer.token, index, this.experience);
      this.selectingSkill = false;
      if (!character.progression.pending) this.audio.selection(false);
      this.renderActors();
      this.characterRenderer.sync(character);
      // The next queued choice opens on the next update with its own input guard.
    });
  }

  private getViewport(): Viewport {
    const camera = this.cameras.main;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    // Use the current player position, including before the camera's first render.
    return this.world.viewport(this.player.body, width, height);
  }

  private renderActors(): void {
    this.player.syncView();
    this.worldView.sync(this.getViewport(), this.player.body, this.enemySystem.stage);
    this.enemyRenderer.sync(this.enemySystem, this.player.body.y);
    this.encounterHud.update(this.enemySystem);
    this.syncHealthBar(this.player.body);
    const aliveIds = new Set<number>([this.player.body.id]);
    for (const enemy of this.enemySystem.enemies) {
      aliveIds.add(enemy.id);
      // Align bars to the visible sprite top while preserving collision size.
      this.syncHealthBar(enemy,enemyRoster[enemy.archetype]?.height*enemyArtConfig.originY);
    }
    for (const [id, bar] of this.healthBars) {
      if (!aliveIds.has(id)) { bar.destroy(); this.healthBars.delete(id); }
    }
  }

  private syncHealthBar(actor: Combatant, topOffset?:number): void {
    let bar = this.healthBars.get(actor.id);
    if (!bar) { bar = new HealthBar(this); this.healthBars.set(actor.id, bar); }
    bar.update(actor,topOffset);
  }
}
