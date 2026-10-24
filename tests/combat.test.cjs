const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { registerHooks } = require('node:module');
registerHooks({ resolve(specifier, context, next) { return next(specifier.startsWith('.') && !path.extname(specifier) ? specifier + '.ts' : specifier, context); } });
const load = (name) => require(path.resolve(__dirname, '..', name));
const { CombatSystem } = load('src/combat/CombatSystem.ts');
const { createCombatant } = load('src/combat/types.ts');
const { EnemySystem } = load('src/enemies/EnemySystem.ts');
const { canOccupy, distance, lineIsClear, moveBody } = load('src/world/geometry.ts');
const { playerConfig } = load('src/config/player.ts');
const { enemyConfig } = load('src/config/enemies.ts');
const { combatConfig } = load('src/config/combat.ts');
const { getEnemyWeapon, playerSwordConfig, playerBulletConfig, enemyBulletConfig } = load('src/config/weapons.ts');

const world = () => ({ width: 3000, height: 3000, obstacles: [] });
const player = (x = 1500, y = 1500) => createCombatant({ id: 0, x, y, size: playerConfig.size }, 'player', playerConfig.maxHp, playerConfig.attackDamage);
function enemy(id, x, y, kind = 'horizontal') {
  return {
    ...createCombatant({ id, x, y, size: enemyConfig.size }, 'enemy', enemyConfig.stats[kind].maxHp, enemyConfig.stats[kind].attackDamage),
    kind, state: 'idle', anchor: { x, y }, direction: 1, angle: 0,
    patrolRadius: enemyConfig.patrol.circleRadius, stateSeconds: 100,
    path: [], repathAt: 0, blockedSeconds: 0,
  };
}
function run(combat, body, enemies, seconds, scenery = world(), callback) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    combat.update(1 / 60, body, enemies, scenery, viewport(body));
    if (callback) callback(i);
  }
}
const viewport = (body) => ({ x: body.x - 640, y: body.y - 360, width: 1280, height: 720 });
function withoutPlayerBullets(run) {
  const originalRange = playerBulletConfig.attackRange;
  playerBulletConfig.attackRange = 0;
  try { return run(); } finally { playerBulletConfig.attackRange = originalRange; }
}

test('Player sword hits contact and orbit distances only once per swing on its configured interval', () => {
  for (const offset of [40, playerSwordConfig.orbitRadius]) {
    const body = player();
    const target = enemy(1, body.x + offset, body.y);
    target.hp = target.maxHp = 1000;
    const combat = new CombatSystem('sword');
    run(combat, body, [target], 0.45);
    assert.equal(target.hp, 1000 - body.attackDamage);
    run(combat, body, [target], 0.12);
    assert.equal(target.hp, 1000 - body.attackDamage * 2);
    assert.equal(body.attackLockSeconds, 0, 'Player attack must not lock movement');
    assert(playerSwordConfig.intervalSeconds === 0.5);
  }
});

test('Player attack creation emits display-only direction metadata with the generated sword', () => {
  const body=player(),target=enemy(1,body.x+40,body.y);target.hp=target.maxHp=1000;
  const combat=new CombatSystem('sword'),events=[];combat.onAttackVisual=event=>events.push(event);
  combat.update(1/60,body,[target],world(),viewport(body));
  assert.equal(events.length,1);
  assert.deepEqual(events[0],{ownerId:body.id,kind:'blade',angle:0,strong:false});
  assert.equal(combat.swords.length,1,'display event does not consume or replace the generated attack');
});

test('Player bullets wait for visible enemies, target the closest visible one, and respect the interval', () => {
  const body = player();
  const closest = enemy(1, body.x + 550, body.y);
  const farther = enemy(2, body.x, body.y + 400);
  const combat = new CombatSystem('bullet');
  combat.update(1 / 60, body, [farther], world(), viewport(body));
  assert.equal(combat.bullets.length, 0, 'A closer offscreen enemy cannot trigger fire');
  combat.update(1 / 60, body, [farther, closest], world(), viewport(body));
  assert.equal(combat.bullets.length, 1);
  assert(combat.bullets[0].velocityX > 0);
  assert.equal(combat.bullets[0].velocityY, 0);
  assert.equal(combat.bullets[0].weapon.radius, playerBulletConfig.radius);
  run(combat, body, [farther, closest], 0.2);
  assert.equal(combat.bullets.length, 1);
  assert.equal(body.attackLockSeconds, 0);
  body.x -= 600; // Camera follows Player away from the target after the shot was emitted.
  run(combat, body, [farther, closest], 1);
  assert(closest.hp < closest.maxHp, 'Existing projectiles keep travelling after the target leaves view');
  assert.equal(combat.bullets.length, 0, 'No replacement shot is emitted towards an offscreen target');
});

