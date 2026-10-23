const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('node:module').registerHooks({ resolve(s, c, next) { return next(s.startsWith('.') && !path.extname(s) ? s + '.ts' : s, c); } });
const { CharacterCombat } = require('../src/combat/CharacterCombat.ts');
const { CombatSystem } = require('../src/combat/CombatSystem.ts');
const { SkillProgression } = require('../src/experience/SkillProgression.ts');
const { ExperienceSystem } = require('../src/experience/ExperienceSystem.ts');
const { createCombatant } = require('../src/combat/types.ts');
const { EnemySystem } = require('../src/enemies/EnemySystem.ts');
const { skills } = require('../src/config/skills.ts');
const { characters, characterIds } = require('../src/config/characters.ts');
const { auxiliaryWeapons, characterWeapons } = require('../src/config/characterWeapons.ts');
const { combatConfig } = require('../src/config/combat.ts');
const { moveBody, canOccupy } = require('../src/world/geometry.ts');

test('Normal and critical lethal hits report full post-defense damage rather than the remaining one HP', () => {
  for (const critical of [false,true]) {
    const target = enemy(1,1600,1500,1);
    target.damageReduction = .2;
    const f = fixture('signal',[target],()=>critical ? 0 : .99);
    const hits = []; f.combat.onDamage = hit=>hits.push(hit);
    f.step();
    assert.equal(target.hp,0);
    assert.equal(hits.length,1);
    assert.equal(hits[0].critical,critical);
    close(hits[0].amount,24 * .8 * (critical ? combatConfig.criticalMultiplier : 1));
    assert(hits[0].amount > target.maxHp,'the displayed hit must not be capped to HP lost');
  }
});

test('Critical chance boundary independently rolls each chain target and reports post-defense damage including lethal hits', () => {
  const rolls = [combatConfig.criticalChance - 1e-8, combatConfig.criticalChance, .99];
  const list = [enemy(1, 1600), enemy(2, 1650), enemy(3, 1700, 1500, 1)];
  list[0].damageReduction = .2;
  const f = fixture('signal', list, () => rolls.shift());
  const hits = []; f.combat.onDamage = hit => hits.push(hit);
  f.step();
  assert.deepEqual(hits.map(hit => hit.critical), [true, false, false]);
  const expected = [24 * combatConfig.criticalMultiplier * .8, 24 * .8, 24 * .8 ** 2];
  hits.forEach((hit, i) => close(hit.amount, expected[i]));
  close(list[0].maxHp - list[0].hp, expected[0]);
  close(list[1].maxHp - list[1].hp, expected[1]);
  assert.equal(list[2].hp, 0);
  f.step(); assert.equal(hits.length, 3, 'dead targets and cooling weapons do not emit extra numbers');
});

test('All characters offer both critical skills at every rank and apply their cumulative rank values to actual damage', () => {
  for (const character of characterIds) for (let rank = 1; rank <= 5; rank++) {
    const target = enemy(1, character === 'carrier' ? 1540 : 1564);
    const f = fixture(character, [target], () => 0);
    f.upgrade(21, rank); f.upgrade(22, rank);
    close(f.combat.criticalChance, combatConfig.criticalChance + skills[character][20].values[rank - 1] / 100);
    close(f.combat.criticalMultiplier, combatConfig.criticalMultiplier + skills[character][21].values[rank - 1]);
    const hits = []; f.combat.onDamage = hit => hits.push(hit);
    f.run(character === 'carrier' ? 1.65 : .6);
    assert.equal(hits.length, 1, character);
    assert(hits[0].critical);
    close(target.maxHp - target.hp, 24 * (character === 'carrier' ? 1.3 : 1) * f.combat.criticalMultiplier);
    const reset = fixture(character);
    close(reset.combat.criticalChance, combatConfig.criticalChance);
    close(reset.combat.criticalMultiplier, combatConfig.criticalMultiplier);
  }
});

test('Placed mines retain critical rank snapshots and zone ticks and electric pulses can critically hit', () => {
  const mine = fixture('carrier', [], () => .1);
  mine.run(1.21);
  mine.upgrade(21, 5); mine.upgrade(22, 5);
  mine.list.push(enemy(1, 1540));
  const hits = []; mine.combat.onDamage = hit => hits.push(hit);
  mine.run(.41);
  assert.equal(hits[0].critical, false, 'old mine keeps original chance');
  close(hits[0].amount, 24 * 1.3);
  const multiplier = fixture('carrier', [], () => 0);
  multiplier.run(1.21); multiplier.upgrade(22, 5);
  multiplier.list.push(enemy(1, 1540)); multiplier.run(.41);
  close(multiplier.list[0].maxHp - multiplier.list[0].hp, 24 * 1.3 * combatConfig.criticalMultiplier);
  for (const id of [7, 9]) {
    const f = fixture('signal', [enemy(1, 1600)], () => 0);
    f.upgrade(id); f.combat.mainTimer = 100; f.combat.auxiliaryTimers.set(id, 0);
    const events = []; f.combat.onDamage = hit => events.push(hit);
    f.run(1.1);
    assert(events.length >= 1);
    assert(events.every(hit => hit.critical));
    close(f.list[0].maxHp - f.list[0].hp, events.reduce((sum, hit) => sum + hit.amount, 0));
    close(events[0].amount, 24 * skills.signal[id - 1].values[0] / 100 * combatConfig.criticalMultiplier);
  }
});

