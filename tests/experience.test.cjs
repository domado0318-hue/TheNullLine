const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { registerHooks } = require('node:module');
registerHooks({ resolve(specifier, context, next) { return next(specifier.startsWith('.') && !path.extname(specifier) ? specifier + '.ts' : specifier, context); } });
const load = (name) => require(path.resolve(__dirname, '..', name));
const { ExperienceSystem } = load('src/experience/ExperienceSystem.ts');
const { ExperienceRenderer } = load('src/experience/ExperienceRenderer.ts');
const { ExperienceHud } = load('src/ui/ExperienceHud.ts');
const { EnemySystem } = load('src/enemies/EnemySystem.ts');
const { CombatSystem } = load('src/combat/CombatSystem.ts');
const { createCombatant } = load('src/combat/types.ts');
const { experienceConfig } = load('src/config/experience.ts');
const { uiConfig } = load('src/config/ui.ts');
const { playerConfig } = load('src/config/player.ts');
const { enemyConfig } = load('src/config/enemies.ts');

const source = (category = 'normal1', x = 100, y = 100) => ({ x, y, hp: 0, experienceCategory: category });
const copyConfig = () => structuredClone(experienceConfig);
const simulate = (system, seconds, player) => {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) system.update(1 / 60, player);
};

test('Defeated categories drop configured rewards at the death position without granting XP immediately', () => {
  const system = new ExperienceSystem();
  const categories = Object.keys(experienceConfig.rewards);
  system.dropFromDefeated(categories.map((category, index) => source(category, 400 + index * 50, 500)));
  assert.equal(system.drops.length, categories.length);
  for (const [index, drop] of system.drops.entries()) {
    assert.deepEqual([drop.x, drop.y, drop.value, drop.attracted], [400 + index * 50, 500, experienceConfig.rewards[categories[index]], false]);
  }
  assert.equal(system.level, 1);
  assert.equal(system.currentExperience, 0);
  assert.equal(new Set(system.drops.map(drop => drop.id)).size, categories.length);
});

test('Living enemies and categories with zero reward do not create drops', () => {
  const config = copyConfig();
  config.rewards.normal1 = 0;
  const system = new ExperienceSystem(config);
  system.dropFromDefeated([source('normal1'), { ...source('normal2'), hp: 1 }]);
  assert.equal(system.drops.length, 0);
});

test('Attraction starts at the inclusive radius, accelerates, and grants XP only upon collection', () => {
  const system = new ExperienceSystem();
  const pickup = experienceConfig.pickup;
  system.dropFromDefeated([source('normal1', 500, 500)]);
  system.update(0.1, { x: 500 + pickup.attractionRadius + 0.01, y: 500 });
  assert.equal(system.drops[0].attracted, false);
  assert.equal(system.drops[0].x, 500);
  const player = { x: 500 + pickup.attractionRadius, y: 500 };
  system.update(1 / 60, player);
  assert.equal(system.drops[0].attracted, true);
  assert(system.drops[0].x > 500 && system.drops[0].x < player.x - pickup.collectionRadius);
  assert(system.drops[0].speed > pickup.initialSpeed);
  assert.equal(system.currentExperience, 0);
  simulate(system, 1, player);
  assert.equal(system.drops.length, 0);
  assert.equal(system.currentExperience, experienceConfig.rewards.normal1);
  simulate(system, 1, player);
  assert.equal(system.currentExperience, experienceConfig.rewards.normal1, 'Collection cannot pay twice');
});

test('Collection radius includes contact but excludes a point immediately outside at zero elapsed time', () => {
  const player = { x: 500, y: 500 };
  const radius = experienceConfig.pickup.collectionRadius;
  const outside = new ExperienceSystem();
  outside.dropFromDefeated([source('normal1', player.x + radius + 0.01, player.y)]);
  outside.update(0, player);
  assert.equal(outside.drops.length, 1);
  assert.equal(outside.currentExperience, 0);
  const contact = new ExperienceSystem();
  contact.dropFromDefeated([source('normal1', player.x + radius, player.y)]);
  contact.update(0, player);
  assert.equal(contact.drops.length, 0);
  assert.equal(contact.currentExperience, experienceConfig.rewards.normal1);
});

test('An attracted drop keeps chasing outside activation radius and respects the speed cap', () => {
  const system = new ExperienceSystem();
  system.dropFromDefeated([source('normal1', 500, 500)]);
  system.update(0.01, { x: 600, y: 500 });
  const before = system.drops[0].x;
  system.update(1, { x: 2500, y: 500 });
  assert.equal(system.drops[0].attracted, true);
  assert(system.drops[0].x > before);
  assert.equal(system.drops[0].speed, experienceConfig.pickup.maximumSpeed);
  assert.equal(system.currentExperience, 0);
});

test('Long frames cannot overshoot collection; acceleration distance matches smaller steps before collection', () => {
  const single = new ExperienceSystem();
  const split = new ExperienceSystem();
  const player = { x: 600, y: 500 };
  for (const system of [single, split]) system.dropFromDefeated([source('normal1', 500, 500)]);
  single.update(0.1, player);
  for (let i = 0; i < 10; i++) split.update(0.01, player);
  assert(Math.abs(single.drops[0].x - split.drops[0].x) < 1e-8);
  single.update(5, player);
  assert.equal(single.drops.length, 0);
  assert.equal(single.currentExperience, experienceConfig.rewards.normal1);
});