test('Player bullets count positive body overlap with each viewport edge as visible, but not mere contact', () => {
  const body = player();
  const camera = viewport(body);
  const half = enemyConfig.size / 2;
  const positions = [
    { x: camera.x - half, y: body.y, dx: 0.01, dy: 0 },
    { x: camera.x + camera.width + half, y: body.y, dx: -0.01, dy: 0 },
    { x: body.x, y: camera.y - half, dx: 0, dy: 0.01 },
    { x: body.x, y: camera.y + camera.height + half, dx: 0, dy: -0.01 },
  ];
  for (const position of positions) {
    const target = enemy(1, position.x, position.y);
    const combat = new CombatSystem('bullet');
    combat.update(1 / 60, body, [target], world(), camera);
    assert.equal(combat.bullets.length, 0);
    target.x += position.dx;
    target.y += position.dy;
    combat.update(1 / 60, body, [target], world(), camera);
    assert.equal(combat.bullets.length, 1);
  }
});

test('Ranged Enemy inside weapon range but outside the camera approaches until visible before firing', () => withoutPlayerBullets(() => {
  const body = player();
  const camera = { x: 1400, y: 1400, width: 200, height: 200 };
  const actor = enemy(1, 1700, 1500, 'circular');
  actor.state = 'attack';
  const system = new EnemySystem(world());
  system.enemies.push(actor);
  const combat = new CombatSystem('bullet');
  combat.update(0.2, body, [actor], world(), camera);
  assert.equal(combat.bullets.length, 0, 'Combat also guards stale/offscreen Attack states');
  actor.state = 'chase';
  system.update(1 / 60, body, camera);
  assert.equal(actor.state, 'chase');
  assert(actor.x < 1700, 'Offscreen ranged Enemy cannot wait at an offscreen firing slot');
  let sawAttack = false;
  for (let frame = 0; frame < 120; frame++) {
    system.update(1 / 60, body, camera);
    combat.update(1 / 60, body, system.enemies, world(), camera);
    if (actor.x - actor.size / 2 >= camera.x + camera.width) assert.equal(actor.state, 'chase');
    if (actor.state === 'attack') sawAttack = true;
  }
  assert(sawAttack);
  assert(body.hp < body.maxHp, 'Enemy must fire and damage Player after entering view');
  body.x = 1300;
  const panned = { x: 1200, y: 1400, width: 200, height: 200 };
  const freshCombat = new CombatSystem('bullet');
  system.update(1 / 60, body, panned);
  assert.equal(actor.state, 'chase', 'Losing screen visibility restarts approach');
  freshCombat.update(0.3, body, system.enemies, world(), panned);
  assert.equal(freshCombat.bullets.length, 0);
}));

test('Default sword tuning leaves a usable distance where Player hits and melee Enemy cannot retaliate', () => {
  const body = player();
  const safeDistance = getEnemyWeapon('horizontal').attackRange + playerConfig.size / 2;
  const target = enemy(1, body.x + safeDistance, body.y);
  target.hp = target.maxHp = 1000;
  target.state = 'attack';
  const combat = new CombatSystem('sword');
  run(combat, body, [target], 0.45);
  assert(target.hp < target.maxHp, 'Player sword must reach beyond Enemy range with a half-player-width margin');
  assert.equal(body.hp, body.maxHp);
  assert(!combat.swords.some(sword => sword.ownerId === target.id));
});

test('Continuous bullet collision hits an enemy even during a long frame', () => {
  const body = player(100, 500);
  const target = enemy(1, 700, 500);
  const combat = new CombatSystem('bullet');
  combat.update(1, body, [target], world(), viewport(body));
  assert.equal(target.hp, target.maxHp - body.attackDamage);
  assert.equal(combat.bullets.length, 0);
});

