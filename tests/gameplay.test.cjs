const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('node:module').registerHooks({ resolve(s,c,n) { return n(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c); } });
const load = name => require(path.resolve(__dirname, '..', name));
const {createObstacleLayout} = load('src/world/createObstacleLayout.ts');
const {canOccupy,distance,lineIsClear,moveBody} = load('src/world/geometry.ts');
const {playerConfig} = load('src/config/player.ts');
const {obstacleConfig} = load('src/config/obstacles.ts');
const {worldConfig} = load('src/config/world.ts');
function seededRandom(seed) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
const player = (x=1500,y=1500) => ({id:0,x,y,size:playerConfig.size});
const emptyWorld = () => ({width:3000,height:3000,obstacles:[]});
test('configs preserve existing visuals, speed, obstacle ratios and distinct enemy colors', () => {
  assert.equal(playerConfig.size, 48);
  assert.equal(playerConfig.movementSpeed, 300);
  assert.equal(worldConfig.width, 3000);
  assert.equal(worldConfig.height, 3000);
  assert.equal(worldConfig.wallThickness, 16);
  const colors = [playerConfig.color, worldConfig.gridColor, worldConfig.wallColor, obstacleConfig.rectangleColor, obstacleConfig.circleColor];
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