test('Zero and capped critical probability work, and invalid critical settings and random values fail explicitly', () => {
  const previous = { chance: combatConfig.criticalChance, multiplier: combatConfig.criticalMultiplier };
  try {
    combatConfig.criticalChance = 0;
    const zero = fixture('signal', [enemy()], () => 0); zero.step();
    close(zero.list[0].maxHp - zero.list[0].hp, 24);
    combatConfig.criticalChance = 1;
    const capped = fixture('signal', [enemy()], () => .999999); capped.upgrade(21, 5); capped.step();
    assert.equal(capped.combat.criticalChance, 1);
    close(capped.list[0].maxHp - capped.list[0].hp, 24 * previous.multiplier);
    for (const bad of [-1, 1.01, NaN, Infinity]) {
      combatConfig.criticalChance = bad;
      assert.throws(() => fixture('signal'), /combat.criticalChance/);
    }
    combatConfig.criticalChance = previous.chance;
    for (const bad of [0, .99, NaN, Infinity]) {
      combatConfig.criticalMultiplier = bad;
      assert.throws(() => fixture('signal'), /combat.criticalMultiplier/);
    }
    combatConfig.criticalMultiplier = previous.multiplier;
    for (const bad of [-.01, 1, NaN, Infinity]) {
      const f = fixture('signal', [enemy()], () => bad);
      assert.throws(() => f.step(), /combat.random/);
      assert.equal(f.list[0].hp, f.list[0].maxHp);
    }
  } finally {
    combatConfig.criticalChance = previous.chance;
    combatConfig.criticalMultiplier = previous.multiplier;
  }
});

const close = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-6, `${message || ''} ${actual} != ${expected}`);

test('Concept upgrades modify the main strong hit and chain, while a carrier lure never fires a projectile', () => {
  const m = fixture('mechanic', [enemy(1, 1564)]);
  m.upgrade(9); m.combat.mainTimer = 100;
  m.run(5);
  assert.equal(m.list[0].hp, m.list[0].maxHp, 'strong-hit upgrade has no independent attack');
  const s = fixture('signal', [enemy(1,1600),enemy(2,1700),enemy(3,1800),enemy(4,1600,1600)]);
  s.upgrade(8); s.step();
  assert(s.list[3].hp < s.list[3].maxHp, 'main chain branches into an unvisited enemy');
  const c = fixture('carrier'); c.upgrade(9); c.run(auxiliaryWeapons.carrier[2].interval + .01);
  assert.equal(c.combat.lures.length, 1, 'lure is placed even with no target');
  assert.equal(c.combat.shots.length, 0);
});
const enemy = (id = 1, x = 1600, y = 1500, hp = 10000) => Object.assign(createCombatant({ id, x, y, size: 32 }, 'enemy', hp, 8), { kind: 'horizontal', state: 'wait', experienceCategory: 'normal1' });
function fixture(character, list = [], hitRandom = () => .99) {
  const player = createCombatant({ id: 0, x: 1500, y: 1500, size: 48 }, 'player', 120, 24);
  let randomValue;
  const combat = new CharacterCombat(character, player, () => randomValue ?? hitRandom());
  const experience = new ExperienceSystem();
  const world = { width: 3000, height: 3000, obstacles: [] };
  const viewport = { x: 860, y: 1140, width: 1280, height: 720 };
  let level = 1;
  const upgrade = (id, rank = 1) => {
    while (combat.progression.level(id) < rank) {
      const eligible = skills[character].filter(skill => combat.progression.level(skill.id) < 5);
      randomValue = (eligible.findIndex(skill => skill.id === id) + 0.01) / eligible.length;
      combat.progression.observeLevel(++level);
      const offer = combat.progression.offer();
      const index = offer.choices.findIndex(choice => choice.kind === 'skill' && choice.id === id);
      assert(index >= 0, 'Requested upgrade must actually be offered');
      assert(combat.choose(offer.token, index, experience));
    }
    randomValue = undefined;
  };
  const step = (seconds = 1 / 60, dx = 0, dy = 0) => {
    const previous = { x: player.x, y: player.y };
    if (dx || dy) moveBody(player, dx, dy, world, list.filter(e => e.hp > 0));
    combat.prepare(seconds, previous, list);
    combat.update(seconds, world, viewport);
  };
  const run = (seconds, callback) => {
    for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += 1 / 60) { step(Math.min(1 / 60, seconds - elapsed)); callback?.(); }
  };
  return { player, combat, experience, world, viewport, list, upgrade, step, run };
}

test('Each character retains twenty original skills plus two shared five-rank critical skills and its own starting stats', () => {
  for (const id of characterIds) {
    assert.equal(skills[id].length, 22);
    assert.equal(new Set(skills[id].map(skill => skill.id)).size, 22);
    for (const skill of skills[id]) {
      assert.equal(skill.values.length, 5);
      assert(skill.values.every(Number.isFinite));
      if (skill.secondary) assert.equal(skill.secondary.length, 5);
    }
    const f = fixture(id);
    assert.equal(f.player.hp, characters[id].maxHp);
    assert.equal(f.combat.movementSpeed, characters[id].speed);
    assert.equal(f.combat.progression.pending, 0);
  }
});

test('Uniform sampling has no duplicate cards; cached offers and stale tokens cannot reroll or select twice', () => {
  for (const character of characterIds) {
    for (let seed = 1; seed <= 20; seed++) {
      let state = seed;
      const p = new SkillProgression(character, () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; });
      p.observeLevel(5);
      const offer = p.offer();
      assert.equal(p.offer(), offer);
      assert.equal(new Set(offer.choices.map(choice => choice.id)).size, 3);
      assert.equal(p.choose(offer.token, 9), undefined);
      assert.equal(p.pending, 4);
      assert(p.choose(offer.token, 0));
      assert.equal(p.choose(offer.token, 0), undefined);
      assert.equal(p.pending, 3);
      assert.notEqual(p.offer().token, offer.token);
    }
  }
});

