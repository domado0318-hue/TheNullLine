import Phaser from 'phaser';
import { enemyArtConfig as art, enemyRoster } from '../config/enemyRoster';
import { enemyCombatConfig } from '../config/enemyAttacks';
import { combatConfig } from '../config/combat';
import type { StageEnemy, StageEnemySystem } from './StageEnemySystem';
import type { EnemyHazard } from '../combat/EnemyAttackSystem';
import { assertPositive } from '../config/validate';
import { EffectSprites } from '../combat/EffectSprites';
import { effectArt as fxArt, effectMotion as motion, effectGround as ground, enemyDeath } from '../config/effects';
import { effectEnvelope, smoothEffect } from '../combat/EffectMotion';

export class EnemyRenderer {
  private readonly views=new Map<number,Phaser.GameObjects.Image>();
  private readonly deaths=new Map<number,{view:Phaser.GameObjects.Image;age:number;y:number}>();
  private readonly graphics:Phaser.GameObjects.Graphics;
  private readonly shadows:Phaser.GameObjects.Graphics;
  private readonly scene:Phaser.Scene;
  private readonly fx:EffectSprites;
  constructor(scene:Phaser.Scene){
    assertPositive('enemyArt.dashStep',art.dashStep);
    this.scene=scene;this.fx=new EffectSprites(scene);this.graphics=scene.add.graphics().setDepth(8);this.shadows=scene.add.graphics().setDepth(2);
    scene.events.once('shutdown',()=>{
      for(const view of this.views.values())view.destroy();
      for(const entry of this.deaths.values())entry.view.destroy();
      this.views.clear();this.deaths.clear();
    });
  }
  /** Receive the actual removed actors, including enemies killed before their first render. */
  updateDeaths(delta:number,dead:readonly StageEnemy[]):void {
    for(const [id,entry] of this.deaths){
      entry.age+=delta;
      if(entry.age>=enemyDeath.seconds){entry.view.destroy();this.deaths.delete(id);}
    }
    for(const e of dead){
      if(this.deaths.has(e.id))continue;
      const d=enemyRoster[e.archetype];if(!d)continue;
      const view=this.views.get(e.id)??this.scene.add.image(e.x,e.y,art.keyPrefix+d.sheet,String(d.frame)).setOrigin(.5,art.originY);
      this.views.delete(e.id);
      const ratio=view.frame.realWidth/view.frame.realHeight;
      view.setPosition(e.x,e.y).setDisplaySize(d.height*ratio,d.height).clearTint().setAlpha(1)
        .setFlipX(Math.cos(e.facingAngle)>0);
      this.deaths.set(e.id,{view,age:0,y:e.y});
    }
  }
  sync(system:StageEnemySystem,depthOriginY=0):void {
    const alive=new Set<number>();this.graphics.clear();this.shadows.clear();this.fx.begin();
    for(const e of system.enemies){
      if(e.hp<=0)continue;alive.add(e.id);const d=enemyRoster[e.archetype];if(!d)continue;
      let view=this.views.get(e.id);
      if(!view){view=this.scene.add.image(e.x,e.y,art.keyPrefix+d.sheet,String(d.frame)).setOrigin(.5,art.originY);this.views.set(e.id,view);}
      const phase=e.action?.phase==='windup'?Math.min(1,e.action.age/Math.max(.01,e.action.spec.windup)):0;
      const gait=e.moving?Math.sin(system.elapsedSeconds*art.gaitHz*Math.PI*2+e.id):0;
      const ratio=view.frame.realWidth/view.frame.realHeight;
      const height=d.height*(1+phase*art.windupStretch);
      view.setDisplaySize(height*ratio*(1-phase*art.windupStretch),height);
      view.setPosition(e.x,e.y-Math.abs(gait)*art.bob).setRotation(gait*art.lean);
      view.setFlipX(Math.cos(e.facingAngle)>0).setDepth(10+(e.y-depthOriginY)/this.scene.scale.height);
      const flash=e.hitFlashSeconds>0&&Math.floor((combatConfig.hitFlashSeconds-e.hitFlashSeconds)/combatConfig.flashIntervalSeconds)%2===0;
      if(flash)view.setTintFill(combatConfig.hitColor);else view.clearTint();
      view.setAlpha(e.age < enemyCombatConfig.spawnGrace ? art.spawnAlpha+(1-art.spawnAlpha)*e.age/enemyCombatConfig.spawnGrace : 1);
      this.shadows.fillStyle(0x030807,art.shadowAlpha).fillEllipse(e.x,e.y+e.size*art.shadowOffset,e.size*art.shadowWidth,e.size*art.shadowHeight);
      if(e.damageReduction||e.frontalReduction||e.shieldSeconds>0){
        const size=e.size*fxArt.shieldScale*fxArt.paddingScale;
        this.fx.draw('shield',e.x,e.y,size,size,e.facingAngle,motion.shieldAlpha);
      }
      if(e.shieldSeconds>0)for(const id of e.shieldTargets){const t=system.enemies.find(t=>t.id===id&&t.hp>0);if(t){this.dashed(e.x,e.y,t.x,t.y);this.fx.line('lightning',e,t,fxArt.boltWidth,fxArt.warningAlpha);}}
      if(e.frontalReduction)this.arc(e,enemyCombatConfig.frontalArc,e.size*.8,art.shield,.5);
      const action=e.action;
      if(action&&['summon','call','command','shield','charge'].includes(action.spec.kind)){
        const active=action.phase==='active',size=e.size*fxArt.shieldScale*fxArt.paddingScale;
        const alpha=action.phase==='windup'?fxArt.warningAlpha*smoothEffect(action.age/Math.max(motion.enterSeconds,action.spec.windup))
          :action.phase==='recovery'?fxArt.warningAlpha*smoothEffect(1-action.age/Math.max(motion.exitSeconds,action.spec.recovery))
          :fxArt.warningAlpha;
        this.fx.draw(action.spec.kind==='charge'?'enemyCut':'pulse',e.x,e.y,size,size,action.angle,
          alpha,active?fxArt.depth:fxArt.groundDepth);
      }
    }
    for(const [id,v] of this.views)if(!alive.has(id)){v.destroy();this.views.delete(id);}
    for(const entry of this.deaths.values()){
      entry.view.setAlpha(1-smoothEffect(entry.age/enemyDeath.seconds))
        .setDepth(10+(entry.y-depthOriginY)/this.scene.scale.height);
    }
    for(const h of system.attacks.hazards)this.hazard(h);
    for(const p of system.attacks.projectiles){
      if(p.hookFrom){
        this.fx.line('beam',p.hookFrom,p,art.tetherWidth*fxArt.beamHeight);
        this.fx.draw('saw',p.x,p.y,p.radius*2*fxArt.paddingScale,p.radius*2*fxArt.paddingScale,Math.atan2(p.vy,p.vx));
        continue;
      }
      const diameter=p.radius*2*(p.visualScale??1);
      this.fx.draw('shard',p.x,p.y,diameter*fxArt.projectileScale,diameter*fxArt.projectileScale,Math.atan2(p.vy,p.vx));
    }
    this.fx.end();
  }
  private dashed(x:number,y:number,tx:number,ty:number):void {
    this.graphics.lineStyle(art.lineWidth,art.shield,.65);const len=Math.hypot(tx-x,ty-y);
    for(let d=0;d<len;d+=art.dashStep){const end=Math.min(len,d+art.dashLength);this.graphics.lineBetween(x+(tx-x)*d/len,y+(ty-y)*d/len,x+(tx-x)*end/len,y+(ty-y)*end/len);}
  }
  private arc(e:StageEnemy,arc:number,radius:number,color:number,alpha:number):void {
    this.graphics.lineStyle(art.lineWidth,color,alpha).beginPath().arc(e.x,e.y,radius,e.facingAngle-arc/2,e.facingAngle+arc/2).strokePath();
  }
  private hazard(h:EnemyHazard):void {
    const active=h.age>=h.warning,color=active?art.active:art.telegraph;
    const progress=active?1:Math.max(0,Math.min(1,h.age/h.warning));
    const g=this.graphics;g.lineStyle(art.lineWidth,color,.9).fillStyle(color,active?art.activeAlpha:art.warningAlpha);
    if(h.kind==='circle'||h.kind==='spawn'){
      g.fillCircle(h.from.x,h.from.y,h.radius).strokeCircle(h.from.x,h.from.y,h.radius);
      if(!active&&progress>0)g.fillStyle(color,art.warningFillAlpha).fillCircle(h.from.x,h.from.y,h.radius*progress)
        .lineStyle(art.lineWidth,art.warningFront,.9).strokeCircle(h.from.x,h.from.y,h.radius*progress);
    }else if(h.kind==='lane'){
      const angle=Math.atan2(h.to.y-h.from.y,h.to.x-h.from.x),dx=-Math.sin(angle)*h.width/2,dy=Math.cos(angle)*h.width/2;
      const corners=[{x:h.from.x+dx,y:h.from.y+dy},{x:h.to.x+dx,y:h.to.y+dy},{x:h.to.x-dx,y:h.to.y-dy},{x:h.from.x-dx,y:h.from.y-dy}];
      g.fillPoints(corners,true).strokePoints(corners,true);
      if(!active&&progress>0){
        const tip={x:h.from.x+(h.to.x-h.from.x)*progress,y:h.from.y+(h.to.y-h.from.y)*progress};
        g.fillStyle(color,art.warningFillAlpha).fillPoints([corners[0],{x:tip.x+dx,y:tip.y+dy},{x:tip.x-dx,y:tip.y-dy},corners[3]],true);
        g.lineStyle(art.lineWidth,art.warningFront,.9).lineBetween(tip.x+dx,tip.y+dy,tip.x-dx,tip.y-dy);
      }
      if(active)g.lineBetween(h.from.x,h.from.y,h.to.x,h.to.y);
    }else{
      g.beginPath().moveTo(h.from.x,h.from.y).arc(h.from.x,h.from.y,h.radius,h.angle-h.arc/2,h.angle+h.arc/2).closePath().fillPath().strokePath();
      if(!active&&progress>0){
        g.fillStyle(color,art.warningFillAlpha).beginPath().moveTo(h.from.x,h.from.y)
          .arc(h.from.x,h.from.y,h.radius*progress,h.angle-h.arc/2,h.angle+h.arc/2).closePath().fillPath();
        g.lineStyle(art.lineWidth,art.warningFront,.9).beginPath()
          .arc(h.from.x,h.from.y,h.radius*progress,h.angle-h.arc/2,h.angle+h.arc/2).strokePath();
      }
    }
    if(!active||h.shot)return;
    const envelope=effectEnvelope(h.age-h.warning,h.duration),alpha=envelope.alpha;
    if(h.kind==='lane')this.fx.line('beam',h.from,h.to,h.width*fxArt.beamHeight,alpha*motion.coreAlpha);
    else if(h.kind==='arc'){
      // A slash is centered inside the actual cone; the outline remains the precise boundary.
      const reach=h.radius/2,x=h.from.x+Math.cos(h.angle)*reach,y=h.from.y+Math.sin(h.angle)*reach;
      const size=Math.min(h.radius,motion.coreDiameter)*fxArt.paddingScale*envelope.scale;
      this.fx.draw('enemyCut',x,y,size,size,h.angle,alpha*motion.slashAlpha);
    }else{
      const size=Math.min(h.radius*2*fxArt.paddingScale,ground.stampSize)*envelope.spread;
      this.fx.ring(h.from.x,h.from.y,h.radius*envelope.spread,alpha*motion.ringAlpha);
      this.fx.draw('pulse',h.from.x,h.from.y,size,size,0,alpha*motion.ringAlpha,fxArt.groundDepth);
      if(h.kind!=='spawn'){
        const core=Math.min(h.radius*2,motion.coreDiameter)*fxArt.paddingScale*envelope.scale;
        this.fx.draw('crush',h.from.x,h.from.y,core,core,0,alpha*motion.coreAlpha,fxArt.groundDepth);
      }
    }
  }
}

