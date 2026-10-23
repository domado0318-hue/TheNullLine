const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { EventEmitter, getEventListeners } = require('node:events');
require('node:module').registerHooks({
  resolve(s, c, next) {
    if (s === 'phaser') return { url: 'test:phaser', shortCircuit: true };
    return next(s.startsWith('.') && !path.extname(s) ? s + '.ts' : s, c);
  },
  load(url, c, next) {
    if (url === 'test:phaser') return { format: 'module', shortCircuit: true,
      source: 'export default { Scene: class Scene {}, Input: {Keyboard: {KeyCodes: {W:87,S:83,A:65,D:68}}}};' };
    return next(url, c);
  },
});
const { GameScene } = require('../src/scenes/GameScene.ts');
const { TitleScene } = require('../src/scenes/TitleScene.ts');
const { uiConfig } = require('../src/config/ui.ts');
const { createCombatant } = require('../src/combat/types.ts');
const { PlayerAnimation } = require('../src/player/PlayerAnimation.ts');
const { playerArt, playerArtConfig, playerIdlePoses } = require('../src/config/playerArt.ts');
const { enemyArtConfig } = require('../src/config/enemyRoster.ts');
const { EnemyRenderer } = require('../src/enemies/EnemyRenderer.ts');
const { combatConfig } = require('../src/config/combat.ts');
const { PlayerEyeLight } = require('../src/player/PlayerEyeLight.ts');
const { playerLightConfig, playerEyeColors } = require('../src/config/playerLight.ts');
const { platformConfig } = require('../src/config/platform.ts');
const { journeyConfig, journeyStages, journeyProps, journeyPropVariants } = require('../src/config/journey.ts');
const { openingConfig } = require('../src/config/opening.ts');
const { OpeningCutscene } = require('../src/ui/OpeningCutscene.ts');
const fs = require('node:fs');
const { effectArt, effectFrames } = require('../src/config/effects.ts');
const { CharacterRenderer } = require('../src/combat/CharacterRenderer.ts');
const { ImpactRenderer } = require('../src/combat/ImpactRenderer.ts');
const { CharacterCombat } = require('../src/combat/CharacterCombat.ts');
const { DamageNumberRenderer } = require('../src/combat/DamageNumberRenderer.ts');
const { damageNumberConfig } = require('../src/config/damageNumbers.ts');
const { StageEnemySystem } = require('../src/enemies/StageEnemySystem.ts');
const { enemyIds } = require('../src/config/enemyRoster.ts');

test('Stage and Wave announcements freeze real gameplay, resume without catch-up and reset on restart', () => {
  const f = harness(false, true), scene = f.scene;
  const transition = () => scene.encounterTransition;
  assert.equal(transition().title.visible, false, 'selection has no premature announcement');
  f.buttons().find(button => button.textContent.startsWith('철도 정비공')).click();
  const snapshot = () => JSON.stringify({ player: scene.player.body, enemies: scene.enemySystem.enemies,
    elapsed: scene.enemySystem.elapsedSeconds, clock: scene.character.time, timer: scene.character.mainTimer,
    drops: scene.experience.drops, attacks: scene.enemySystem.attacks.projectiles });
  f.keys.get(68).isDown = true;
  const initial = snapshot();
  assert.equal(transition().title.text, 'Stage 1');
  assert.deepEqual([transition().title.x, transition().title.y], [640, 360]);
  const duration = uiConfig.encounterTransition.seconds * 1000;
  scene.update(0, duration - 1);
  assert.equal(snapshot(), initial);
  assert.equal(transition().title.text, 'Stage 1');
  scene.update(0, 1);
  assert.equal(transition().title.text, 'Wave 1');
  scene.update(0, duration * 10);
  assert.equal(snapshot(), initial, 'long paused frames never leak into simulation');
  assert.equal(transition().title.visible, false);
  scene.update(0, 100);
  assert(scene.player.body.x > JSON.parse(initial).player.x);
  assert(scene.enemySystem.elapsedSeconds > 0);
  f.keys.get(68).isDown = false;
  const system = scene.enemySystem;
  for (const expected of ['Wave 2', 'Wave 3', 'Stage 2']) {
    for (const enemy of system.enemies) enemy.hp = 0;
    system.removeDefeated();
    scene.update(0, 6000);
    assert.equal(transition().title.text, expected);
    assert.equal(transition().title.visible, true);
    const frozen = snapshot();
    const target = system.enemies[0];
    assert.equal(target.hp, target.maxHp, 'new wave takes no damage before its announcement');
    scene.update(0, duration);
    assert.equal(snapshot(), frozen);
    if (expected === 'Stage 2') {
      assert.equal(transition().title.text, 'Wave 1');
      scene.update(0, duration);
      assert.equal(snapshot(), frozen);
    }
    assert.equal(transition().title.visible, false);
    assert.equal(scene.encounterHud.remaining.text, `남은 적 ${system.remainingCount}`);
    assert(!scene.encounterHud.text.text.includes('남은 적'));
    assert(scene.encounterHud.remaining.x > scene.encounterHud.text.x + uiConfig.encounterHud.width / 2);
  }
  const previous = transition();
  scene.scene.restart();
  assert.notEqual(transition(), previous);
  assert.equal(transition().title.visible, false);
  f.buttons().find(button => button.textContent.startsWith('철도 정비공')).click();
  assert.equal(transition().title.text, 'Stage 1');
  scene.events.emit('shutdown');
});

test('Damage numbers distinguish critical hits, retain world hit positions, fade, reuse a bounded pool and clean up on shutdown', () => {
  const events = new EventEmitter(), texts = [];
  const scene = { events, add: { text() {
    const text = view();
    for (const [method, field] of [['setFontSize','fontSize'],['setColor','color'],['setScale','scale'],['setStroke','stroke']]) {
      text[method] = function(value) { this[field] = value; return this; };
    }
    texts.push(text); return text;
  } } };
  const renderer = new DamageNumberRenderer(scene);
  const target = createCombatant({id:1,x:500,y:400,size:32},'enemy',100,0);
  renderer.show({target, amount:24.3, critical:false}, 60);
  renderer.show({target, amount:36.45, critical:true}, 60);
  assert.deepEqual(texts.map(text => text.text), ['24', '36!']);
  assert.equal(texts[0].color, damageNumberConfig.color);
  assert.equal(texts[1].color, damageNumberConfig.criticalColor);
  assert.notEqual(texts[0].color, texts[1].color);
  assert(texts[1].fontSize > texts[0].fontSize);
  assert(texts[1].scale > texts[0].scale);
  assert.equal(texts[0].y, 400 - 60 - damageNumberConfig.topGap);
  assert(texts.every(text => text.depth > uiConfig.healthBar.depth && text.depth < uiConfig.experience.depth));
  target.x += 100; target.y += 100;
  const position = [texts[1].x,texts[1].y];
  renderer.update(damageNumberConfig.lifetime * .7);
  assert.equal(texts[1].x, position[0], 'center lane stays anchored at the hit location');
  assert(texts[1].y < position[1] && texts[1].alpha < 1);
  renderer.update(damageNumberConfig.lifetime);
  assert(texts.every(text => !text.visible));
  for (const amount of [0,-1,NaN,Infinity]) renderer.show({target,amount,critical:false});
  assert(texts.every(text => !text.visible));
  const player = createCombatant({id:0,x:600,y:400,size:48},'player',100,0);
  renderer.show({target:player,amount:12.6,critical:false});
  assert.equal(texts[0].text,'-13');
  assert.equal(texts[0].color,damageNumberConfig.receivedColor);
  assert.equal(texts[0].stroke,damageNumberConfig.receivedStroke);
  assert.equal(texts[0].fontSize,damageNumberConfig.receivedFontSize);
  assert.equal(texts[0].x,player.x);
  renderer.update(damageNumberConfig.lifetime);
  renderer.show({target,amount:24,critical:false});
  assert.equal(texts[0].text,'24');
  assert.equal(texts[0].color,damageNumberConfig.color,'reused incoming text resets to outgoing style');
  for (let i=0; i<damageNumberConfig.maximum * 2; i++) renderer.show({target,amount:i+1,critical:i%2===0});
  assert.equal(texts.length, damageNumberConfig.maximum);
  assert(texts.every(text => text.visible && text.alpha === 1));
  events.emit('shutdown');
  assert(texts.every(text => text.destroyed));
  assert.equal(renderer.entries.length, 0);
});

test('Player incoming numbers reflect reduction and shields, ignore invulnerable hits, and retain full lethal damage', () => {
  const f = harness(false,true);
  f.buttons().find(button=>button.textContent.startsWith('철도 정비공')).click(); finishEncounterIntro(f.scene);
  const scene=f.scene, player=scene.player.body, character=scene.character, attacks=scene.enemySystem.attacks;
  character.mainTimer=100;
  character.progression.levels[18]=5; // 15% damage reduction.
  const target=scene.enemySystem.enemies[0];
  scene.enemySystem.enemies.splice(1);
  const hazard = () => attacks.hazard(target.id,'circle',player,player,{warning:0,duration:.1,radius:100,damage:.1});
  const shown = () => scene.damageNumbers.entries.filter(e=>e.text.visible).map(e=>e.text.text);
  character.shields.push({source:'test',value:20,remaining:10});
  hazard();scene.update(0,16);
  assert.equal(player.hp,player.maxHp);
  assert.deepEqual(shown(),[],'fully shielded hit has no HP damage number');
  attacks.clear();player.invulnerableSeconds=0;
  character.shields[0].value=5;
  hazard();scene.update(0,16);
  assert.equal(player.hp,player.maxHp-(15*.85-5));
  assert.deepEqual(shown(),['-8']);
  const hp=player.hp;
  hazard();scene.update(0,16);
  assert.equal(player.hp,hp);
  assert.deepEqual(shown(),['-8'],'invulnerability cannot emit a second number');
  scene.damageNumbers.update(damageNumberConfig.lifetime);
  attacks.clear();player.invulnerableSeconds=0;
  attacks.shoot({...target,x:player.x+50,y:player.y},Math.PI,.1,attacks.group());
  scene.update(0,100);
  assert(player.hp<hp,'actual projectile hits');
  assert.deepEqual(shown(),['-13']);
  scene.damageNumbers.update(damageNumberConfig.lifetime);
  attacks.clear();player.invulnerableSeconds=0;player.hp=1;
  hazard();scene.update(0,16);
  assert.equal(player.hp,0);
  assert.deepEqual(shown(),['-13'],'lethal damage is not capped to the last HP');
  const old=scene.damageNumbers.entries.map(e=>e.text);
  scene.scene.restart();
  assert(old.every(text=>text.destroyed));
  assert.equal(scene.damageNumbers.entries.length,0);
  scene.events.emit('shutdown');
});