test('Rank five skills never reappear; all upgrades include critical skills and 2/1/0 eligible skills receive supplies', () => {
  for (const character of characterIds) {
    const p = new SkillProgression(character, () => 0);
    const maximumUpgrades = skills[character].length * 5;
    p.observeLevel(maximumUpgrades + 5);
    let upgrades = 0;
    while (upgrades < maximumUpgrades) {
      const offer = p.offer();
      const eligible = p.levels.filter(level => level < 5).length;
      assert.equal(offer.choices.length, 3);
      assert.equal(offer.choices.filter(choice => choice.kind === 'skill').length, Math.min(3, eligible));
      for (const choice of offer.choices) if (choice.kind === 'skill') assert(p.level(choice.id) < 5);
      const choice = p.choose(offer.token, 0);
      assert.equal(choice.kind, 'skill');
      upgrades++;
    }
    assert(p.levels.every(level => level === 5));
    assert.deepEqual(p.offer().choices.map(choice => choice.id), ['heal', 'shield', 'pickup']);
    p.choose(p.offer().token, 0);
    assert(p.levels.every(level => level === 5));
    assert.equal(p.pending, 3);
    assert(new SkillProgression(character).levels.every(level => level === 0));
  }
});

for (const character of characterIds) {
  test(`${character}: every rank applies HP, movement, pickup radius and damage reduction without cumulative rank addition`, () => {
    const f = fixture(character);
    for (let rank = 1; rank <= 5; rank++) {
      f.player.hp = 20;
      const previous = f.player.maxHp;
      f.upgrade(16, rank);
      assert.equal(f.player.maxHp, characters[character].maxHp + skills[character][15].values[rank - 1]);
      assert.equal(f.player.hp, 20 + f.player.maxHp - previous);
      f.upgrade(17, rank);
      close(f.combat.movementSpeed, characters[character].speed * (1 + rank * 0.04));
      f.upgrade(18, rank);
      const radius = 150 + skills[character][17].values[rank - 1];
      assert.equal(f.combat.pickupRadius, radius);
      f.experience.dropFromDefeated([{ hp: 0, experienceCategory: 'normal1', x: f.player.x + radius, y: f.player.y }]);
      f.experience.update(0, f.player, f.combat.pickupRadius);
      assert(f.experience.drops.at(-1).attracted);
      f.upgrade(19, rank);
      close(f.combat.defend(100), 100 - rank * 3);
    }
  });

  test(`${character}: timed damage skills at every rank wait for cooldown and trap arming; passive and lure skills do not attack independently`, () => {
    for (let id = 7; id <= 10; id++) for (let rank = 1; rank <= 5; rank++) {
      const config = auxiliaryWeapons[character][id - 7];
      const target = enemy(1, 1500, 1550);
      const f = fixture(character, [target]);
      f.upgrade(id, rank);
      // Keep the baseline weapon cooling down to isolate the real auxiliary simulation.
      f.combat.mainTimer = 100;
      if (config.kind === 'passive' || config.kind === 'lure') {
        f.run(7);
        assert.equal(target.hp, target.maxHp, `${character}/${id}/${rank} must not attack independently`);
        assert.equal(f.combat.shots.length, 0);
        if (config.kind === 'lure') {
          assert.equal(f.combat.lures.length, 1);
          assert.equal(f.combat.lures[0].radius, skills.carrier[8].values[rank - 1]);
          f.combat.auxiliaryTimers.clear(); f.run(5);
          assert.equal(f.combat.lures.length, 0, 'lures expire');
        }
        continue;
      }
      f.run(config.interval - 0.05);
      assert.equal(target.hp, target.maxHp, `${character}/${id}/${rank} fired early`);
      f.run(config.kind === 'zone' || config.kind === 'trap' ? 0.6 : 0.2);
      close(target.maxHp - target.hp, 24 * skills[character][id - 1].values[rank - 1] / 100, `${character}/${id}/${rank}`);
    }
  });
}

test('Mechanic auxiliary melee hits nearby enemies once and cannot fire at distant enemies at any rank', () => {
  for (const id of [7]) for (let rank = 1; rank <= 5; rank++) {
    const near = enemy(1, 1564), rear = enemy(2, 1436), far = enemy(3, 1800);
    const f = fixture('mechanic', [near, rear, far]);
    f.upgrade(id, rank); f.combat.mainTimer = 100;
    f.combat.auxiliaryTimers.set(id, 0);
    f.run(.7);
    assert.equal(f.combat.shots.length, 0, 'melee skills never launch a projectile');
    close(near.maxHp - near.hp, 24 * skills.mechanic[id - 1].values[rank - 1] / 100);
    close(rear.maxHp - rear.hp, 0);
    assert.equal(far.hp, far.maxHp);
    const remote = fixture('mechanic', [enemy(1, 1800)]);
    remote.upgrade(id, rank); remote.combat.mainTimer = 100;
    remote.combat.auxiliaryTimers.set(id, 0); remote.run(1);
    assert.equal(remote.list[0].hp, remote.list[0].maxHp, 'no remote damage');
    assert.equal(remote.combat.shots.length, 0);
    assert.equal(remote.combat.swings.length, 0);
  }
});

