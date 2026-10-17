const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { registerHooks } = require('node:module');

registerHooks({ resolve(specifier, context, next) { return next(context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !path.extname(specifier) ? specifier + '.ts' : specifier, context); } });
const { showWeaponSelection, showDefeat } = require('../src/ui/GameOverlay.ts');

// DOM lifecycle/activation tests use native EventTarget dispatch. No Phaser hit-test mocks.
class Element extends EventTarget {
  constructor(tagName, document) {
    super();
    Object.assign(this, { tagName, ownerDocument: document, style: {}, children: [], attributes: {}, parentNode: null });
  }
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
  const initialColor = button.style.backgroundColor;
  button.dispatchEvent(new Event('mouseenter'));
  assert.notEqual(button.style.backgroundColor, initialColor);
  button.dispatchEvent(new Event('mouseleave'));
  assert.equal(button.style.backgroundColor, initialColor);
  ui.scene.events.emit('destroy');
  assert.equal(ui.document.body.children.length, 0);
});
