const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('node:module').registerHooks({ resolve(s,c,next) { return next(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c); } });
const { PlatformWorld } = require('../src/world/PlatformWorld.ts');
const { PlatformWorldView, preloadPlatform, validateJourneyArt } = require('../src/world/PlatformWorldView.ts');
const { journeyConfig, journeyStages, journeyProps, journeyPropVariants, journeyStage, nextLocation } = require('../src/config/journey.ts');
const { platformConfig } = require('../src/config/platform.ts');
const { worldConfig } = require('../src/config/world.ts');
const { canOccupy, moveBody, lineIsClear, isInViewport } = require('../src/world/geometry.ts');
const { StageEnemySystem } = require('../src/enemies/StageEnemySystem.ts');
const { stages } = require('../src/config/encounters.ts');
const { createCombatant } = require('../src/combat/types.ts');
const player = (x,y) => createCombatant({id:0,x,y,size:48},'player',100,24);
const random = initial => { let seed=initial; return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}; };

test('Finite platform prevents crossing all four edges and leaves continuous central and perimeter escape lanes', () => {
  const w=new PlatformWorld();
  assert(!w.unbounded);assert.equal(w.obstacles.length,12);
  for(const [x,y,dx,dy,expected] of [
    [200,600,-1000,0,[24,600]], [w.width-200,600,1000,0,[w.width-24,600]],
    [1800,200,0,-1000,[1800,24]], [1800,w.height-200,0,1000,[1800,w.height-24]],
    [200,200,-1000,-1000,[24,24]], [w.width-200,w.height-200,1000,1000,[w.width-24,w.height-24]],
  ]) {const p=player(x,y);moveBody(p,dx,dy,w,[]);assert.deepEqual([p.x,p.y],expected);assert(canOccupy(p,48,w));}
  for(const y of [100,w.height/2,w.height-100]) assert(lineIsClear({x:100,y},{x:w.width-100,y},96,w,[]));
  for(const o of w.obstacles){const p=player(o.x,o.y-200);moveBody(p,0,400,w,[]);assert(p.y<=o.y-o.height/2-24);assert(canOccupy(p,48,w));}
});

test('Clamped view includes small perimeter scenery without changing the combat floor at any stage', () => {
  const w=new PlatformWorld(),b=w.bounds;
  assert.equal(w.width,3600);assert.equal(w.height,1200);
  assert.equal(b.x,-journeyConfig.leftBorder);assert.equal(b.y,-journeyConfig.topBorder);
  assert.deepEqual(w.viewport({x:24,y:24},1280,720),{x:b.x,y:b.y,width:1280,height:720});
  assert.deepEqual(w.viewport({x:w.width-24,y:w.height-24},1280,720),{x:b.x+b.width-1280,y:b.y+b.height-720,width:1280,height:720});
  assert.deepEqual(w.viewport({x:0,y:0},b.width+200,b.height+100),{x:b.x-100,y:b.y-50,width:b.width+200,height:b.height+100});
});

test('At center, edges and corners six enemies spawn inside the platform and outside the actual camera, then approach', () => {
  for(const seed of [1,17,83]) for(const [x,y] of [[1800,600],[24,600],[3576,600],[1800,24],[1800,1176],[24,24],[3576,24],[24,1176],[3576,1176]]) {
    const w=new PlatformWorld(),p=player(x,y),v=w.viewport(p,1280,720),s=new StageEnemySystem(w,random(seed));
    s.initialize(p,v);assert.equal(s.enemies.length,6,`seed ${seed}, ${x},${y}`);
    const initial=s.enemies.map(e=>Math.hypot(e.x-p.x,e.y-p.y));
    for(const e of s.enemies){assert(canOccupy(e,e.size,w));assert(!isInViewport(e,e.size,v));}
    for(let i=0;i<120;i++)s.update(1/60,p,v);
    assert(s.enemies.some((e,i)=>Math.hypot(e.x-p.x,e.y-p.y)<initial[i]-10));
    for(const e of s.enemies)assert(canOccupy(e,e.size,w,[p,...s.enemies.filter(other=>other!==e)]));
  }
});