test('Mechanic melee respects range boundaries and walls, and a spinning blade follows player movement', () => {
  for (const id of [7]) {
    const range = auxiliaryWeapons.mechanic[id - 7].range;
    const edge = enemy(1, 1500 + range), outside = enemy(2, 1500 - range - .001);
    const f = fixture('mechanic', [edge, outside]);
    f.upgrade(id); f.combat.mainTimer = 100; f.combat.auxiliaryTimers.set(id, 0); f.run(.7);
    assert(edge.hp < edge.maxHp, `skill ${id} reaches its advertised boundary`);
    assert.equal(outside.hp, outside.maxHp);
    const blocked = fixture('mechanic', [enemy(1, 1600)]);
    blocked.world.obstacles.push({ x: 1550, y: 1500, size: 20, shape: 'circle' });
    blocked.upgrade(id); blocked.combat.mainTimer = 100; blocked.combat.auxiliaryTimers.set(id, 0); blocked.run(.7);
    assert.equal(blocked.list[0].hp, blocked.list[0].maxHp, 'wall blocks melee');
  }
  const target = enemy(1, 1564), f = fixture('mechanic', [target]);
  f.upgrade(9); f.combat.attacks = 3; f.step(0);
  f.step(0, 0, -200); f.run(.7);
  assert.equal(target.hp, target.maxHp, 'the blade leaves its old location with the moving player');
  assert.equal(f.combat.swings.length, 0, 'the full rotation expires');
});

test('Mechanic sword damage, radius, interval, strong cadence and knockback use rank values and actual swept hits', () => {
  const baseX=1500+characterWeapons.mechanic.radius;
  for (let rank = 1; rank <= 5; rank++) {
    const target = enemy(1, baseX, 1500);
    const f = fixture('mechanic', [target]);
    f.upgrade(1, rank);
    f.step(); f.run(characterWeapons.mechanic.duration);
    close(target.maxHp - target.hp, 24 * (1 + skills.mechanic[0].values[rank - 1] / 100));
    assert(target.x > baseX);
    const ext = fixture('mechanic', [enemy(1, 1500 + characterWeapons.mechanic.range + rank * 8, 1500)]);
    ext.upgrade(3, rank);
    ext.step();
    assert.equal(ext.combat.swings.length, 1);
    assert.equal(ext.combat.swings[0].radius, characterWeapons.mechanic.radius + rank * 8);
    const timerBefore = ext.combat.mainTimer;
    ext.upgrade(2, rank);
    close(ext.combat.mainTimer / timerBefore, 1 - rank * 0.06);
    ext.run(characterWeapons.mechanic.duration);
    close(ext.list[0].maxHp-ext.list[0].hp,24,'each extension rank still hits its new outer boundary once');
    const strong = fixture('mechanic', [enemy(1, baseX, 1500)]);
    strong.upgrade(4, rank); strong.upgrade(5, rank);
    strong.combat.attacks = skills.mechanic[3].values[rank - 1] - 1;
    strong.step(); strong.run(0.02);
    close(strong.list[0].maxHp - strong.list[0].hp, 24 * (1 + skills.mechanic[3].secondary[rank - 1] / 100));
    close(strong.list[0].x - baseX, skills.mechanic[4].values[rank - 1]);
  }
});

test('Every crushing rank enlarges only the main strong swing, hits its boundary once, and retains strong-hit rewards', () => {
  for (let rank=1;rank<=5;rank++) {
    const extra=skills.mechanic[8].values[rank-1],range=characterWeapons.mechanic.range+extra;
    const target=enemy(1,1500+range),outside=enemy(2,1500-range-.001);
    const f=fixture('mechanic',[target,outside]);
    f.upgrade(9,rank); f.upgrade(13); f.upgrade(15); f.player.hp=50;
    f.step(); assert.equal(f.combat.swings.length,0,'a normal attack cannot reach the enlarged boundary');
    f.combat.attacks=3; f.step();
    assert.equal(f.combat.swings.length,1); assert(f.combat.swings[0].empowered);
    assert.equal(f.combat.swings[0].range,range);
    f.run(.6);
    close(target.maxHp-target.hp,24*(1+(.5)+skills.mechanic[8].secondary[rank-1]/100));
    assert.equal(outside.hp,outside.maxHp); assert.equal(f.combat.swings.length,0);
    close(f.combat.shieldAmount,skills.mechanic[12].values[0]); close(f.player.hp,52);
    assert(!f.combat.auxiliaryTimers.has(9));
    const normal=fixture('mechanic',[enemy(1,1564)]); normal.upgrade(9,rank);normal.step();
    assert(!normal.combat.swings[0].empowered);normal.run(.6);
    close(normal.list[0].maxHp-normal.list[0].hp,24,'normal hit damage is unchanged');
    const blocked=fixture('mechanic',[enemy(1,1500+range)]); blocked.upgrade(9,rank);blocked.combat.attacks=3;
    blocked.world.obstacles.push({x:1560,y:1500,size:20,shape:'circle'});blocked.run(.6);
    assert.equal(blocked.list[0].hp,blocked.list[0].maxHp,'strong slash cannot cross a wall');
  }
});

test('Signal branches and terminal overload scale at every rank, stay bounded and share main damage and transfer range upgrades', () => {
  for(let rank=1;rank<=5;rank++) {
    const list=[enemy(1,1600),enemy(2,1700),enemy(3,1800),enemy(4,1600,1600),enemy(5,1600,1400)];
    const f=fixture('signal',list);f.upgrade(8,rank);f.upgrade(10,rank);f.upgrade(1);
    const hits=[];f.combat.onDamage=h=>hits.push(h);f.step();
    const base=24*1.15;
    close(list[3].maxHp-list[3].hp,base*skills.signal[7].values[rank-1]/100);
    close(list[4].maxHp-list[4].hp,base*skills.signal[7].values[rank-1]/100);
    close(list[2].maxHp-list[2].hp,base*.8**2+base*skills.signal[9].values[rank-1]/100);
    assert.equal(hits.length,6,'three chain hits, two branches and one terminal hit; no recursion');
    assert.equal(f.combat.shots.length,0);assert.equal(f.combat.auxiliaryTimers.size,0);
    const solo=fixture('signal',[enemy(1,1600)]);solo.upgrade(10,rank);solo.step();
    close(solo.list[0].maxHp-solo.list[0].hp,24,'one target does not trigger overload');
  }
  const f=fixture('signal',[enemy(1,1600),enemy(2,1700),enemy(3,1800),enemy(4,1600,1680)]);
  f.upgrade(8);f.step();assert.equal(f.list[3].hp,f.list[3].maxHp);
  f.upgrade(4,2);f.combat.mainTimer=0;f.step();assert(f.list[3].hp<f.list[3].maxHp,'antenna extends branch range');
  const synergy=fixture('signal',[enemy(1,1600),enemy(2,1700),enemy(3,1600,1620)]);
  for(const id of [6,8,13,15])synergy.upgrade(id);
  synergy.combat.charged=true;synergy.step();
  close(synergy.combat.shieldAmount,skills.signal[12].values[0],'two main hits plus a branch earn the triple-hit shield');
  assert(synergy.combat.vulnerability.has(3));assert(synergy.combat.slow.has(3),'branch shares charged slow');
});

