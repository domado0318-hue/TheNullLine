import { enemyCombatConfig as c, enemyAttackVisuals } from '../config/enemyAttacks';
import { combatConfig } from '../config/combat';
import { distance, lineIsClear, moveBody } from '../world/geometry';
import type { Body, CollisionWorld, Point } from '../world/geometry';
import { segmentRoundedRectangleHit } from '../world/intersections';
import { obstacleBulletHit } from './hitDetection';
import type { Combatant } from './types';
import { assertNonNegative } from '../config/validate';
import type { SoundEmitter, SoundId } from '../config/audio';

export interface EnemyHazard {
  id: number;
  ownerId: number;
  kind: 'circle'|'lane'|'arc'|'spawn';
  from: Point;
  to: Point;
  width: number;
  radius: number;
  angle: number;
  arc: number;
  age: number;
  warning: number;
  duration: number;
  damage: number;
  group: number;
  cancelWithOwner: boolean;
  hook?: boolean;
  shot?: boolean;
  impactSound?: SoundId;
}
export interface EnemyProjectile extends Point {
  id:number; ownerId:number; vx:number; vy:number; age:number; damage:number; group:number;
  radius:number; lifetime:number; hookFrom?:Point; visualScale?:number;
}
export class EnemyAttackSystem {
  onSound?: SoundEmitter;
  readonly hazards: EnemyHazard[]=[];
  readonly projectiles: EnemyProjectile[]=[];
  private readonly hitGroups=new Set<number>();
  private nextId=1;
  private nextGroup=1;
  private pull?: {target:Point;remaining:number};
  pullImmunity=0;
  specialSafety=0;
  group():number{return this.nextGroup++;}
  clear():void {this.hazards.length=0;this.projectiles.length=0;this.hitGroups.clear();this.pull=undefined;this.specialSafety=0;}
  cancelOwner(id:number):void {
    for(let i=this.hazards.length-1;i>=0;i--)if(this.hazards[i].ownerId===id&&this.hazards[i].cancelWithOwner)this.hazards.splice(i,1);
  }
  clearOwner(id:number):void {
    for(let i=this.hazards.length-1;i>=0;i--)if(this.hazards[i].ownerId===id)this.hazards.splice(i,1);
    for(let i=this.projectiles.length-1;i>=0;i--)if(this.projectiles[i].ownerId===id)this.projectiles.splice(i,1);
  }
  hazard(ownerId:number,kind:EnemyHazard['kind'],from:Point,to:Point,options:Partial<EnemyHazard>={}):EnemyHazard {
    const h:EnemyHazard={id:this.nextId++,ownerId,kind,from:{...from},to:{...to},width:0,radius:0,angle:0,arc:Math.PI*2,age:0,warning:0,duration:.1,damage:0,group:this.group(),cancelWithOwner:true,...options};
    this.hazards.push(h);return h;
  }
  shoot(owner:Body,angle:number,damage:number,group:number,visualScale=enemyAttackVisuals.projectileScale):void {
    const offset=owner.size/2+c.projectileRadius;
    this.projectiles.push({id:this.nextId++,ownerId:owner.id,x:owner.x+Math.cos(angle)*offset,y:owner.y+Math.sin(angle)*offset,
      vx:Math.cos(angle)*c.projectileSpeed,vy:Math.sin(angle)*c.projectileSpeed,age:0,damage,group,radius:c.projectileRadius,lifetime:c.projectileLifetime,visualScale});
  }
  shootHook(owner:Body,angle:number,damage:number,group:number,length:number,width:number,seconds:number):void {
    const radius=width/2,offset=owner.size/2+radius,speed=Math.max(0,length-offset)/seconds;
    this.projectiles.push({id:this.nextId++,ownerId:owner.id,x:owner.x+Math.cos(angle)*offset,y:owner.y+Math.sin(angle)*offset,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,damage,group,radius,lifetime:seconds,hookFrom:{x:owner.x,y:owner.y}});
  }
  /** Clip to the earliest actual wall, including beam thickness. */
  clippedEnd(from:Point,to:Point,width:number,world:CollisionWorld):Point {
    let first=1;
    for(const obstacle of world.obstacles){const t=obstacleBulletHit(from,to,width/2,obstacle);if(t!==undefined)first=Math.min(first,t);}
    const half=width/2;
    for(const axis of world.unbounded ? [] : ['x','y'] as const){
      const max=(axis==='x'?world.width:world.height)-half,delta=to[axis]-from[axis];
      if(delta&&(to[axis]<half||to[axis]>max))first=Math.min(first,Math.max(0,((delta<0?half:max)-from[axis])/delta));
    }
    return{x:from.x+(to.x-from.x)*first,y:from.y+(to.y-from.y)*first};
  }
  contains(h:EnemyHazard,body:Body):boolean {
    if(h.kind==='spawn')return false;
    if(h.kind==='lane')return segmentRoundedRectangleHit(h.from,h.to,body,body.size/2,body.size/2,h.width/2)!==undefined;
    const dx=Math.max(0,Math.abs(body.x-h.from.x)-body.size/2),dy=Math.max(0,Math.abs(body.y-h.from.y)-body.size/2);
    if(Math.hypot(dx,dy)>h.radius)return false;
    return h.kind==='circle'||Math.abs(Math.atan2(Math.sin(Math.atan2(body.y-h.from.y,body.x-h.from.x)-h.angle),Math.cos(Math.atan2(body.y-h.from.y,body.x-h.from.x)-h.angle)))<=h.arc/2;
  }
  dangerous(body:Body):boolean{return this.hazards.some(h=>h.damage>0&&!h.hook&&this.contains(h,body));}
  update(dt:number,player:Combatant,enemies:readonly Combatant[],world:CollisionWorld,defend:(damage:number)=>number):void {
    assertNonNegative('enemyAttacks.deltaSeconds',dt);
    this.pullImmunity=Math.max(0,this.pullImmunity-dt);this.specialSafety=Math.max(0,this.specialSafety-dt);
    if(this.pull){
      const step=Math.min(dt,this.pull.remaining),ratio=step/this.pull.remaining;
      const dx=(this.pull.target.x-player.x)*ratio,dy=(this.pull.target.y-player.y)*ratio;
      const candidate={...player,x:player.x+dx,y:player.y+dy};
      if(!this.dangerous(candidate))moveBody(player,dx,dy,world,enemies.filter(e=>e.hp>0));
      this.pull.remaining-=step;
      if(this.pull.remaining<=1e-8){this.pull=undefined;this.specialSafety=c.pullSafety;}
    }
    for(let i=this.hazards.length-1;i>=0;i--){
      const h=this.hazards[i],owner=enemies.find(e=>e.id===h.ownerId);
      if(h.cancelWithOwner&&(!owner||owner.hp<=0)){this.hazards.splice(i,1);continue;}
      const previous=h.age;h.age+=dt;
      if (h.impactSound && previous <= h.warning && h.age >= h.warning) {
        this.onSound?.(h.impactSound, h.from); h.impactSound = undefined;
      }
      if(h.age>=h.warning&&previous<=h.warning+h.duration&&h.damage>0&&this.contains(h,player)
        &&lineIsClear(h.from,player,0,world,[])){
        const hit=this.hit(player,h.damage,h.group,defend);
        if(hit&&h.hook&&this.pullImmunity<=0)this.startPull(player,h.from,enemies,world);
      }
      if(h.age>=h.warning+h.duration)this.hazards.splice(i,1);
    }
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],from={x:p.x,y:p.y},step=Math.max(0,Math.min(dt,p.lifetime-p.age));
      const to={x:p.x+p.vx*step,y:p.y+p.vy*step};
      const hit=segmentRoundedRectangleHit(from,to,player,player.size/2,player.size/2,p.radius);
      let wall=Infinity;
      for(const obstacle of world.obstacles){const t=obstacleBulletHit(from,to,p.radius,obstacle);if(t!==undefined)wall=Math.min(wall,t);}
      if(hit!==undefined&&hit<wall){
        const applied=this.hit(player,p.damage,p.group,defend);
        if(applied&&p.hookFrom&&this.pullImmunity<=0)this.startPull(player,p.hookFrom,enemies,world);
        this.projectiles.splice(i,1);continue;
      }
      if(wall!==Infinity||(!world.unbounded&&(to.x<p.radius||to.y<p.radius||to.x>world.width-p.radius||to.y>world.height-p.radius))||p.age+dt>=p.lifetime){this.projectiles.splice(i,1);continue;}
      p.x=to.x;p.y=to.y;p.age+=dt;
    }
    const liveGroups=new Set([...this.hazards,...this.projectiles].map(h=>h.group));
    for(const group of this.hitGroups)if(!liveGroups.has(group))this.hitGroups.delete(group);
  }
  hit(player:Combatant,damage:number,group:number,defend:(damage:number)=>number):boolean {
    if(this.hitGroups.has(group)||player.hp<=0)return false;
    // A multi-pellet contact consumes this attack even during invulnerability.
    this.hitGroups.add(group);
    if(player.invulnerableSeconds>0)return false;
    player.hp=Math.max(0,player.hp-defend(player.maxHp*damage));
    player.hitFlashSeconds=combatConfig.hitFlashSeconds;
    player.invulnerableSeconds=combatConfig.invulnerabilitySeconds.player;
    return true;
  }
  private startPull(player:Combatant,from:Point,enemies:readonly Combatant[],world:CollisionWorld):void {
    const length=distance(player,from);if(!length)return;
    const amount=Math.min(c.pullDistance,Math.max(0,length-player.size));
    let target={x:player.x,y:player.y};
    // Stop before any occupied or already-reserved hazard, never push another actor.
    for(let d=4;d<=amount;d+=4){
      const candidate={...player,x:player.x+(from.x-player.x)/length*d,y:player.y+(from.y-player.y)/length*d};
      if(this.dangerous(candidate)||!lineIsClear(target,candidate,player.size,world,enemies.filter(e=>e.hp>0)))break;
      target=candidate;
    }
    this.pull={target,remaining:c.pullSeconds};this.pullImmunity=c.pullImmunity+c.pullSeconds;
    this.specialSafety=c.pullSeconds+c.pullSafety;
  }
}