test('Fifteen backgrounds switch in place with small perimeter details, stable collisions and foreground fading', () => {
  const nodes=[],loaded=[],frames=[];
  const node=(x,y,key,frame)=>{const n={x,y,key,frame,setOrigin(x,y){this.origin=[x,y];return this},setVisible(v){this.visible=v;return this},setSize(w,h){this.width=w;this.height=h;return this},setTexture(k,f){this.key=k;this.frame=f;return this},setTileScale(x,y){this.tileScale=[x,y];return this},setDisplaySize(w,h){this.width=w;this.height=h;return this},setDepth(d){this.depth=d;return this},setAlpha(a){this.alpha=a;return this}};nodes.push(n);return n;};
  const dimensions=Object.fromEntries(Object.values(journeyPropVariants).flat().map(p=>{const b=require('node:fs').readFileSync(path.join(__dirname,'../public',p.image));return [p.key,{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}];}));
  const scene={textures:{exists:()=>false,get:key=>({has:()=>false,add:(...args)=>frames.push(args),getSourceImage:()=>dimensions[key]??({width:2048,height:768})})},load:{image:(...args)=>loaded.push(args)},add:{image:node,tileSprite:(x,y,w,h,k,f)=>node(x,y,k,f).setDisplaySize(w,h)}};
  preloadPlatform(scene);assert.equal(loaded.length,25);
  const w=new PlatformWorld(),view=new PlatformWorldView(scene,w),o=w.obstacles[0];
  const p={x:o.x,y:o.y-36},obstacles=JSON.stringify(w.obstacles);
  for(let stage=0;stage<15;stage++){
    view.sync(w.viewport(p,1280,720),p,stage);assert.equal(nodes[9].alpha,platformConfig.occlusionAlpha);
    assert.equal(view.floor.key,journeyStages[stage].key);assert.equal(nodes[9].key,journeyProps[journeyStages[stage].chapter].key);
    const prop=journeyProps[journeyStages[stage].chapter],size=dimensions[prop.key];
    assert.equal(nodes[9].width,prop.width);assert.equal(nodes[9].height,prop.width*size.height/size.width);
    assert.deepEqual(nodes[9].origin,[0.5,prop.originY]);
    for(const [i,o] of w.obstacles.entries()){
      const variant=journeyPropVariants[journeyStages[stage].chapter][o.variant],n=nodes[9+i];
      assert.equal(n.key,variant.key);assert.equal(n.width,variant.width);
      assert.deepEqual([n.x,n.y],[o.x,o.y]);
      const behind={x:o.x,y:o.y-24};view.sync(w.viewport(behind,1280,720),behind,stage);
      assert.equal(n.alpha,platformConfig.occlusionAlpha,'each variant fades independently');
      const ahead={x:o.x,y:o.y+80};view.sync(w.viewport(ahead,1280,720),ahead,stage);assert.equal(n.alpha,1);
    }
    assert.equal(view.floor.width,3600);assert.equal(view.floor.height,1200);
    assert.equal(view.floor.tileScale[0],journeyStages[stage].floorScale??journeyConfig.floorDetailScale);
    assert.equal(nodes[1].tileScale[0],journeyConfig.borderDetailScale);assert.equal(nodes[2].height,journeyConfig.bottomBorder);
    assert.equal(JSON.stringify(w.obstacles),obstacles);assert.equal(nodes[21].visible,stage===14);
  }
  view.sync(w.viewport({x:3500,y:1100},1280,720),{x:3500,y:1100},14);assert.equal(nodes[9].alpha,1);
  assert.equal(nodes.length,22);assert.equal(view.floor.x,0);
  const floorFrames=frames.filter(f=>f[0]==='floor');
  assert.deepEqual(floorFrames[0].slice(2),[92,142,1864,452],'wall columns must not repeat across the walkable floor');
  assert.deepEqual(floorFrames.at(-1).slice(2),[1728,438,128,128],'final ring is excluded from the repeated floor');
  assert.equal(nodes[21].key,'journey-erasure-mark');assert.deepEqual([nodes[21].x,nodes[21].y],[1800,600]);
  view.sync(w.viewport(p,1280,720),p,0);assert.equal(nodes[21].visible,false,'final marking disappears on restart');
});

test('Mixed prop clusters keep twelve separate solid footprints, nine distinct assets and open escape lanes',()=>{
  const w=new PlatformWorld(),keys=new Set(),{readPng}=require('../scripts/read-player-png.cjs');
  for(const variants of Object.values(journeyPropVariants))for(const [i,prop] of variants.entries()){
    keys.add(prop.key);
    const png=readPng(path.join(__dirname,'../public',prop.image));
    assert.equal(png.pixels[3],0,'asset corner is transparent');
    let bottom=0,left=png.width,right=0;
    for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++)if(png.pixels[(y*png.width+x)*4+3]>200){bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
    const footprint=i===0?{width:platformConfig.footprintWidth,height:platformConfig.footprintHeight}:platformConfig.companionOffsets[i-1];
    const scale=prop.width/png.width;
    assert(Math.abs(bottom*scale-png.height*scale*prop.originY-footprint.height/2)<4,`${prop.key}: base alignment`);
    assert((right-left)*scale>=footprint.width,`${prop.key}: solid footprint stays inside visible width`);
  }
  assert.equal(keys.size,9);assert.equal(w.obstacles.length,12);
  for(const o of w.obstacles){
    assert(!canOccupy(o,24,w),'each visible object blocks movement');
    for(const other of w.obstacles)if(other!==o)assert(Math.abs(o.x-other.x)>=(o.width+other.width)/2||Math.abs(o.y-other.y)>=(o.height+other.height)/2,'footprints do not overlap');
  }
  assert(lineIsClear({x:100,y:600},{x:3500,y:600},192,w,[]),'wide central lane');
  for(const x of [100,1800,3500])assert(lineIsClear({x,y:100},{x,y:1100},96,w,[]),'vertical escape lanes');
});