test('Actual scene connects lethal critical hits to numbers, pauses them on level-up and clears them on restart', () => {
  const f = harness(false, true);
  f.buttons().find(button => button.textContent.startsWith('신호 기술자')).click(); finishEncounterIntro(f.scene);
  const scene = f.scene, player = scene.player.body;
  scene.character.random = () => 0;
  const target = scene.enemySystem.enemies[0];
  Object.assign(target, {x:player.x+100,y:player.y,hp:1});
  scene.enemySystem.enemies.splice(1);
  scene.update(0,16);
  assert.equal(target.hp,0);
  assert(!scene.enemySystem.enemies.includes(target));
  const death=scene.enemyRenderer.deaths.get(target.id);
  assert(death&&!death.view.destroyed,'a first-frame kill keeps its body for the fade after simulation removal');
  assert(!scene.healthBars.has(target.id),'the dead body has no surviving health bar');
  const entry = scene.damageNumbers.entries[0];
  assert(entry.critical && entry.text.visible);
  assert.equal(entry.text.text, `${Math.round(player.attackDamage * combatConfig.criticalMultiplier)}!`);
  scene.experience.addExperience(10); scene.update(0,16);
  const age = entry.age;
  scene.update(0,1000); assert.equal(entry.age,age);
  scene.scene.restart();
  assert(death.view.destroyed,'restart clears fading bodies');
  assert(entry.text.destroyed);
  assert.equal(scene.damageNumbers.entries.length,0);
  assert.equal(scene.character,undefined);
  scene.events.emit('shutdown');
});

test('Result screen finishes enemy body fades while gameplay and damage remain stopped',()=>{
  const f=harness(false,true),scene=f.scene;
  f.buttons().find(button=>button.textContent.startsWith('신호 기술자')).click(); finishEncounterIntro(f.scene);
  const target=scene.enemySystem.enemies[0];target.hp=0;
  scene.enemyRenderer.updateDeaths(0,scene.enemySystem.removeDefeated());
  const body=scene.enemyRenderer.deaths.get(target.id).view;
  scene.defeated=true;
  const before=[scene.enemySystem.elapsedSeconds,scene.player.body.hp,scene.player.body.x,scene.player.body.y];
  scene.update(0,500);
  assert(body.destroyed);
  assert.deepEqual([scene.enemySystem.elapsedSeconds,scene.player.body.hp,scene.player.body.x,scene.player.body.y],before);
  scene.events.emit('shutdown');
});
test('Actual scene clamps movement and camera at platform edges, keeps scenery fixed and stops on key release',()=>{
 const before=uiConfig.cards.inputDelayMs;uiConfig.cards.inputDelayMs=0;
 try{
  const f=harness();f.buttons().find(b=>b.textContent.startsWith('철도 정비공')).click(); finishEncounterIntro(f.scene);
  const p=f.scene.player.body;p.x=500;p.y=300;f.scene.enemySystem.enemies.splice(0);
  f.scene.world.obstacles.splice(0);
  f.keys.get(68).isDown=true;f.keys.get(87).isDown=true;f.scene.update(0,250);
  assert.equal(f.camera.bounded,true);assert(!f.scene.world.unbounded);
  assert(Math.abs(Math.hypot(p.x-500,p.y-300)-f.scene.character.movementSpeed*.25)<1e-6);
  p.x=f.scene.world.width-p.size/2;p.y=p.size/2;f.scene.update(0,250);
  assert.equal(p.x,f.scene.world.width-p.size/2);assert.equal(p.y,p.size/2);
  const v=f.scene.getViewport(),bounds=f.scene.world.bounds;
  assert.equal(v.x,bounds.x+bounds.width-v.width);assert.equal(v.y,bounds.y);
  assert.equal(f.scene.worldView.floor.x,0);assert.equal(f.scene.worldView.floor.y,0);
  f.keys.get(68).isDown=false;f.keys.get(87).isDown=false;const at=[p.x,p.y];f.scene.update(0,100);assert.deepEqual([p.x,p.y],at);
  f.scene.events.emit('shutdown');
 }finally{uiConfig.cards.inputDelayMs=before}
});

test('Completing the real three-wave stage changes the location; restart restores the first platform without resetting combat space',()=>{
 const f=harness(),s=f.scene.enemySystem,p=f.scene.player.body;
 const previousWorld=f.scene.world,previousFloor=f.scene.worldView.floor;
 assert.equal(previousFloor.textureKey,'journey-01');
 for(let wave=0;wave<3;wave++){
  for(const e of s.enemies)e.hp=0;s.removeDefeated();s.update(4,p,f.scene.getViewport());
 }
 assert.equal(s.stage,1);f.scene.renderActors();
 assert.equal(f.scene.worldView.floor,previousFloor);assert.equal(previousFloor.textureKey,'journey-02');
 f.scene.scene.restart();assert.notEqual(f.scene.world,previousWorld);assert.equal(f.scene.enemySystem.stage,0);
 assert.equal(f.scene.worldView.floor.textureKey,'journey-01');assert.notEqual(f.scene.worldView.floor,previousFloor);
 assert.equal(f.buttons().length,3);f.scene.events.emit('shutdown');
});
const atlases = Object.fromEntries(Object.entries(playerArt).map(([id, art]) => [art.key,
  JSON.parse(fs.readFileSync(path.join(__dirname, '../public', art.atlas), 'utf8'))]));

test('Both boss deaths advance the real scene to train and terminal art while preserving player progress and collision layout',()=>{
 for(const stage of [4,9]){
  const f=harness(),scene=f.scene,p=scene.player.body;
  const system=new StageEnemySystem(scene.world,()=>.37);system.stage=stage;system.initialize(p,scene.getViewport());scene.enemySystem=system;
  const original={hp:p.hp,x:p.x,y:p.y,world:scene.world,obstacles:JSON.stringify(scene.world.obstacles),experience:scene.experience};
  scene.renderActors();assert.equal(scene.worldView.floor.textureKey,journeyStages[stage].key);
  assert.equal(system.enemies.length,1);assert(system.enemies[0].archetype.startsWith('B'));
  system.enemies[0].hp=0;system.removeDefeated();scene.renderActors();
  assert(scene.encounterHud.text.text.includes(stage===4?'NULL LINE 탑승':'종착 말소 시설 진입'));
  system.update(4.01,p,scene.getViewport());scene.renderActors();
  assert.equal(system.stage,stage+1);assert.equal(scene.worldView.floor.textureKey,journeyStages[stage+1].key);
  assert(scene.worldView.props.every(prop=>prop.view.textureKey===journeyPropVariants[journeyStages[stage+1].chapter][prop.variant].key));
  assert.deepEqual([p.hp,p.x,p.y],[original.hp,original.x,original.y]);assert.equal(scene.experience,original.experience);assert.equal(scene.world,original.world);
  assert.equal(JSON.stringify(scene.world.obstacles),original.obstacles);f.scene.events.emit('shutdown');
 }
});

test('Final boss completion keeps final art without requesting a sixteenth background',()=>{
 const f=harness(),scene=f.scene,p=scene.player.body,s=new StageEnemySystem(scene.world,()=>.37);
 s.stage=14;s.initialize(p,scene.getViewport());scene.enemySystem=s;scene.renderActors();
 s.enemies[0].hp=0;s.removeDefeated();s.update(4.01,p,scene.getViewport());scene.renderActors();
 assert(s.complete);assert.equal(scene.worldView.floor.textureKey,journeyStages[14].key);
 assert(scene.encounterHud.text.text.includes('전투 완료'));scene.events.emit('shutdown');
});

