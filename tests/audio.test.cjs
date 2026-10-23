const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('node:module').registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c);}});
const {AudioDirector}=require('../src/audio/AudioDirector.ts');
const {audioConfig,soundCatalog,soundGroups,musicFiles,musicForStage,soundUrl}=require('../src/config/audio.ts');
const {CharacterCombat}=require('../src/combat/CharacterCombat.ts');
const {createCombatant}=require('../src/combat/types.ts');
const {EnemyAttackSystem}=require('../src/combat/EnemyAttackSystem.ts');
const {StageEnemySystem}=require('../src/enemies/StageEnemySystem.ts');
const {ExperienceSystem}=require('../src/experience/ExperienceSystem.ts');
const {enemyAttacks}=require('../src/config/enemyAttacks.ts');
const {gameAudio}=require('../src/audio/GameAudio.ts');
const {EventEmitter}=require('node:events');

test('Accessible click activates audio without pointerdown, and game disposal removes the unlock listener',async()=>{
 const saved=Object.fromEntries(['window','document','AudioContext','fetch'].map(k=>[k,global[k]]));
 const parameter=()=>({value:0});
 class Context{
  state='suspended';currentTime=0;destination={};resumes=0;
  createGain(){return{gain:parameter(),connect(){}};}
  createDynamicsCompressor(){return{threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){}};}
  async decodeAudioData(){return{};}
  async resume(){this.resumes++;this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
 }
 const events=new EventEmitter();let director;
 try{
  global.window=new EventTarget();global.document=Object.assign(new EventTarget(),{hidden:false});global.AudioContext=Context;
  global.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
  director=gameAudio({game:{events}});const context=director.output.context;
  assert.equal(context.state,'suspended');window.dispatchEvent(new Event('click'));await Promise.resolve();
  assert.equal(context.state,'running');
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(context.state,'suspended');
  document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(context.state,'running');
  events.emit('destroy');const resumes=context.resumes;window.dispatchEvent(new Event('click'));assert.equal(context.resumes,resumes);
  await new Promise(resolve=>setImmediate(resolve));
 }finally{
  events.emit('destroy');
  for(const [key,value]of Object.entries(saved)){if(value===undefined)delete global[key];else global[key]=value;}
 }
});

function output(){
 let time=0;const voices=[],missing=new Set();
 return {voices,missing,now:()=>time,advance:t=>{time+=t;},play(id,gain,loop,pan){
  if(missing.has(id))return;
  let end=Infinity;const voice={id,gain,loop,pan,fades:[],get ended(){return time>=end;},
   fade(gain,seconds){voice.gain=gain;voice.fades.push({gain,seconds});},stop(after=0){end=time+after;}};
  voices.push(voice);return voice;
 }};
}
function active(o,loop=false){return o.voices.filter(v=>v.loop===loop&&!v.ended);}
const world={width:3000,height:3000,obstacles:[],unbounded:false};
const view={x:0,y:0,width:1280,height:720};
const player=()=>createCombatant({id:0,x:500,y:350,size:32},'player',120,24);
const enemy=(id,x=570,y=350)=>({...createCombatant({id,x,y,size:32},'enemy',500,0),archetype:'E01'});

test('Every configured sound exists and all seven stage tracks have Ogg headers',()=>{
 assert.equal(Object.keys(soundCatalog).length,57);assert.equal(Object.keys(musicFiles).length,7);
 for(const [id,[group,gain,gap]]of Object.entries(soundCatalog)){
  assert(soundGroups[group]);assert(gain>0&&gain<=1&&gap>0);
  const b=fs.readFileSync(path.join(__dirname,'../public',soundUrl(id)));
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),48000);
 }
 for(const file of Object.values(musicFiles))assert.equal(fs.readFileSync(path.join(__dirname,'../public/assets/audio/bgm',file+'.ogg')).toString('ascii',0,4),'OggS');
 assert.deepEqual(Array.from({length:15},(_,i)=>musicForStage(i)),['combat1','combat1','combat1','combat1','boss1','combat2','combat2','combat2','combat2','boss2','combat3','combat3','combat3','combat3','boss3']);
});