test('Signal beacon bridges a broken chain without duplicate targets, never crosses walls, and expires before it can relay again', () => {
  const first=enemy(1,1600),second=enemy(2,1820),f=fixture('signal',[first,second]);
  f.upgrade(9);f.combat.mainTimer=100;
  // Place the real beacon on an enemy, then let that enemy leave the stationary field.
  first.x=1710;f.combat.auxiliaryTimers.set(9,0);f.step(0);first.x=1600;
  assert.equal(f.combat.zones[0].x,1710);
  f.combat.mainTimer=0;f.step(0);
  close(second.maxHp-second.hp,24*.8);assert.equal(f.combat.effects.filter(e=>e.to).length,3);
  second.hp=second.maxHp;first.hp=first.maxHp;
  f.world.obstacles.push({x:1765,y:1500,size:20,shape:'circle'});f.combat.mainTimer=0;f.step(0);
  assert.equal(second.hp,second.maxHp,'relay segments respect obstacles');
  f.world.obstacles.length=0;f.combat.mainTimer=100;f.combat.auxiliaryTimers.clear();f.run(3.01);
  assert.equal(f.combat.zones.length,0);second.hp=second.maxHp;f.combat.mainTimer=0;f.step(0);
  assert.equal(second.hp,second.maxHp,'expired beacon cannot bridge the gap');
});

test('Carrier scrap traps share weapon damage, radius, slow and kill rewards, while sticky trails delay pursuit', () => {
  const target=enemy(1,1540),f=fixture('carrier',[target]);
  for(const id of [1,3,7,12,15])f.upgrade(id);
  f.combat.mainTimer=100;f.combat.auxiliaryTimers.set(7,0);f.step(0);
  assert.equal(f.combat.mines[0].radius,90);
  f.run(.39);assert.equal(target.hp,target.maxHp);f.run(.03);
  close(target.maxHp-target.hp,24*.6*1.15);close(target.movementMultiplier,.85);
  target.hp=1;f.combat.auxiliaryTimers.set(7,0);f.step(0);target.x=1540;f.run(.42);
  assert.equal(target.hp,0);assert(f.combat.movementSpeed>320);
  const trail=fixture('carrier',[enemy(1,1540)]);trail.upgrade(8);trail.combat.mainTimer=100;
  trail.combat.auxiliaryTimers.set(8,0);trail.run(.55);close(trail.list[0].movementMultiplier,.7);
  trail.list[0].x=1800;trail.run(1.1);close(trail.list[0].movementMultiplier,1);
});

test('Carrier chain detonation triggers each armed trap once, obeys range and walls and excludes unarmed traps', () => {
  for(let rank=1;rank<=5;rank++) {
    const link=skills.carrier[9].values[rank-1],f=fixture('carrier');f.upgrade(10,rank);
    const place=(x,age=.5)=>{f.player.x=x;f.combat.mainTimer=0;f.step(0);const mine=f.combat.mines.at(-1);mine.age=age;return mine;};
    place(1500);place(1500+link);place(1500+2*link);const unarmed=place(1500-link,0);
    const outside=place(1500+3*link+.001);
    f.player.x=1100;f.list.push(enemy(1,1500,1540));f.combat.mainTimer=100;f.step(0);
    assert.deepEqual(f.combat.mines,[unarmed,outside],'only connected armed traps detonate');
    close(f.list[0].maxHp-f.list[0].hp,24*1.3,'the trigger victim takes one hit at this spacing');
    assert.equal(f.combat.effects.length,3);
  }
  const f=fixture('carrier');f.upgrade(10,5);f.combat.mainTimer=0;f.step(0);f.combat.mines[0].age=.5;
  f.player.x=1640;f.combat.mainTimer=0;f.step(0);f.combat.mines[1].age=.5;
  f.player.x=1100;f.list.push(enemy(1,1500,1540));f.world.obstacles.push({x:1570,y:1500,size:20,shape:'circle'});
  f.step(0);assert.equal(f.combat.mines.length,1,'walls block chain detonation');
});

