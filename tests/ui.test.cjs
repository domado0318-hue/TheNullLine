const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { registerHooks } = require('node:module');

registerHooks({ resolve(specifier, context, next) { return next(context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !path.extname(specifier) ? specifier + '.ts' : specifier, context); } });
const { showWeaponSelection, showDefeat, showTitleScreen } = require('../src/ui/GameOverlay.ts');
const { showCharacterSelection, showSkillSelection } = require('../src/ui/GameOverlay.ts');
const { formatPlayerText } = require('../src/ui/GameOverlay.ts');
const { CharacterCombat } = require('../src/combat/CharacterCombat.ts');
const { createCombatant } = require('../src/combat/types.ts');
const { ExperienceSystem } = require('../src/experience/ExperienceSystem.ts');
const { uiConfig } = require('../src/config/ui.ts');
const { PlayerHud } = require('../src/ui/PlayerHud.ts');
const { skills, skillEffect } = require('../src/config/skills.ts');
const { loadGameFont } = require('../src/ui/loadGameFont.ts');

test('Game font readiness waits for the web font before allowing Canvas text creation', async () => {
  let finish;
  let ready = false;
  const loading = loadGameFont({ load(font) {
    assert.equal(font, '16px "Yangjin"');
    return new Promise(resolve => { finish = resolve; });
  } }).then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false, 'a slow font must not start the game with cached fallback text');
  finish([]);
  await loading;
  assert.equal(ready, true);
});

test('Failed font download allows the game to start with its configured fallback', async t => {
  const failure = new Error('font unavailable');
  const warning = t.mock.method(console, 'warn', () => {});
  await loadGameFont({ load: async () => { throw failure; } });
  assert.equal(warning.mock.calls.length, 1);
  assert.equal(warning.mock.calls[0].arguments[1], failure);
  assert.match(uiConfig.fontFamily, /^"Yangjin",/);
  assert.match(uiConfig.fontFamily, /sans-serif$/);
});