test('Mass hits, pickups and multikills coalesce while warnings and player damage remain audible',()=>{
 const o=output(),a=new AudioDirector(o);a.combat(0);a.stopEffects();
 for(let i=0;i<100;i++){a.play('enemy_hit_soft');a.play('enemy_defeat');a.play('xp_pickup');}
 assert.equal(o.voices.filter(v=>v.id==='enemy_hit_soft').length,1);
 assert.equal(o.voices.filter(v=>v.id==='enemy_defeat').length,0);
 assert.equal(o.voices.filter(v=>v.id==='xp_pickup').length,1);
 assert(a.play('beam_warning'));assert(a.play('player_hit'));
 o.advance(.11);assert(a.play('xp_pickup')===false,'active pickup cap still applies even after the cooldown');
 active(o).find(v=>v.id==='xp_pickup').stop();assert(a.play('xp_pickup'));
 assert(active(o).length<=audioConfig.maxEffects);
});

test('Moving onto a button and immediately confirming does not lose the click sound to hover throttling',()=>{
 const o=output(),a=new AudioDirector(o);a.menu();
 assert(a.play('ui_focus'));assert(a.play('ui_confirm'));
 assert(!a.play('ui_confirm'));assert.equal(active(o).length,2);
});

test('A new danger cue replaces a low-priority voice at the global cap; ordinary sounds cannot displace it',()=>{
 const o=output(),a=new AudioDirector(o);a.combat(0);a.stopEffects();
 for(const id of ['xp_pickup','enemy_hit_soft','enemy_hit_metal','paper_shot','enemy_melee','mechanic_cutter','spark_shot','pressure_pulse','heal','shield_gain']){
  assert(a.play(id),id);o.advance(.21);
 }
 assert.equal(active(o).length,audioConfig.maxEffects);
 assert(a.play('beam_warning'));assert.equal(active(o).length,audioConfig.maxEffects);
 assert(o.voices.find(v=>v.id==='xp_pickup').ended);
 assert(!a.play('enemy_defeat'));assert(active(o).some(v=>v.id==='beam_warning'));
});

test('World sound distance and stereo panning are bounded; offscreen danger has a longer audible radius',()=>{
 const o=output(),a=new AudioDirector(o);a.combat(0);a.stopEffects();a.listen({x:0,y:0});
 assert(!a.play('enemy_melee',{x:audioConfig.maxDistance,y:0}));
 assert(a.play('beam_warning',{x:1000,y:0}));const v=o.voices.at(-1);
 assert(v.gain>0&&v.gain<audioConfig.effectGain);assert(v.pan<=audioConfig.maxPan);
 assert(!a.play('charge_warning',{x:audioConfig.warningDistance,y:0}));
});

test('Title/opening/selection keep one loop; transitions never accumulate more than two music sources',()=>{
 const o=output(),a=new AudioDirector(o);a.menu();const title=o.voices[0];
 a.menu();a.play('ui_page');assert.equal(active(o,true).length,1);assert.equal(active(o,true)[0],title);
 a.combat(0);assert.equal(active(o,true).length,2);o.advance(audioConfig.crossfadeSeconds+.01);
 assert.equal(active(o,true).length,1);const first=active(o,true)[0];a.combat(1);assert.equal(active(o,true)[0],first);
 a.combat(4);a.combat(5);a.combat(9);assert.equal(active(o,true).length,2);
 assert.equal(active(o,true).at(-1).id,'boss2');
});

test('Actual boss wave initialization does not suppress the boss entry cue with an ordinary wave cue',()=>{
 const o=output(),a=new AudioDirector(o);a.combat(3);a.stopEffects();
 const s=new StageEnemySystem(world,()=>.37);s.stage=4;s.onSound=a.play;
 s.initialize(player(),view);a.combat(s.stage);
 assert.equal(o.voices.filter(v=>v.id==='boss_enter').length,1);
 assert.equal(o.voices.filter(v=>v.id==='wave_start'&&!v.ended).length,0);
});

test('Slow asset completion cannot resurrect an outdated song or a combat effect',()=>{
 const o=output(),a=new AudioDirector(o);o.missing.add('title');o.missing.add('combat1');
 a.menu();a.combat(0);a.combat(4);o.missing.clear();a.refresh();
 assert.deepEqual(active(o,true).map(v=>v.id),['boss1']);
 o.missing.add('beam_warning');assert(!a.play('beam_warning'));o.missing.clear();a.refresh();
 assert(!o.voices.some(v=>v.id==='beam_warning'));a.result(false);a.refresh();o.advance(1);assert.equal(active(o,true).length,0);
});

