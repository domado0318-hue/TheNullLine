const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
require('node:module').registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c);}});
const {StageEnemySystem}=require('../src/enemies/StageEnemySystem.ts');
const {EnemyAttackSystem}=require('../src/combat/EnemyAttackSystem.ts');
const {enemyRoster,enemyIds}=require('../src/config/enemyRoster.ts');
const {stages,bossCalls}=require('../src/config/encounters.ts');
const {enemyAttacks,enemyCombatConfig}=require('../src/config/enemyAttacks.ts');
const {createCombatant,receivedDamage}=require('../src/combat/types.ts');
const {CombatSystem}=require('../src/combat/CombatSystem.ts');
const {CharacterCombat}=require('../src/combat/CharacterCombat.ts');
const {canOccupy,isInViewport,distance}=require('../src/world/geometry.ts');
function fixture(seed=17){
  const world={width:3000,height:3000,obstacles:[]},viewport={x:860,y:1140,width:1280,height:720};
  const player=createCombatant({id:0,x:1500,y:1500,size:48},'player',100,24);
  const system=new StageEnemySystem(world,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;});
  const combat=new CombatSystem();
  const add=(id,x=1600,y=1500)=>{const e=system.create(id,{x,y});system.enemies.push(e);return e;};
  const step=(dt=1/120)=>{system.update(dt,player,viewport);combat.update(dt,player,system.enemies,world,viewport);system.updateAttacks(dt,player,d=>d);};
  const run=(seconds)=>{for(let t=0;t<seconds-1e-8;t+=1/120)step(Math.min(1/120,seconds-t));};
  return{world,viewport,player,system,add,step,run};
}
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-6,`${actual} !== ${expected}`);

test('Carrier lure draws real normal AI into armed traps, then expires and restores pursuit without collision overlap',()=>{
  const f=fixture(),c=new CharacterCombat('carrier',f.player,()=>.99);
  c.progression.levels[8]=5;c.auxiliaryTimers.set(9,0);c.mainTimer=0;
  c.prepare(0,f.player,f.system.enemies);c.update(0,f.world,f.viewport);
  assert.equal(c.lures.length,1);assert.equal(c.mines.length,1);
  f.player.x=1900;const enemy=f.add('E01',1670);enemy.hp=enemy.maxHp=1000;enemy.cooldown=100;
  const start=enemy.x;
  for(let i=0;i<120;i++){
    c.prepare(1/60,f.player,f.system.enemies);f.system.update(1/60,f.player,f.viewport,c.lures);
    c.mainTimer=100;c.update(1/60,f.world,f.viewport);
    assert(canOccupy(enemy,enemy.size,f.world,[f.player]));
  }
  assert(enemy.x<start,'enemy moves away from player toward bait');assert(enemy.hp<1000,'bait brings it within trap trigger distance');
  assert.equal(c.mines.length,0);
  c.auxiliaryTimers.clear();const atBait=enemy.x;
  for(let i=0;i<150;i++){
    c.prepare(1/60,f.player,f.system.enemies);f.system.update(1/60,f.player,f.viewport,c.lures);
    c.update(1/60,f.world,f.viewport);
  }
  assert.equal(c.lures.length,0);assert(enemy.x>atBait,'expired lure resumes pursuit');
});