test('Mechanic movement charge, crowd defense, strong-hit shields and healing, kill speed and twelve-kill recovery work', () => {
  const radius=characterWeapons.mechanic.radius;
  for (let rank = 1; rank <= 5; rank++) {
    const f = fixture('mechanic');
    for (const id of [11, 12, 13, 14, 15, 20]) f.upgrade(id, rank);
    f.step(0.01, 500);
    assert(f.combat.isCharged);
    f.list.push(enemy(1, f.player.x + radius, f.player.y), enemy(2, f.player.x, f.player.y + radius), enemy(3, f.player.x - radius, f.player.y));
    f.player.hp = 50;
    f.combat.attacks = 3;
    f.step();
    close(f.combat.defend(100), 100 * (1 - skills.mechanic[11].values[rank - 1] / 100));
    f.step(0.02);
    assert(!f.combat.isCharged);
    close(f.list[0].maxHp - f.list[0].hp, 24 * (1 + 0.5 + skills.mechanic[10].values[rank - 1] / 100));
    close(f.combat.shieldAmount, skills.mechanic[12].values[rank - 1]);
    close(f.player.hp, 50 + skills.mechanic[14].values[rank - 1]);
    f.run(characterWeapons.mechanic.duration);
    close(f.player.hp, 50 + skills.mechanic[14].values[rank - 1], 'one heal per strong attack');
    // A normal sword attack kills twelve distinct enemies; each death is counted once.
    f.list.splice(0, f.list.length, ...Array.from({ length: 12 }, (_, i) => enemy(i + 10, f.player.x + Math.cos(i * Math.PI / 6) * radius, f.player.y + Math.sin(i * Math.PI / 6) * radius, 1)));
    f.combat.mainTimer = 0;
    const hpBefore = f.player.hp;
    f.run(characterWeapons.mechanic.duration + 1/60);
    close(f.player.hp - hpBefore, skills.mechanic[19].values[rank - 1]);
    close(f.combat.movementSpeed, 280 * (1 + skills.mechanic[13].values[rank - 1] / 100));
  }
});

test('Direct vulnerability applies after the initial hit and auxiliary attacks neither inherit weapon upgrades nor recurse', () => {
  for (const character of ['mechanic', 'signal']) for (let rank = 1; rank <= 5; rank++) {
    const target = enemy(1, character === 'mechanic' ? 1500+characterWeapons.mechanic.radius : 1700, 1500);
    const f = fixture(character, [target]);
    f.upgrade(6, rank); f.upgrade(1, 5); f.upgrade(7);
    f.step(); if (character === 'mechanic') f.step(0.02);
    const afterFirst = target.hp;
    f.combat.mainTimer = 0;
    f.step(); if (character === 'mechanic') f.step(0.02);
    close(afterFirst - target.hp, 24 * 1.8 * (1 + rank * 0.04));
  }
});

test('Signal chain fixes its path, respects visibility and walls, and never revisits an enemy at MAX ranks', () => {
  for (let rank = 1; rank <= 5; rank++) {
    const list = Array.from({ length: 8 }, (_, i) => enemy(i + 1, 1600 + i * 50, 1500));
    const f = fixture('signal', list);
    for (const id of [1, 2, 3, 4, 5]) f.upgrade(id, rank);
    f.step();
    const count = skills.signal[2].values[rank - 1];
    const base = 24 * (1 + skills.signal[0].values[rank - 1] / 100);
    const retention = skills.signal[4].values[rank - 1] / 100;
    for (let i = 0; i < list.length; i++) close(list[i].maxHp - list[i].hp, i < count ? base * retention ** i : 0);
    close(f.combat.mainTimer, 0.9 * (1 - rank * 0.06));
  }
  const f = fixture('signal', [enemy(1, 1600, 1500), enemy(2, 1700, 1500), enemy(3, 1500, 1000)]);
  f.world.obstacles.push({ x: 1650, y: 1500, shape: 'rectangle', size: 30 });
  f.step();
  assert(f.list[0].hp < f.list[0].maxHp);
  assert.equal(f.list[1].hp, f.list[1].maxHp);
  assert.equal(f.list[2].hp, f.list[2].maxHp);
});

test('Signal crowd and solo bonuses, triple-hit shield, movement slow, death explosion and safe recharge apply every rank', () => {
  for (let rank = 1; rank <= 5; rank++) {
    const f = fixture('signal');
    for (const id of [11, 12, 13, 14, 15, 20]) f.upgrade(id, rank);
    f.step(0.01, 400);
    f.list.push(...[100, 150, 200].map((offset, i) => enemy(i + 1, f.player.x + offset, 1500)));
    f.step();
    close(f.list[0].maxHp - f.list[0].hp, 24 * (1 + skills.signal[10].values[rank - 1] / 100));
    close(f.combat.shieldAmount, skills.signal[12].values[rank - 1]);
    f.step();
    close(f.list[0].movementMultiplier, 0.7);
    f.combat.mainTimer = 100;
    f.run(skills.signal[14].values[rank - 1] + 0.02);
    close(f.list[0].movementMultiplier, 1);
    const solo = fixture('signal', [enemy(1, 1600, 1500)]);
    solo.upgrade(12, rank); solo.step();
    close(solo.list[0].maxHp - solo.list[0].hp, 24 * (1 + rank * 0.1));
    const blast = fixture('signal', [enemy(1, 1600, 1500, 1), enemy(2, 1650, 1500)]);
    blast.upgrade(14, rank); blast.step();
    close(blast.list[1].maxHp - blast.list[1].hp, 24 * 0.8 + 24 * skills.signal[13].values[rank - 1] / 100);
    const heal = fixture('signal'); heal.upgrade(20, rank); heal.player.hp = 20;
    heal.run(9.98); close(heal.player.hp, 20);
    heal.run(0.04); close(heal.player.hp, 20 + rank);
    heal.combat.defend(1); heal.run(9); close(heal.player.hp, 20 + rank);
  }
});

test('Carrier mines arm, expire before triggering, respect caps and snapshot rank values', () => {
  const f = fixture('carrier'); f.run(1.21);
  assert.equal(f.combat.mines.length, 1);
  f.list.push(enemy(1, 1540, 1500));
  f.run(0.3); assert.equal(f.list[0].hp, f.list[0].maxHp);
  f.upgrade(1, 5); f.run(0.11);
  close(f.list[0].maxHp - f.list[0].hp, 24 * 1.3, 'existing mine keeps old damage');
  const cap = fixture('carrier'); cap.upgrade(2, 5); cap.run(8);
  assert.equal(cap.combat.mines.length, 8);
  const old = cap.combat.mines[0]; cap.run(1); assert(!cap.combat.mines.includes(old));
  const expired = fixture('carrier'); expired.run(1.2);
  expired.combat.mines[0].age = 9.99;
  expired.list.push(enemy(1, 1540, 1500)); expired.step(0.02);
  assert.equal(expired.list[0].hp, expired.list[0].maxHp);
});

