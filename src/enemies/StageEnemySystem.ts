import { enemyRoster } from '../config/enemyRoster';
import type { SoundEmitter } from '../config/audio';
import type { EnemyId } from '../config/enemyRoster';
import { bossAttacks, enemyAttacks, enemyCombatConfig as c, enemyAttackVisuals as visuals } from '../config/enemyAttacks';
import type { EnemyAttack } from '../config/enemyAttacks';
import { bossCalls, encounterConfig as tuning, stages } from '../config/encounters';
import { enemyConfig } from '../config/enemies';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import { createCombatant } from '../combat/types';
import type { Combatant, LureTarget } from '../combat/types';
import { EnemyAttackSystem } from '../combat/EnemyAttackSystem';
import type { EnemyHazard } from '../combat/EnemyAttackSystem';
import type { Enemy } from './EnemySystem';
import { NavigationGrid } from './NavigationGrid';
import { navigationConfig } from '../config/navigation';
import { canOccupy, clamp, distance, isInViewport, lineIsClear, moveBody } from '../world/geometry';
import type { Body, CollisionWorld, Point, Viewport } from '../world/geometry';

export interface EnemyAction {
  spec:EnemyAttack; age:number; angle:number; phase:'windup'|'active'|'gap'|'recovery';
  from:Point; target:Point; repeats:number; burst:number; group:number; hazards:EnemyHazard[];
  spawn?:{id:EnemyId;point:Point}[];
}
export interface StageEnemy extends Enemy {
  archetype:EnemyId;
  age:number; cooldown:number; action?:EnemyAction; facingAngle:number;
  moving:boolean; summonCount:number; summonedBy?:number; bossAdd?:number;
  phase:number; pattern:number; transition:number; called:number; command:number;
  lastSpecial:number; shieldTargets:number[]; shieldSeconds:number; approach:number;
  lureTarget?: LureTarget;
}
interface Pending { id:EnemyId; at:number; point?:Point; parent?:number; bossAdd?:number }
const special=(a:EnemyAttack)=>['charge','lob','explode','hook','beam','stamp'].includes(a.kind)||a.kind==='shot'&&(a.count??1)>1;
const firing=(a:EnemyAttack)=>['shot','beam','lob'].includes(a.kind);
const point=(p:Point):Point=>({x:p.x,y:p.y});