class Element extends EventTarget {
  constructor(tagName, document) { super(); Object.assign(this, { tagName, ownerDocument: document,
    style: {setProperty(name,value){this[name]=value;}}, attributes:{}, children: [], parentNode: null }); }
  get textContent() { return (this.ownText || '') + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.ownText = value; this.children = []; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  setAttribute(name,value) { this.attributes[name]=value; }
  remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
  focus() {}
  click() { this.dispatchEvent(new Event('click')); }
}

test('Enemy atlas count and dotted-line step reject invalid values before loader or draw loops',()=>{
  const previousCount=enemyArtConfig.count,previousStep=enemyArtConfig.dashStep;
  try{
    enemyArtConfig.count=Infinity;
    assert.throws(()=>new GameScene().preload(),/enemyArt.count/);
    enemyArtConfig.dashStep=0;
    assert.throws(()=>new EnemyRenderer({}),/enemyArt.dashStep/);
  }finally{enemyArtConfig.count=previousCount;enemyArtConfig.dashStep=previousStep;}
});
function view(x = 0, y = 0) {
  const data = { x, y, text: '', originX: .5, originY: .5, commands: [], destroyed:false,
    setPosition(x, y) { this.x = x; this.y = y; return proxy; }, setText(value) { this.text = value; return proxy; },
    setFrame(frame) { const data=atlases[this.textureKey]?.frames[frame]; this.frame = { name: String(frame), realWidth:data?.sourceSize?.w??316, realHeight:data?.sourceSize?.h??312, customData: data || {} }; return proxy; }, setFlipX(value) { this.flipX = value; return proxy; },
    setTexture(key, frame) { this.textureKey = key; return this.setFrame(frame); },
    setDisplaySize(w,h) { this.displayWidth=w; this.displayHeight=h; return proxy; },
    setOrigin(x,y) { this.originX=x; this.originY=y; return proxy; },
    setRotation(value) { this.rotation=value; return proxy; }, setDepth(value) { this.depth=value; return proxy; },
    setAlpha(value) { this.alpha=value; return proxy; }, destroy() { this.destroyed=true; this.visible=false; return proxy; },
    clear() { this.commands=[]; return proxy; },
    fillStyle(color,alpha) { this.color=color; this.alpha=alpha; return proxy; },
    fillCircle(x,y,radius) { this.commands.push({x,y,radius,color:this.color,alpha:this.alpha}); return proxy; },
    lineTo(...args) { this.commands.push({method:'lineTo',args}); return proxy; },
    strokeCircle(...args) { this.commands.push({method:'strokeCircle',args}); return proxy; },
    setVisible(value) { this.visible = value; return proxy; }, clearTint() { this.tint = undefined; return proxy; },
    setTintFill(value) { this.tint = value; return proxy; } };
  const proxy = new Proxy(data, { get(target, key) { return key in target ? target[key] : () => proxy; } });
  return proxy;
}
function harness(startAtTitle = false, instantSelection = false) {
  const document = Object.assign(new EventTarget(), { defaultView: new EventTarget(), hidden:false });
  document.createElement = tag => new Element(tag, document);
  document.createElementNS = (_namespace, tag) => new Element(tag, document);
  document.body = document.createElement('body');
  const canvas = document.createElement('canvas');
  const bounds = { left: 0, top: 0, width: 1280, height: 720 };
  canvas.getBoundingClientRect = () => bounds;
  const scene = new GameScene();
  const createGame=()=>{
    const previous=uiConfig.cards.inputDelayMs;
    if(instantSelection)uiConfig.cards.inputDelayMs=0;
    try{scene.create();}finally{uiConfig.cards.inputDelayMs=previous;}
  };
  const keys = new Map();
  const camera = { width: 1280, height: 720, zoom: 1, setBounds(x,y,width,height) { this.bounded=true;this.bounds={x,y,width,height}; }, startFollow() {} };
  const textureCache=new Map();
  const context=()=>new Proxy({createRadialGradient(){return{addColorStop(){}}}}, {get(target,key){return target[key]??(()=>{});}});
  const textures={exists:key=>textureCache.has(key),get:()=>({has:()=>false,add(){},getSourceImage:()=>({width:2048,height:768})}),
    createCanvas(key,width,height){const canvas={width,height},ctx=context();const texture={canvas,getContext:()=>ctx,refresh(){}};textureCache.set(key,texture);return texture;},
    remove:key=>textureCache.delete(key)};
  Object.assign(scene, {
    add: { image: (x, y, key, frame) => view(x, y).setTexture(key, frame), tileSprite:(x,y,_w,_h,key)=>view(x,y).setTexture(key), rectangle: (x, y) => view(x, y), circle: (x, y) => view(x, y), graphics: () => view(), text: (x, y) => view(x, y), star: (x, y) => view(x, y) },
    textures,
    input: { keyboard: { addKey: code => { const key = { isDown: false }; keys.set(code, key); return key; } } },
    cameras: { main: camera }, game: { canvas },
    scale: Object.assign(new EventEmitter(), { width: 1280, height: 720 }), events: new EventEmitter(),
    scene: { restart() { scene.events.emit('shutdown'); createGame(); } },
  });
  const buttons = (element = document.body) => element.children.flatMap(child => child.tagName === 'button' ? [child] : buttons(child));
  let title;
  if (startAtTitle) {
    title = new TitleScene();
    Object.assign(title, { game: scene.game, scale: scene.scale, events: new EventEmitter(),
      scene: { start(key) {
        assert.equal(key, 'GameScene');
        title.events.emit('shutdown');
        createGame();
      } },
    });
    title.create();
  } else createGame();
  const skipOpening=()=>buttons().find(button=>button.attributes['aria-label']==='이야기 건너뛰기')?.click();
  return { scene, title, document, keys, camera, buttons, skipOpening, bounds };
}

const descendants = element => [element, ...element.children.flatMap(descendants)];
const openingNode = (f, className) => descendants(f.document.body).find(node=>node.attributes?.class===className);
function finishEncounterIntro(scene) {
  scene.update(0, uiConfig.encounterTransition.seconds * 1000);
  scene.update(0, uiConfig.encounterTransition.seconds * 1000);
}
function selectCharacter(f, name) {
  const previous=uiConfig.cards.inputDelayMs;
  uiConfig.cards.inputDelayMs=0;
  try { f.buttons().find(button=>button.textContent.startsWith(name)).click(); finishEncounterIntro(f.scene); }
  finally { uiConfig.cards.inputDelayMs=previous; }
}

test('Actual scene passes live carrier lures into enemy AI, freezes them with skill selection and clears them on restart',()=>{
  const f=harness(false,true);selectCharacter(f,'폐기물 운반원');const scene=f.scene,c=scene.character,p=scene.player.body;
  const e=scene.enemySystem.create('E01',{x:p.x+160,y:p.y});e.cooldown=100;
  scene.enemySystem.enemies.splice(0,scene.enemySystem.enemies.length,e);scene.enemySystem.pending=[];
  c.lures.push({x:p.x,y:p.y,radius:300,remaining:2});p.x+=300;c.mainTimer=100;
  const before=e.x;scene.update(0,100);assert(e.x<before,'scene AI follows the bait away from player');
  const remaining=c.lures[0].remaining;scene.selectingSkill=true;scene.update(0,1000);
  assert.equal(c.lures[0].remaining,remaining,'skill choice freezes the lure timer');
  scene.selectingSkill=false;scene.scene.restart();selectCharacter(f,'폐기물 운반원');
  assert.notEqual(scene.character,c);assert.equal(scene.character.lures.length,0);
  scene.events.emit('shutdown');
});

test('Start opens the entire quote before creating the world; elapsed time and held keys never turn pages', t=>{
  let now=1000;t.mock.method(performance,'now',()=>now);
  const f=harness(true,true),start=f.buttons()[0];
  assert.equal(start.textContent,'게임 시작');
  start.click();start.click();
  assert.equal(f.scene.player,undefined);assert.equal(f.keys.size,0);
  assert.equal(openingNode(f,'opening-quote').textContent,openingConfig.quote);
  assert.equal(openingNode(f,'opening-quote').style.display,'block');
  const panel=openingNode(f,'opening-panel'),next=openingNode(f,'opening-next');
  next.click();assert.equal(panel.attributes['data-page'],'quote','reject the click that opened the story');
  now+=60000;f.scene.update(0,60000);
  assert.equal(panel.attributes['data-page'],'quote','reading time does not advance the story');
  f.document.defaultView.dispatchEvent(Object.assign(new Event('keydown'),{key:'Enter',repeat:true}));
  assert.equal(panel.attributes['data-page'],'quote','a held key cannot flip pages');
  next.click();assert.equal(panel.attributes['data-page'],'citizens');
  next.click();assert.equal(panel.attributes['data-page'],'citizens','rapid duplicate inputs cannot skip a page');
  now+=openingConfig.inputDelayMs+1;
  const double=Object.assign(new Event('click'),{detail:2});openingNode(f,'opening-content').dispatchEvent(double);
  assert.equal(panel.attributes['data-page'],'citizens','ignore the second click of a double click on the page');
  next.dispatchEvent(Object.assign(new Event('click'),{detail:2}));
  assert.equal(panel.attributes['data-page'],'citizens','the Next button also ignores the second click after the input delay');
  openingNode(f,'opening-previous').click();assert.equal(panel.attributes['data-page'],'quote');
  assert.equal(openingNode(f,'opening-previous').disabled,true);
  f.title.events.emit('shutdown');assert.equal(f.document.body.children.length,0);
});

test('Opening body, cover caption, NULL fallback and controls all use the configured game font',()=>{
  const f=harness(true,true);f.buttons()[0].click();
  const css=descendants(f.document.body).find(node=>node.tagName==='style').textContent;
  for(const selector of ['.opening-panel','.opening-body','.opening-quote::after','.opening-record strong','.opening-story button']) {
    const rule=css.slice(css.indexOf(selector+' {')).split('}')[0];
    const font=rule.match(/(?:font|font-family)\s*:\s*([^;]+);/);
    assert(font,`${selector} has a font declaration`);
    assert(font[1].includes(uiConfig.fontFamily),`${selector} must keep Yangjin before system fallbacks`);
  }
  f.title.events.emit('shutdown');
});

test('Clicking every story page explains the name and opens character selection once; all three characters and retries start directly',t=>{
  let now=10000;t.mock.method(performance,'now',()=>now);
  for(const [name,id] of [['철도 정비공','mechanic'],['신호 기술자','signal'],['폐기물 운반원','carrier']]) {
    const f=harness(true,true);f.buttons()[0].click();
    const next=openingNode(f,'opening-next');
    const expected=['quote','citizens','recycling','railway','null-line','erased'];
    const pages=[];
    for(let i=0;i<expected.length;i++) {
      assert.equal(openingNode(f,'opening-panel').attributes['data-page'],expected[i]);
      assert.equal(openingNode(f,'opening-progress').textContent,(i+1)+' / '+expected.length);
      assert.equal(f.scene.player,undefined,'no world, combat, drops or spawning during reading');
      const page=openingConfig.pages[i];
      if(page.illustration) assert.equal(openingNode(f,'opening-illustration').attributes.src,openingConfig.illustrations[page.illustration]);
      if(page.illustration) {
        const paragraphs=openingNode(f,'opening-body').children;
        assert.equal(paragraphs.length,page.text.split('\n\n').length,'cinematic captions preserve every story paragraph');
        assert.equal(paragraphs.map(line=>line.textContent).join(' ').replace(/\s+/g,' '),page.text.replace(/\s+/g,' '),
          'reflowing the former narrow column must not omit or rewrite the story');
        assert(paragraphs.every(line=>!line.textContent.includes('\n')),'old column line breaks reflow within the subtitle width');
      }
      pages.push(openingNode(f,'opening-copy').textContent);
      now+=openingConfig.inputDelayMs+1;
      if(i===expected.length-1)assert.equal(next.textContent,'캐릭터 선택');
      // Both the content area and the explicit button advance the same reader-controlled sequence.
      if(i%2)openingNode(f,'opening-content').click();else next.click();
    }
    // The city erases citizens it judges unnecessary, even while they are alive.
    // The first-person story leads from erasure to a recovery order and refusal.
    // The opening motivates survival and resistance, not an archive investigation.
    const beats=[
      ['시민 등록 말소','도시 운영에 불필요','내 이름이 지워졌다','감시 카메라','회수 대상으로 인식'],
      ['공구','수리해 다시','기계','작업 기록','일을 계속했다'],
      ['열차에 탑승','회수 열차','폐기 구역','자원 회수 시설','나도 그 화물로 분류'],
      ['공식 노선도에서 지워진','노선 이름 대신 NULL','널 라인','이름이 지워진 사람들','폐기물','실어 나르는'],
      ['탑승 거부','강제 회수','회수 기계','공구를 고쳐 쥐었다','아직 살아 있었다','내 목숨까지 내줄 생각은 없었다'],
    ];
    for(let i=0;i<beats.length;i++)for(const phrase of beats[i])assert(pages[i+1].includes(phrase),`${expected[i+1]}: ${phrase}`);
    assert(!pages.join(' ').includes('당신'),'the narrative keeps one first-person viewpoint');
    assert(!pages.join(' ').includes('버려진 기록'),'discarded records are not a destination or a promised answer');
    assert(!pages.join(' ').includes('카드'),'the opening no longer revolves around retrying an identity card');
    assert(!pages.join(' ').includes('배급'),'ration access is not part of this story');
    assert(!pages[4].includes('단말기'),'the name page connects the erased railway with erased people, not a terminal lookup');
    assert(!openingNode(f,'opening-story'));assert.equal(f.buttons().length,3);
    const player=f.scene.player;next.click();assert.equal(f.scene.player,player,'stale navigation cannot create a second game');
    const frozen=JSON.stringify([player.body,f.scene.enemySystem.enemies]);
    f.keys.get(68).isDown=true;f.scene.update(0,1000);
    assert.equal(JSON.stringify([player.body,f.scene.enemySystem.enemies]),frozen,'selection still pauses gameplay');
    selectCharacter(f,name);assert.equal(f.scene.player.view.textureKey,playerArt[id].key);
    assert(f.scene.combat);assert.equal(f.document.body.children.length,0);
    const x=player.body.x;f.scene.update(0,100);assert(player.body.x>x);
    f.keys.get(68).isDown=false;player.body.hp=0;f.scene.update(0,16);
    assert.equal(f.buttons()[0].textContent,'다시 시작');f.buttons()[0].click();
    assert.equal(f.buttons().length,3);assert(!openingNode(f,'opening-story'));
    selectCharacter(f,'폐기물 운반원');assert(f.scene.combat);
    assert.equal(f.scene.character.time,0);assert.equal(f.scene.experience.level,1);
    f.scene.events.emit('shutdown');
  }
});

test('Every opening illustration is a real full-frame production PNG and story text stays separate from the artwork',()=>{
  const illustratedPages=openingConfig.pages.filter(page=>page.id!=='quote');
  assert(illustratedPages.every(page=>page.illustration),'every narrative page has its own illustration');
  const paths=illustratedPages.map(page=>openingConfig.illustrations[page.illustration]);
  assert.equal(new Set(paths).size,illustratedPages.length,'no picture repeats between story pages');
  const hashes=new Set();
  for(const file of Object.values(openingConfig.illustrations)) {
    const bytes=fs.readFileSync(path.join(__dirname,'../public',file));
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert(width>=1280&&height>=720);
    assert(Math.abs(width/height-16/9)<.02,'paintings keep their original proportions');
  }
  assert.equal(hashes.size,illustratedPages.length,'unique filenames must not reuse identical picture bytes');
});

test('Story skip button and Escape open selection once; title shutdown removes the story and stale input without starting a game',()=>{
  for(const mode of ['button','escape','shutdown']) {
    const f=harness(true,true);f.buttons()[0].click();
    const old=openingNode(f,'opening-skip'),window=f.document.defaultView;
    assert.equal(getEventListeners(window,'keydown').length,1);
    const escape=()=>window.dispatchEvent(Object.assign(new Event('keydown'),{key:'Escape',repeat:false}));
    if(mode==='button')old.click();else if(mode==='escape')escape();else f.title.events.emit('shutdown');
    const player=f.scene.player;
    assert.equal(Boolean(player),mode!=='shutdown');assert(!openingNode(f,'opening-story'));
    assert.equal(getEventListeners(window,'keydown').length,0);
    assert.equal(f.title.events.listenerCount('shutdown'),0);
    old.click();escape();assert.equal(f.scene.player,player);
    if(player){assert.equal(f.buttons().length,3);assert.equal(f.scene.combat,undefined);}
    else {assert.equal(f.document.body.children.length,0);assert.equal(f.scene.scale.listenerCount('resize'),0);}
    f.scene.events.emit('shutdown');f.title.events.emit('shutdown');
  }
});

test('Story follows canvas offsets and scaling; arrow keys, Enter and Space turn exactly one page and hidden tabs ignore input',t=>{
  let now=2000;t.mock.method(performance,'now',()=>now);
  const f=harness(true,true);f.buttons()[0].click();
  Object.assign(f.bounds,{left:110,top:80,width:960,height:540});f.scene.scale.emit('resize');
  const root=openingNode(f,'opening-story'),panel=openingNode(f,'opening-panel');
  assert.deepEqual([root.style.left,root.style.top,root.style.width,root.style.height],['110px','80px','960px','540px']);
  assert.equal(panel.style.transform,'scale(0.75, 0.75)');
  const key=value=>{now+=openingConfig.inputDelayMs+1;f.document.defaultView.dispatchEvent(Object.assign(new Event('keydown'),{key:value,repeat:false}));};
  key('ArrowRight');assert.equal(panel.attributes['data-page'],'citizens');
  key(' ');assert.equal(panel.attributes['data-page'],'recycling');
  key('Enter');assert.equal(panel.attributes['data-page'],'railway');
  key('ArrowLeft');assert.equal(panel.attributes['data-page'],'recycling');
  f.document.hidden=true;key('ArrowRight');assert.equal(panel.attributes['data-page'],'recycling');
  f.document.hidden=false;key('ArrowRight');assert.equal(panel.attributes['data-page'],'railway');
  f.title.events.emit('shutdown');
  assert.equal(getEventListeners(f.document.defaultView,'resize').length,0);
  assert.equal(f.scene.scale.listenerCount('resize'),0);
});

test('Story validates empty pages and invalid input guards before registering UI or events',()=>{
  const f=harness(true),pages=openingConfig.pages,delay=openingConfig.inputDelayMs;
  try {
    openingConfig.pages=[];assert.throws(()=>new OpeningCutscene(f.title,()=>{}),/opening.pages/);
    openingConfig.pages=pages;
    for(const value of [-1,NaN,Infinity]) {
      openingConfig.inputDelayMs=value;
      assert.throws(()=>new OpeningCutscene(f.title,()=>{}),/opening.inputDelayMs/);
    }
    assert.equal(getEventListeners(f.document.defaultView,'keydown').length,0);
    openingConfig.inputDelayMs=0;const story=new OpeningCutscene(f.title,()=>{});story.destroy();
  }finally{openingConfig.pages=pages;openingConfig.inputDelayMs=delay;f.title.events.emit('shutdown');}
});

test('Actual GameScene pauses before selection and through multiple queued levels, then resumes movement and all simulation timers', t => {
  t.mock.method(performance, 'now', () => 10000);
  const previousDelay = uiConfig.cards.inputDelayMs;
  uiConfig.cards.inputDelayMs = 0;
  try {
    const f = harness();
    f.keys.get(68).isDown = true;
    const start = f.scene.player.body.x;
    const enemiesBefore = f.scene.enemySystem.enemies.map(e => [e.x, e.y]);
    f.scene.update(0, 1000);
    assert.equal(f.scene.player.body.x, start);
    assert.deepEqual(f.scene.enemySystem.enemies.map(e => [e.x, e.y]), enemiesBefore);
    assert.equal(f.buttons().length, 3);
    f.buttons().find(button => button.textContent.startsWith('폐기물 운반원')).click(); finishEncounterIntro(f.scene);
    
    f.scene.update(0, 100);
    assert(f.scene.player.body.x > start);
    f.scene.experience.addExperience(25); // Exactly two level-ups through the real XP table.
    f.scene.update(0, 16);
    assert.equal(f.scene.character.progression.pending, 2);
    assert.equal(f.buttons().length, 3);
    const state = () => JSON.stringify({ x: f.scene.player.body.x, hp: f.scene.player.body.hp, enemies: f.scene.enemySystem.enemies,
      timer: f.scene.character.mainTimer, clock: f.scene.character.time, drops: f.scene.experience.drops });
    const paused = state();
    const pausedFrame = f.scene.player.view.frame.name;
    f.scene.update(0, 5000);
    assert.equal(state(), paused);
    assert.equal(f.scene.player.view.frame.name, pausedFrame, 'skill selection also freezes drawn walking frames');
    const old = f.buttons()[0]; old.click(); old.click();
    assert.equal(f.scene.character.progression.pending, 1);
    // A chosen passive can immediately change HP; only the following update must freeze.
    const afterChoice = state();
    f.scene.update(0, 5000);
    assert.equal(state(), afterChoice, 'opening the next queued menu cannot simulate the frame');
    assert.equal(f.buttons().length, 3);
    f.buttons()[0].click();
    assert.equal(f.scene.character.progression.pending, 0);
    f.scene.update(0, 100);
    assert.notEqual(state(), paused);
    f.scene.events.emit('shutdown');
    assert.equal(f.document.body.children.length, 0);
  } finally { uiConfig.cards.inputDelayMs = previousDelay; }
});

test('Actual death-drop-pickup opens a skill menu mid-frame; defeat and restart clear character and skill state', () => {
  const previousDelay = uiConfig.cards.inputDelayMs;
  uiConfig.cards.inputDelayMs = 0;
  try {
    const f = harness();
    f.buttons().find(button => button.textContent.startsWith('신호 기술자')).click(); finishEncounterIntro(f.scene);
    
    const player = f.scene.player.body;
    f.scene.enemySystem.enemies.splice(0);
    for (let id = 100; id < 102; id++) {
      const enemy = Object.assign(createCombatant({ id, x: player.x + 90, y: player.y + (id - 100) * 45, size: 32 }, 'enemy', 1, 0),
        { archetype: 'E01', kind: 'horizontal', state: 'wait', experienceCategory: 'normal1', path: [], pathIndex: 0, repathRemaining: 0 });
      // Drop from already-defeated sources uses the same real experience system as the scene.
      enemy.hp = 0;
      f.scene.enemySystem.enemies.push(enemy);
    }
    f.scene.update(0, 1000);
    assert.equal(f.scene.experience.level, 2);
    assert.equal(f.scene.character.progression.pending, 1);
    assert(f.scene.character.time < 1, 'stop splitting the frame as soon as XP levels up');
    f.buttons()[0].click();
    player.hp = 0;
    f.scene.update(0, 16);
    assert.equal(f.scene.defeated, true);
    assert.equal(f.buttons()[0].textContent, '다시 시작');
    f.buttons()[0].click();
    assert.equal(f.scene.experience.level, 1);
    assert.equal(f.scene.character, undefined);
    assert.equal(f.scene.combat, undefined);
    assert.equal(f.buttons().length, 3);
    f.buttons().find(button => button.textContent.startsWith('철도 정비공')).click(); finishEncounterIntro(f.scene);
    assert(f.scene.character.progression.levels.every(rank => rank === 0));
    assert.equal(f.scene.player.body.hp, 150);
    f.scene.events.emit('shutdown');
  } finally { uiConfig.cards.inputDelayMs = previousDelay; }
});

test('PlayerController preserves normalized WASD, opposite inputs, release and finite-world wall collision at character speeds', () => {
  const f = harness();
  f.scene.world.obstacles.splice(0);
  f.scene.enemySystem.enemies.splice(0);
  const controller = f.scene.player;
  for (const speed of [280, 300, 320]) {
    controller.body.x = f.scene.world.width / 2; controller.body.y = f.scene.world.height / 2;
    f.keys.get(68).isDown = true;
    controller.update(1, f.scene.world, [], speed);
    assert(Math.abs(controller.body.x - f.scene.world.width / 2 - speed) < 1e-6);
    controller.body.x = f.scene.world.width / 2; controller.body.y = f.scene.world.height / 2;
    f.keys.get(87).isDown = true;
    controller.update(1, f.scene.world, [], speed);
    assert(Math.abs(Math.hypot(controller.body.x - f.scene.world.width / 2, controller.body.y - f.scene.world.height / 2) - speed) < 1e-6);
    f.keys.get(65).isDown = true; f.keys.get(83).isDown = true;
    const before = { x: controller.body.x, y: controller.body.y };
    controller.update(1, f.scene.world, [], speed);
    assert.deepEqual({ x: controller.body.x, y: controller.body.y }, before);
    for (const key of f.keys.values()) key.isDown = false;
    controller.update(1, f.scene.world, [], speed);
    assert.deepEqual({ x: controller.body.x, y: controller.body.y }, before);
    controller.body.x = f.scene.world.width - controller.body.size / 2; f.keys.get(68).isDown = true;
    controller.update(1, { ...f.scene.world, unbounded:false }, [], speed);
    assert.equal(controller.body.x, f.scene.world.width - controller.body.size / 2);
    f.keys.get(68).isDown = false;
  }
  f.scene.events.emit('shutdown');
});

test('Idle breathes in all eight directions with planted feet, stable camera position and no body movement', () => {
  const f=harness(), p=f.scene.player;
  f.scene.world.obstacles.splice(0);
  for(const id of ['mechanic','signal','carrier']) {
    p.setCharacter(id);
    for(const [x,y] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      p.animation.update(.1,x,y,x,y);p.syncView();
      const facing=p.animation.facing, position=[p.body.x,p.body.y];
      p.animation.update(0,0,0,0,0);p.syncView();
      const frame=p.view.frame.name, height=p.view.displayHeight;
      const row=Number(p.animation.frame)/playerArtConfig.framesPerDirection;
      assert.equal(Number(frame),row*playerArtConfig.framesPerDirection+playerIdlePoses[id][row]);
      const foot=()=>p.view.y+(285/320-p.view.originY)*p.view.displayHeight;
      const baseline=foot();
      for(let i=0;i<60;i++)p.update(1/60,f.scene.world,[]);
      p.syncView();
      assert(p.view.displayHeight>height,`${id}/${facing}: idle must animate after release`);
      assert.equal(p.view.frame.name,frame,'idle holds a planted pose instead of walking in place');
      assert.equal(p.animation.facing,facing);
      assert.deepEqual([p.body.x,p.body.y],position);
      assert.deepEqual([p.view.x,p.view.y],position,'camera follow target stays still');
      assert(Math.abs(foot()-baseline)<1e-9,'breathing must not lift the feet');
      const frozen=[p.view.displayWidth,p.view.displayHeight,p.view.originY];
      p.syncView();assert.deepEqual([p.view.displayWidth,p.view.displayHeight,p.view.originY],frozen,'rendering alone does not advance idle');
      p.animation.update(.1,x,y,x,y);p.syncView();
      assert.equal(p.view.displayHeight,playerArtConfig.displaySize);
      assert.equal(p.view.originY,.5,'walking restores the normal origin');
    }
  }
  f.scene.events.emit('shutdown');
});

test('Idle cycle is time-step independent, loops smoothly and validates breathing settings', () => {
  const a=new PlayerAnimation(), b=new PlayerAnimation();
  a.update(1,0,0,0,0);
  for(let i=0;i<100;i++)b.update(.01,0,0,0,0);
  assert(Math.abs(a.idleBreath-b.idleBreath)<1e-12);
  a.update(playerArtConfig.idleCycleSeconds-1,0,0,0,0);
  assert(Math.abs(a.idleBreath)<1e-12);
  for(const key of ['idleCycleSeconds','idleHeightPixels','idleWidthPixels']) {
    const original=playerArtConfig[key];
    try {
      for(const value of [-1,NaN,Infinity,...(key==='idleCycleSeconds'?[0]:[])]) {
        playerArtConfig[key]=value;
        assert.throws(()=>a.update(.01,0,0,0,0),new RegExp(key));
      }
    } finally { playerArtConfig[key]=original; }
  }
});

test('Walking loops four frames in all eight directions, with distinct true profiles and front/rear diagonals', () => {
  const a = new PlayerAnimation();
  const step = 1 / playerArtConfig.frameRate;
  for (const [x,y,facing,start,flip] of [[0,1,'front',0,false],[0,-1,'back',16,false],[1,0,'right',8,false],[-1,0,'left',8,true],
    [1,1,'front-right',4,false],[-1,1,'front-left',4,true],[1,-1,'back-right',12,false],[-1,-1,'back-left',12,true]]) {
    a.update(0,x,y,0,0);
    assert.equal(a.facing,facing); assert.equal(a.frame,String(start)); assert.equal(a.flipX,flip);
    const frames=new Set();
    for(let i=0;i<4;i++){ a.update(step,x,y,x,y);frames.add(Number(a.frame)); }
    assert.deepEqual([...frames].sort((a,b)=>a-b),[start,start+1,start+2,start+3]);
    a.update(step,0,0,0,0);assert.equal(a.frame,String(start));assert.equal(a.moving,false);assert.equal(a.facing,facing);
    a.update(step,x,y,0,0);assert.equal(a.moving,false,'pressing into a wall is not walking');
  }
  a.update(step,1,-1,0,-3);assert.equal(a.facing,'back','wall sliding follows actual movement');
  a.update(step,1,-1,3,0);assert.equal(a.facing,'right','horizontal wall slide uses existing side art');
  a.update(step,1,-1,1e-12,-3);assert.equal(a.facing,'back','roundoff is not a diagonal step');
  const diagonal = 280 / 60 / Math.SQRT2;
  for (const x of [511, 1023, 1500, 2047]) {
    a.update(step,1,1,(x + diagonal) - x,(1500 + diagonal) - 1500);
    assert.equal(a.facing,'front-right','equal diagonal motion keeps its facing across floating-point coordinate boundaries');
  }
  const whole = new PlayerAnimation(), split = new PlayerAnimation();
  whole.update(.31,1,0,30,0);
  for(let i=0;i<31;i++)split.update(.01,1,0,1,0);
  assert.equal(whole.frame,split.frame);
});

test('Real WASD input selects all eight directions, preserves normalized travel and idles on release and finite-world wall contact', () => {
  const f=harness(), controller=f.scene.player;
  f.scene.world.obstacles.splice(0);
  for (const [keys,facing,flip,start] of [
    [[83],'front',false,0],[[87],'back',false,16],[[68],'right',false,8],[[65],'left',true,8],
    [[83,68],'front-right',false,4],[[83,65],'front-left',true,4],[[87,68],'back-right',false,12],[[87,65],'back-left',true,12],
  ]) {
    controller.body.x=f.scene.world.width/2;controller.body.y=f.scene.world.height/2;
    for(const key of keys) f.keys.get(key).isDown=true;
    controller.update(.25,f.scene.world,[],280);controller.syncView();
    assert.equal(controller.animation.facing,facing);assert.equal(controller.view.flipX,flip);
    assert(Number(controller.view.frame.name)>=start&&Number(controller.view.frame.name)<=start+3);
    assert(Math.abs(Math.hypot(controller.body.x-f.scene.world.width/2,controller.body.y-f.scene.world.height/2)-70)<1e-6);
    for(const key of f.keys.values())key.isDown=false;
    const position=[controller.body.x,controller.body.y];
    controller.update(.25,f.scene.world,[],280);controller.syncView();
    assert.equal(controller.view.frame.name,String(start));assert.equal(controller.animation.facing,facing);
    assert.deepEqual([controller.body.x,controller.body.y],position);
  }
  controller.body.x=f.scene.world.width-controller.body.size/2;controller.body.y=24;
  f.keys.get(87).isDown=true;f.keys.get(68).isDown=true;
  controller.update(.25,{...f.scene.world,unbounded:false},[],280);controller.syncView();
  assert.equal(controller.animation.moving,false);assert.equal(controller.view.frame.name,'12');
  assert.deepEqual([controller.body.x,controller.body.y],[f.scene.world.width-controller.body.size/2,24]);
  f.scene.events.emit('shutdown');
});

test('Scene preloads player and enemy atlases; chosen sprites retain collision size, hit flash, restart and idle behavior', () => {
  const queued=[], images=[];
  const loader=new GameScene();
  loader.textures={exists:()=>false};loader.load={atlas:(...args)=>queued.push(args),image:(...args)=>images.push(args)};
  loader.preload();
  assert.equal(queued.length,10,'includes the generated combat atlas');
  assert.deepEqual(queued.slice(0,2), [
    [uiConfig.art.panelKey, uiConfig.art.panel, uiConfig.art.panelAtlas],
    [uiConfig.art.iconsKey, uiConfig.art.icons, uiConfig.art.iconsAtlas],
  ], 'painted UI atlases load alongside the actor atlases');
  const openingImages=images.filter(([key])=>key.startsWith('opening-'));
  const backgrounds=images.filter(([key])=>!key.startsWith('opening-'));
  assert.deepEqual(backgrounds,[...journeyStages.map(s=>[s.key,journeyConfig.path+s.file]),...journeyStages.flatMap(s=>s.centerpiece?[[s.centerpiece.key,journeyConfig.path+s.centerpiece.file]]:[]),...Object.values(journeyPropVariants).flat().map(p=>[p.key,p.image])],'all fifteen locations and nine facility types load');

  assert.equal(openingImages.length,0,'GameScene retries never reload or play the title story');
  const titleImages=[],titleLoader=new TitleScene();
  titleLoader.textures={exists:()=>false};titleLoader.load={image:(...args)=>titleImages.push(args)};
  titleLoader.preload();
  assert.deepEqual(titleImages.map(([,url])=>url),Object.values(openingConfig.illustrations),'story illustrations load on the title before Start is clickable');
  titleLoader.textures.exists=()=>true;titleLoader.preload();assert.equal(titleImages.length,Object.keys(openingConfig.illustrations).length,'already loaded story art is not queued again');
  assert.deepEqual(queued.slice(2,5).map(args=>args[0]),Object.values(playerArt).map(art=>art.key));
  assert.deepEqual(queued.slice(2,5).map(args=>args.slice(1)),Object.values(playerArt).map(art=>[art.sheet,art.atlas]));
  assert.deepEqual(queued.slice(5,9).map(args=>args[0]),[0,1,2,3].map(i=>'enemy-v2-'+i));
  assert.deepEqual(queued[9],[effectArt.key,effectArt.path,effectArt.atlas]);
  loader.textures.exists=()=>true;loader.preload();assert.equal(queued.length,10,'restart reuses loaded textures');
  const f=harness();
  assert.equal(f.scene.player.view.visible,false,'no placeholder player before choosing');
  for(const id of ['mechanic','signal','carrier']) {
    const controller=f.scene.player;
    controller.setCharacter(id);controller.syncView();
    assert.equal(controller.view.textureKey,playerArt[id].key);
    assert.equal(controller.view.visible,true);assert.equal(controller.body.size,48);
    controller.body.hitFlashSeconds=combatConfig.hitFlashSeconds;controller.syncView();
    assert.equal(controller.view.tint,combatConfig.hitColor);
    controller.body.hitFlashSeconds=0;controller.syncView();assert.equal(controller.view.tint,undefined);
  }
  f.keys.get(87).isDown=true;
  f.scene.player.update(.2,f.scene.world,[],280);f.scene.player.syncView();
  assert.equal(f.scene.player.animation.facing,'back');
  f.keys.get(87).isDown=false;f.scene.player.update(.1,f.scene.world,[],280);f.scene.player.syncView();
  assert.equal(f.scene.player.view.frame.name,'17','carrier rests with both feet planted in the second rear pose');
  f.scene.scene.restart();assert.equal(f.scene.player.animation.frame,'0');assert.equal(f.scene.player.view.visible,false);
  f.scene.events.emit('shutdown');
});

test('Selection portraits contain one trimmed original character with real alpha, intact ivory details and transparent margins', () => {
  const { readPng } = require('../scripts/read-player-png.cjs');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../images/players/portrait-extraction.json'), 'utf8'));
  for (const [id, art] of Object.entries(playerArt)) {
    const entry = manifest[id];
    const png = readPng(path.join(__dirname, '../public', art.portrait));
    const source = readPng(path.join(__dirname, '..', entry.source));
    assert.deepEqual([png.width, png.height], [entry.width, entry.height]);
    assert(png.width < source.width / 2 && png.height < source.height, 'ship only the selected drawing');
    let transparent = 0, opaque = 0, partial = 0, ivory = 0;
    let left = png.width, top = png.height, right = -1, bottom = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const at = (y * png.width + x) * 4, alpha = png.pixels[at + 3];
      if (x < entry.padding || y < entry.padding || x >= png.width - entry.padding || y >= png.height - entry.padding) {
        assert.equal(alpha, 0, `${id}: every outer margin is transparent`);
      }
      if (!alpha) { transparent++; continue; }
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      if (alpha === 255) {
        opaque++;
        const sx = entry.sourceX + x - entry.padding, sy = entry.sourceY + y - entry.padding;
        const originalAt = (sy * source.width + sx) * 4;
        assert(png.pixels.subarray(at, at + 3).equals(source.pixels.subarray(originalAt, originalAt + 3)),
          `${id}: opaque drawing pixels must match the original, without redraw or recoloring`);
        if (png.pixels[at] > 200 && png.pixels[at + 1] > 180 && png.pixels[at + 2] > 130) ivory++;
      } else partial++;
    }
    const area = png.width * png.height;
    assert(transparent > area * .1 && opaque > area * .4, `${id}: transparent exterior and solid character required`);
    assert(partial > 0 && partial < area * .05, `${id}: antialiased contour without a translucent paper rectangle`);
    assert(ivory > area * .02, `${id}: light scarf/apron/trim must remain opaque`);
    assert.deepEqual([left, top, right, bottom], [entry.padding, entry.padding, png.width - entry.padding - 1, png.height - entry.padding - 1]);
  }
});