test('Bullets hit the first rectangle/circle obstacle before a target', () => {
  for (const shape of ['rectangle', 'circle']) {
    const body = player(100, 500);
    const target = enemy(1, 700, 500);
    const scenery = { ...world(), obstacles: [{ x: 400, y: 500, size: 100, shape }] };
    const combat = new CombatSystem('bullet');
    combat.update(1, body, [target], scenery, viewport(body));
    assert.equal(target.hp, target.maxHp);
    assert.equal(combat.bullets.length, 0);
  }
});

test('Enemy bullets pass through friendly enemies and damage only the Player', () => {
  const body = player(700, 500);
  body.attackDamage = 0; // Isolate Enemy projectiles from the longer Player sword.
  const source = enemy(1, 400, 500, 'circular');
  source.state = 'attack';
  const friend = enemy(2, 550, 500);
  const combat = new CombatSystem('sword');
  run(combat, body, [source, friend], 1.12);
  assert.equal(friend.hp, friend.maxHp);
  assert.equal(body.hp, body.maxHp - source.attackDamage);
});

test('Enemy swords skip friendly targets, damage Player, and lock only the attacker', () => {
  const body = player(400 + getEnemyWeapon('horizontal').attackRange - 5, 500);
  body.attackDamage = 0;
  const source = enemy(1, 400, 500);
  source.state = 'attack';
  const friend = enemy(2, 400, 560);
  const combat = new CombatSystem('bullet');
  combat.update(1 / 60, body, [source, friend], world(), viewport(body));
  assert.equal(friend.hp, friend.maxHp);
  assert.equal(body.hp, body.maxHp - source.attackDamage);
  assert(source.attackLockSeconds > 0);
  assert.equal(friend.attackLockSeconds, 0);
  assert.equal(body.attackLockSeconds, 0);
});

test('Enemy retains short spatial hysteresis and immediately resumes beyond its margin', () => {
  for (const kind of ['horizontal', 'circular']) {
    const body = player();
    const range = getEnemyWeapon(kind).attackRange;
    const actor = enemy(1, body.x - range + 5, body.y, kind);
    actor.state = 'chase';
    const system = new EnemySystem(world());
    system.enemies.push(actor);
    const before = { x: actor.x, y: actor.y };
    system.update(1 / 60, body, viewport(body));
    assert.equal(actor.state, 'attack');
    assert.equal(distance(actor, before), 0);
    body.x += 10;
    system.update(1 / 60, body, viewport(body));
    assert.equal(actor.state, 'attack');
    assert.equal(distance(actor, before), 0);
    body.x += enemyConfig.chase.resumeDistance + 10;
    system.update(1 / 60, body, viewport(body));
    assert.equal(actor.state, 'chase');
    assert(distance(actor, before) > 0);
  }
});

test('Enemy cannot stay forever without attacking in the hysteresis band after Player retreats', () => {
  const originalRange = playerBulletConfig.attackRange;
  playerBulletConfig.attackRange = 0;
  try {
    for (const kind of ['horizontal', 'circular']) {
      const body = player();
      const range = getEnemyWeapon(kind).attackRange;
      const actor = enemy(1, body.x - range, body.y, kind);
      actor.state = 'chase';
      const system = new EnemySystem(world());
      system.enemies.push(actor);
      system.update(1 / 60, body, viewport(body));
      assert.equal(actor.state, 'attack');
      body.x += 12;
      const before = { x: actor.x, y: actor.y };
      const combat = new CombatSystem('bullet');
      for (let frame = 0; frame < 180; frame++) {
        system.update(1 / 60, body, viewport(body));
        combat.update(1 / 60, body, system.enemies, world(), viewport(body));
      }
      assert(distance(actor, before) > 1, `${kind} must resume approach`);
      assert(body.hp < body.maxHp, `${kind} must eventually deal actual damage`);
    }
  } finally { playerBulletConfig.attackRange = originalRange; }
});