test('Required XP boundaries preserve excess XP and permit multiple level-ups in a single award', () => {
  const system = new ExperienceSystem();
  const [first, second] = experienceConfig.requiredExperience;
  system.addExperience(first - 1);
  assert.deepEqual([system.level, system.currentExperience], [1, first - 1]);
  system.addExperience(1);
  assert.deepEqual([system.level, system.currentExperience], [2, 0]);
  system.addExperience(second + experienceConfig.requiredExperience[2] + 3);
  assert.deepEqual([system.level, system.currentExperience], [4, 3]);
  assert.equal(system.requiredExperience, experienceConfig.requiredExperience[3]);
});

test('Levels 1 through maxLevel follow the table; later levels scale the last table entry with ceiling', () => {
  const system = new ExperienceSystem();
  const config = experienceConfig;
  for (let level = 1; level <= config.maxLevel; level++) assert.equal(system.requiredForLevel(level), config.requiredExperience[level - 1]);
  const last = config.requiredExperience.at(-1);
  assert.equal(system.requiredForLevel(config.maxLevel + 1), Math.ceil(last * config.beyondMaxLevelMultiplier));
  assert.equal(system.requiredForLevel(config.maxLevel + 2), Math.ceil(last * config.beyondMaxLevelMultiplier ** 2));
  system.addExperience(config.requiredExperience.reduce((sum, value) => sum + value, 0) + 4);
  assert.deepEqual([system.level, system.currentExperience], [config.maxLevel + 1, 4]);
  system.addExperience(system.requiredExperience - 4);
  assert.deepEqual([system.level, system.currentExperience], [config.maxLevel + 2, 0]);
  assert.equal(system.requiredForLevel(100000), Number.MAX_SAFE_INTEGER, 'Huge level requirements remain finite');
});

test('Changing maxLevel, reward, attraction, and zero acceleration uses the supplied config without shared mutations', () => {
  const config = copyConfig();
  config.maxLevel = 2;
  config.requiredExperience = [3, 5];
  config.beyondMaxLevelMultiplier = 2;
  config.rewards.normal3 = 9;
  config.pickup.attractionRadius = 300;
  config.pickup.acceleration = 0;
  const system = new ExperienceSystem(config);
  system.dropFromDefeated([source('normal3', 100, 100)]);
  system.update(0.1, { x: 350, y: 100 });
  assert.equal(system.drops[0].speed, config.pickup.initialSpeed);
  assert.equal(system.drops[0].x, 100 + config.pickup.initialSpeed * 0.1);
  simulate(system, 2, { x: 350, y: 100 });
  assert.deepEqual([system.level, system.currentExperience, system.requiredExperience], [3, 1, 10]);
  assert.equal(experienceConfig.maxLevel, 30);
});

test('Invalid XP table, growth, reward and pickup config fail with a setting name instead of entering update loops', () => {
  const cases = [
    ['maxLevel', config => { config.maxLevel = 0; }],
    ['requiredExperience', config => { config.requiredExperience.pop(); }],
    ...[0, -1, NaN, Infinity, 1.5].map(value => ['requiredExperience', config => { config.requiredExperience[0] = value; }]),
    ...[0, 1, NaN, Infinity].map(value => ['beyondMaxLevelMultiplier', config => { config.beyondMaxLevelMultiplier = value; }]),
    ['rewards.normal1', config => { config.rewards.normal1 = -1; }],
    ['pickup.attractionRadius', config => { config.pickup.attractionRadius = 0; }],
    ['pickup.collectionRadius', config => { config.pickup.collectionRadius = config.pickup.attractionRadius + 1; }],
    ['pickup.initialSpeed', config => { config.pickup.initialSpeed = config.pickup.maximumSpeed + 1; }],
    ['pickup.acceleration', config => { config.pickup.acceleration = -1; }],
    ['icon.innerRadius', config => { config.icon.innerRadius = config.icon.outerRadius; }],
    ['icon.points', config => { config.icon.points = 2; }],
  ];
  for (const [name, mutate] of cases) {
    const config = copyConfig();
    mutate(config);
    assert.throws(() => new ExperienceSystem(config), error => error.message.includes(name), name);
  }
  const system = new ExperienceSystem();
  for (const value of [-1, NaN, Infinity, 0.5]) assert.throws(() => system.addExperience(value), /experience.amount/);
  for (const value of [-1, NaN, Infinity]) assert.throws(() => system.update(value, { x: 0, y: 0 }), /experience.deltaSeconds/);
});