test('Each PNG physically contains 20 equal cells with aligned feet, unchanged original RGBA pixels and eye anchors', () => {
  const {readPng}=require('../scripts/read-player-png.cjs');
  const {createHash}=require('node:crypto');
  const expectedFiles=Object.values(playerArt).flatMap(art=>[art.sheet,art.atlas,art.portrait]).map(file=>path.basename(file)).sort();
  assert.deepEqual(fs.readdirSync(path.join(__dirname,'../public/assets/players')).sort(),expectedFiles,
    'public art must contain only referenced production files; backups increase the shipped build');
  for(const id of ['mechanic','signal','carrier']) {
    const root=path.join(__dirname,'../public/assets/players/');
    const sourceRoot=path.join(__dirname,'../images/players/source') + path.sep;
    const source=readPng(sourceRoot+id+'-walk-source.png');
    const sourceAtlas=JSON.parse(fs.readFileSync(sourceRoot+id+'-walk-source.json','utf8'));
    const atlas=JSON.parse(fs.readFileSync(path.join(__dirname,'../public',playerArt[id].atlas),'utf8'));
    assert.equal(atlas.textures,undefined,'no mixed old/new texture pages');
    assert.equal(path.basename(playerArt[id].sheet),atlas.meta.image);
    assert.deepEqual(Object.keys(atlas.frames),Array.from({length:20},(_,i)=>String(i)));
    const hashes=[];
    const png=readPng(root+atlas.meta.image);
    assert.deepEqual([png.width,png.height],[1280,1600],'PNG itself is a 4 by 5 grid of 320px cells');
    assert.equal(atlas.meta.image,id+'-walk.png');
    for(const [name,f] of Object.entries(atlas.frames)) {
      const i=Number(name),r=f.frame;
      const old=sourceAtlas.frames[name], oldRect=old.frame, offset=old.spriteSourceSize;
      assert(r.x>=0&&r.y>=0&&r.x+r.w<=png.width&&r.y+r.h<=png.height);
      assert.deepEqual(r,{x:i%4*320,y:Math.floor(i/4)*320,w:320,h:320});
      assert.equal(f.trimmed,false,'no per-frame runtime repositioning');
      assert.deepEqual(f.spriteSourceSize,{x:0,y:0,w:320,h:320});
      assert.deepEqual(f.sourceSize,{w:320,h:320});
      assert.deepEqual(f.eye,old.eye,'eye positions remain identical to the original displayed poses');
      for(let y=0;y<oldRect.h;y++) {
        const before=(oldRect.y+y)*source.width*4+oldRect.x*4;
        const after=(r.y+offset.y+y)*png.width*4+(r.x+offset.x)*4;
        assert(source.pixels.subarray(before,before+oldRect.w*4).equals(png.pixels.subarray(after,after+oldRect.w*4)),`${id}/${i}: preserve all four channels exactly`);
      }
      if(i<12) {
        assert(f.eye.x>0&&f.eye.x<1&&f.eye.y>0&&f.eye.y<1);
        const x=Math.round(r.x+f.eye.x*320-f.spriteSourceSize.x);
        const y=Math.round(r.y+f.eye.y*320-f.spriteSourceSize.y);
        const at=(y*png.width+x)*4;
        assert(png.pixels[at+3]>240&&png.pixels[at+1]>235,`${id}/${i}: anchor must land on the bright eye`);
      } else {
        assert.equal(f.eye,null,'back-facing poses have no visible eye');
      }
      let transparent=0,opaque=0,bottom=-1,left=320,right=-1;const hash=createHash('sha256');
      for(let y=r.y;y<r.y+r.h;y++) {
        const row=png.pixels.subarray((y*png.width+r.x)*4,(y*png.width+r.x+r.w)*4);hash.update(row);
        // image_gen interiors use alpha 253/254 (visually opaque), verified with an independent PNG reader.
        for(let x=0;x<r.w;x++) {
          const alpha=row[x*4+3],localY=y-r.y;
          if(alpha===0)transparent++;if(alpha>=250)opaque++;
          if(alpha>8){bottom=localY;left=Math.min(left,x);right=Math.max(right,x);}
          if(x<offset.x||x>=offset.x+oldRect.w||localY<offset.y||localY>=offset.y+oldRect.h) assert.equal(alpha,0,'added cell padding stays transparent');
        }
      }
      assert.equal(bottom,282,`${id}/${i}: sole pixels align within the actual PNG cell`);
      assert(Math.abs((left+right+1)/2-160)<=.5,'actual silhouette is horizontally centered');
      assert(transparent>r.w*r.h*.1&&opaque>oldRect.w*oldRect.h*.3,`${id}/${i}: actual transparent silhouette required`);
      hashes.push(hash.digest('hex'));
    }
    assert.equal(new Set(hashes).size,20,'poses must be drawn frames, not duplicated stills');
    const visiblePixelCount = image => {
      let count = 0;
      for (let at = 3; at < image.pixels.length; at += 4) if (image.pixels[at] > 8) count++;
      return count;
    };
    assert.equal(visiblePixelCount(png),visiblePixelCount(source),
      `${id}: packing preserves every visible source pixel, including detached antialias edges`);
  }
});