test('Carrier damage, radius, charge distance, capacity, lifetime and knockback use all five rank values', () => {
  for (let rank = 1; rank <= 5; rank++) {
    const f = fixture('carrier');
    for (const id of [1, 2, 3, 4, 5, 6, 11]) f.upgrade(id, rank);
    f.step(0.01, skills.carrier[3].values[rank - 1]);
    assert(f.combat.isCharged);
    f.run(1.2);
    const mine = f.combat.mines[0];
    assert(mine.payload.charged);
    assert.equal(mine.radius, skills.carrier[2].values[rank - 1]);
    assert.equal(mine.lifetime, skills.carrier[4].secondary[rank - 1]);
    f.run(0.41); // Let the mine complete its explicit 0.4-second arming phase.
    const target = enemy(1, mine.x + 50, mine.y);
    f.list.push(target);
    const before = target.x;
    f.step();
    close(target.maxHp - target.hp, 24 * 1.3 * (1 + skills.carrier[0].values[rank - 1] / 100 + skills.carrier[10].values[rank - 1] / 100));
    close(target.x - before, skills.carrier[5].values[rank - 1]);
  }
});

test('Carrier slow, moving defense, multi-hit shield, kill speed and fifteen-kill recovery apply every rank', () => {
  for (let rank = 1; rank <= 5; rank++) {
    const f = fixture('carrier');
    for (const id of [12, 13, 14, 15, 20]) f.upgrade(id, rank);
    for (let i = 0; i < 121; i++) f.step(1 / 60, 1);
    close(f.combat.defend(100), 100 * (1 - skills.carrier[12].values[rank - 1] / 100));
    const mine = f.combat.mines[0];
    f.list.push(enemy(1, mine.x + 40, mine.y), enemy(2, mine.x + 60, mine.y + 20), enemy(3, mine.x + 60, mine.y - 20));
    f.step(); f.step();
    close(f.list[0].movementMultiplier, 1 - skills.carrier[11].values[rank - 1] / 100);
    close(f.combat.shieldAmount, skills.carrier[13].values[rank - 1]);
    f.run(0.31);
    close(f.combat.defend(1000), 1000 - skills.carrier[13].values[rank - 1], 'stopping removes moving defense');
    const kills = fixture('carrier'); kills.upgrade(15, rank); kills.upgrade(20, rank); kills.player.hp = 20;
    kills.run(1.61);
    const origin = kills.combat.mines[0];
    kills.list.push(...Array.from({ length: 15 }, (_, i) => enemy(i + 1, origin.x + 45, origin.y, 1)));
    kills.step();
    close(kills.player.hp, 20 + skills.carrier[19].values[rank - 1]);
    close(kills.combat.movementSpeed, 320 * (1 + skills.carrier[14].values[rank - 1] / 100));
  }
});

test('Blocked movement and knockback are not charge; shields absorb before HP and death prevents attacks and healing', () => {
  const f = fixture('carrier');
  f.player.x = 2976;
  for (let i = 0; i < 60; i++) f.step(1 / 60, 10);
  assert(!f.combat.isCharged);
  close(f.combat.chargeRatio, 0);
  f.player.x -= 300; f.step();
  assert(!f.combat.isCharged, 'external displacement is not voluntary movement');
  const signal = fixture('signal', [enemy(1, 1600), enemy(2, 1650), enemy(3, 1700)]);
  signal.upgrade(13); signal.step();
  close(signal.combat.defend(3), 0); close(signal.combat.shieldAmount, 2);
  close(signal.combat.defend(8), 6); close(signal.combat.shieldAmount, 0);
  signal.player.hp = 0;
  const health = signal.list.map(e => e.hp);
  signal.combat.mainTimer = 0; signal.run(1);
  assert.deepEqual(signal.list.map(e => e.hp), health);
});

test('Every character with all skills at MAX integrates with enemy AI, damage, collisions and experience', () => {
  for (const character of characterIds) {
    const f = fixture(character);
    for (const skill of skills[character]) f.upgrade(skill.id, 5);
    let seed = 712;
    const enemies = new EnemySystem(f.world, () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; });
    enemies.initialize(f.player, f.viewport);
    const combat = new CombatSystem(undefined, damage => f.combat.defend(damage));
    let removed = 0;
    for (let frame = 0; frame < 1800 && f.player.hp > 0; frame++) {
      const previous = { x: f.player.x, y: f.player.y };
      const angle = frame / 120;
      moveBody(f.player, Math.cos(angle) * f.combat.movementSpeed / 60, Math.sin(angle) * f.combat.movementSpeed / 60, f.world, enemies.enemies);
      f.combat.prepare(1 / 60, previous, enemies.enemies);
      enemies.update(1 / 60, f.player, f.viewport);
      combat.update(1 / 60, f.player, enemies.enemies, f.world, f.viewport);
      f.combat.update(1 / 60, f.world, f.viewport);
      const defeated = enemies.removeDefeated(); removed += defeated.length;
      f.experience.dropFromDefeated(defeated);
      f.experience.update(1 / 60, f.player, f.combat.pickupRadius);
      assert(canOccupy(f.player, f.player.size, f.world, enemies.enemies));
      assert(Number.isFinite(f.player.hp));
      assert(f.combat.mines.filter(mine => !mine.skill).length <= 18);
      assert(f.combat.mines.filter(mine => mine.skill === 7).length <= characterWeapons.carrier.scrapMaximum);
    }
    assert(removed > 0, `${character} must kill actual AI enemies`);
  }
});