test('Actual combat death produces one configured drop through Enemy removal, and pickup alone awards XP', () => {
  const scenery = { width: 3000, height: 3000, obstacles: [] };
  const body = createCombatant({ id: 0, x: 1500, y: 1500, size: playerConfig.size }, 'player', playerConfig.maxHp, 10000);
  const system = new EnemySystem(scenery, () => 0.1);
  system.initialize(body, { x: 860, y: 1140, width: 1280, height: 720 });
  system.enemies.splice(1);
  const target = system.enemies[0];
  assert(target);
  assert.equal(target.experienceCategory, enemyConfig.stats[target.kind].experienceCategory);
  Object.assign(target, { x: 1800, y: 1500, hp: 1, state: 'idle' });
  const combat = new CombatSystem('bullet');
  const experience = new ExperienceSystem();
  combat.update(1, body, system.enemies, scenery, { x: body.x - 640, y: body.y - 360, width: 1280, height: 720 });
  assert.equal(target.hp, 0);
  const removed = system.removeDefeated();
  experience.dropFromDefeated(removed);
  experience.dropFromDefeated(system.removeDefeated());
  assert.equal(experience.drops.length, 1);
  assert.deepEqual([experience.drops[0].x, experience.drops[0].y], [target.x, target.y]);
  experience.update(0.1, body);
  assert.equal(experience.currentExperience, 0);
  Object.assign(body, { x: target.x, y: target.y });
  experience.update(1 / 60, body);
  assert.equal(experience.currentExperience, experienceConfig.rewards[target.experienceCategory]);
  assert.equal(experience.drops.length, 0);
});

function displayHarness() {
  const texts = [];
  const stars = [];
  const fills = [];
  const object = () => ({
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    setOrigin(value) { this.origin = value; return this; },
    setDisplaySize(width, height) { Object.assign(this, { width, height }); return this; },
    setText(value) { this.text = value; return this; },
    setPosition(x, y) { Object.assign(this, { x, y }); return this; },
    destroy() { this.destroyed = true; },
  });
  const graphics = Object.assign(object(), {
    clear() { fills.length = 0; return this; }, fillStyle(color) { this.color = color; return this; }, lineStyle() { return this; },
    fillRect(x, y, width, height) { fills.push({ x, y, width, height, color: this.color }); return this; }, strokeRect() { return this; },
    fillCircle() { return this; },
  });
  return { texts, stars, fills, graphics, scene: { add: {
    image: () => object(),
    graphics: () => graphics,
    text(x, y) { const view = Object.assign(object(), { x, y }); texts.push(view); return view; },
    star(x, y, points, innerRadius, outerRadius, color) {
      const view = Object.assign(object(), { x, y, points, innerRadius, outerRadius, color }); stars.push(view); return view;
    },
  } } };
}

test('HUD keeps all parts fixed to the screen and synchronizes level, central text, bar fill, and reset', () => {
  const ui = displayHarness();
  const system = new ExperienceSystem();
  const hud = new ExperienceHud(ui.scene);
  const config = uiConfig.experience;
  system.addExperience(5);
  hud.update(system);
  assert.equal(ui.graphics.scrollFactor, 0);
  assert(ui.texts.every(text => text.scrollFactor === 0));
  assert.equal(ui.texts[0].text, `${config.levelPrefix} 1`);
  assert.equal(ui.texts[1].text, `EXP 5 / ${system.requiredExperience}`);
  assert.equal(ui.texts[1].origin, 0.5);
  assert.equal(ui.texts[1].x, config.x + uiConfig.railway.hudPadding + config.levelWidth + config.barWidth / 2);
  const fill = () => ui.fills.find(rect => rect.color === config.fillColor);
  assert.equal(ui.texts[1].y, fill().y + fill().height / 2, 'EXP label sits inside the bar');
  assert.equal(config.y, uiConfig.encounterHud.y, 'EXP panel aligns with the top row after removing HUD HP');
  assert.equal(ui.texts[0].y, config.y + uiConfig.railway.hudPadding + config.barHeight / 2);
  assert.equal(fill().width, config.barWidth * 5 / system.requiredExperience);
  system.addExperience(system.requiredExperience - 5);
  hud.update(system);
  assert.equal(ui.texts[0].text, `${config.levelPrefix} 2`);
  assert.equal(ui.texts[1].text, `EXP 0 / ${system.requiredExperience}`);
  assert.equal(fill().width, 0);
  const reset = new ExperienceSystem();
  hud.update(reset);
  assert.equal(reset.drops.length, 0);
  assert.equal(ui.texts[0].text, `${config.levelPrefix} 1`);
  assert.equal(ui.texts[1].text, `EXP 0 / ${reset.requiredExperience}`);
});

test('Renderer creates stars once, follows drop positions, and destroys collected icons', () => {
  const ui = displayHarness();
  const system = new ExperienceSystem();
  const renderer = new ExperienceRenderer(ui.scene);
  system.dropFromDefeated([source('normal1', 500, 500)]);
  renderer.sync(system);
  const star = ui.stars[0];
  assert.equal(star.points, experienceConfig.icon.points);
  assert.equal(star.color, experienceConfig.icon.color);
  system.update(0.1, { x: 600, y: 500 });
  renderer.sync(system);
  assert.equal(ui.stars.length, 1);
  assert.equal(star.x, system.drops[0].x);
  system.update(1, { x: 600, y: 500 });
  renderer.sync(system);
  assert.equal(star.destroyed, true);
});