test('Eye glow tracks every visible eye and mirrored frame, follows movement, and hides on back, death and selection', () => {
  const graphics=view(), light=new PlayerEyeLight({add:{graphics:()=>graphics}});
  const sprite=view(400,300).setDisplaySize(64,64).setVisible(true);
  for(const id of ['mechanic','signal','carrier']) for(let frame=0;frame<20;frame++) {
    sprite.setTexture(playerArt[id].key,String(frame));
    for(const flip of [false,true]) {
      sprite.setFlipX(flip);light.sync(sprite,id,true);
      if(frame>=12) { assert.equal(graphics.visible,false);assert.equal(graphics.commands.length,0);continue; }
      assert.equal(graphics.visible,true);
      const eye=atlases[playerArt[id].key].frames[frame].eye;
      assert.equal(graphics.x,400+((flip?1-eye.x:eye.x)-.5)*64);
      assert.equal(graphics.y,300+(eye.y-.5)*64);
      assert.equal(graphics.commands[0].color,playerEyeColors[id]);
      assert.equal(graphics.commands[0].radius,playerLightConfig.radius);
      assert.equal(graphics.commands.length,playerLightConfig.rings+1);
      assert(graphics.commands.every(command=>command.x===0&&command.y===0&&command.alpha>0));
    }
  }
  sprite.setTexture(playerArt.mechanic.key,'0').setFlipX(false);
  light.sync(sprite,'mechanic',true);const position=[graphics.x,graphics.y];
  sprite.setPosition(470,280);light.sync(sprite,'mechanic',true);
  assert.equal(graphics.x-position[0],70);assert.equal(graphics.y-position[1],-20);
  light.sync(sprite,'mechanic',false);assert.equal(graphics.visible,false);assert.equal(graphics.commands.length,0);
  sprite.setVisible(false);light.sync(sprite,'mechanic',true);assert.equal(graphics.visible,false);
  sprite.setVisible(true);
  const previous={...playerLightConfig};
  try {
    playerLightConfig.enabled=false;light.sync(sprite,'mechanic',true);assert.equal(graphics.visible,false);
    playerLightConfig.enabled=true;
    for(const invalid of [0,-1,NaN,Infinity,1.5]) {
      playerLightConfig.rings=invalid;
      assert.throws(()=>light.sync(sprite,'mechanic',true),/playerLight.rings/);
    }
  } finally { Object.assign(playerLightConfig,previous); }
});