test('Level selection stops stale combat effects and ducks once; defeat and restart clean up all old sources',()=>{
 const o=output(),a=new AudioDirector(o);a.combat(0);a.play('beam_warning');
 a.selection(true);assert(o.voices.find(v=>v.id==='beam_warning').ended);
 assert.equal(active(o,true)[0].gain,audioConfig.musicGain*audioConfig.selectionGain);
 const fades=active(o,true)[0].fades.length;a.selection(true);assert.equal(active(o,true)[0].fades.length,fades);
 assert(!a.play('mechanic_cutter'));assert(a.play('heal'));a.selection(false);
 assert.equal(active(o,true)[0].gain,audioConfig.musicGain);
 a.result(false);a.result(false);assert.equal(o.voices.filter(v=>v.id==='cue_defeat_record_closed').length,1);
 a.menu();assert(o.voices.find(v=>v.id==='cue_defeat_record_closed').ended);
 assert.equal(active(o,true).at(-1).id,'title');a.destroy();assert.equal(active(o).length+active(o,true).length,0);
});

test('Real weapon simulation emits nothing without a target, one chain launch, and one sound per explosion rather than per victim',()=>{
 const p=player(),signal=new CharacterCombat('signal',p,()=>0),sounds=[];signal.onSound=id=>sounds.push(id);
 signal.prepare(.01,p,[]);signal.update(.01,world,view);assert.equal(sounds.length,0);
 const enemies=[enemy(1,600),enemy(2,650),enemy(3,700)];signal.prepare(.01,p,enemies);signal.update(.01,world,view);
 assert.equal(sounds.filter(s=>s==='signal_discharge').length,1);assert.equal(sounds.filter(s=>s==='signal_chain').length,1);
 assert(enemies.every(e=>e.hp<500));
 const c=new CharacterCombat('carrier',player(),()=>0),heard=[];c.onSound=id=>heard.push(id);
 const targets=[enemy(4,525),enemy(5,535),enemy(6,545)];c.prepare(1.2,c.player,targets);c.update(.01,world,view);
 assert.equal(heard.filter(s=>s==='carrier_place').length,1);
 c.prepare(.4,c.player,targets);c.update(.4,world,view);
 assert.equal(heard.filter(s=>s==='carrier_blast').length,1);assert(targets.every(e=>e.hp<500));
});

test('Delayed ground audio follows hazard activation, cancellation and actual invulnerability-aware damage',()=>{
 const a=new EnemyAttackSystem(),p=player(),e=enemy(1),sounds=[];a.onSound=id=>sounds.push(id);
 const c=new CharacterCombat('mechanic',p);c.onSound=id=>sounds.push(id);
 a.hazard(1,'circle',p,p,{warning:.5,duration:.1,radius:100,damage:.1,impactSound:'wet_impact'});
 a.update(.2,p,[e],world,d=>c.defend(d));assert.equal(sounds.length,0);
 a.update(.3,p,[e],world,d=>c.defend(d));assert(sounds.includes('wet_impact'));assert(sounds.includes('player_hit'));assert(p.hp<p.maxHp);
 const hits=sounds.filter(s=>s==='player_hit').length;a.hit(p,.1,a.group(),d=>c.defend(d));assert.equal(sounds.filter(s=>s==='player_hit').length,hits);
 a.hazard(1,'circle',p,p,{warning:.5,impactSound:'boss_stamp'});e.hp=0;a.update(.6,p,[e],world,d=>c.defend(d));assert(!sounds.includes('boss_stamp'));
});

test('Enemy repeated beam gives two real warnings, multi-pellet shot emits one launch, and XP sounds only on collection',()=>{
 const s=new StageEnemySystem(world,()=>.37),p=player(),sounds=[];s.onSound=id=>sounds.push(id);s.attacks.onSound=s.onSound;
 const e=s.create('X03',{x:800,y:350});s.enemies.push(e);e.age=10;
 assert(s.beginAction(e,enemyAttacks.X03,p,view));assert.equal(sounds.filter(x=>x==='beam_warning').length,1);
 for(let i=0;i<160;i++)s.updateAction(e,.02,p,view);
 assert.equal(sounds.filter(x=>x==='beam_warning').length,2);
 const shooter=s.create('E06',{x:800,y:350});s.enemies.push(shooter);s.beginAction(shooter,enemyAttacks.E06,p,view);s.updateAction(shooter,1,p,view);
 assert.equal(sounds.filter(x=>x==='paper_shot').length,1);assert.equal(s.attacks.projectiles.length,5);
 const xp=new ExperienceSystem();xp.onSound=id=>sounds.push(id);xp.dropFromDefeated([{x:500,y:350,hp:0,experienceCategory:'normal1'}]);
 assert(!sounds.includes('xp_pickup'));xp.update(.01,p);assert.equal(sounds.filter(x=>x==='xp_pickup').length,1);
});