test('Lures respect boundary, walls, elites and bosses, and never cancel an attack already in progress',()=>{
  for(const [id,attracted] of [['E01',true],['E04',true],['X01',false],['B01',false]]){
    const f=fixture(),e=f.add(id,1700);f.player.x=1900;e.cooldown=100;
    const lure={x:1500,y:1500,radius:200,remaining:4};
    f.system.update(.1,f.player,f.viewport,[lure]);assert.equal(e.x<1700,attracted,id);
  }
  for(const blocked of [false,true]){
    const f=fixture(),e=f.add('E01',1700);f.player.x=1900;e.cooldown=100;
    const lure={x:1500,y:1500,radius:blocked?300:199.999,remaining:4};
    if(blocked)f.world.obstacles.push({x:1600,y:1500,size:40,shape:'circle'});
    f.system.update(.1,f.player,f.viewport,[lure]);assert(e.x>1700,'wall or range excludes lure');
  }
  const f=fixture(),e=f.add('E04',1700);e.age=2;e.cooldown=0;f.step();
  const action=e.action;assert(action);const target={...action.target};
  f.system.update(.01,f.player,f.viewport,[{x:1750,y:1600,radius:300,remaining:4}]);
  assert.equal(e.action,action);assert.deepEqual(e.action.target,target,'existing telegraph is preserved');
});
test('Ranged warnings cover each firing direction with wider boss lanes and larger visible projectiles without changing damage or hit radius',()=>{
  const samples=[];
  for(const id of ['E04','E06','B01','B02','B03']){
    const f=fixture(),e=f.add(id,1760);e.age=2;e.cooldown=0;
    f.step();const a=e.action;assert.equal(a.spec.kind,'shot');
    const lanes=a.hazards;assert.equal(lanes.length,a.spec.count??1);
    for(const h of lanes){
      assert.equal(h.kind,'lane');assert(h.width>=24);assert(distance(h.from,h.to)>=a.spec.range-e.size);
      assert.equal(h.damage,0);close(h.warning,a.spec.windup);
    }
    f.run(a.spec.windup-.03);assert.equal(f.system.attacks.projectiles.length,0);
    f.run(.04);const shots=f.system.attacks.projectiles;assert.equal(shots.length,lanes.length);
    for(const [i,p] of shots.entries()){
      close(Math.atan2(p.vy,p.vx),Math.atan2(lanes[i].to.y-lanes[i].from.y,lanes[i].to.x-lanes[i].from.x));
      close(p.radius,enemyCombatConfig.projectileRadius);assert(p.visualScale>1);
    }
    samples.push({width:lanes[0].width,scale:shots[0].visualScale});
  }
  for(const boss of samples.slice(2)){assert(boss.width>samples[0].width);assert(boss.scale>samples[0].scale);}
});
test('Document roster maps all 17 normal, 3 elite and 3 bosses to distinct existing transparent atlas frames',()=>{
  const {readPng}=require('../scripts/read-player-png.cjs');const frames=new Set();
  assert.equal(enemyIds.length,23);
  for(let sheet=0;sheet<4;sheet++){
    const atlas=JSON.parse(fs.readFileSync(path.join(__dirname,`../public/assets/enemies/sheet-${sheet}.json`)));
    const png=readPng(path.join(__dirname,`../public/assets/enemies/sheet-${sheet}.png`));
    for(const id of enemyIds.filter(id=>enemyRoster[id].sheet===sheet)){
      const d=enemyRoster[id],frame=atlas.frames[d.frame].frame;frames.add(`${sheet}/${d.frame}`);
      assert(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=png.width&&frame.y+frame.h<=png.height);
      let visible=0,empty=0;
      for(let y=frame.y;y<frame.y+frame.h;y++)for(let x=frame.x;x<frame.x+frame.w;x++){
        const alpha=png.pixels[(y*png.width+x)*4+3];if(alpha>128)visible++;if(alpha===0)empty++;
      }
      assert(visible>3000&&empty>1000,id+' must contain one alpha-isolated drawing');
    }
  }
  assert.equal(frames.size,23);
});
test('All 15 stages match independent documented wave totals, elite delays, 322 base and at most 34 normal summons',()=>{
  assert.equal(stages.length,15);
  const expected=[[6,10,12],[8,10,9],[9,11,11],[8,10,13],[1],[8,9,10],[8,9,9],[7,10,8],[9,9,11],[1],[7,8,7],[8,8,10],[6,8,8],[8,9,11],[1]];
  let base=0,summons=0;
  for(let i=0;i<15;i++){
    assert.deepEqual(stages[i].waves.map(w=>w.reduce((n,e)=>n+e.count,0)),expected[i]);
    for(const wave of stages[i].waves)for(const e of wave){
      assert(enemyRoster[e.id]);if(!e.id.startsWith('B'))base+=e.count;
      if(['E13','E14','X02'].includes(e.id))summons+=e.count*(e.id==='X02'?6:4);
    }
  }
  assert.equal(base,322);assert.equal(summons,34);
  const delayed=stages.flatMap((s,i)=>s.waves.flatMap((w,j)=>w.filter(e=>e.delay).map(e=>[i+1,j+1,e.id,e.delay])));
  assert.deepEqual(delayed,[[3,3,'X01',2],[8,3,'X02',2],[9,3,'X01',2],[13,3,'X03',2],[14,3,'X01',2]]);
  assert.equal(Object.values(bossCalls).flat().reduce((n,c)=>n+c.ids.length,0),18);
});
test('Stage spawns are safe and off camera across seeds; kills advance three fixed waves after exactly four seconds and never refill mid-wave',()=>{
  for(const seed of [1,17,99]){
    const f=fixture(seed);f.system.initialize(f.player,f.viewport);
    assert.equal(f.system.enemies.length,6);
    for(const e of f.system.enemies){assert(!isInViewport(e,e.size,f.viewport));assert(canOccupy(e,e.size,f.world,[f.player,...f.system.enemies.filter(o=>o!==e)]));}
    f.system.enemies[0].hp=0;f.system.removeDefeated();f.run(3.5);assert.equal(f.system.enemies.length,5);
    for(const e of f.system.enemies)e.hp=0;f.system.removeDefeated();
    f.run(3.99);assert.equal(f.system.enemies.length,0);f.run(.02);
    assert.equal(f.system.wave,1);assert.equal(f.system.enemies.length,10);
  }
});
test('Empty coat has no contact damage, waits its spawn grace and windup, locks direction, then deals six percent once',()=>{
  const f=fixture();const e=f.add('E01',1565);e.cooldown=0;
  f.run(.99);assert.equal(f.player.hp,100);assert.equal(e.action,undefined);
  f.run(.02);assert.equal(e.action.phase,'windup');const angle=e.action.angle;
  f.player.y+=8;f.run(.45);assert.equal(f.player.hp,100);close(e.action.angle,angle);
  f.run(.15);close(f.player.hp,94);f.run(.5);close(f.player.hp,94);
});
test('Dead windup is canceled; a fired paper projectile survives ordinary owner death, while last kill clears all enemy hazards',()=>{
  const f=fixture();const e=f.add('E04',1720);f.add('E01',2300);e.age=2;e.cooldown=0;
  f.step();assert.equal(e.action.phase,'windup');e.hp=0;f.system.removeDefeated();assert.equal(f.system.attacks.hazards.length,0);
  const s=f.add('E04',1720),other=f.add('E01',2200);s.age=2;s.cooldown=0;
  f.run(.7);assert(f.system.attacks.projectiles.length>0);s.hp=0;f.system.removeDefeated();
  f.run(1);assert(f.player.hp<100);other.hp=0;f.system.removeDefeated();assert.equal(f.system.attacks.projectiles.length,0);
});
test('Burst direction stays fixed, shotgun groups hit once and at most two ranged actions start together',()=>{
  const f=fixture();
  for(let i=0;i<5;i++){const e=f.add('E05',1700,1400+i*45);e.age=2;e.cooldown=0;}
  f.step();assert.equal(f.system.enemies.filter(e=>e.action).length,2);
  const a=f.system.enemies[0].action;const angle=a.angle;f.player.y+=100;f.run(1.3);close(a.angle,angle);
  const attacks=new EnemyAttackSystem(),p=createCombatant({id:0,x:100,y:100,size:48},'player',100,0);
  const group=attacks.group();for(let i=0;i<5;i++)attacks.hazard(7,'circle',p,p,{radius:100,damage:.04,group,cancelWithOwner:false,duration:2});
  attacks.update(.1,p,[],f.world,d=>d);close(p.hp,96);p.invulnerableSeconds=0;attacks.update(.5,p,[],f.world,d=>d);close(p.hp,96);
});
test('Lob fixes its displayed position and applies only the delayed explosion without a residual zone',()=>{
  const f=fixture();const e=f.add('E07',1720);e.age=2;e.cooldown=0;
  f.step();const h=f.system.attacks.hazards.find(h=>h.kind==='circle');assert(h);const target={...h.from};
  f.player.y+=180;f.run(1.2);assert.equal(f.player.hp,100);assert.deepEqual(h.from,target);
  f.run(.3);assert.equal(f.player.hp,100);assert.equal(f.system.attacks.hazards.length,0);
});
test('Guard damage reduction uses source direction, caps relay combination at 70 percent, and exposes its front in recovery',()=>{
  const f=fixture();const e=f.add('E09',1560);e.facingAngle=Math.PI;e.frontalReduction=.7;e.damageReduction=.25;
  close(receivedDamage(e,f.player,100),30);close(receivedDamage(e,{id:9,size:0,x:1700,y:1500},100),75);
  e.age=2;e.cooldown=0;f.step();assert.equal(e.action.phase,'windup');f.run(1);assert.equal(e.action.phase,'recovery');close(e.frontalReduction,0);
  const character=new CharacterCombat('signal',f.player);character.prepare(0,f.player,[e]);
  character.update(.01,f.world,f.viewport);assert(e.hp<e.maxHp,'actual character attacks can damage the new enemy');
});
test('A triple sack killed during its warning cancels every explosion; successful cluster has three delayed children in one hit group',()=>{
  const f=fixture();const e=f.add('E12',1570);e.age=2;e.cooldown=0;f.step();e.hp=0;f.system.removeDefeated();f.run(2);close(f.player.hp,100);
  const g=fixture();const sack=g.add('E12',1570);g.add('E01',2300);sack.age=2;sack.cooldown=0;g.run(1.25);
  const circles=g.system.attacks.hazards.filter(h=>h.kind==='circle'&&!h.cancelWithOwner&&h.warning>0);assert.equal(circles.length,3);
  assert.equal(new Set(circles.map(h=>h.group)).size,1);close(g.player.hp,90);
});
test('Summoners obey first delay, per-caster alive limits, global four alive and two successful casts; caster death cancels pending summon',()=>{
  const f=fixture();const e=f.add('E13',1750);f.run(1.99);assert(!e.action);f.run(.04);assert.equal(e.action.spec.kind,'summon');
  f.run(1.4);assert.equal(e.summonCount,1);assert.equal(f.system.enemies.filter(t=>t.summonedBy===e.id).length,2);
  f.run(10);assert.equal(e.summonCount,1);
  for(const t of f.system.enemies)if(t.summonedBy)t.hp=0;f.system.removeDefeated();f.run(10);
  assert.equal(e.summonCount,2);assert(f.system.enemies.filter(t=>t.hp>0&&t.summonedBy).length<=4);
  const g=fixture();const s=g.add('E14',1750);g.run(2.1);s.hp=0;g.system.removeDefeated();g.run(2);assert.equal(g.system.enemies.length,0);
});
test('Relay protects two eligible neighbors, never itself/relay/boss, expires without retargeting and releases immediately on death',()=>{
  const f=fixture();const r=f.add('E17',1760),a=f.add('E01',1660),b=f.add('E09',1820),other=f.add('E17',1880),boss=f.add('B01',1980);
  for(const e of [a,b,other,boss])e.cooldown=100;
  r.age=2;r.cooldown=0;f.run(1.3);assert.equal(r.shieldTargets.length,2);assert(r.shieldTargets.includes(a.id)&&r.shieldTargets.includes(b.id));
  close(a.damageReduction,.25);close(boss.damageReduction,0);close(other.damageReduction,0);
  r.hp=0;f.system.removeDefeated();close(a.damageReduction,0);close(b.damageReduction,0);
});
test('Beam clips against the first wall, waits its full warning and its maintained line damages at most once',()=>{
  const f=fixture();f.world.obstacles.push({x:1600,y:1500,size:50,shape:'rectangle'});
  const end=f.system.attacks.clippedEnd({x:1750,y:1500},{x:1400,y:1500},48,f.world);close(end.x,1649);
  const g=fixture();const e=g.add('E16',1800);e.age=2;e.cooldown=0;g.step();g.run(1.15);close(g.player.hp,100);g.run(.12);close(g.player.hp,90);g.run(.35);close(g.player.hp,90);
});
test('Hook pulls over time without stun, stops before hazards/obstacles and grants two-second re-pull immunity',()=>{
  const f=fixture();const e=f.add('E15',1800);e.age=2;e.cooldown=0;f.run(1.15);
  const before=f.player.x;f.run(.35);assert(f.player.x>before,'hook must actually move its target');assert(f.player.x<=1596.01);assert(f.system.attacks.pullImmunity>1.5);
  assert(canOccupy(f.player,f.player.size,f.world,f.system.enemies));assert.equal(f.player.attackLockSeconds,0);
});
test('Elite charge and cutter show a fresh direction and full second warning, retain special ownership, then release it',()=>{
  for(const id of ['X01','X03']){
    const f=fixture();f.player.invulnerableSeconds=100;const e=f.add(id,1780);e.age=2;e.cooldown=0;
    const firstWindup=enemyAttacks[id].windup;f.run(firstWindup+.65);
    f.player.y+=100;f.run(.3);
    assert(e.action&&e.action.repeats===1,id);assert.equal(f.system.specialOwner,e.id);
    const first=e.action;
    for(let time=0;time<4&&e.action===first;time+=1/120)f.step();
    assert.notEqual(e.action,first,'first complete sequence must finish');
    if(e.action===undefined)assert.equal(f.system.specialOwner,undefined);
  }
});
test('Boss transition finishes its active attack, keeps HP damageable, queues threshold calls in order and clears adds on death',()=>{
  const f=fixture();f.player.invulnerableSeconds=100;const e=f.add('B02',1800);e.age=3;e.cooldown=0;f.step();assert(e.action);
  e.hp=e.maxHp*.2;f.run(.2);assert.equal(e.phase,1,'do not cancel a running pattern on threshold');
  f.run(3);assert.equal(e.phase,2);assert(e.transition>0||e.called>0);
  const before=e.hp;e.hp-=20;assert.equal(e.hp,before-20,'no threshold HP lock');
  f.run(3);assert.equal(e.called,1);assert.equal(f.system.enemies.filter(t=>t.bossAdd===e.id).length,4);
  for(const t of f.system.enemies)if(t.bossAdd)t.hp=0;f.system.removeDefeated();f.run(6);
  assert.equal(e.called,2);e.hp=0;f.system.removeDefeated();assert.equal(f.system.enemies.length,0);assert.equal(f.system.attacks.hazards.length,0);
});
test('A full fixed-wave traversal reaches victory and resets independently, with exactly 322 base enemies and three bosses',()=>{
  const f=fixture();f.system.initialize(f.player,f.viewport);let base=0,bosses=0;
  for(let i=0;i<50&&!f.system.complete;i++){
    f.run(2.01); // include delayed elite appearances
    for(const e of f.system.enemies){if(e.archetype.startsWith('B'))bosses++;else base++;e.hp=0;}
    f.system.removeDefeated();f.run(4.01);
  }
  assert(f.system.complete);assert.equal(base,322);assert.equal(bosses,3);
  const fresh=fixture();fresh.system.initialize(fresh.player,fresh.viewport);assert.equal(fresh.system.stage,0);assert.equal(fresh.system.wave,0);assert.equal(fresh.system.enemies.length,6);
});