test('After all skills reach MAX, healing, refreshing shields and attracting XP remain usable without a sixth rank', () => {
  const f = fixture('carrier');
  for (const skill of skills.carrier) f.upgrade(skill.id, 5);
  f.combat.progression.observeLevel(skills.carrier.length * 5 + 5);
  f.player.hp = 10;
  let offer = f.combat.progression.offer();
  assert(f.combat.choose(offer.token, 0, f.experience));
  close(f.player.hp, 10 + f.player.maxHp / 4);
  offer = f.combat.progression.offer();
  f.combat.choose(offer.token, 1, f.experience);
  close(f.combat.shieldAmount, f.player.maxHp / 5);
  f.combat.defend(5);
  offer = f.combat.progression.offer();
  f.combat.choose(offer.token, 1, f.experience);
  close(f.combat.shieldAmount, f.player.maxHp / 5, 'same supply refreshes rather than adding');
  f.experience.dropFromDefeated([{ x: 2250, y: 1500, hp: 0, experienceCategory: 'normal1' }, { x: 2301, y: 1500, hp: 0, experienceCategory: 'normal1' }]);
  offer = f.combat.progression.offer(); f.combat.choose(offer.token, 2, f.experience);
  assert.equal(f.experience.drops[0].attracted, true);
  assert.equal(f.experience.drops[1].attracted, false);
  assert(f.combat.progression.levels.every(rank => rank === 5));
  f.run(10.1); close(f.combat.shieldAmount, 0);
});

test('Overlapping same-name zones use the strongest damage once per tick, and projectiles stop at scenery', () => {
  const f = fixture('mechanic', [enemy(1, 1550, 1500)]);
  f.combat.mainTimer = 100;
  f.upgrade(10);
  f.combat.auxiliaryTimers.set(10, 0); f.step();
  f.upgrade(10, 5);
  f.combat.auxiliaryTimers.set(10, 0); f.step();
  f.run(0.52);
  close(f.list[0].maxHp - f.list[0].hp, 24 * 0.6);
  const projectile = fixture('signal', [enemy(1, 1800, 1500)]);
  projectile.combat.mainTimer = 100;
  // Retain the generic projectile collision regression even though character growth now uses chains and traps.
  projectile.combat.shots.push({x:1532,y:1500,vx:600,vy:0,age:0,hitIds:new Set(),
    config:{radius:5,lifetime:1,pierce:1,explosion:0},payload:{damage:24,direct:false,knockback:0,hits:0,ranks:projectile.combat.progression.levels}});
  assert.equal(projectile.combat.shots.length, 1);
  projectile.world.obstacles.push({ x: 1700, y: 1500, size: 40, shape: 'circle' });
  projectile.run(1);
  assert.equal(projectile.list[0].hp, projectile.list[0].maxHp);
  assert.equal(projectile.combat.shots.length, 0);
});

test('Enemy AI uses slow as a movement multiplier without changing its shared configuration', () => {
  const world = { width: 3000, height: 3000, obstacles: [] };
  const player = createCombatant({ id: 0, x: 1500, y: 1500, size: 48 }, 'player', 120, 24);
  const viewport = { x: 860, y: 1140, width: 1280, height: 720 };
  const distances = [];
  for (const multiplier of [1, 0.7, 0.4]) {
    let seed = 42;
    const ai = new EnemySystem(world, () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; });
    ai.initialize(player, viewport);
    const actor = ai.enemies[0]; ai.enemies.splice(1);
    actor.x = 1100; actor.y = 1500; actor.state = 'chase'; actor.movementMultiplier = multiplier;
    const before = { x: actor.x, y: actor.y };
    ai.update(1 / 60, player, viewport);
    distances.push(Math.hypot(actor.x - before.x, actor.y - before.y));
  }
  close(distances[1] / distances[0], 0.7);
  close(distances[2] / distances[0], 0.4);
});

test('Mechanic saw keeps close contact and a smaller reach, hits each body once, and turns more slowly without overlapping at max attack speed',()=>{
  for(const offset of [40,64,112]){
    const target=enemy(1,1500+offset,1500),f=fixture('mechanic',[target]);
    f.step();f.run(.58);
    close(target.maxHp-target.hp,24,'one complete rotation must hit near, orbit and reach-edge bodies once');
  }
  const near=enemy(1,1564,1500),far=enemy(2,1630,1500),f=fixture('mechanic',[near,far]);
  f.step();assert.equal(f.combat.swings.length,1);
  const start=f.combat.swings[0].angle;f.step(.1);
  assert(f.combat.swings[0].angle-start<Math.PI/2,'orbit must advance less than the previous quarter turn in 0.1s');
  f.run(.3);assert.equal(f.combat.swings.length,1,'a full turn must take longer than the old 0.4s');
  f.run(.18);close(far.hp,far.maxHp,'an active saw cannot reach a body 130px from the player');
  assert.equal(f.combat.swings.length,0,'the slower rotation still ends');
  const justOutside=enemy(2,1612.001,1500),edge=fixture('mechanic',[enemy(1,1564,1500),justOutside]);
  edge.step();edge.run(.58);close(justOutside.hp,justOutside.maxHp,'an active saw cannot hit just beyond its 112px range');
  const fast=fixture('mechanic',[enemy(1,1564,1500)]);fast.upgrade(2,5);
  fast.run(3,()=>assert(fast.combat.swings.length<=1,'max attack speed must not stack two orbiting saws'));
});
