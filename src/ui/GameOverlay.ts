import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import type { WeaponKind } from '../config/weapons';
import { characterIds, characters, characterRules } from '../config/characters';
import type { CharacterId } from '../config/characters';
import { skills, skillEffect } from '../config/skills';
import type { CharacterCombat } from '../combat/CharacterCombat';
import type { SkillOffer } from '../experience/SkillProgression';
import { playerArt } from '../config/playerArt';
import { railwayStyle } from './RailwayStyle';
import { createRailwayIcon, skillIcon } from './RailwayIcons';
import type { RailwayIcon } from './RailwayIcons';
import { gameAudio } from '../audio/GameAudio';

interface Overlay {
  panel: HTMLDivElement;
  document: Document;
  finish: (action: () => void) => void;
  feedback: () => void;
}

/** UI distances use metres; simulation and tuning continue to use pixels. */
export function formatPlayerText(value: string): string {
  if (!Number.isFinite(uiConfig.distancePixelsPerMeter) || uiConfig.distancePixelsPerMeter <= 0)
    throw new Error('ui.distancePixelsPerMeter: 양의 유한수가 필요합니다.');
  return value.replace(/(\d+(?:\.\d+)?)px/g, (_match, pixels: string) =>
    `${Number((Number(pixels) / uiConfig.distancePixelsPerMeter).toFixed(2))}m`);
}

function element(ui: Overlay, tag: string, className: string, value = ''): HTMLElement {
  const node = ui.document.createElement(tag);
  node.setAttribute('class', className);
  node.textContent = formatPlayerText(value);
  return node;
}