test('Prop cutouts align their visible base with the collision footprint and keep clear transparent margins',()=>{
  const {readPng}=require('../scripts/read-player-png.cjs');
  for(const [chapter,prop] of Object.entries(journeyProps)){
    const {width,height,pixels}=readPng(path.join(__dirname,'../public',prop.image));
    let left=width,right=0,top=height,bottom=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const alpha=pixels[(y*width+x)*4+3];
      if(y<height*0.08||y>height*0.94)assert.equal(alpha,0,`${chapter}: no opaque background or glow in margins`);
      if(alpha>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    const scale=prop.width/width;
    assert(Math.abs(bottom*scale-height*scale*prop.originY-platformConfig.footprintHeight/2)<4,`${chapter}: base must meet footprint front edge`);
    assert((right-left)*scale>=platformConfig.footprintWidth,`${chapter}: visible width covers collision`);
    assert((right-left)*scale<=platformConfig.footprintWidth+40,`${chapter}: avoid oversized lateral overhang`);
    assert((bottom-top)*scale<=platformConfig.footprintHeight+16,`${chapter}: low props fit the elevated camera`);
  }
  const w=new PlatformWorld();
  assert.equal(new Set(w.obstacles.filter(o=>o.variant===0).map(o=>o.x)).size,2,'two aligned facility columns');
  assert.equal(new Set(w.obstacles.filter(o=>o.variant===0).map(o=>o.y)).size,2,'two aligned facility rows');
});

test('Every stage wave can finish its scheduled spawns while the player waits at either platform end', () => {
  for(const [stageIndex,stage] of stages.entries()) for(const [waveIndex,wave] of stage.waves.entries()) for(const x of [24,3576]) {
    const w=new PlatformWorld(),p=player(x,600),v=w.viewport(p,1280,720),s=new StageEnemySystem(w,random(stageIndex*3+waveIndex+1));
    s.stage=stageIndex;s.wave=waveIndex;s.initialize(p,v);
    const duration=Math.max(...wave.map(group=>group.delay))+1;
    for(let elapsed=0;elapsed<duration;elapsed+=.25)s.update(.25,p,v);
    assert.equal(s.enemies.length,wave.reduce((sum,group)=>sum+group.count,0),`stage ${stageIndex+1}, wave ${waveIndex+1}, x ${x}`);
    for(const e of s.enemies)assert(canOccupy(e,e.size,w));
  }
});

test('Invalid platform dimensions and image floor mapping are rejected before placement', () => {
  for(const prop of Object.values(journeyPropVariants).flat())for(const key of ['width','originY']){
    const before=prop[key];try{for(const value of [0,-1,NaN,Infinity,...(key==='originY'?[1.1]:[])]){prop[key]=value;assert.throws(()=>validateJourneyArt(),/journey.props/);}}finally{prop[key]=before;}
  }
  for(const key of ['width','height']){const before=worldConfig[key];try{for(const value of [0,-1,NaN,Infinity]){worldConfig[key]=value;assert.throws(()=>new PlatformWorld(),new RegExp('world.'+key));}}finally{worldConfig[key]=before;}}
  const rect=journeyStages[0].floor;try{journeyStages[0].floor={x:1,y:1,width:2048,height:768};assert.throws(()=>validateJourneyArt(),/journey.0.floor/);}finally{journeyStages[0].floor=rect;}
  for(const invalid of [-1,15,NaN,.5])assert.throws(()=>journeyStage(invalid),/journey.stage/);
  const inset=journeyConfig.floorInset;
  try{for(const value of [-1,NaN,Infinity,0.5,1000]){journeyConfig.floorInset=value;assert.throws(()=>validateJourneyArt(),/journey/);}}finally{journeyConfig.floorInset=inset;}
});

test('Journey binds every stage to a unique location and both boss exits to the next chapter', () => {
  assert.equal(journeyStages.length,stages.length);assert.equal(new Set(journeyStages.map(s=>s.file)).size,15);
  assert.deepEqual(journeyStages.map(s=>s.chapter),[...Array(5).fill('boarding'),...Array(5).fill('onboard'),...Array(5).fill('terminal')]);
  assert.equal(nextLocation(4),'NULL LINE 탑승');assert.equal(nextLocation(9),'종착 말소 시설 진입');
  assert.equal(journeyStage(14).name,'말소 경계 · 최종 집행실');
});

test('Every configured location loads a distinct production PNG with the inspected source dimensions',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),hashes=new Set();
 for(const theme of journeyStages){
  const bytes=fs.readFileSync(path.join(__dirname,'../public',journeyConfig.path,theme.file));
  assert.equal(bytes.readUInt32BE(16),journeyConfig.sourceWidth,theme.file);assert.equal(bytes.readUInt32BE(20),journeyConfig.sourceHeight,theme.file);
  hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(hashes.size,15,'backgrounds must be different artwork, not aliases');
});