test('Ranged enemies enter a short viewport before attacking and seek a visible shot around scenery instead of freezing in range',()=>{
  const f=fixture();f.viewport.x=1400;f.viewport.y=1400;f.viewport.width=200;f.viewport.height=200;
  const e=f.add('E04',1500,1800);e.age=2;e.cooldown=0;
  f.run(3);assert(isInViewport(e,e.size,f.viewport));assert(f.player.hp<100,'shooter must enter, fire and actually hit');
  const g=fixture();g.world.obstacles.push({shape:'rectangle',x:1625,y:1500,size:70});
  const s=g.add('E04',1750);s.age=2;s.cooldown=0;g.run(8);
  assert(g.player.hp<100,'blocked shooter must find a firing angle and deal actual damage');
});
test('Config rejects non-finite counts, timing and zero collision steps before any attack loop starts',()=>{
  const {navigationConfig}=require('../src/config/navigation.ts');
  for(const [object,key,bad,label] of [[enemyAttacks.E05,'bursts',Infinity,'bursts'],[enemyAttacks.E05,'gap',0,'gap'],[enemyAttacks.E01,'windup',NaN,'windup'],[navigationConfig,'collisionStep',0,'collisionStep'],[stages[0].waves[0][0],'count',-1,'count']]){
    const previous=object[key];try{object[key]=bad;assert.throws(()=>fixture(),new RegExp(label));}finally{object[key]=previous;}
  }
});
test('A relay killed by an earlier hit stops protecting the very next character hit in the same simulation step',()=>{
  const f=fixture();const r=f.add('E17',1760),e=f.add('E01',1680);e.cooldown=100;r.age=2;r.cooldown=0;
  f.run(1.3);close(receivedDamage(e,f.player,100),75);
  r.hp=0;close(receivedDamage(e,f.player,100),100);
});