function effectScene() {
  const images=[];
  const scene={events:new EventEmitter(),add:{image:(x,y,key,frame)=>{const image=view(x,y).setTexture(key,frame);images.push(image);return image;},graphics:()=>view()},scale:{height:720}};
  return {scene,images,live:()=>images.filter(image=>image.textureKey===effectArt.key&&!image.destroyed)};
}

test('Effect images preserve their source aspect ratio in narrow projectile and wide beam boxes',()=>{
  const {EffectSprites}=require('../src/combat/EffectSprites.ts');
  const f=effectScene(),fx=new EffectSprites(f.scene);
  for(const [width,height] of [[96,24],[400,32],[64,64]]){
    fx.begin();fx.draw('saw',100,100,width,height);fx.end();
    const image=f.live()[0];
    assert(Math.abs(image.displayWidth/image.displayHeight-image.frame.realWidth/image.frame.realHeight)<1e-8,'source proportions must survive display sizing');
    assert(image.displayWidth<=width&&image.displayHeight<=height);
  }
});

test('Long lightning links use a continuous path without stretching their endpoint artwork',()=>{
  const {EffectSprites}=require('../src/combat/EffectSprites.ts');
  const f=effectScene(),fx=new EffectSprites(f.scene);
  fx.begin();fx.line('lightning',{x:100,y:200},{x:900,y:200},42);fx.end();
  assert(f.live().every(v=>v.displayWidth<100&&v.displayHeight<100),'no distance-sized atlas image');
  assert(fx.lines.commands.some(c=>c.method==='lineTo'&&c.args[0]===900&&c.args[1]===200),'path ends at the target');
  fx.begin();fx.end();assert.equal(fx.lines.commands.length,0,'expired links clear their geometry');
});

