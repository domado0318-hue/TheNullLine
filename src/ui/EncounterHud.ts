import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import { stages } from '../config/encounters';
import { enemyRoster } from '../config/enemyRoster';
import type { StageEnemySystem } from '../enemies/StageEnemySystem';
import { createRailwayPanel } from './RailwayPanel';
import { journeyStage, nextLocation } from '../config/journey';

export class EncounterHud {
  private readonly text:Phaser.GameObjects.Text;
  private readonly remaining:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene){
    const c=uiConfig.encounterHud;
    const r=uiConfig.railway;
    createRailwayPanel(scene,c.x-c.width/2,c.y,c.width,c.height);
    this.text=scene.add.text(c.x,c.y+(c.height-r.stripe)/2,'',{fontFamily:uiConfig.fontFamily,fontSize:`${c.fontSize}px`,color:r.ink,align:'center'})
      .setOrigin(.5).setScrollFactor(0).setDepth(uiConfig.experience.depth+1);
    const count=uiConfig.remainingEnemies;
    const x=scene.scale.width-count.right-count.width/2;
    createRailwayPanel(scene,x-count.width/2,count.y,count.width,count.height);
    this.remaining=scene.add.text(x,count.y+(count.height-r.stripe)/2,'',{
      fontFamily:uiConfig.fontFamily,fontSize:count.fontSize,color:r.ink,
    }).setOrigin(.5).setScrollFactor(0).setDepth(uiConfig.experience.depth+1);
  }
  update(system:StageEnemySystem):void {
    const stage=stages[system.stage],boss=system.enemies.find(e=>e.hp>0&&e.archetype?.startsWith('B'));
    const detail=boss?`${enemyRoster[boss.archetype].name} · ${boss.phase}단계 · HP ${Math.ceil(boss.hp)} / ${boss.maxHp}`
      :system.countdown>0?(system.wave===stage.waves.length-1?`${nextLocation(system.stage)} · ${Math.ceil(system.countdown)}초`:`다음 전투까지 ${Math.ceil(system.countdown)}초`):`웨이브 ${system.wave+1}/${stage.waves.length}`;
    this.remaining.setText(`남은 적 ${system.remainingCount}`);
    this.text.setText(system.complete?`${stages.length}스테이지 전투 완료`:`${system.stage+1} / ${stages.length} · ${journeyStage(system.stage).name}\n${detail}`);
  }
}