// DOM lifecycle/activation tests use native EventTarget dispatch. No Phaser hit-test mocks.
class Element extends EventTarget {
  constructor(tagName, document) {
    super();
    Object.assign(this, { tagName, ownerDocument: document, style: {}, children: [], attributes: {}, parentNode: null });
  }
  get textContent() { return (this.ownText || '') + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.ownText = value; this.children = []; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  remove() {
    if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
  focus() { this.ownerDocument.activeElement = this; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}

function harness(rect = { left: 0, top: 0, width: 1280, height: 720 }) {
  const document = { defaultView: new EventTarget() };
  document.createElement = (tag) => new Element(tag, document);
  document.createElementNS = (_namespace, tag) => new Element(tag, document);
  document.body = document.createElement('body');
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => rect;
  let restarted = 0;
  const scene = {
    game: { canvas },
    scale: Object.assign(new EventEmitter(), { width: 1280, height: 720 }),
    events: new EventEmitter(),
    scene: { restart: () => restarted++ },
    cameras: { main: { scrollX: 860, scrollY: 1140 } },
  };
  const findButtons = (element = document.body) => element.children.flatMap((child) => child.tagName === 'button' ? [child] : findButtons(child));
  return { scene, document, canvas, findButtons, rect, get restarted() { return restarted; } };
}

test('Selection menus omit routine instructions and category clutter while retaining meaningful choices', () => {
  const ui = harness();
  showCharacterSelection(ui.scene, () => {});
  const panel = ui.document.body.children[0].children[0];
  assert.equal(panel.children[0].children.length, 1, 'the heading carries only its live title');
  assert.doesNotMatch(panel.textContent, /20종|WASD|최대 Lv|HP |이동 |선택선택/);
  ui.scene.events.emit('shutdown');
  const body = createCombatant({ id: 0, x: 0, y: 0, size: 48 }, 'player', 120, 24);
  const combat = new CharacterCombat('mechanic', body, () => 0);
  combat.progression.observeLevel(2);
  showSkillSelection(ui.scene, combat, combat.progression.offer(), () => {});
  const skillsPanel = ui.document.body.children[0].children[0];
  assert.doesNotMatch(skillsPanel.textContent, /남은 선택|일시정지|최초 습득|신규 Lv|보유 스킬 없음|직업/);
  assert.equal(ui.findButtons().length, 3);
  assert(ui.findButtons().every(card => !card.children[2].children.some(child => child.attributes.class === 'rail-trait')));
  assert(ui.findButtons()[0].textContent.includes(skillEffect(skills.mechanic[0], 1)));
  ui.scene.events.emit('shutdown');
});

test('Skill selection shows current critical totals for every character, updates after choices and resets on a fresh run', t => {
  t.mock.method(performance, 'now', () => 10000);
  const delay = uiConfig.cards.inputDelayMs;
  uiConfig.cards.inputDelayMs = 0;
  try {
    for (const character of ['mechanic', 'signal', 'carrier']) {
      const ui = harness({left:120,top:50,width:640,height:360});
      let random = 20.01 / 22;
      const body = createCombatant({id:0,x:1500,y:1500,size:48},'player',100,24);
      const combat = new CharacterCombat(character,body,()=>random), xp = new ExperienceSystem();
      const current = () => ui.document.body.children[0].children[0].children.find(child=>child.attributes.class==='rail-critical-stats');
      const open = () => {
        const offer = combat.progression.offer();
        showSkillSelection(ui.scene,combat,offer,index=>combat.choose(offer.token,index,xp));
        return offer;
      };
      combat.progression.observeLevel(3);
      open();
      assert.equal(current().textContent,'현재 치명타 확률 5% · 피해 배율 1.5배');
      assert.equal(current().style.pointerEvents,'none');
      assert.equal(ui.findButtons().length,3);
      ui.findButtons().find(card=>card.textContent.startsWith('정밀 조준')).click();
      assert.equal(ui.document.body.children.length,0);
      random = .999;
      open();
      assert.equal(current().textContent,'현재 치명타 확률 10% · 피해 배율 1.5배');
      ui.findButtons().find(card=>card.textContent.startsWith('치명적 일격')).click();
      showSkillSelection(ui.scene,combat,{token:99,choices:[{kind:'supply',id:'heal'}]},()=>{});
      assert.equal(current().textContent,'현재 치명타 확률 10% · 피해 배율 1.7배');
      assert.equal(ui.document.body.children[0].children[0].style.transform,'scale(0.5, 0.5)');
      ui.scene.events.emit('shutdown');
      const fresh = new CharacterCombat(character,body,()=>0);
      fresh.progression.observeLevel(2);
      showSkillSelection(ui.scene,fresh,fresh.progression.offer(),()=>{});
      assert.equal(current().textContent,'현재 치명타 확률 5% · 피해 배율 1.5배');
      ui.scene.events.emit('shutdown');
    }
  } finally { uiConfig.cards.inputDelayMs = delay; }
});

test('Painted UI atlases retain transparent surroundings and complete separate equipment silhouettes', () => {
  const fs = require('node:fs');
  const { readPng } = require('../scripts/read-player-png.cjs');
  const a = uiConfig.art;
  for (const [pngPath, atlasPath] of [[a.panel, a.panelAtlas], [a.icons, a.iconsAtlas]]) {
    const png = readPng(path.join(__dirname, '../public', pngPath));
    const atlas = JSON.parse(fs.readFileSync(path.join(__dirname, '../public', atlasPath), 'utf8'));
    assert.deepEqual(atlas.meta.size, { w: png.width, h: png.height });
    if (pngPath === a.panel) {
      assert.deepEqual(a.panelSize, { width: png.width, height: png.height });
      const f = a.panelFrame;
      assert.deepEqual(atlas.frames.panel.frame, { x: f.x, y: f.y, w: f.width, h: f.height },
        'DOM headings and canvas HUD must crop the same replacement artwork');
    }
    assert.equal(png.pixels[3], 0, 'do not ship a background rectangle');
    for (const [name, { frame: f }] of Object.entries(atlas.frames)) {
      assert(f.x >= 0 && f.y >= 0 && f.x + f.w <= png.width && f.y + f.h <= png.height, name);
      let visible = 0;
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        const alpha = png.pixels[(y * png.width + x) * 4 + 3];
        if (alpha >= 128) visible++;
        if (pngPath === a.icons && (x === f.x || y === f.y || x === f.x + f.w - 1 || y === f.y + f.h - 1))
          assert(alpha < 32, `${name}: keep the entire silhouette inside its frame`);
      }
      assert(visible > f.w * f.h * .2, `${name}: actual equipment artwork is required`);
      if (pngPath === a.icons) assert.deepEqual(f, a.iconFrames[name], 'DOM and canvas use the same artwork crop');
    }
  }
});

test('C title artwork follows canvas scaling; Start opens character selection once and scene exit removes stale input', () => {
  const fs = require('node:fs');
  assert.equal(require('node:crypto').createHash('sha256')
    .update(fs.readFileSync(path.join(__dirname, '../public', uiConfig.titleScreen.image))).digest('hex'),
    '5b269b47c1a4892e7df04514a67cb2868d8f5a059ba6f36e80b1676d4d1255d1',
    'the shipped title must remain the selected C artwork');
  for (const exit of ['start', 'shutdown', 'destroy']) {
    const ui = harness({ left: 120, top: 50, width: 640, height: 360 });
    let starts = 0;
    showTitleScreen(ui.scene, () => { starts++; showCharacterSelection(ui.scene, () => {}); });
    const root = ui.document.body.children[0];
    const panel = root.children[0];
    const image = panel.children[0];
    assert.equal(root.attributes['aria-label'], 'THE NULL LINE');
    assert.equal(image.tagName, 'img');
    assert.equal(image.attributes.src, uiConfig.titleScreen.image);
    assert.equal(image.style.objectFit, 'contain', 'keep the complete composition visible');
    assert.equal(panel.style.transform, 'scale(0.5, 0.5)');
    assert.equal(root.style.left, '120px');
    const button = ui.findButtons()[0];
    assert.equal(button.textContent, '게임 시작');
    assert.equal(button.style.backgroundColor, 'transparent', 'the title artwork must remain visible through the button');
    assert.equal(button.attributes.class, 'rail-title-button', 'the title uses text and a route, without an enamel plate');
    const route = button.children.find(child => child.attributes.class === 'rail-title-route');
    assert(route && route.attributes['aria-hidden'] === 'true');
    const initial = button.style.filter;
    button.dispatchEvent(new Event('mouseenter'));
    assert.notEqual(button.style.filter, initial);
    assert.equal(button.style.backgroundColor, 'transparent', 'hover must not add a white rectangle');
    button.dispatchEvent(new Event('mouseleave'));
    assert.equal(button.style.filter, initial);
    root.click(); assert.equal(starts, 0, 'the artwork does not start the game');
    Object.assign(ui.rect, { left: 0, top: 90, width: 960, height: 540 });
    ui.document.defaultView.dispatchEvent(new Event('resize'));
    assert.equal(root.style.top, '90px');
    assert.equal(panel.style.transform, 'scale(0.75, 0.75)');
    if (exit === 'start') {
      button.click(); button.click();
      assert.equal(starts, 1);
      assert.equal(ui.findButtons().length, 3);
      assert.equal(ui.document.body.children.length, 1, 'only the character menu remains');
    }
    ui.scene.events.emit(exit === 'destroy' ? 'destroy' : 'shutdown');
    button.click();
    assert.equal(starts, exit === 'start' ? 1 : 0);
    assert.equal(ui.document.body.children.length, 0);
    assert.equal(ui.scene.scale.listenerCount('resize'), 0);
    assert.equal(ui.scene.events.listenerCount('shutdown'), 0);
    assert.equal(ui.scene.events.listenerCount('destroy'), 0);
  }
});

test('Native Sword/Bullet buttons start the selected weapon exactly once and restore game focus', () => {
  for (const [label, kind] of [['검', 'sword'], ['탄환', 'bullet']]) {
    const ui = harness();
    const selected = [];
    showWeaponSelection(ui.scene, (weapon) => selected.push(weapon));
    assert.deepEqual(selected, [], 'Selection must wait for input');
    const button = ui.findButtons().find((item) => item.textContent === label);
    assert(button);
    assert.equal(button.type, 'button');
    button.click();
    assert.deepEqual(selected, [kind]);
    assert.equal(ui.document.body.children.length, 0);
    assert.equal(ui.document.activeElement, ui.canvas);
    button.click();
    assert.deepEqual(selected, [kind], 'Old button callbacks cannot start twice');
    assert.equal(ui.scene.events.listenerCount('shutdown'), 0);
    assert.equal(ui.scene.scale.listenerCount('resize'), 0);
  }
});

test('Menu tracks the actual canvas offset, letterboxing, browser resize and CSS scaling', () => {
  const ui = harness({ left: 120, top: 50, width: 640, height: 360 });
  showWeaponSelection(ui.scene, () => {});
  const root = ui.document.body.children[0];
  const panel = root.children[0];
  assert.equal(root.style.left, '120px');
  assert.equal(root.style.top, '50px');
  assert.equal(panel.style.transform, 'scale(0.5, 0.5)');
  Object.assign(ui.rect, { left: 0, top: 140, width: 960, height: 540 });
  ui.scene.scale.emit('resize');
  assert.equal(root.style.top, '140px');
  assert.equal(root.style.width, '960px');
  assert.equal(panel.style.transform, 'scale(0.75, 0.75)');
  ui.scene.events.emit('shutdown');
});

test('Backdrop cannot choose a weapon; leaving the scene disposes stale buttons and listeners', () => {
  const ui = harness();
  const selected = [];
  showWeaponSelection(ui.scene, (weapon) => selected.push(weapon));
  const root = ui.document.body.children[0];
  const oldButton = ui.findButtons()[0];
  root.click();
  assert.deepEqual(selected, []);
  ui.scene.events.emit('shutdown');
  assert.equal(ui.document.body.children.length, 0);
  oldButton.click();
  assert.deepEqual(selected, []);
  assert.equal(ui.scene.scale.listenerCount('resize'), 0);
});

test('Restart button works regardless of world camera position', () => {
  const ui = harness();
  ui.scene.cameras.main.scrollX = 1736;
  ui.scene.cameras.main.scrollY = 2296;
  showDefeat(ui.scene);
  ui.findButtons()[0].click();
  assert.equal(ui.restarted, 1);
  assert.equal(ui.document.body.children.length, 0);
});

test('Buttons expose visible browser hover feedback', () => {
  const ui = harness();
  showWeaponSelection(ui.scene, () => {});
  const button = ui.findButtons()[0];
  const initialFilter = button.style.filter;
  assert.equal(button.style.backgroundColor, 'transparent');
  button.dispatchEvent(new Event('mouseenter'));
  assert.notEqual(button.style.filter, initialFilter);
  button.dispatchEvent(new Event('mouseleave'));
  assert.equal(button.style.filter, initialFilter);
  ui.scene.events.emit('destroy');
  assert.equal(ui.document.body.children.length, 0);
});

test('Character traits and skill distances use player language instead of pixel coordinates', () => {
  assert.equal(formatPlayerText('500px 이동 · 반경 +8px'), '10m 이동 · 반경 +0.16m');
  assert.equal(formatPlayerText('3초마다 공격력의 60% 피해'), '3초마다 공격력의 60% 피해');
  const previousScale = uiConfig.distancePixelsPerMeter;
  try {
    for (const scale of [0, -1, NaN, Infinity]) {
      uiConfig.distancePixelsPerMeter = scale;
      assert.throws(() => formatPlayerText('500px'), /ui.distancePixelsPerMeter/);
    }
  } finally { uiConfig.distancePixelsPerMeter = previousScale; }
  const ui = harness();
  showCharacterSelection(ui.scene, () => {});
  const carrier = ui.findButtons().find(card => card.textContent.startsWith('폐기물 운반원'));
  assert(carrier.textContent.includes('이동할수록 다음 함정 강화'));
  assert.doesNotMatch(carrier.textContent, /px/);
  ui.scene.events.emit('shutdown');
  for (const character of ['mechanic', 'signal', 'carrier']) {
    const combat = new CharacterCombat(character, createCombatant({ id: 0, x: 0, y: 0, size: 48 }, 'player', 150, 24), () => 0);
    for (let id = 1; id <= skills[character].length; id++) {
      showSkillSelection(ui.scene, combat, { token: 1, choices: [{kind: 'skill', id}] }, () => {});
      const card = ui.findButtons()[0];
      assert.doesNotMatch(card.textContent + card.attributes['aria-label'], /\dpx/);
      assert(card.textContent.includes(formatPlayerText(skillEffect(skills[character][id - 1], 1))), 'distance conversion retains the actual effect amount');
      ui.scene.events.emit('shutdown');
    }
  }
});

test('Three character cards select their character once, reject rapid/repeated clicks and clean stale listeners', t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  for (const [name, id] of [['철도 정비공', 'mechanic'], ['신호 기술자', 'signal'], ['폐기물 운반원', 'carrier']]) {
    const ui = harness({ left: 40, top: 70, width: 960, height: 540 });
    const selected = [];
    showCharacterSelection(ui.scene, character => selected.push(character));
    assert.equal(ui.findButtons().length, 3);
    const card = ui.findButtons().find(button => button.textContent.startsWith(name));
    const portrait = card.children.find(child => child.tagName === 'img');
    assert.equal(card.children[0].textContent, name, 'station nameplate precedes the portrait');
    assert.equal(portrait.tagName, 'img');
    assert.equal(portrait.attributes.alt, name);
    assert.equal(portrait.attributes.src, `/assets/players/${id}-portrait.png`);
    assert.equal(portrait.style.objectFit, 'contain');
    assert.equal(portrait.style.backgroundColor, undefined, 'no paper-colored panel behind the transparent artwork');
    assert.equal(portrait.children.length, 0, 'load only the extracted PNG, not a clipped comparison sheet');
    assert.equal(card.style.height, `${uiConfig.characterCards.height}px`);
    assert.equal(card.children[2].tagName, 'span', 'transparent character art precedes the readable description');
    const stats = card.children[2].children.find(child => child.attributes.class === 'rail-stats');
    const { characters } = require('../src/config/characters.ts');
    assert.equal(stats.children[0].textContent, String(characters[id].maxHp));
    assert.equal(stats.children[0].attributes['aria-label'], `체력 ${characters[id].maxHp}`);
    assert.equal(stats.children[1].textContent, String(characters[id].speed));
    assert.equal(stats.children[1].attributes['aria-label'], `이동 속도 ${characters[id].speed}`);
    assert(stats.children.every(stat => stat.children[0].attributes['aria-hidden'] === 'true'));
    assert(card.attributes['aria-label'].includes(name), 'the whole card remains a named native action');
    card.click(); assert.deepEqual(selected, []);
    now += uiConfig.cards.inputDelayMs + 1;
    const double = new Event('click'); Object.defineProperty(double, 'detail', { value: 2 });
    card.dispatchEvent(double); assert.deepEqual(selected, []);
    card.click(); card.click(); assert.deepEqual(selected, [id]);
    assert.equal(ui.document.body.children.length, 0);
    assert.equal(ui.scene.scale.listenerCount('resize'), 0);
  }
});

test('Skill cards show current and next rank, final MAX transition and exclude completed skills from new offers', t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const ui = harness();
  const body = createCombatant({ id: 0, x: 1500, y: 1500, size: 48 }, 'player', 120, 24);
  const combat = new CharacterCombat('mechanic', body, () => 0);
  const experience = new ExperienceSystem();
  combat.progression.observeLevel(7);
  for (let rank = 1; rank <= 5; rank++) {
    const offer = combat.progression.offer();
    showSkillSelection(ui.scene, combat, offer, index => combat.choose(offer.token, index, experience));
    const card = ui.findButtons()[0];
    assert.equal(card.children[1].tagName, 'span', 'painted equipment accompanies readable skill text');
    assert(card.children[1].children[0].style.backgroundImage.includes(uiConfig.art.icons));
    assert.equal(card.children[1].attributes['aria-hidden'], 'true');
    assert(card.textContent.includes('날 연마'));
    if (rank === 1) assert.doesNotMatch(card.textContent, /신규|Lv.1/);
    else assert(card.textContent.includes(`Lv.${rank - 1} → Lv.${rank}`));
    if (rank === 5) assert(card.textContent.includes('Lv.5 MAX'));
    now += uiConfig.cards.inputDelayMs + 1;
    card.click(); card.click();
    assert.equal(combat.progression.level(1), rank);
  }
  const next = combat.progression.offer();
  showSkillSelection(ui.scene, combat, next, () => {});
  assert(ui.findButtons().every(card => !card.textContent.includes('날 연마')));
  assert.equal(ui.findButtons().length, 3);
  ui.scene.events.emit('shutdown');
  assert.equal(ui.document.body.children.length, 0);
});

