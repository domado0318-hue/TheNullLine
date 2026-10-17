const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { registerHooks } = require('node:module');

// Node 24 runs the actual TypeScript logic without a new testing dependency.
registerHooks({
  resolve(specifier, context, next) {
    return next(specifier.startsWith('.') && !path.extname(specifier) ? specifier + '.ts' : specifier, context);
  },
});
const load = (sourcePath) => require(path.resolve(__dirname, '..', sourcePath));

const { EnemySystem } = load('src/enemies/EnemySystem.ts');
const { NavigationGrid } = load('src/enemies/NavigationGrid.ts');
const { createObstacleLayout } = load('src/world/createObstacleLayout.ts');
const { canOccupy, distance, overlapsSquare, lineIsClear, moveBody } = load('src/world/geometry.ts');
const { enemyConfig } = load('src/config/enemies.ts');
const { playerConfig } = load('src/config/player.ts');
const { obstacleConfig } = load('src/config/obstacles.ts');
const { worldConfig } = load('src/config/world.ts');

function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const player = (x = 1500, y = 1500) => ({ id: 0, x, y, size: playerConfig.size });
const viewport = (body) => ({ x: body.x - 640, y: body.y - 360, width: 1280, height: 720 });
const emptyWorld = () => ({ width: 3000, height: 3000, obstacles: [] });
function fixture(seed = 11, world = emptyWorld(), body = player()) {
  const system = new EnemySystem(world, seededRandom(seed));
  system.initialize(body, viewport(body));
  return { system, body, world };
}
function simulate(system, body, seconds, callback) {
  const frames = Math.ceil(seconds * 30);
  for (let frame = 0; frame < frames; frame++) {
    system.update(1 / 30, body, viewport(body));
    if (callback) callback(frame);
  }
}
function checkCollisions(system, body) {
  assert(canOccupy(body, body.size, system.world, system.enemies), 'Player cannot overlap actors or scenery');
  system.enemies.forEach((enemy, index) => {
    assert(canOccupy(enemy, enemy.size, system.world, [body, ...system.enemies.slice(0, index)]), `Enemy ${enemy.id} cannot overlap`);
  });
}
function fill(system, body) {
  for (let i = 0; i < 15; i++) system.update(3, body, viewport(body));
  assert.equal(system.enemies.length, system.maximumCount);
}

test('configs preserve existing visuals, speed, obstacle ratios and distinct enemy colors', () => {
  assert.equal(playerConfig.size, 48);
  assert.equal(playerConfig.movementSpeed, 300);
  assert.equal(worldConfig.width, 3000);
  assert.equal(worldConfig.height, 3000);
  assert.equal(worldConfig.wallThickness, 16);
  const colors = [playerConfig.color, worldConfig.gridColor, worldConfig.wallColor, obstacleConfig.rectangleColor, obstacleConfig.circleColor, ...Object.values(enemyConfig.colors)];
  assert.equal(new Set(colors).size, colors.length);
  for (let seed = 1; seed <= 100; seed++) {
    const obstacles = createObstacleLayout(3000, 3000, 48, seededRandom(seed));
    assert.equal(obstacles.length, 8);
    assert(obstacles.every((item) => item.size >= 38.4 - 1e-9 && item.size <= 120));
    assert(canOccupy(player(), 48, { ...emptyWorld(), obstacles }));
  }
});

test('movement cannot tunnel through rectangles, circles, enemies or the floor boundary', () => {
  for (const shape of ['rectangle', 'circle']) {
    const world = { ...emptyWorld(), obstacles: [{ shape, x: 700, y: 500, size: 100 }] };
    const body = player(300, 500);
    moveBody(body, 1000, 0, world, []);
    assert(body.x <= 626 && body.x >= 622);
    assert(canOccupy(body, body.size, world));
  }
  const body = player(300, 500);
  moveBody(body, 1000, 0, emptyWorld(), [{ id: 1, x: 700, y: 500, size: 32 }]);
  assert(body.x <= 660);
  moveBody(body, -10000, -10000, emptyWorld(), []);
  assert.equal(body.x, 24);
  assert.equal(body.y, 24);
  const free = player(500, 500);
  moveBody(free, 300 / Math.SQRT2, 300 / Math.SQRT2, emptyWorld(), []);
  assert(Math.abs(distance(free, { x: 500, y: 500 }) - 300) < 1e-8);
});