test('Ranged Enemy abandons a slot whose center ray is clear but bullet is blocked', () => {
  const originalRange = playerBulletConfig.attackRange;
  playerBulletConfig.attackRange = 0;
  try {
    const body = player();
    const scenery = { ...world(), obstacles: [{ shape: 'circle', x: 1250, y: 1525, size: 40 }] };
    const actor = enemy(1, 1125, 1500, 'circular');
    actor.state = 'chase';
    const system = new EnemySystem(scenery);
    system.enemies.push(actor);
    const combat = new CombatSystem('bullet');
    for (let frame = 0; frame < 180; frame++) {
      system.update(1 / 60, body, viewport(body));
      combat.update(1 / 60, body, system.enemies, scenery, viewport(body));
    }
    assert(distance(actor, { x: 1125, y: 1500 }) > 1);
    assert(body.hp < body.maxHp, 'A reachable firing slot must produce actual damage');
  } finally { playerBulletConfig.attackRange = originalRange; }
});

test('Increasing sword attackRange alone cannot leave Enemy swinging beyond physical reach', () => {
  const weapon = getEnemyWeapon('horizontal');
  const original = weapon.attackRange;
  const playerRange = playerBulletConfig.attackRange;
  weapon.attackRange = 220;
  playerBulletConfig.attackRange = 0;
  try {
    const body = player();
    const actor = enemy(1, 1300, 1500);
    actor.state = 'chase';
    const system = new EnemySystem(world());
    system.enemies.push(actor);
    const combat = new CombatSystem('bullet');
    for (let frame = 0; frame < 180; frame++) {
      system.update(1 / 60, body, viewport(body));
      combat.update(1 / 60, body, system.enemies, world(), viewport(body));
    }
    assert(body.hp < body.maxHp);
    assert(actor.x > 1300, 'AI must approach to actual sword reach');
  } finally { weapon.attackRange = original; playerBulletConfig.attackRange = playerRange; }
});

test('Round bullets miss square corners outside their radius and include exact contact', () => {
  const { obstacleBulletHit } = load('src/combat/hitDetection.ts');
  const target = enemy(1, 100, 100);
  const body = player(500, 500);
  const combat = new CombatSystem('sword');
  const weapon = { ...playerBulletConfig, speed: 2, radius: 5, lifetimeSeconds: 2, maximumTravelDistance: 10 };
  combat.bullets.push({ id: 900, ownerId: body.id, faction: 'player', damage: 24, x: 78, y: 120, velocityX: 2, velocityY: 0, age: 0, travelled: 0, weapon });
  combat.update(1, body, [target], world(), viewport(body));
  assert.equal(target.hp, target.maxHp);
  assert.equal(combat.bullets.length, 1);
  const obstacle = { shape: 'rectangle', x: 100, y: 100, size: 32 };
  assert.equal(obstacleBulletHit({ x: 78, y: 120 }, { x: 80, y: 120 }, 5, obstacle), undefined);
  assert.notEqual(obstacleBulletHit({ x: 78, y: 119 }, { x: 80, y: 119 }, 5, obstacle), undefined);
  const scenery = { ...world(), obstacles: [obstacle] };
  assert.equal(lineIsClear({ x: 78, y: 120 }, { x: 80, y: 120 }, 10, scenery, [], 'circle'), true);
  assert.equal(lineIsClear({ x: 78, y: 120 }, { x: 80, y: 120 }, 10, scenery, []), false);
});

test('Enemy in an outer waiting ring does not attack outside its range', () => {
  const body = player();
  const actor = enemy(1, 2000, 1500);
  actor.state = 'wait';
  const combat = new CombatSystem('bullet');
  combat.update(1 / 60, body, [actor], world(), viewport(body));
  assert(!combat.swords.some((sword) => sword.ownerId === actor.id));
  assert(!combat.bullets.some((bullet) => bullet.ownerId === actor.id));
});

test('Hit effects apply immediately, decay, and knockback remains inside the floor', () => {
  const body = player(2800, 1500);
  const target = enemy(1, 2970, 1500);
  target.hp = target.maxHp = 1000;
  const combat = new CombatSystem('bullet');
  run(combat, body, [target], 0.2);
  assert(target.hp < target.maxHp);
  assert(target.hitFlashSeconds > 0);
  const before = target.x;
  body.x = 1000;
  run(combat, body, [target], 0.5, world(), () => assert(canOccupy(target, target.size, world(), [body])));
  assert(target.x > before);
  assert(target.x <= 3000 - target.size / 2);
  assert.equal(target.hitFlashSeconds, 0);
  assert.equal(target.knockbackSeconds, 0);
});