// Native buttons stay aligned with the canvas, independently of the world camera.
function overlay(scene: Phaser.Scene, title: string, description: string, mode: 'title' | 'character' | 'skill' | 'notice' | 'danger' = 'notice'): Overlay {
  const canvas = scene.game.canvas;
  const document = canvas.ownerDocument;
  const window = document.defaultView;
  const root = document.createElement('div');
  const panel = document.createElement('div');
  root.setAttribute('class', 'rail-ui');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', title);
  Object.assign(root.style, {
    position: 'fixed', zIndex: String(uiConfig.overlayDepth), overflow: 'hidden', pointerEvents: 'auto',
    backgroundColor: `rgba(${uiConfig.overlayColor >> 16 & 255}, ${uiConfig.overlayColor >> 8 & 255}, ${uiConfig.overlayColor & 255}, ${uiConfig.overlayAlpha})`,
  });
  Object.assign(panel.style, {
    position: 'absolute', left: '0', top: '0',
    width: `${scene.scale.width}px`, height: `${scene.scale.height}px`,
    transformOrigin: 'top left', fontFamily: uiConfig.fontFamily,
  });
  root.appendChild(panel);
  const style = document.createElement('style');
  style.textContent = railwayStyle();
  root.appendChild(style);
  document.body.appendChild(root);
  const alignToCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width || scene.scale.width;
    const height = bounds.height || scene.scale.height;
    Object.assign(root.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${width}px`, height: `${height}px` });
    panel.style.transform = `scale(${width / scene.scale.width}, ${height / scene.scale.height})`;
  };
  alignToCanvas();
  scene.scale.on('resize', alignToCanvas);
  window?.addEventListener('resize', alignToCanvas);
  window?.addEventListener('scroll', alignToCanvas);
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    root.remove();
    scene.scale.off('resize', alignToCanvas);
    window?.removeEventListener('resize', alignToCanvas);
    window?.removeEventListener('scroll', alignToCanvas);
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
  };
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  const ui: Overlay = {
    panel, document,
    feedback: () => { gameAudio(scene).play('ui_focus'); },
    finish(action) {
      if (closed) return;
      gameAudio(scene).play('ui_confirm');
      cleanup();
      action();
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    },
  };
  if (mode !== 'title') {
    const layout = mode === 'character' ? uiConfig.characterCards : uiConfig.cards;
    const isCards = mode === 'character' || mode === 'skill';
    const heading = element(ui, 'div', `rail-enamel rail-heading${mode === 'danger' ? ' rail-danger' : ''}`);
    heading.appendChild(element(ui, 'span', 'rail-heading-label', title));
    heading.style.top = `${scene.scale.height / 2 + (isCards ? layout.titleOffset : uiConfig.titleOffsetY)}px`;
    panel.appendChild(heading);
    if (description) text(scene, ui, description, isCards ? layout.descriptionOffset : uiConfig.descriptionOffsetY, uiConfig.bodyFontSize);
  }
  return ui;
}

function text(scene: Phaser.Scene, ui: Overlay, value: string, offsetY: number, fontSize: number): void {
  const label = element(ui, 'div', 'rail-notice', value);
  Object.assign(label.style, {
    position: 'absolute', left: '50%', top: `${scene.scale.height / 2 + offsetY}px`,
    transform: 'translate(-50%, -50%)', width: '90%', textAlign: 'center',
    fontSize: `${fontSize}px`, color: uiConfig.mutedTextColor,
  });
  ui.panel.appendChild(label);
}

function hover(button: HTMLButtonElement, card = false, feedback?: () => void): void {
  const c = uiConfig.railway;
  button.style.backgroundColor = card ? c.teal : 'transparent';
  button.style.filter = '';
  button.addEventListener('mouseenter', () => {
    feedback?.();
    if (card) button.style.backgroundColor = c.tealLight;
    else button.style.filter = 'brightness(1.12)';
  });
  button.addEventListener('mouseleave', () => {
    if (card) button.style.backgroundColor = c.teal;
    else button.style.filter = '';
  });
  button.addEventListener('focus', () => feedback?.());
}

function buttons(scene: Phaser.Scene, ui: Overlay, choices: { label: string; action: () => void }[]): void {
  const row = element(ui, 'div', '');
  Object.assign(row.style, {
    position: 'absolute', left: '50%', top: `${scene.scale.height / 2 + uiConfig.buttonOffsetY}px`,
    transform: 'translate(-50%, -50%)', display: 'flex', gap: `${uiConfig.buttonSpacing - uiConfig.buttonWidth}px`,
  });
  for (const choice of choices) {
    const button = element(ui, 'button', `rail-enamel rail-action${choice.label === '다시 시작' ? ' rail-return' : ''}`, choice.label) as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-label', choice.label);
    Object.assign(button.style, { width: `${uiConfig.buttonWidth}px`, height: `${uiConfig.buttonHeight}px`, fontSize: `${uiConfig.buttonFontSize}px` });
    button.appendChild(createRailwayIcon(ui.document, 'arrow'));
    hover(button, false, ui.feedback);
    button.addEventListener('click', () => ui.finish(choice.action));
    row.appendChild(button);
  }
  ui.panel.appendChild(row);
}

export function showTitleScreen(scene: Phaser.Scene, onStart: () => void): void {
  const ui = overlay(scene, 'THE NULL LINE', '', 'title');
  const config = uiConfig.titleScreen;
  const image = ui.document.createElement('img');
  image.setAttribute('src', config.image);
  image.setAttribute('alt', '');
  image.setAttribute('draggable', 'false');
  Object.assign(image.style, { position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' });
  ui.panel.appendChild(image);
  const button = element(ui, 'button', 'rail-title-button') as HTMLButtonElement;
  button.type = 'button';
  button.setAttribute('aria-label', '게임 시작');
  button.appendChild(element(ui, 'span', 'rail-title-label', '게임 시작'));
  const route = ui.document.createElement('img');
  route.setAttribute('class', 'rail-title-route');
  route.setAttribute('src', config.routeImage);
  route.setAttribute('alt', '');
  route.setAttribute('aria-hidden', 'true');
  route.setAttribute('draggable', 'false');
  button.appendChild(route);
  Object.assign(button.style, {
    position: 'absolute', left: `${config.buttonX}px`, top: `${config.buttonY}px`,
    transform: 'translate(-50%, -50%)', width: `${config.buttonWidth}px`, height: `${config.buttonHeight}px`,
    fontFamily: uiConfig.fontFamily, fontSize: `${config.fontSize}px`, letterSpacing: `${config.letterSpacing}px`,
  });
  hover(button, false, ui.feedback);
  button.addEventListener('click', () => ui.finish(onStart));
  ui.panel.appendChild(button);
}

export function showWeaponSelection(scene: Phaser.Scene, onSelect: (kind: WeaponKind) => void): void {
  const ui = overlay(scene, '시작 무기 선택', '검은 주변을 회전하고, 탄환은 가장 가까운 적을 향해 발사됩니다.');
  buttons(scene, ui, [
    { label: '검', action: () => onSelect('sword') },
    { label: '탄환', action: () => onSelect('bullet') },
  ]);
}

export function showDefeat(scene: Phaser.Scene): void {
  const ui = overlay(scene, '플레이어가 쓰러졌습니다', '', 'danger');
  buttons(scene, ui, [{ label: '다시 시작', action: () => scene.scene.restart() }]);
}

interface Card {
  name: string;
  icon: RailwayIcon;
  character?: CharacterId;
  rank?: string;
  description: string;
  effect: string;
  action: () => void;
}

function cards(ui: Overlay, choices: Card[]): void {
  const config = uiConfig.cards;
  const row = element(ui, 'div', '');
  Object.assign(row.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: `${config.gap}px` });
  if (choices.some(choice => choice.character)) row.style.top = `calc(50% + ${uiConfig.characterCards.centerOffsetY}px)`;
  const readyAt = performance.now() + config.inputDelayMs;
  for (const choice of choices) {
    const button = element(ui, 'button', 'rail-card') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-label', formatPlayerText([
      choice.name, choice.character ? characters[choice.character].weapon : choice.rank,
      choice.character ? characters[choice.character].trait : '', choice.description, choice.effect,
    ].filter(Boolean).join(' · ')));
    Object.assign(button.style, {
      width: `${config.width}px`, height: `${choice.character ? uiConfig.characterCards.height : config.height}px`,
      fontFamily: uiConfig.fontFamily, fontSize: `${config.fontSize}px`,
    });
    button.appendChild(element(ui, 'span', 'rail-card-title rail-enamel', choice.name));
    const icon = createRailwayIcon(ui.document, choice.icon);
    if (choice.character) {
      const portrait = ui.document.createElement('img');
      portrait.setAttribute('class', 'rail-portrait');
      portrait.setAttribute('src', playerArt[choice.character].portrait);
      portrait.setAttribute('alt', characters[choice.character].name);
      portrait.setAttribute('draggable', 'false');
      Object.assign(portrait.style, { height: `${uiConfig.characterCards.portraitHeight}px`, objectFit: 'contain', pointerEvents: 'none' });
      button.appendChild(portrait);
    } else {
      icon.setAttribute('class', 'rail-icon rail-skill-icon');
      button.appendChild(icon);
    }
    const content = element(ui, 'span', 'rail-card-content');
    if (choice.character) {
      const weapon = element(ui, 'span', 'rail-weapon');
      weapon.appendChild(icon);
      weapon.appendChild(element(ui, 'span', '', characters[choice.character].weapon));
      content.appendChild(weapon);
      content.appendChild(element(ui, 'span', 'rail-trait', characters[choice.character].trait));
      const stats = element(ui, 'span', 'rail-stats');
      const definition = characters[choice.character];
      for (const [symbol, value, label] of [['heart', definition.maxHp, '체력'], ['boot', definition.speed, '이동 속도']] as const) {
        const stat = element(ui, 'span', 'rail-stat');
        stat.setAttribute('aria-label', `${label} ${value}`);
        stat.setAttribute('title', `${label} ${value}`);
        stat.appendChild(createRailwayIcon(ui.document, symbol));
        stat.appendChild(element(ui, 'span', '', String(value)));
        stats.appendChild(stat);
      }
      content.appendChild(stats);
    } else {
      if (choice.rank) content.appendChild(element(ui, 'span', 'rail-rank', choice.rank));
      if (choice.description) content.appendChild(element(ui, 'span', 'rail-description', choice.description));
      content.appendChild(element(ui, 'span', 'rail-effect', choice.effect));
    }
    button.appendChild(content);
    hover(button, true, ui.feedback);
    button.addEventListener('keydown', event => { if (event.repeat) event.preventDefault(); });
    button.addEventListener('click', event => {
      if (performance.now() < readyAt || event.detail > 1) return;
      ui.finish(choice.action);
    });
    row.appendChild(button);
  }
  ui.panel.appendChild(row);
}

export function showCharacterSelection(scene: Phaser.Scene, onSelect: (id: CharacterId) => void): void {
  const ui = overlay(scene, '캐릭터 선택', '', 'character');
  cards(ui, characterIds.map(id => ({
    name: characters[id].name, icon: skillIcon(id, 1), character: id, description: characters[id].description,
    effect: `HP ${characters[id].maxHp} · 이동 ${characters[id].speed}`, action: () => onSelect(id),
  })));
}

export function showVictory(scene: Phaser.Scene): void {
  const ui = overlay(scene, '말소 경계 격파', '15스테이지 전투를 모두 완료했습니다.');
  buttons(scene, ui, [{ label: '다시 시작', action: () => scene.scene.restart() }]);
}

export function showSkillSelection(scene: Phaser.Scene, character: CharacterCombat, offer: SkillOffer, onSelect: (index: number) => void): void {
  const progression = character.progression;
  const ui = overlay(scene, '레벨업', '', 'skill');
  const number = (value: number) => String(Number(value.toFixed(2)));
  const stats = element(ui, 'div', 'rail-critical-stats',
    `현재 치명타 확률 ${number(character.criticalChance * 100)}% · 피해 배율 ${number(character.criticalMultiplier)}배`);
  Object.assign(stats.style, {
    position: 'absolute', left: '50%', top: `${scene.scale.height / 2 + uiConfig.cards.criticalStatsOffset}px`,
    transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', pointerEvents: 'none',
    padding: `${uiConfig.cards.padding}px`, borderRadius: `${uiConfig.railway.radius}px`,
    fontSize: `${uiConfig.cards.criticalStatsFontSize}px`, color: uiConfig.railway.enamel,
    backgroundColor: uiConfig.railway.teal, border: `1px solid ${uiConfig.railway.edge}`,
  });
  ui.panel.appendChild(stats);
  const supplies: Record<string, { name: string; icon: RailwayIcon; description: string; effect: string }> = {
    heal: { name: '응급 수리', icon: 'repair', description: `현재 HP ${Math.ceil(character.player.hp)} / ${character.player.maxHp}`, effect: `최대 HP의 ${characterRules.supplyHeal * 100}% 회복` },
    shield: { name: '임시 보호막', icon: 'shield', description: `${characterRules.supplyShieldSeconds}초 유지 · 중첩 없이 갱신`, effect: `최대 HP의 ${characterRules.supplyShield * 100}% 보호막` },
    pickup: { name: '주변 회수', icon: 'magnet', description: '', effect: `${characterRules.supplyPickupRadius}px 안의 경험치를 끌어옵니다.` },
  };
  cards(ui, offer.choices.map((choice, index) => {
    if (choice.kind === 'supply') return { ...supplies[choice.id], action: () => onSelect(index) };
    const definition = skills[character.character][choice.id - 1];
    const level = progression.level(choice.id);
    const rank = level ? `Lv.${level} → Lv.${level + 1}${level + 1 === characterRules.maxSkillLevel ? ' MAX' : ''}` : '';
    return {
      name: definition.name, icon: skillIcon(character.character, choice.id), rank, description: definition.description,
      effect: `${level ? `현재: ${skillEffect(definition, level)}\n다음: ` : ''}${skillEffect(definition, level + 1)}`,
      action: () => onSelect(index),
    };
  }));
}