test('initial spawns stay outside the camera and avoid all actors and obstacles across seeds', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const world = { ...emptyWorld(), obstacles: createObstacleLayout(3000, 3000, 48, seededRandom(seed)) };
    const { system, body } = fixture(seed + 100, world);
    assert.equal(system.enemies.length, 10);
    assert.equal(system.enemies.filter((enemy) => enemy.kind === 'circular').length, 5);
    const camera = viewport(body);
    for (const enemy of system.enemies) {
      const margin = enemy.size / 2 + enemyConfig.spawn.cameraMargin;
      assert(enemy.x <= camera.x - margin || enemy.x >= camera.x + camera.width + margin || enemy.y <= camera.y - margin || enemy.y >= camera.y + camera.height + margin);
    }
    checkCollisions(system, body);
  }
});

test('spawn interval, wave size, population cap, larger worlds and unavailable spawn space', () => {
  const { system, body } = fixture();
  simulate(system, body, 2.9);
  assert.equal(system.enemies.length, 10);
  simulate(system, body, 0.2);
  assert(system.enemies.length === 11 || system.enemies.length === 12);
  fill(system, body);
  assert.equal(system.enemies.length, 20);
  const larger = fixture(20, { width: 6000, height: 3000, obstacles: [] }, player(3000, 1500));
  assert.equal(larger.system.initialCount, 20);
  assert.equal(larger.system.maximumCount, 40);
  assert.equal(larger.system.enemies.length, 20);
  const blocked = new EnemySystem(emptyWorld(), seededRandom(33));
  blocked.initialize(body, { x: -100, y: -100, width: 4000, height: 4000 });
  assert.equal(blocked.enemies.length, 0);
  blocked.update(3, body, viewport(body));
  assert.equal(blocked.enemies.length, 10, 'Deferred initial spawns retry safely');
});

test('Invalid initial count cannot override the cap; zero counts disable enemies, waves and obstacles', () => {
  const original = { ...enemyConfig.spawn };
  const originalObstacles = obstacleConfig.countAtReferenceArea;
  try {
    enemyConfig.spawn.initialCount = 30;
    enemyConfig.spawn.maximumCount = 20;
    assert.throws(() => new EnemySystem(emptyWorld()), /initialCount.*maximumCount/);
    Object.assign(enemyConfig.spawn, { initialCount: 0, maximumCount: 0 });
    const disabled = fixture();
    simulate(disabled.system, disabled.body, 6);
    assert.equal(disabled.system.enemies.length, 0);
    Object.assign(enemyConfig.spawn, { maximumCount: 20, minimumPerWave: 0, maximumPerWave: 0 });
    const noWaves = fixture();
    simulate(noWaves.system, noWaves.body, 6);
    assert.equal(noWaves.system.enemies.length, 0);
    obstacleConfig.countAtReferenceArea = 0;
    assert.deepEqual(createObstacleLayout(3000, 3000, 48), []);
  } finally { Object.assign(enemyConfig.spawn, original); obstacleConfig.countAtReferenceArea = originalObstacles; }
});

test('Repeatedly killing one Enemy type cannot bias every replacement to the other type', () => {
  const { system, body } = fixture(884);
  fill(system, body);
  const replacements = [];
  for (let wave = 0; wave < 10; wave++) {
    const victim = system.enemies.find(actor => actor.kind === 'horizontal');
    assert(victim, 'Horizontal enemies must not disappear through replacement bias');
    victim.hp = 0;
    system.removeDefeated();
    const previousIds = new Set(system.enemies.map(actor => actor.id));
    system.update(3, body, viewport(body));
    replacements.push(...system.enemies.filter(actor => !previousIds.has(actor.id)).map(actor => actor.kind));
    assert.equal(system.enemies.length, system.maximumCount);
  }
  assert(replacements.includes('horizontal') && replacements.includes('circular'));
});

test('Analytic visibility catches short circle intersections between old sample positions', () => {
  const from = { x: 1000, y: 1000 };
  const to = { x: 1120, y: 1000 };
  for (const direction of [[from, to], [to, from]]) {
    const scenery = { ...emptyWorld(), obstacles: [{ shape: 'circle', x: 1060, y: 980.1, size: 40 }] };
    assert.equal(lineIsClear(...direction, 0, scenery, []), false);
    scenery.obstacles[0].y = 979.9;
    assert.equal(lineIsClear(...direction, 0, scenery, []), true);
  }
});