test('Multiple simultaneous enemy hits respect Player invulnerability', () => {
  const body = player(1000, 500);
  const combat = new CombatSystem('sword');
  for (let i = 0; i < 5; i++) {
    combat.bullets.push({
      id: 100 + i, ownerId: 10 + i, faction: 'enemy', damage: 8, x: 950, y: 500,
      velocityX: enemyBulletConfig.speed, velocityY: 0, age: 0, travelled: 0, weapon: enemyBulletConfig,
    });
  }
  combat.update(0.2, body, [], world(), viewport(body));
  assert.equal(body.hp, body.maxHp - 8);
  assert.equal(body.invulnerableSeconds, combatConfig.invulnerabilitySeconds.player);
  assert.equal(combat.bullets.length, 0);
});

test('Defeated enemies are removed, their sword ends, and spawn population recovers', () => {
  const body = player();
  const system = new EnemySystem(world());
  system.initialize(body, viewport(body));
  const dead = system.enemies[0];
  const combat = new CombatSystem('sword');
  dead.hp = 0;
  combat.swords.push({ id: 500, ownerId: dead.id, faction: 'enemy', damage: 100, age: 0, angle: 0, x: dead.x, y: dead.y, weapon: getEnemyWeapon('horizontal'), hitIds: new Set() });
  system.removeDefeated();
  assert.equal(system.enemies.length, 9);
  combat.update(1 / 60, body, system.enemies, world(), viewport(body));
  assert(!combat.swords.some((sword) => sword.ownerId === dead.id));
  system.update(3, body, viewport(body));
  assert(system.enemies.length >= 10 && system.enemies.length <= 11);
  assert(system.enemies.every((actor) => actor.hp > 0 && actor.id !== dead.id));
});

test('Automatic attacks keep Player movement at its configured speed', () => {
  for (const kind of ['sword', 'bullet']) {
    const body = player(1000, 1500);
    const target = enemy(1, 1800, 1500);
    const combat = new CombatSystem(kind);
    for (let i = 0; i < 60; i++) {
      moveBody(body, playerConfig.movementSpeed / 60, 0, world(), [target]);
      combat.update(1 / 60, body, [target], world(), viewport(body));
    }
    assert(Math.abs(body.x - 1300) < 1e-8);
    assert.equal(body.attackLockSeconds, 0);
  }
});

test('Health cannot become negative and expired bullets are removed', () => {
  const body = player();
  body.attackDamage = 10000;
  const target = enemy(1, body.x + 100, body.y);
  const combat = new CombatSystem('bullet');
  combat.update(1, body, [target], world(), viewport(body));
  assert.equal(target.hp, 0);
  combat.update(10, body, [], world(), viewport(body));
  assert.equal(combat.bullets.length, 0);
});

test('Movement, crowd AI, combat, knockback, deaths and respawns remain collision-safe together', () => {
  const { createObstacleLayout } = load('src/world/createObstacleLayout.ts');
  for (const kind of ['sword', 'bullet']) {
    let seed = kind === 'sword' ? 771 : 992;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const scenery = { ...world(), obstacles: createObstacleLayout(3000, 3000, 48, random) };
    const body = player();
    body.hp = body.maxHp = 5000;
    const system = new EnemySystem(scenery, random);
    system.initialize(body, viewport(body));
    const combat = new CombatSystem(kind);
    let observedDamage = false;
    for (let i = 0; i < 1200; i++) {
      const angle = i / 100;
      moveBody(body, Math.cos(angle) * playerConfig.movementSpeed / 30, Math.sin(angle) * playerConfig.movementSpeed / 30, scenery, system.enemies);
      system.update(1 / 30, body, viewport(body));
      combat.update(1 / 30, body, system.enemies, scenery, viewport(body));
      if (body.hp < body.maxHp || system.enemies.some((actor) => actor.hp < actor.maxHp)) observedDamage = true;
      system.removeDefeated();
      assert(system.enemies.length <= system.maximumCount);
      assert(body.hp >= 0 && body.hp <= body.maxHp);
      assert(canOccupy(body, body.size, scenery, system.enemies));
      system.enemies.forEach((actor, index) => {
        assert(actor.hp > 0 && actor.hp <= actor.maxHp);
        assert(canOccupy(actor, actor.size, scenery, [body, ...system.enemies.slice(0, index)]));
      });
    }
    assert(observedDamage, `The ${kind} simulation should exercise actual attacks`);
  }
});