test('All enemy bodies fade at their death position without debris, distortion or repeated death entries',()=>{
  const {enemyDeath}=require('../src/config/effects.ts');
  const f=effectScene(),renderer=new EnemyRenderer(f.scene),system=new StageEnemySystem({width:3000,height:3000,obstacles:[]});
  for(const id of enemyIds)system.enemies.push(system.create(id,{x:400,y:300}));
  renderer.sync(system);
  for(const e of system.enemies){e.hp=0;e.x+=10;}
  const dead=system.removeDefeated();renderer.updateDeaths(0,dead);renderer.sync(system);
  const bodies=f.images.filter(v=>v.textureKey.startsWith('enemy-')&&!v.destroyed);
  assert.equal(bodies.length,23);assert(bodies.every(v=>v.x===410&&v.alpha===1&&v.tint===undefined));
  const sizes=bodies.map(v=>[v.displayWidth,v.displayHeight]);
  renderer.updateDeaths(enemyDeath.seconds/2,[]);renderer.sync(system);
  assert(bodies.every(v=>v.alpha>0&&v.alpha<1));
  assert.deepEqual(bodies.map(v=>[v.displayWidth,v.displayHeight]),sizes,'fade never squashes the body');
  const alphas=bodies.map(v=>v.alpha);renderer.sync(system);
  assert.deepEqual(bodies.map(v=>v.alpha),alphas,'rendering alone cannot advance death during pause');
  renderer.updateDeaths(0,dead);assert.equal(renderer.deaths.size,23);
  renderer.updateDeaths(enemyDeath.seconds,[]);renderer.sync(system);
  assert(bodies.every(v=>v.destroyed));assert.equal(f.live().length,0);
});

test('Every warning shape fills from its origin as time advances while retaining its full boundary',()=>{
  for(const kind of ['circle','spawn','arc','lane']){
    const f=effectScene(),renderer=new EnemyRenderer(f.scene),calls=[];
    const g=new Proxy({}, {get:(_,method)=>(...args)=>{calls.push([method,...args]);return g;}});
    renderer.graphics=g;
    const h={kind,from:{x:100,y:100},to:{x:300,y:100},radius:80,width:32,angle:0,arc:Math.PI/2,age:0,warning:2,duration:.2};
    for(const progress of [0,.25,.75,.99]){
      calls.length=0;h.age=progress*2;renderer.hazard(h);
      if(kind==='circle'||kind==='spawn'){
        assert(calls.some(c=>c[0]==='strokeCircle'&&c[3]===80));
        if(progress>0)assert(calls.some(c=>c[0]==='fillCircle'&&Math.abs(c[3]-80*progress)<1e-8),'circle has a growing filled interior');
      }else if(kind==='arc'){
        assert(calls.some(c=>c[0]==='arc'&&c[3]===80));
        if(progress>0)assert(calls.some(c=>c[0]==='arc'&&Math.abs(c[3]-80*progress)<1e-8),'sector has a growing filled interior');
      }else{
        assert(calls.some(c=>c[0]==='strokePoints'&&c[1][1].x===300));
        if(progress>0)assert(calls.some(c=>c[0]==='fillPoints'&&Math.abs(c[1][1].x-(100+200*progress))<1e-8),'lane fills toward its far end');
      }
    }
  }
});