test('Railway cards preserve long effects and supply choices while omitting the duplicate owned-skill footer', t => {
  t.mock.method(performance, 'now', () => 0);
  const ui = harness();
  const body = createCombatant({ id: 0, x: 1500, y: 1500, size: 48 }, 'player', 150, 24);
  const combat = new CharacterCombat('mechanic', body, () => 0);
  combat.progression.observeLevel(skills.mechanic.length * 5 + 2);
  const xp = new ExperienceSystem();
  for (let i = 0; i < skills.mechanic.length * 5; i++) {
    const offer = combat.progression.offer();
    combat.choose(offer.token, 0, xp);
  }
  const supply = combat.progression.offer();
  showSkillSelection(ui.scene, combat, supply, () => {});
  assert.equal(ui.findButtons().length, 3);
  for (const name of ['응급 수리', '임시 보호막', '주변 회수']) assert(ui.findButtons().some(card => card.textContent.includes(name)));
  const panel = ui.document.body.children[0].children[0];
  assert(!panel.children.some(child => child.attributes.class === 'rail-notice'), 'owned ranks stay in the HUD without a repeated menu footer');
  assert(ui.findButtons().every(card => card.children[1].children[0].style.backgroundImage.includes(uiConfig.art.icons)));
  ui.scene.events.emit('shutdown');
  const longOffer = { token: 1, choices: [{ kind: 'skill', id: 4 }, { kind: 'skill', id: 18 }, { kind: 'skill', id: 19 }] };
  const fresh = new CharacterCombat('mechanic', body, () => 0);
  showSkillSelection(ui.scene, fresh, longOffer, () => {});
  const card = ui.findButtons()[0];
  assert(card.textContent.includes(skills.mechanic[3].description));
  assert(card.textContent.includes(skillEffect(skills.mechanic[3], 1)));
  assert.equal(ui.findButtons().length, 3, 'only choices are buttons; equipment art is decorative');
  ui.scene.events.emit('destroy');
});