test('Far idle enemies do not perform per-frame shot visibility scans in an expanded world', () => {
  const random = seededRandom(993);
  const obstacles = createObstacleLayout(12000, 12000, 48, random);
  let reads = 0;
  const scenery = { width: 12000, height: 12000, get obstacles() { reads++; return obstacles; } };
  const body = player(10000, 10000);
  const { system } = fixture(993, scenery, body);
  fill(system, body);
  system.enemies.forEach((actor, index) => Object.assign(actor, { x: 100 + index % 20 * 60, y: 100 + Math.floor(index / 20) * 60, state: 'idle', stateSeconds: 100 }));
  reads = 0;
  system.update(1 / 60, body, viewport(body));
  assert.equal(reads, 0, 'No scenery/LOS scans are needed for distant stationary idle actors');
});

test('horizontal and circular patrol alternate Idle / Move and retain their paths', () => {
  const { system, body } = fixture(11, emptyWorld(), player(2700, 2700));
  system.enemies.splice(2);
  const horizontal = system.enemies[0];
  const circular = system.enemies[1];
  Object.assign(horizontal, { x: 500, y: 500, anchor: { x: 500, y: 500 }, state: 'idle', stateSeconds: 0.2, direction: 1 });
  Object.assign(circular, { x: 1120, y: 500, anchor: { x: 1000, y: 500 }, patrolRadius: 120, angle: 0, state: 'idle', stateSeconds: 0.2 });
  system.update(0.1, body, viewport(body));
  assert.equal(horizontal.x, 500);
  assert.equal(circular.x, 1120);
  system.update(0.2, body, viewport(body));
  assert.equal(horizontal.state, 'patrol');
  assert(horizontal.x > 500);
  assert.equal(horizontal.y, 500);
  assert(circular.y > 500);
  assert(Math.abs(distance(circular, circular.anchor) - 120) < 1);
  horizontal.stateSeconds = 0.01;
  system.update(0.02, body, viewport(body));
  assert.equal(horizontal.state, 'idle');
  const last = horizontal.x;
  system.update(0.05, body, viewport(body));
  assert.equal(horizontal.x, last);
});

test('Chase detection / release and attack / resume use separate thresholds', () => {
  const { system, body } = fixture();
  system.enemies.splice(1);
  const enemy = system.enemies[0];
  Object.assign(enemy, { x: 1100, y: 1500, anchor: { x: 1100, y: 1500 } });
  system.update(0.01, body, viewport(body));
  assert.equal(enemy.state, 'chase');
  assert(enemy.slot);
  body.x = enemy.x + 700;
  system.update(0.01, body, viewport(body));
  assert.equal(enemy.state, 'chase', 'Do not release at the detection threshold');
  body.x = enemy.x + 900;
  system.update(0.01, body, viewport(body));
  assert.equal(enemy.state, 'idle');
  body.x = 1500;
  enemy.x = 1100;
  system.update(0.01, body, viewport(body));
  simulate(system, body, 2.4);
  assert.equal(enemy.state, 'attack');
  const stopped = { x: enemy.x, y: enemy.y };
  body.x += 10;
  system.update(0.01, body, viewport(body));
  assert.equal(enemy.state, 'attack');
  assert.equal(distance(enemy, stopped), 0);
  body.x += 40;
  system.update(0.01, body, viewport(body));
  assert.equal(enemy.state, 'chase');
});

test('A* chooses a collision-free detour around a wall and another enemy', () => {
  const world = { ...emptyWorld(), obstacles: [{ shape: 'rectangle', x: 1500, y: 1500, size: 350 }] };
  const from = { x: 1100, y: 1500 };
  const target = { x: 1900, y: 1500 };
  const blockers = [{ id: 7, x: 1500, y: 1250, size: 32 }];
  const navigation = new NavigationGrid(world, 32);
  const route = navigation.findPath(from, target, blockers);
  assert(route.length > 2);
  let previous = from;
  for (const point of route) {
    assert(lineIsClear(previous, point, 32, world, blockers));
    previous = point;
  }
  assert.deepEqual(route.at(-1), target);
});

