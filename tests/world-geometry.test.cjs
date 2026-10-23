const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
require('node:module').registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c);}});
const {canOccupy,moveBody,lineIsClear,overlapsObstacle}=require('../src/world/geometry.ts');
const {obstacleBulletHit}=require('../src/combat/hitDetection.ts');
const {NavigationGrid}=require('../src/enemies/NavigationGrid.ts');
const {StageEnemySystem}=require('../src/enemies/StageEnemySystem.ts');
const {EnemyAttackSystem}=require('../src/combat/EnemyAttackSystem.ts');
const {CombatSystem}=require('../src/combat/CombatSystem.ts');
const {CharacterCombat}=require('../src/combat/CharacterCombat.ts');
const {createCombatant}=require('../src/combat/types.ts');
const empty=()=>({width:3000,height:3000,unbounded:true,obstacles:[]});
const player=(x,y)=>createCombatant({id:0,x,y,size:48},'player',100,24);
const viewport=p=>({x:p.x-640,y:p.y-360,width:1280,height:720});
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('Player crosses the old floor edges and negative coordinates without wrapping; facility and actor collisions still stop movement',()=>{
 const w=empty(),p=player(-4096,-100);
 for(let i=0;i<180;i++){moveBody(p,100,0,w,[]);assert(canOccupy(p,48,w));}
 close(p.x,13904);close(p.y,-100);
 moveBody(p,1000,0,w,[{id:1,x:p.x+100,y:p.y,size:48}]);assert(p.x<=13956);
 const o={x:p.x+500,y:p.y,size:128,width:128,height:64,shape:'rectangle'};w.obstacles.push(o);const walker=player(o.x-250,o.y);moveBody(walker,500,0,w,[]);
 assert(walker.x<=o.x-o.width/2-24+1e-6);assert(canOccupy(walker,48,w));
});

test('Rectangular facility footprints use their actual width and height for movement, line of sight and circular projectiles',()=>{
 const obstacle={x:-500,y:-500,size:128,width:128,height:64,shape:'rectangle'},w={...empty(),obstacles:[obstacle]};
 assert.equal(overlapsObstacle({x:-500,y:-444},48,obstacle),false);
 assert.equal(overlapsObstacle({x:-500,y:-444.001},48,obstacle),true);
 assert.equal(lineIsClear({x:-700,y:-435},{x:-300,y:-435},64,w,[]),true);
 assert.equal(lineIsClear({x:-700,y:-436},{x:-300,y:-436},64,w,[],'circle'),false);
 close(obstacleBulletHit({x:-700,y:-500},{x:-300,y:-500},10,obstacle),126/400);
});

test('Navigation and stage spawns work around scenery at negative and distant coordinates',()=>{
 const w={...empty(),width:2048,height:2048,originX:-1536,originY:-1536,
  obstacles:[{x:-500,y:-500,size:160,width:160,height:240,shape:'rectangle'}]};
 const grid=new NavigationGrid(w,32),from={x:-800,y:-500},to={x:-200,y:-500},route=grid.findPath(from,to,[]);
 assert(route.length>2);let previous=from;for(const p of route){assert(lineIsClear(previous,p,32,w,[]));previous=p;}assert.deepEqual(route.at(-1),to);
 for(const location of [{x:-12000,y:-9000},{x:25000,y:14000}]){
  const world={...empty(),originX:location.x-1500,originY:location.y-1500,
   obstacles:[{x:location.x+400,y:location.y,size:128,width:128,height:64,shape:'rectangle'}]};const p=player(location.x,location.y);
  let seed=17;const system=new StageEnemySystem(world,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;});
  system.initialize(p,viewport(p));assert.equal(system.enemies.length,6);
  const start=system.enemies.map(e=>Math.hypot(e.x-p.x,e.y-p.y));
  for(let i=0;i<120;i++){system.update(1/60,p,viewport(p));}
  assert(system.enemies.some((e,i)=>Math.hypot(e.x-p.x,e.y-p.y)<start[i]-10));
  for(const e of system.enemies)assert(canOccupy(e,e.size,world,[p,...system.enemies.filter(t=>t!==e)]));
 }
});

test('Player, auxiliary and enemy projectiles deal damage beyond the old positive and negative world edges; beam clipping still respects scenery',()=>{
 for(const [x,y] of [[-500,-500],[15000,15000]]){
  const w=empty(),p=player(x,y),target=createCombatant({id:1,x:x+240,y,size:32},'enemy',1000,0);
  target.kind='horizontal';target.state='wait';
  const combat=new CombatSystem('bullet');for(let i=0;i<40;i++)combat.update(1/60,p,[target],w,viewport(p));
  assert(target.hp<1000,'player projectile must not disappear at the old floor edge');
  const auxiliary=new CharacterCombat('signal',p);auxiliary.mainTimer=100;
  auxiliary.shots.push({x:x+32,y,vx:600,vy:0,age:0,hitIds:new Set(),config:{radius:5,lifetime:1,pierce:1,explosion:0},
    payload:{damage:24,direct:false,knockback:0,hits:0,ranks:auxiliary.progression.levels}});
  const before=target.hp;for(let i=0;i<50;i++){auxiliary.prepare(1/60,{x:p.x,y:p.y},[target]);auxiliary.update(1/60,w,viewport(p));}
  assert(target.hp<before,'auxiliary projectile must retain damage outside old bounds');
  const attacks=new EnemyAttackSystem(),victim=player(x+240,y);attacks.shoot(p,0,.1,attacks.group());
  attacks.update(.1,victim,[],w,d=>d);assert.equal(attacks.projectiles.length,1);
  attacks.update(1,victim,[],w,d=>d);close(victim.hp,90);
  assert.deepEqual(attacks.clippedEnd({x,y},{x:x+400,y},10,w),{x:x+400,y});
  w.obstacles.push({x:x+200,y,size:128,width:128,height:64,shape:'rectangle'});
  close(attacks.clippedEnd({x,y},{x:x+400,y},10,w).x,x+131);
 }
});