test('Player HUD omits duplicate HP and retains painted equipment and all ranks in two rows', () => {
  const texts = [], fills = [], images = [];
  const view = () => ({
    setScrollFactor(value) { this.scrollFactor = value; return this; }, setDepth() { return this; },
    setOrigin() { return this; }, setVisible(value) { this.visible = value; return this; },
    setDisplaySize(width, height) { Object.assign(this, { width, height }); return this; },
    setTexture(key, frame) { Object.assign(this, { key, frame }); return this; },
    setText(value) { this.text = value; return this; },
  });
  const graphics = Object.assign(view(), {
    clear() { fills.length = 0; return this; }, fillStyle(color) { this.color = color; return this; },
    fillRect(x, y, width, height) { fills.push({ x, y, width, height, color: this.color }); return this; },
    strokeRect() { return this; }, fillCircle() { return this; }, strokeCircle() { return this; },
    lineStyle() { return this; }, lineBetween() { return this; },
  });
  const hud = new PlayerHud({ add: {
    graphics: () => graphics,
    image(x, y, key, frame) { const image = Object.assign(view(), { x, y, key, frame }); images.push(image); return image; },
    text(x, y, _value, style) { const text = Object.assign(view(), { x, y, style }); texts.push(text); return text; },
  } });
  const body = createCombatant({ id: 0, x: 1500, y: 1500, size: 48 }, 'player', 150, 24);
  const combat = new CharacterCombat('mechanic', body, () => 0);
  const c = uiConfig.railway;
  assert(texts.every(text => text.style.color === c.enamel), 'skill ranks stay legible on their dark equipment slots');
  const healthFill = () => fills.find(fill => fill.color === c.health);
  body.hp = 75;
  hud.sync(combat);
  assert.equal(healthFill(), undefined);
  assert(images.every(image => image.key !== uiConfig.art.panelKey), 'no empty HP panel remains');
  assert(texts.every(text => !text.text?.includes('HP')));
  assert(texts.every(text => !/철도 정비공|보호막|충전 완료|보유 스킬/.test(text.text ?? '')), 'redundant status text is absent from the combat HUD');
  assert.equal(graphics.scrollFactor, 0);
  assert(texts.every(text => text.scrollFactor === 0));
  assert.equal(texts.filter(text => text.visible === true).length, 0, 'unowned slots stay hidden');
  combat.progression.observeLevel(skills.mechanic.length * 5 + 2);
  const xp = new ExperienceSystem();
  for (let i = 0; i < skills.mechanic.length * 5; i++) { const offer = combat.progression.offer(); combat.choose(offer.token, 0, xp); }
  hud.sync(combat);
  assert.equal(texts.filter(text => text.visible === true).length, skills.mechanic.length);
  assert.equal(images.filter(image => image.visible === true).length, skills.mechanic.length);
  assert(images.every(image => image.key === uiConfig.art.iconsKey));
  assert(texts.every(text => text.text.endsWith(' 5')), 'all maximum ranks remain readable without repeated MAX labels');
  assert.equal(new Set(texts.map(text => text.y)).size, 2);
  assert(texts.every(text => text.x < 1280 && text.y < 720), 'all skills fit inside both rows');
  body.hp = -10;
  hud.sync(combat);
  assert.equal(healthFill(), undefined);
  body.hp = body.maxHp;
  hud.sync(combat);
  assert.equal(healthFill(), undefined);
});