test('twenty followers form multiple rings, settle without jitter, and do not overlap', () => {
  const { system, body } = fixture();
  fill(system, body);
  system.enemies.forEach((enemy, index) => {
    const angle = index / system.enemies.length * Math.PI * 2;
    Object.assign(enemy, { x: body.x + Math.cos(angle) * 400, y: body.y + Math.sin(angle) * 400, kind: 'horizontal', state: 'chase', slot: undefined, path: [], pathTarget: undefined, repathAt: 0 });
  });
  simulate(system, body, 18, () => checkCollisions(system, body));
  assert(system.enemies.some((enemy) => enemy.state === 'attack'));
  assert(system.enemies.some((enemy) => enemy.slot?.ring > 0));
  assert(system.enemies.filter((enemy) => enemy.state === 'wait' || enemy.state === 'attack').length >= 18, 'Crowd must converge to attack/wait slots');
  const before = system.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
  simulate(system, body, 2, () => checkCollisions(system, body));
  const waitingMotion = system.enemies.filter((enemy, index) => (enemy.state === 'wait' || enemy.state === 'attack') && distance(enemy, before[index]) > 0.001);
  assert.equal(waitingMotion.length, 0, 'Settled enemies must not vibrate around a stationary player');
});

test('Enemy chase navigates scenery while player movement remains collision-safe', () => {
  const world = { ...emptyWorld(), obstacles: [{ shape: 'rectangle', x: 1250, y: 1500, size: 220 }, { shape: 'circle', x: 1550, y: 1200, size: 120 }] };
  const { system, body } = fixture(35, world, player(1550, 1500));
  system.enemies.splice(1);
  const enemy = system.enemies[0];
  Object.assign(enemy, { x: 1000, y: 1500, anchor: { x: 1000, y: 1500 }, state: 'idle', path: [], repathAt: 0 });
  let wentAround = false;
  simulate(system, body, 12, () => {
    checkCollisions(system, body);
    if (Math.abs(enemy.y - 1500) > 120) wentAround = true;
  });
  assert(wentAround);
  assert(distance(enemy, body) < 200, 'Enemy should reach the player side of the obstacle');
  for (let i = 0; i < 300; i++) {
    const angle = i / 60;
    moveBody(body, Math.cos(angle) * 5, Math.sin(angle) * 5, world, system.enemies);
    system.update(1 / 60, body, viewport(body));
    checkCollisions(system, body);
  }
});

test('crowds near walls and scenery use available ring space and remain stable', () => {
  const cases = [
    { body: player(80, 80), world: emptyWorld(), seed: 108 },
    { body: player(1300, 1500), world: { ...emptyWorld(), obstacles: [{ shape: 'rectangle', x: 1450, y: 1500, size: 160 }, { shape: 'circle', x: 1200, y: 1300, size: 120 }] }, seed: 130 },
  ];
  for (const { body, world, seed } of cases) {
    const { system } = fixture(seed, world, body);
    fill(system, body);
    const random = seededRandom(seed);
    const placed = [];
    for (const enemy of system.enemies) {
      let placedEnemy = false;
      for (let attempt = 0; attempt < 5000; attempt++) {
        const angle = random() * Math.PI * 2;
        const radius = 250 + random() * 300;
        const candidate = { x: body.x + Math.cos(angle) * radius, y: body.y + Math.sin(angle) * radius };
        if (!canOccupy(candidate, enemy.size + 10, world, [body, ...placed])) continue;
        Object.assign(enemy, candidate, { state: 'chase', slot: undefined, path: [], pathTarget: undefined, repathAt: 0, blockedSeconds: 0 });
        placed.push(enemy);
        placedEnemy = true;
        break;
      }
      assert(placedEnemy);
    }
    simulate(system, body, 35, () => checkCollisions(system, body));
    const waiting = system.enemies.filter((enemy) => enemy.state === 'wait' || enemy.state === 'attack');
    assert(waiting.length >= 18, `At least 18 enemies should settle, seed ${seed}: ${JSON.stringify(system.enemies.filter((enemy) => enemy.state !== 'wait').map((enemy) => ({ id: enemy.id, slot: enemy.slot, x: enemy.x, y: enemy.y })))}`);
    const stopped = new Map(waiting.map((enemy) => [enemy.id, { x: enemy.x, y: enemy.y }]));
    simulate(system, body, 2, () => checkCollisions(system, body));
    assert(waiting.every((enemy) => distance(enemy, stopped.get(enemy.id)) < 0.001));
  }
});