test('Boss projectile enlargement reaches the rendered image and persists after its owner is removed',()=>{
  const {enemyAttackVisuals}=require('../src/config/enemyAttacks.ts');
  const system=new StageEnemySystem({width:3000,height:3000,obstacles:[]}),f=effectScene(),renderer=new EnemyRenderer(f.scene);
  const owner=system.create('B01',{x:1600,y:1500});
  system.attacks.shoot(owner,0,.04,system.attacks.group());
  system.attacks.shoot(owner,0,.04,system.attacks.group(),enemyAttackVisuals.bossProjectileScale);
  renderer.sync(system);
  const [normal,boss]=f.live().filter(v=>Number(v.frame.name)===effectFrames.shard);
  assert(normal&&boss);
  assert(Math.abs(boss.displayWidth/normal.displayWidth-enemyAttackVisuals.bossProjectileScale/enemyAttackVisuals.projectileScale)<1e-8);
  assert(boss.displayHeight>normal.displayHeight);
  assert.equal(system.attacks.projectiles[0].radius,system.attacks.projectiles[1].radius);
});
test('Generated effect atlas contains sixteen separate alpha drawings with transparent gutters, not opaque background tiles',()=>{
  const {readPng}=require('../scripts/read-player-png.cjs');
  const png=readPng(path.join(__dirname,'../public',effectArt.path));
  const atlas=JSON.parse(fs.readFileSync(path.join(__dirname,'../public',effectArt.atlas)));
  assert.equal(Object.keys(atlas.frames).length,Object.keys(effectFrames).length);
  for(const [name,index] of Object.entries(effectFrames)) {
    const r=atlas.frames[index].frame;
    assert(r.x+r.w<=png.width&&r.y+r.h<=png.height,name);
    let visible=0,transparent=0,partial=0;
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){
      const alpha=png.pixels[((r.y+y)*png.width+r.x+x)*4+3];
      if(alpha>128)visible++;if(!alpha)transparent++;if(alpha>0&&alpha<250)partial++;
      // Generated RGBA contains alpha=1 quantization dust; no visible paint may reach a cell border.
      if(x<6||y<6||x>=r.w-6||y>=r.h-6)assert(alpha<=1,name+' has a visually clear cell border');
    }
    assert(visible>300&&transparent>r.w*r.h*.35&&partial>0,name+' has painted RGBA pixels and soft transparent edges');
  }
});
test('All three real character weapons and twelve acquired auxiliary skills render generated images, animate and clean expired effects',()=>{
  const {skills}=require('../src/config/skills.ts');
  const {ExperienceSystem}=require('../src/experience/ExperienceSystem.ts');
  const world={width:3000,height:3000,obstacles:[]},viewport={x:860,y:1140,width:1280,height:720};
  for(const id of ['mechanic','signal','carrier']){
    const p=createCombatant({id:0,x:1500,y:1500,size:48},'player',100,24);
    let random=0,level=1;
    const c=new CharacterCombat(id,p,()=>random),xp=new ExperienceSystem();
    for(let skillId=7;skillId<=10;skillId++){
      const eligible=skills[id].filter(s=>c.progression.level(s.id)<5);
      random=(eligible.findIndex(s=>s.id===skillId)+.01)/eligible.length;
      c.progression.observeLevel(++level);const offer=c.progression.offer();
      assert(c.choose(offer.token,offer.choices.findIndex(s=>s.kind==='skill'&&s.id===skillId),xp));
    }
    const enemies=Array.from({length:8},(_,i)=>createCombatant({id:i+1,x:p.x+Math.cos(i*Math.PI/4)*100,y:p.y+Math.sin(i*Math.PI/4)*100,size:32},'enemy',100000,0));
    if(id==='carrier')enemies[0].x=p.x+40; // Enter the trap sensor, rather than merely its explosion radius.
    const f=harness(); // Real PlayerHud ownership/lifecycle as used by the GameScene.
    const images=[];const original=f.scene.add.image;
    f.scene.add.image=(...args)=>{const image=original(...args);images.push(image);return image;};
    const renderer=new CharacterRenderer(f.scene),seen=new Set();let previousAngle;
    for(let frame=0;frame<600;frame++){
      c.prepare(1/60,p,enemies);c.update(1/60,world,viewport);renderer.sync(c);
      for(const image of images.filter(image=>!image.destroyed&&image.textureKey===effectArt.key)){
        seen.add(Number(image.frame.name));assert(Number.isFinite(image.displayWidth)&&image.displayWidth>0);
        if(id==='mechanic'&&Number(image.frame.name)===effectFrames.saw){if(previousAngle!==undefined&&image.rotation!==previousAngle)seen.add('rotating');previousAngle=image.rotation;}
      }
    }
    const expected=id==='mechanic'?['saw','cut','pulse']:id==='signal'?['lightning','pulse']:['mine','explosion','poison','shield'];
    for(const name of expected)assert(seen.has(effectFrames[name]),id+' actually draws '+name);
    if(id==='mechanic'){
      assert(seen.has('rotating'),'saw rotates during the real attack');
      assert(!seen.has(effectFrames.rivet),'mechanic no longer renders ranged auxiliary shots');
    }
    assert.equal(c.shots.length,0,'character growth stays with melee, electricity or traps');
    c.swings.length=c.shots.length=c.mines.length=c.zones.length=c.effects.length=c.shields.length=c.lures.length=0;
    renderer.sync(c);assert(images.filter(image=>image.textureKey===effectArt.key).every(image=>image.destroyed),'expired attacks release their images');
    f.scene.events.emit('shutdown');
  }
});
test('All 23 enemies show nonlethal impacts but no death sparks; hazards and projectiles retain their cues and direction',()=>{
  const world={width:3000,height:3000,obstacles:[]},system=new StageEnemySystem(world),f=effectScene();
  const renderer=new EnemyRenderer(f.scene),impacts=new ImpactRenderer(f.scene);
  const player=createCombatant({id:0,x:1500,y:1500,size:48},'player',100,24);
  for(const [i,id] of enemyIds.entries())system.enemies.push(system.create(id,{x:1600+i*10,y:1500}));
  const actors=[player,...system.enemies];impacts.observe(0,actors);
  for(const actor of actors)actor.hp--;
  // Effects now fade in from alpha=0; retain the full count check after entry starts.
  impacts.observe(1/60,actors);impacts.observe(.02,actors);impacts.sync();
  assert.equal(f.live().filter(v=>Number(v.frame.name)===effectFrames.hit).length,24,'all enemies plus player show one impact');
  for(const actor of actors)actor.hp=0;
  impacts.observe(1/60,actors);impacts.observe(.02,actors);impacts.sync();
  assert.equal(f.live().length,0,'death removes previous hit sparks and never spawns debris or a ring');
  impacts.observe(effectArt.impactSeconds,[]);impacts.sync();assert.equal(f.live().length,0);
  const e=system.enemies[0];e.hp=e.maxHp;e.damageReduction=.2;e.frontalReduction=.2;
  system.attacks.shoot(e,Math.PI/2,.1,system.attacks.group());system.attacks.shootHook(e,Math.PI,.1,system.attacks.group(),200,16,.5);
  for(const kind of ['circle','lane','arc','spawn'])system.attacks.hazard(e.id,kind,e,{x:e.x+100,y:e.y},{radius:80,width:24,angle:0,age:.02,warning:0,duration:.2});
  renderer.sync(system,player.y);
  const active=f.live();for(const name of ['shield','shard','saw','beam','enemyCut','crush','pulse'])assert(active.some(v=>Number(v.frame.name)===effectFrames[name]),name);
  assert.equal(active.find(v=>Number(v.frame.name)===effectFrames.shard).rotation,Math.PI/2);
  system.attacks.clear();system.enemies.length=0;renderer.sync(system,player.y);assert.equal(f.live().length,0,'cleared wave leaves no stale images');
});

test('Normal and strong orbiting saws render only the blade, with no slash trail at any phase',()=>{
  const {characterWeapons}=require('../src/config/characterWeapons.ts');
  const tuning=characterWeapons.mechanic;
  const f=harness(),p=createCombatant({id:0,x:1500,y:1500,size:48},'player',150,24),c=new CharacterCombat('mechanic',p);
  const images=[],original=f.scene.add.image;f.scene.add.image=(...args)=>{const v=original(...args);images.push(v);return v;};
  const renderer=new CharacterRenderer(f.scene),swing={angle:0,age:0,radius:tuning.radius,range:tuning.range,payload:{strong:false},hitIds:new Set()};c.swings.push(swing);
  for(const strong of [false,true])for(const progress of [0,.3,.99]){
    swing.payload.strong=strong;swing.age=tuning.duration*progress;swing.angle=progress*Math.PI*2;
    renderer.sync(c);
    const live=images.filter(v=>!v.destroyed&&v.textureKey===effectArt.key);
    assert.deepEqual(live.map(v=>Number(v.frame.name)),[effectFrames.saw],'only the saw is visible');
    assert.equal(live[0].displayWidth,tuning.length*effectArt.paddingScale,'blade size is unchanged');
    assert(Math.abs(Math.hypot(live[0].x-p.x,live[0].y-p.y)-tuning.radius)<1e-6,'blade follows the same hit orbit');
  }
  assert.deepEqual([p.x,p.y,swing.radius,swing.range],[1500,1500,tuning.radius,tuning.range],'presentation cannot change the configured hit orbit');
  c.swings.length=0;renderer.sync(c);
  assert(images.filter(v=>v.textureKey===effectArt.key).every(v=>v.destroyed),'ending the attack removes its blade image');
  f.scene.events.emit('shutdown');
});
test('Large explosions enter from a small transparent flash and separate a restrained core from a spreading fading ring',()=>{
  const {characterWeapons}=require('../src/config/characterWeapons.ts');
  const f=harness(),p=createCombatant({id:0,x:1500,y:1500,size:48},'player',120,24),c=new CharacterCombat('carrier',p);
  const images=[],original=f.scene.add.image;f.scene.add.image=(...args)=>{const v=original(...args);images.push(v);return v;};
  const renderer=new CharacterRenderer(f.scene),effect={x:1600,y:1500,radius:200,remaining:characterWeapons.effectDuration};c.effects.push(effect);
  const sample=age=>{effect.remaining=characterWeapons.effectDuration-age;renderer.sync(c);return images.filter(v=>!v.destroyed&&v.textureKey===effectArt.key).map(v=>({frame:Number(v.frame.name),width:v.displayWidth,alpha:v.alpha}));};
  const born=sample(0),early=sample(.035),peak=sample(.08),end=sample(.175);
  assert(born.every(v=>v.alpha<.1),'no full-size opaque birth frame');
  const core=peak.find(v=>v.frame===effectFrames.explosion),ring=peak.find(v=>v.frame===effectFrames.pulse);
  assert(core&&ring,'compact flash and a separate outer shockwave are required');
  assert(core.width<180&&ring.alpha<.6,'large radius cannot enlarge the solid flash into a screen-covering icon');
  assert(ring.width<=require('../src/config/effects.ts').effectGround.stampSize,'painted shockwave detail stays compact');
  sample(.08);
  assert(renderer.fx.ground.commands.some(c=>c.method==='strokeCircle'&&c.args[2]>100),'a separate thin ring still communicates the spreading damage area');
  const firstVisible=sample(.009).find(v=>v.frame===effectFrames.pulse);
  assert(firstVisible.width<ring.width/2,'first visible shockwave must begin near the impact, not at full area size');
  assert(early.find(v=>v.frame===effectFrames.pulse).width<ring.width,'shockwave expands over time');
  assert(end.every(v=>v.alpha<core.alpha),'both layers fade out');
  assert.deepEqual(sample(.08),peak,'rendering the same simulation age twice must not advance growth or fade');
  assert.equal(effect.radius,200,'damage radius is preserved');f.scene.events.emit('shutdown');
});

test('Rendered mechanic saw is larger, closer and spins independently at a readable speed',()=>{
  const {characterWeapons}=require('../src/config/characterWeapons.ts');
  const f=harness(),p=createCombatant({id:0,x:1500,y:1500,size:48},'player',150,24),c=new CharacterCombat('mechanic',p);
  const images=[],original=f.scene.add.image;f.scene.add.image=(...args)=>{const v=original(...args);images.push(v);return v;};
  const target=createCombatant({id:1,x:1564,y:1500,size:32},'enemy',10000,0);
  const world={width:3000,height:3000,obstacles:[]},viewport={x:860,y:1140,width:1280,height:720};
  const step=dt=>{c.prepare(dt,p,[target]);c.update(dt,world,viewport);};
  const renderer=new CharacterRenderer(f.scene);step(1/60);renderer.sync(c);
  const saw=()=>images.find(v=>!v.destroyed&&v.textureKey===effectArt.key&&Number(v.frame.name)===effectFrames.saw);
  assert(saw(),'a nearby target must create the saw');
  const firstRotation=saw().rotation;
  assert(saw().displayWidth>72,'larger than the previous 72px padded sprite');
  assert(Math.hypot(saw().x-p.x,saw().y-p.y)<80,'closer than the old 120px orbit');
  step(.1);renderer.sync(c);
  assert(Math.abs(saw().rotation-firstRotation)<.8,'teeth spin slowly instead of following twice the orbit angle');
  const distance=Math.hypot(saw().x-p.x,saw().y-p.y);
  assert(Math.abs(distance-characterWeapons.mechanic.radius)<1e-6,'the image follows the real hit orbit');
  f.scene.events.emit('shutdown');
});

