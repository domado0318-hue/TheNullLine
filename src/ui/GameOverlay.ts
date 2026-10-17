import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import type { WeaponKind } from '../config/weapons';

const cssColor = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

interface Overlay {
  panel: HTMLDivElement;
  document: Document;
  finish: (action: () => void) => void;
}

// Native buttons receive browser clicks directly, independently of the world camera.
function overlay(scene: Phaser.Scene, title: string, description: string): Overlay {
  const canvas = scene.game.canvas;
  const document = canvas.ownerDocument;
  const window = document.defaultView;
  const root = document.createElement('div');
  const panel = document.createElement('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', title);
  Object.assign(root.style, {
    position: 'fixed', zIndex: String(uiConfig.overlayDepth), overflow: 'hidden',
    pointerEvents: 'auto',
    backgroundColor: `rgba(${uiConfig.overlayColor >> 16 & 255}, ${uiConfig.overlayColor >> 8 & 255}, ${uiConfig.overlayColor & 255}, ${uiConfig.overlayAlpha})`,
  });
  Object.assign(panel.style, {
    position: 'absolute', left: '0', top: '0',
    width: `${scene.scale.width}px`, height: `${scene.scale.height}px`,
    transformOrigin: 'top left', fontFamily: uiConfig.fontFamily,
  });
  root.appendChild(panel);
  document.body.appendChild(root);

  const alignToCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width || scene.scale.width;
    const height = bounds.height || scene.scale.height;
    Object.assign(root.style, {
      left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${width}px`, height: `${height}px`,
    });
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
    finish(action) {
      if (closed) return;
      cleanup();
      action();
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    },
  };
  text(scene, ui, title, uiConfig.titleOffsetY, uiConfig.titleFontSize, uiConfig.textColor);
  text(scene, ui, description, uiConfig.descriptionOffsetY, uiConfig.bodyFontSize, uiConfig.mutedTextColor);
  return ui;
}

function text(scene: Phaser.Scene, ui: Overlay, value: string, offsetY: number, fontSize: number, color: string): void {
  const label = ui.document.createElement('div');
  label.textContent = value;
  Object.assign(label.style, {
    position: 'absolute', left: '50%', top: `${scene.scale.height / 2 + offsetY}px`,
    transform: 'translate(-50%, -50%)', width: '90%', textAlign: 'center',
    fontSize: `${fontSize}px`, color, pointerEvents: 'none',
  });
  ui.panel.appendChild(label);
}

function buttons(scene: Phaser.Scene, ui: Overlay, choices: { label: string; action: () => void }[]): void {
  const row = ui.document.createElement('div');
  Object.assign(row.style, {
    position: 'absolute', left: '50%', top: `${scene.scale.height / 2 + uiConfig.buttonOffsetY}px`,
    transform: 'translate(-50%, -50%)', display: 'flex',
    gap: `${uiConfig.buttonSpacing - uiConfig.buttonWidth}px`,
  });
  for (const choice of choices) {
    const button = ui.document.createElement('button');
    button.type = 'button';
    button.textContent = choice.label;
    Object.assign(button.style, {
      width: `${uiConfig.buttonWidth}px`, height: `${uiConfig.buttonHeight}px`, boxSizing: 'border-box',
      border: `1px solid ${cssColor(uiConfig.buttonStrokeColor)}`, cursor: 'pointer',
      fontFamily: uiConfig.fontFamily, fontSize: `${uiConfig.buttonFontSize}px`, color: uiConfig.textColor,
      backgroundColor: cssColor(uiConfig.buttonColor),
    });
    button.addEventListener('mouseenter', () => { button.style.backgroundColor = cssColor(uiConfig.buttonHoverColor); });
    button.addEventListener('mouseleave', () => { button.style.backgroundColor = cssColor(uiConfig.buttonColor); });
    button.addEventListener('click', () => ui.finish(choice.action));
    row.appendChild(button);
  }
  ui.panel.appendChild(row);
}

export function showWeaponSelection(scene: Phaser.Scene, onSelect: (kind: WeaponKind) => void): void {
  const ui = overlay(scene, '시작 무기를 선택하세요', '검은 주변을 회전하고, 탄환은 가장 가까운 적을 향해 발사됩니다.');
  buttons(scene, ui, [
    { label: '검', action: () => onSelect('sword') },
    { label: '탄환', action: () => onSelect('bullet') },
  ]);
  text(scene, ui, 'WASD 이동 · 자동 공격 중에도 이동 가능', uiConfig.hintOffsetY, uiConfig.bodyFontSize, uiConfig.mutedTextColor);
}

export function showDefeat(scene: Phaser.Scene): void {
  const ui = overlay(scene, '플레이어가 쓰러졌습니다', '다시 시작하면 무기를 새로 선택할 수 있습니다.');
  buttons(scene, ui, [{ label: '다시 시작', action: () => scene.scene.restart() }]);
}
