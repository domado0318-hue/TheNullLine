const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Parent-enforced timeout is necessary: a synchronous infinite loop blocks node:test timeouts.
function isolated(script) {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    require('node:module').registerHooks({resolve(s,c,n){return n(s.startsWith('.')&&!path.extname(s)?s+'.ts':s,c)}});
    const load = name => require('./src/' + name + '.ts');
    ${script}
  `], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 3000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('Invalid loop steps are rejected before enemy, weapon, movement, world or simulation loops run', () => {
  isolated(`
    const {enemyConfig} = load('config/enemies');
    const {navigationConfig} = load('config/navigation');
    const {playerSwordConfig} = load('config/weapons');
    const {worldConfig} = load('config/world');
    const {gameConfig} = load('config/game');
    const {EnemySystem} = load('enemies/EnemySystem');
    const {CombatSystem} = load('combat/CombatSystem');
    const {createCombatant} = load('combat/types');
    const {moveBody} = load('world/geometry');
    const {NavigationGrid} = load('enemies/NavigationGrid');
    const {createWorldView} = load('world/createWorldView');
    const world = {width:3000,height:3000,obstacles:[]};
    const player = createCombatant({id:0,x:1500,y:1500,size:48},'player',120,24);
    for(const bad of [0,-1,NaN,Infinity]) {
      let previous = enemyConfig.spawn.intervalSeconds;
      enemyConfig.spawn.intervalSeconds = bad;
      assert.throws(()=>{const enemy=new EnemySystem(world);enemy.update(1/60,player,{x:0,y:0,width:1280,height:720})}, /spawn.intervalSeconds/);
      enemyConfig.spawn.intervalSeconds = previous;
      previous = playerSwordConfig.maximumHitAngleStep;
      playerSwordConfig.maximumHitAngleStep = bad;
      assert.throws(()=>new CombatSystem('sword').update(1/60,player,[],world,{x:860,y:1140,width:1280,height:720}), /maximumHitAngleStep/);
      playerSwordConfig.maximumHitAngleStep = previous;
      previous = navigationConfig.collisionStep;
      navigationConfig.collisionStep = bad;
      assert.throws(()=>moveBody(player,10,0,world,[]), /collisionStep/);
      navigationConfig.collisionStep = previous;
      previous = navigationConfig.cellSize;
      navigationConfig.cellSize = bad;
      assert.throws(()=>new NavigationGrid(world,32), /cellSize/);
      navigationConfig.cellSize = previous;
      previous = worldConfig.gridSpacing;
      worldConfig.gridSpacing = bad;
      const graphics = {setDepth(){return this},lineStyle(){return this},lineBetween(){return this}};
      assert.throws(()=>createWorldView({add:{graphics:()=>graphics}},world), /gridSpacing/);
      worldConfig.gridSpacing = previous;
      previous = gameConfig.simulationStepSeconds;
      gameConfig.simulationStepSeconds = bad;
      assert.throws(()=>load('scenes/advanceSimulation').advanceSimulation(16,()=>{}), /simulationStepSeconds/);
      gameConfig.simulationStepSeconds = previous;
    }
  `);
});

test('Simulation splitting preserves elapsed time and supports stopping immediately on defeat', () => {
  isolated(`
    const {advanceSimulation} = load('scenes/advanceSimulation');
    let total=0, count=0;
    advanceSimulation(1000, step=>{assert(step>0&&step<=1/60);total+=step;count++});
    assert(Math.abs(total-1)<1e-9);assert(count>=60);
    let stopped=0;advanceSimulation(1000,()=>{stopped++;return false});assert.equal(stopped,1);
    for(const bad of [-1,NaN,Infinity])assert.throws(()=>advanceSimulation(bad,()=>{}), /delta/);
  `);
});