/** Fixed waves, material-specific enemy actions and boss phases; no Phaser dependency. */
export class StageEnemySystem {
  onSound?: SoundEmitter;
  readonly enemies:StageEnemy[]=[];
  readonly attacks=new EnemyAttackSystem();
  stage=0;
  wave=0;
  countdown=0;
  complete=false;
  elapsedSeconds=0;
  private waveSeconds=0;
  private nextId=1;
  private pending:Pending[]=[];
  private cleared=false;
  private readonly navigation=new Map<number,NavigationGrid>();
  private navigationRevision=-1;
  private readonly world:CollisionWorld;
  private readonly random:()=>number;
  private specialOwner?:number;
  private specialSerial=0;
  get remainingCount():number{return this.enemies.filter(e=>e.hp>0).length+this.pending.length;}
  constructor(world:CollisionWorld,random:()=>number=Math.random){
    this.world=world;this.random=random;
    assertPositive('encounters.waveDelay',tuning.waveDelay);
    assertPositive('encounters.navigationInterval',tuning.navigationInterval);
    assertInteger('encounters.spawnAttempts',tuning.spawnAttempts,1);
    assertInteger('enemyCombat.summonLimit',c.summonLimit);
    assertInteger('enemyCombat.summonedAlive',c.summonedAlive);
    assertInteger('enemyCombat.firingSlots',c.firingSlots);
    assertInteger('enemyCombat.bossFiringSlots',c.bossFiringSlots);
    assertPositive('enemyCombat.projectileSpeed',c.projectileSpeed);
    assertPositive('enemyCombat.projectileLifetime',c.projectileLifetime);
    assertPositive('enemyCombat.pullSeconds',c.pullSeconds);
    assertPositive('navigation.collisionStep',navigationConfig.collisionStep);
    for(const [id,s] of [...Object.entries(enemyAttacks),...Object.entries(bossAttacks).flatMap(([boss,actions])=>Object.entries(actions).map(([name,s])=>[`${boss}.${name}`,s] as const))]){
      for(const key of ['windup','recovery','interval','damage'] as const)assertNonNegative(`enemyAttacks.${id}.${key}`,s[key]);
      assertPositive(`enemyAttacks.${id}.range`,s.range);
      for(const key of ['count','bursts','repeats'] as const)if(s[key]!==undefined)assertInteger(`enemyAttacks.${id}.${key}`,s[key]!,1);
      for(const key of ['gap','active','delay','length','width','radius','secondWindup'] as const)if(s[key]!==undefined)assertPositive(`enemyAttacks.${id}.${key}`,s[key]!);
    }
    for(const [i,s] of stages.entries())for(const [j,wave] of s.waves.entries())for(const e of wave){
      assertInteger(`stages.${i}.${j}.${e.id}.count`,e.count);assertNonNegative(`stages.${i}.${j}.${e.id}.delay`,e.delay);
    }
    for(const [id,d] of Object.entries(enemyRoster)){
      assertPositive(`enemyRoster.${id}.hp`,d.hp);assertPositive(`enemyRoster.${id}.size`,d.size);
      assertNonNegative(`enemyRoster.${id}.speed`,d.speed);
    }
  }
  initialize(player:Body,viewport:Viewport):void {this.beginWave();this.spawnPending(player,viewport);}
  private beginWave():void {
    if(!stages[this.stage].waves[this.wave].some(e=>enemyRoster[e.id].role==='boss'))this.onSound?.('wave_start');
    this.cleared=false;this.waveSeconds=0;this.attacks.clear();this.specialOwner=undefined;
    this.pending=stages[this.stage].waves[this.wave].flatMap(e=>Array.from({length:e.count},()=>({id:e.id,at:e.delay})));
  }
  private spawnPending(player:Body,viewport:Viewport):void {
    for(let i=0;i<this.pending.length;){
      const p=this.pending[i];
      if(p.at>this.waveSeconds+1e-8){i++;continue;}
      const position=p.point??this.spawnPoint(p.id,player,viewport);
      if(!position||!canOccupy(position,enemyRoster[p.id].size+2*tuning.spawnClearance,this.world,[player,...this.enemies.filter(e=>e.hp>0)])){i++;continue;}
      const e=this.create(p.id,position);e.summonedBy=p.parent;e.bossAdd=p.bossAdd;
      this.enemies.push(e);this.pending.splice(i,1);
    }
  }
  private create(id:EnemyId,p:Point):StageEnemy {
    const d=enemyRoster[id];
    return {...createCombatant({...p,id:this.nextId++,size:d.size},'enemy',enemyConfig.stats.horizontal.maxHp*d.hp,0),
      kind:['shot','lob','beam'].includes(d.role)?'circular':'horizontal',experienceCategory:d.reward,
      state:'chase',anchor:{...p},direction:1,angle:0,patrolRadius:0,stateSeconds:0,path:[],repathAt:0,blockedSeconds:0,outOfRangeSeconds:0,
      archetype:id,age:0,cooldown:d.role==='summon'||d.role==='boss'?c.summonFirstDelay:c.spawnGrace,
      facingAngle:0,moving:false,summonCount:0,phase:1,pattern:0,transition:0,called:0,command:0,lastSpecial:-1,shieldTargets:[],shieldSeconds:0,approach:0};
  }
  private spawnPoint(id:EnemyId,player:Body,viewport:Viewport,visible=false,reserved:Body[]=[]):Point|undefined {
    const half=enemyRoster[id].size/2;
    for(let attempt=0;attempt<tuning.spawnAttempts;attempt++){
      const side=(attempt+this.nextId)%4;
      const margin=half+tuning.spawnMargin+(visible?0:this.random()*tuning.spawnBand);
      const p=side<2?{x:viewport.x+this.random()*viewport.width,y:side?viewport.y+viewport.height+margin:viewport.y-margin}
        :{x:side===2?viewport.x-margin:viewport.x+viewport.width+margin,y:viewport.y+this.random()*viewport.height};
      if(visible){p.x=clamp(p.x,viewport.x+half,viewport.x+viewport.width-half);p.y=clamp(p.y,viewport.y+half,viewport.y+viewport.height-half);}
      if(distance(p,player)<tuning.summonSafeDistance+enemyRoster[id].size)continue;
      if(!visible&&isInViewport(p,enemyRoster[id].size,viewport))continue;
      if(canOccupy(p,enemyRoster[id].size+tuning.spawnClearance*2,this.world,[player,...this.enemies.filter(e=>e.hp>0),...reserved])&&!this.attacks.dangerous({...p,id:-1,size:enemyRoster[id].size}))return p;
    }
  }
  update(dt:number,player:Combatant,viewport:Viewport,lures:readonly LureTarget[]=[]):void {
    assertNonNegative('encounters.deltaSeconds',dt);if(this.complete||player.hp<=0)return;
    if(this.navigationRevision!==(this.world.revision??0)){
      this.navigation.clear();this.navigationRevision=this.world.revision??0;
      for(const enemy of this.enemies){enemy.path=[];enemy.repathAt=0;}
    }
    this.elapsedSeconds+=dt;this.waveSeconds+=dt;
    if(this.cleared){
      this.countdown=Math.max(0,this.countdown-dt);
      if(this.countdown>1e-8)return;
      this.wave++;
      if(this.wave>=stages[this.stage].waves.length){this.stage++;this.wave=0;}
      if(this.stage>=stages.length){this.stage=stages.length-1;this.complete=true;return;}
      this.beginWave();
    }
    this.spawnPending(player,viewport);
    for(const e of this.enemies){
      e.damageReduction=0;e.damageReductionSources=[];e.frontalReduction=0;e.moving=false;
      if(e.hp<=0)continue;
      e.age+=dt;e.cooldown=Math.max(0,e.cooldown-dt);e.command=Math.max(0,e.command-dt);e.shieldSeconds=Math.max(0,e.shieldSeconds-dt);
      if(e.transition>0){e.transition=Math.max(0,e.transition-dt);continue;}
      if(e.action)this.updateAction(e,dt,player,viewport);
    }
    // Oldest waiting special actor goes first after a complete sequence.
    const order=[...this.enemies].sort((a,b)=>a.lastSpecial-b.lastSpecial||a.id-b.id);
    for(const e of order){
      if(e.hp<=0)continue;
      const d=enemyRoster[e.archetype];
      if((e.archetype==='E09'||e.archetype==='E10')&&e.action?.phase!=='recovery')e.frontalReduction=e.archetype==='E09'?c.frontalGuard:c.frontalAssault;
      if(e.action||e.transition>0||this.enemies.some(b=>b.hp>0&&b.transition>0))continue;
      const lure=e.archetype.startsWith('E')?lures.filter(lure=>lure.remaining>0&&distance(e,lure)<=lure.radius&&lineIsClear(e,lure,0,this.world,[]))
        .sort((a,b)=>distance(e,a)-distance(e,b))[0]:undefined;
      if(e.lureTarget!==lure){e.path=[];e.repathAt=0;e.lureTarget=lure;}
      if(lure){
        e.facingAngle=Math.atan2(lure.y-e.y,lure.x-e.x);
        this.approach(e,{...lure,id:-1,size:0},dt,0,viewport,0,player);
        continue;
      }
      if(d.role==='boss'&&this.bossEvent(e,player,viewport))continue;
      const spec=this.spec(e);
      if(!spec){e.state='wait';continue;}
      const visible=isInViewport(e,e.size,viewport);
      const shotWidth=spec.kind==='shot'?c.projectileRadius*2:spec.kind==='beam'||spec.kind==='hook'?spec.width??0:0;
      const reachable=distance(e,player)<=spec.range&&visible&&lineIsClear(e,player,shotWidth,this.world,[],'circle');
      if(reachable&&e.cooldown<=1e-8&&e.age>=c.spawnGrace&&this.canStart(e,spec)){
        if(this.beginAction(e,spec,player,viewport))continue;
      }
      // Boss melee closes for at most two seconds before committing to its sweep.
      if(d.role==='boss'&&spec.kind==='melee'&&!reachable){
        e.approach+=dt;
        if(e.approach>=c.meleeApproach&&e.cooldown<=0&&this.canStart(e,spec)){this.beginAction(e,spec,player,viewport);continue;}
      }
      e.facingAngle=Math.atan2(player.y-e.y,player.x-e.x);
      if(!reachable)this.approach(e,player,dt,spec.range,viewport,shotWidth);
      else e.state='wait';
    }
    // Determine the strongest (non-stacking) active relay after all actions/deaths.
    for(const e of this.enemies){
      if(e.hp<=0||e.shieldSeconds<=0)continue;
      e.shieldTargets=e.shieldTargets.filter(id=>{
        const target=this.enemies.find(t=>t.id===id&&t.hp>0);
        if(!target||distance(e,target)>enemyAttacks.E17.radius!)return false;
        target.damageReduction=c.shieldReduction;target.damageReductionSources!.push(e);return true;
      });
    }
  }
  private canStart(e:StageEnemy,s:EnemyAttack):boolean {
    if(special(s)&&(this.specialOwner!==undefined||this.attacks.specialSafety>0))return false;
    if(firing(s)){
      const bossFiring=this.enemies.some(t=>t.hp>0&&t.archetype.startsWith('B')&&t.action&&firing(t.action.spec)&&t.action.phase!=='recovery');
      const active=this.enemies.filter(t=>t!==e&&t.hp>0&&!t.archetype.startsWith('B')&&t.action&&firing(t.action.spec)&&t.action.phase!=='recovery').length;
      if(!e.archetype.startsWith('B')&&active>=(bossFiring?c.bossFiringSlots:c.firingSlots))return false;
    }
    if(s.kind==='summon'){
      if(e.summonCount>=c.summonLimit)return false;
      const summoned=this.enemies.filter(t=>t.hp>0&&t.summonedBy!==undefined);
      const queued=this.pending.filter(p=>p.parent!==undefined);
      if(summoned.filter(t=>t.summonedBy===e.id).length+queued.filter(p=>p.parent===e.id).length>=(s.count??2)
        ||summoned.length+queued.length+(s.count??2)>c.summonedAlive)return false;
    }
    if(s.kind==='command'&&!this.enemies.some(t=>t.hp>0&&t.bossAdd===e.id)){e.pattern++;return false;}
    if(s.kind==='hook'&&this.attacks.hazards.some(h=>h.damage>0))return false;
    return true;
  }
  private spec(e:StageEnemy):EnemyAttack|undefined {
    if(!e.archetype.startsWith('B'))return enemyAttacks[e.archetype as keyof typeof enemyAttacks];
    const id=e.archetype as keyof typeof bossAttacks;
    const sequence=id==='B01'?['shot','charge','melee','lob']:id==='B02'?['shot','lob','command','shot','melee']
      :e.phase===1?['shot','charge','melee','beam']:['shot','beam','stamp','melee','charge'];
    const key=sequence[e.pattern%sequence.length];
    const s={...(bossAttacks[id] as Record<string,EnemyAttack>)[key]};
    if(e.phase>1){
      if(id==='B01'&&key==='charge')Object.assign(s,{repeats:2,secondWindup:.8,recovery:2.5});
      if(id==='B01'&&key==='lob')Object.assign(s,{bursts:2,gap:.6});
      if(id==='B02'&&key==='shot')Object.assign(s,{count:3,arc:Math.PI/9});
      if(id==='B02'&&key==='lob')s.bursts=3;
      if(id==='B02'&&key==='command')s.active=8;
      if(id==='B03'&&key==='beam')s.count=2;
      if(id==='B03'&&key==='charge'&&e.phase===3)Object.assign(s,{repeats:2,secondWindup:1,recovery:2.8});
    }
    return s;
  }
  private beginAction(e:StageEnemy,s:EnemyAttack,player:Body,viewport:Viewport):boolean {
    const angle=Math.atan2(player.y-e.y,player.x-e.x);
    const a:EnemyAction={spec:{...s},age:0,angle,phase:'windup',from:point(e),target:point(player),repeats:s.repeats??1,burst:0,group:this.attacks.group(),hazards:[]};
    if(s.kind==='summon'||s.kind==='call'){
      const ids=s.kind==='call'?bossCalls[e.archetype]![e.called].ids:Array.from({length:s.count??2},()=>e.archetype==='E14'?'E02':'E01') as EnemyId[];
      const reserved:Body[]=[];a.spawn=[];
      for(const id of ids){
        let p:Point|undefined;
        const index=reserved.length;
        if(s.kind==='call'&&index%2===1){
          const anchor=reserved[index-1],half=enemyRoster[id].size/2;
          for(const [dx,dy] of [[tuning.bossPairGap,0],[-tuning.bossPairGap,0],[0,tuning.bossPairGap],[0,-tuning.bossPairGap]]){
            const candidate={x:anchor.x+dx,y:anchor.y+dy};
            if(candidate.x<viewport.x+half||candidate.y<viewport.y+half||candidate.x>viewport.x+viewport.width-half||candidate.y>viewport.y+viewport.height-half)continue;
            if(distance(candidate,player)>=tuning.summonSafeDistance+enemyRoster[id].size&&canOccupy(candidate,enemyRoster[id].size+tuning.spawnClearance*2,this.world,[player,...this.enemies.filter(t=>t.hp>0),...reserved])){p=candidate;break;}
          }
        }else{
          p=this.spawnPoint(id,player,viewport,true,reserved);
          if(s.kind==='call'&&index===2){
            for(let attempt=0;p&&distance(p,reserved[0])<tuning.bossClusterGap&&attempt<8;attempt++)p=this.spawnPoint(id,player,viewport,true,reserved);
            if(p&&distance(p,reserved[0])<tuning.bossClusterGap)p=undefined;
          }
        }
        if(!p)return false;
        a.spawn.push({id,point:p});reserved.push({...p,id:-1,size:enemyRoster[id].size+tuning.spawnClearance*2});
      }
      for(const item of a.spawn)a.hazards.push(this.attacks.hazard(e.id,'spawn',item.point,item.point,{radius:tuning.summonMarkRadius,warning:s.windup,duration:.05}));
    }
    if(special(s)){this.specialOwner=e.id;e.lastSpecial=++this.specialSerial;}
    e.action=a;e.state='attack';e.path=[];e.facingAngle=angle;e.approach=0;e.cooldown=s.interval;
    this.prepareHazards(e,a,player);
    return true;
  }
  private prepareHazards(e:StageEnemy,a:EnemyAction,player:Body):void {
    const s=a.spec;
    if (s.kind === 'charge') this.onSound?.('charge_warning', e);
    if (s.kind === 'hook') this.onSound?.('hook_warning', e);
    if (s.kind === 'beam') this.onSound?.('beam_warning', e);
    if (s.kind === 'explode') this.onSound?.('explosion_warning', e);
    const end=this.attacks.clippedEnd(e,{x:e.x+Math.cos(a.angle)*(s.length??s.range),y:e.y+Math.sin(a.angle)*(s.length??s.range)},s.width??0,this.world);
    const common={warning:s.windup,duration:s.active??.1,damage:s.damage,group:a.group,angle:a.angle};
    if(['charge','hook','beam'].includes(s.kind)){
      const count=s.kind==='beam'?(s.count??1):1;
      let offsets=[0];
      if(count===2){
        const offset=(c.safeCorridor+player.size+(s.width??0))/2;
        const middle={x:(e.x+end.x)/2,y:(e.y+end.y)/2};
        // Two parallel lines only when the entire center lane is traversable.
        if(lineIsClear(e,end,c.safeCorridor+player.size,this.world,this.enemies.filter(t=>t!==e&&t.hp>0))
          &&canOccupy(middle,c.safeCorridor+player.size,this.world,this.enemies.filter(t=>t!==e&&t.hp>0)))offsets=[-offset,offset];
      }
      for(const offset of offsets){
        const from={x:e.x-Math.sin(a.angle)*offset,y:e.y+Math.cos(a.angle)*offset};
        const to=this.attacks.clippedEnd(from,{x:end.x-Math.sin(a.angle)*offset,y:end.y+Math.cos(a.angle)*offset},s.width??0,this.world);
        a.hazards.push(this.attacks.hazard(e.id,'lane',from,to,{...common,width:s.width??e.size,damage:s.kind==='charge'||s.kind==='hook'?0:s.damage,hook:s.kind==='hook'}));
      }
    }else if(s.kind==='melee')a.hazards.push(this.attacks.hazard(e.id,'arc',e,e,{...common,radius:s.radius??s.range,arc:s.arc??Math.PI}));
    else if(s.kind==='explode')a.hazards.push(this.attacks.hazard(e.id,'circle',e,e,{...common,radius:s.radius??0,damage:0}));
    else if(s.kind==='lob'||s.kind==='stamp')this.markImpact(e,a,player);
    else if(s.kind==='shot'){
      const count=s.count??1,width=e.archetype.startsWith('B')?visuals.bossShotWarningWidth:visuals.shotWarningWidth;
      for(let i=0;i<count;i++){
        const angle=a.angle+(count===1?0:(i/(count-1)-.5)*(s.arc??0));
        const to=this.attacks.clippedEnd(e,{x:e.x+Math.cos(angle)*s.range,y:e.y+Math.sin(angle)*s.range},c.projectileRadius*2,this.world);
        a.hazards.push(this.attacks.hazard(e.id,'lane',e,to,{...common,angle,width,damage:0,shot:true,duration:Math.max(.05,((s.bursts??1)-1)*(s.gap??0))}));
      }
    }
  }
  private markImpact(e:StageEnemy,a:EnemyAction,player:Body):void {
    const s=a.spec,target=point(player);
    if(!lineIsClear(e,target,0,this.world,[]))return;
    // Do not reserve a circle when every local escape corridor is already blocked.
    const escape=[0,Math.PI/2,Math.PI,Math.PI*1.5].some(angle=>{
      const p={x:target.x+Math.cos(angle)*((s.radius??0)+c.safeCorridor),y:target.y+Math.sin(angle)*((s.radius??0)+c.safeCorridor)};
      return lineIsClear(target,p,player.size,this.world,this.enemies.filter(t=>t!==e&&t.hp>0));
    });
    if(!escape)return;
    a.hazards.push(this.attacks.hazard(e.id,'circle',target,target,{warning:s.delay??1.3,duration:.1,radius:s.radius??72,damage:s.damage,group:this.attacks.group(),cancelWithOwner:false,impactSound:s.kind==='stamp'?'boss_stamp':'wet_impact'}));
    this.onSound?.('ground_warning', target);
  }
  private updateAction(e:StageEnemy,dt:number,player:Combatant,viewport:Viewport):void {
    const a=e.action!,s=a.spec;a.age+=dt;
    if(a.phase==='windup'){
      if(a.age+1e-8<s.windup)return;
      if(firing(s)&&!isInViewport(e,e.size,viewport)){this.attacks.cancelOwner(e.id);e.cooldown=0;this.finish(e);return;}
      a.age=0;a.phase='active';
      if(s.kind==='summon'||s.kind==='call'){
        const count=a.spawn?.length??0;
        const allowed=s.kind==='call'?!this.enemies.some(t=>t.hp>0&&t.bossAdd===e.id)
          :this.enemies.filter(t=>t.hp>0&&t.summonedBy!==undefined).length+count<=c.summonedAlive;
        if(!allowed){e.cooldown=0;this.finish(e);return;}
        // Commit a complete bundle only when every marked position remains safe.
        if(a.spawn?.some(item=>!canOccupy(item.point,enemyRoster[item.id].size+2*tuning.spawnClearance,this.world,[player,...this.enemies.filter(t=>t.hp>0)]))){
          e.cooldown=0;this.finish(e);return;
        }
        for(const item of a.spawn??[])this.pending.push({id:item.id,at:this.waveSeconds,point:item.point,parent:s.kind==='summon'?e.id:undefined,bossAdd:s.kind==='call'?e.id:undefined});
        if(s.kind==='summon')e.summonCount++;else e.called++;
        this.spawnPending(player,viewport);
        this.onSound?.('summon_open', e);
      }
      if(s.kind==='shield'){
        e.shieldTargets=this.enemies.filter(t=>t!==e&&t.hp>0&&enemyRoster[t.archetype].role!=='shield'&&!t.archetype.startsWith('B')&&distance(t,e)<=(s.radius??336))
          .sort((x,y)=>distance(x,e)-distance(y,e)).slice(0,s.count??2).map(t=>t.id);e.shieldSeconds=s.active??4;
        if (e.shieldTargets.length) this.onSound?.('enemy_shield', e);
      }
      if(s.kind==='command')for(const t of this.enemies)if(t.bossAdd===e.id)t.command=s.active??6;
      if(s.kind==='command')this.onSound?.('boss_command',e);
      if(s.kind==='melee')this.onSound?.('enemy_melee',e);
      if(s.kind==='charge')this.onSound?.('charge_release',e);
      if(s.kind==='beam')this.onSound?.('beam_release',e);
      if(s.kind==='hook')this.onSound?.('hook_release',e);
      if(s.kind==='hook')this.attacks.shootHook(e,a.angle,s.damage,a.group,s.length!,s.width!,s.active!);
      if(s.kind==='explode'){
        this.attacks.hazard(e.id,'circle',e,e,{radius:s.radius??0,damage:s.damage,group:a.group,cancelWithOwner:false,impactSound:'packet_burst'});
        if(e.archetype==='E12')for(let i=0;i<3;i++){
          const p={x:e.x+Math.cos(a.angle+i*Math.PI*2/3)*c.splitOffset,y:e.y+Math.sin(a.angle+i*Math.PI*2/3)*c.splitOffset};
          if(canOccupy(p,c.splitRadius*2,this.world)) {
            this.attacks.hazard(e.id,'circle',p,p,{radius:c.splitRadius,warning:s.delay??.8,damage:c.splitDamage,group:a.group,cancelWithOwner:false,impactSound:'packet_burst'});
            this.onSound?.('ground_warning',p);
          }
        }
        e.hp=0;this.finish(e);return;
      }
    }
    if(a.phase==='active'){
      if(s.kind==='shot'){
        while(a.burst<(s.bursts??1)&&a.age+1e-8>=a.burst*(s.gap??0)){
          const group=this.attacks.group(),count=s.count??1;
          this.onSound?.('paper_shot', e);
          const visualScale=e.archetype.startsWith('B')?visuals.bossProjectileScale:visuals.projectileScale;
          for(let i=0;i<count;i++)this.attacks.shoot(e,a.angle+(count===1?0:(i/(count-1)-.5)*(s.arc??0)),s.damage,group,visualScale);
          a.burst++;
        }
      }
      if((s.kind==='lob'||s.kind==='stamp')&&a.burst<(s.bursts??1)-1&&a.age+1e-8>=(a.burst+1)*(s.gap??0)){
        this.markImpact(e,a,player);a.burst++;
      }
      if(s.kind==='charge'){
        const before=point(e),travel=(s.length??0)/(s.active??1)*dt;
        const blockers=[player,...this.enemies.filter(t=>t!==e&&t.hp>0)];
        const moved=this.moveStraight(e,a.angle,travel,blockers);
        e.moving=moved>0;
        if(segmentTouches(before,{x:e.x+Math.cos(a.angle)*e.size/2,y:e.y+Math.sin(a.angle)*e.size/2},s.width??e.size,player))this.attacks.hit(player,s.damage,a.group,this.defend);
        if(moved<travel*.5)a.age=s.active??1;
      }
      const duration=s.kind==='shot'?Math.max(.05,((s.bursts??1)-1)*(s.gap??0))
        :s.kind==='lob'||s.kind==='stamp'?((s.bursts??1)-1)*(s.gap??0)+(s.delay??0)
        :['shield','command','summon','call'].includes(s.kind)?0:s.active??.1;
      if(a.age+1e-8>=duration){
        if(a.repeats>1){a.phase='gap';a.age=0;}else{a.phase='recovery';a.age=0;}
      }
    }else if(a.phase==='gap'&&a.age+1e-8>=(s.gap??0)){
      a.repeats--;a.phase='windup';a.age=0;a.angle=Math.atan2(player.y-e.y,player.x-e.x);a.from=point(e);a.target=point(player);
      a.spec={...s,windup:s.secondWindup??s.windup};a.group=this.attacks.group();a.hazards=[];e.facingAngle=a.angle;this.prepareHazards(e,a,player);
    }else if(a.phase==='recovery'&&a.age+1e-8>=s.recovery){this.finish(e);}
  }
  private defend:(damage:number)=>number=damage=>damage;
  updateAttacks(dt:number,player:Combatant,defend:(damage:number)=>number):void {
    this.defend=defend;this.attacks.update(dt,player,this.enemies,this.world,defend);
  }
  private finish(e:StageEnemy):void {
    if(this.specialOwner===e.id)this.specialOwner=undefined;
    if(e.action?.spec.kind==='hook')this.attacks.specialSafety=Math.max(this.attacks.specialSafety,c.pullSafety);
    if(e.archetype.startsWith('B')&&e.action?.spec.kind!=='call'){e.pattern++;e.cooldown=c.bossTurn;}
    e.action=undefined;e.state='chase';
  }
  private bossEvent(e:StageEnemy,player:Body,viewport:Viewport):boolean {
    const ratio=e.hp/e.maxHp;
    const phase=e.archetype==='B03'?(ratio<=.3?3:ratio<=.65?2:1):ratio<=.5?2:1;
    if(phase>e.phase){
      this.onSound?.('boss_phase');
      e.phase++;e.pattern=0;e.transition=c.bossTransition;this.attacks.clearOwner(e.id);
      if(this.specialOwner===e.id)this.specialOwner=undefined;
      return true;
    }
    const calls=bossCalls[e.archetype];
    if(calls&&e.called<calls.length&&ratio<=calls[e.called].threshold&&!this.enemies.some(t=>t.hp>0&&t.bossAdd===e.id)&&e.cooldown<=1e-8){
      if(this.specialOwner!==undefined)return false;
      return this.beginAction(e,{kind:'call',windup:c.bossCall,recovery:0,interval:0,damage:0,range:10000},player,viewport);
    }
    return false;
  }
  private approach(e:StageEnemy,player:Body,dt:number,range:number,viewport:Viewport,shotWidth:number,collisionPlayer:Body=player):void {
    if(e.attackLockSeconds>0||e.knockbackSeconds>0)return;
    const visible=isInViewport(e,e.size,viewport);
    const attackClear=lineIsClear(e,player,shotWidth,this.world,[],'circle');
    const length=distance(e,player),radius=Math.max((e.size+player.size)*Math.SQRT2/2+tuning.stopGap,
      Math.min(range-tuning.stopGap,visible?Infinity:Math.min(viewport.width,viewport.height)/2-e.size));
    const angle=Math.atan2(e.y-player.y,e.x-player.x);
    let target={x:player.x+Math.cos(angle)*Math.min(length,radius),y:player.y+Math.sin(angle)*Math.min(length,radius)};
    if(!attackClear&&length<=radius+tuning.stopGap){
      // Seek a firing position around the obstruction rather than waiting on it.
      for(const offset of [Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2]){
        const p={x:player.x+Math.cos(angle+offset)*radius,y:player.y+Math.sin(angle+offset)*radius};
        if(canOccupy(p,e.size,this.world)&&lineIsClear(p,player,shotWidth,this.world,[],'circle')){target=p;break;}
      }
    }
    if(distance(e,target)<tuning.stopGap){e.state='wait';return;}
    const blockers=[collisionPlayer,...this.enemies.filter(t=>t!==e&&t.hp>0)];let goal=target;
    if(!lineIsClear(e,target,e.size,this.world,blockers)){
      if(this.elapsedSeconds>=e.repathAt){
        let grid=this.navigation.get(e.size);if(!grid){grid=new NavigationGrid(this.world,e.size);this.navigation.set(e.size,grid);}
        e.path=grid.findPath(e,target,blockers);e.repathAt=this.elapsedSeconds+tuning.navigationInterval;
      }
      while(e.path.length&&distance(e,e.path[0])<tuning.stopGap)e.path.shift();goal=e.path[0]??target;
    }else e.path=[];
    const speed=enemyConfig.chase.speed*enemyRoster[e.archetype].speed*(e.movementMultiplier??1)*(e.command>0?tuning.commandSpeed:1);
    const heading=Math.atan2(goal.y-e.y,goal.x-e.x),travel=Math.min(speed*dt,distance(e,goal));
    const moved=moveBody(e,Math.cos(heading)*travel,Math.sin(heading)*travel,this.world,blockers);
    e.moving=moved>1e-5;e.state=e.moving?'chase':'wait';
  }
  private moveStraight(e:StageEnemy,angle:number,travel:number,blockers:Body[]):number {
    const before=point(e),steps=Math.max(1,Math.ceil(travel/navigationConfig.collisionStep));
    for(let i=0;i<steps;i++){
      const p={x:e.x+Math.cos(angle)*travel/steps,y:e.y+Math.sin(angle)*travel/steps};
      if(!canOccupy(p,e.size,this.world,blockers))break;
      e.x=p.x;e.y=p.y;
    }
    return distance(before,e);
  }
  removeDefeated():StageEnemy[] {
    const dead=this.enemies.filter(e=>e.hp<=0);
    const bossDead=dead.some(e=>e.archetype?.startsWith('B'));
    for(const e of dead){this.attacks.cancelOwner(e.id);if(this.specialOwner===e.id)this.specialOwner=undefined;}
    for(let i=this.enemies.length-1;i>=0;i--)if(this.enemies[i].hp<=0||bossDead)this.enemies.splice(i,1);
    if(bossDead)this.pending=[];
    // Relays release their targets immediately, before the next player attack.
    for(const e of this.enemies)e.damageReduction=this.enemies.some(r=>r.hp>0&&r.shieldSeconds>0&&r.shieldTargets.includes(e.id))?c.shieldReduction:0;
    if(!this.enemies.length&&!this.pending.length&&!this.cleared){this.cleared=true;this.countdown=tuning.waveDelay;this.attacks.clear();this.specialOwner=undefined;}
    return dead;
  }
}

import { segmentRoundedRectangleHit } from '../world/intersections';
function segmentTouches(from:Point,to:Point,width:number,body:Body):boolean{return segmentRoundedRectangleHit(from,to,body,body.size/2,body.size/2,width/2)!==undefined;}
