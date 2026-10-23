import type Phaser from 'phaser';
import { openingConfig as config } from '../config/opening';
import { uiConfig } from '../config/ui';
import { assertNonNegative } from '../config/validate';
import { createOpeningArtwork } from './OpeningArtwork';
import { gameAudio } from '../audio/GameAudio';

/** Reader-paced cinematic on the title scene, before creating the game world. */
export class OpeningCutscene {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly art: HTMLDivElement;
  private readonly quote: HTMLParagraphElement;
  private readonly copy: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly body: HTMLParagraphElement;
  private readonly progress: HTMLDivElement;
  private readonly previous: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private readonly document: Document;
  private readonly window: Window | null;
  private readonly scene: Phaser.Scene;
  private readonly onComplete: () => void;
  private page = 0;
  private readyAt = 0;
  private closed = false;

  constructor(scene: Phaser.Scene, onComplete: () => void) {
    assertNonNegative('opening.inputDelayMs', config.inputDelayMs);
    if (!config.pages.length) throw new Error('opening.pages: 이야기 장면이 필요합니다.');
    this.scene = scene;
    this.onComplete = onComplete;
    this.document = scene.game.canvas.ownerDocument;
    this.window = this.document.defaultView;
    const node = <T extends keyof HTMLElementTagNameMap>(tag: T, className: string, text = ''): HTMLElementTagNameMap[T] => {
      const element = this.document.createElement(tag);
      element.setAttribute('class', className);
      element.textContent = text;
      return element;
    };
    this.root = node('div', 'opening-story');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', '시작 이야기');
    this.panel = node('div', 'opening-panel');
    this.content = node('div', 'opening-content');
    this.content.addEventListener('click', this.onContentClick);
    this.art = node('div', 'opening-art');
    this.art.setAttribute('aria-hidden', 'true');
    this.quote = node('p', 'opening-quote', config.quote);
    this.copy = node('div', 'opening-copy');
    this.copy.setAttribute('aria-live', 'polite');
    this.title = node('h1', 'opening-title');
    this.body = node('p', 'opening-body');
    this.copy.appendChild(this.title);
    this.copy.appendChild(this.body);
    this.content.appendChild(this.art);
    this.content.appendChild(this.quote);
    this.content.appendChild(this.copy);
    this.panel.appendChild(this.content);
    const skip = node('button', 'opening-skip', '건너뛰기 · Esc');
    skip.type = 'button';
    skip.setAttribute('aria-label', '이야기 건너뛰기');
    skip.addEventListener('click', this.finish);
    this.panel.appendChild(skip);
    const footer = node('div', 'opening-footer');
    this.progress = node('div', 'opening-progress');
    this.progress.setAttribute('role', 'status');
    footer.appendChild(this.progress);
    const controls = node('div', 'opening-controls');
    this.previous = node('button', 'opening-previous', '이전');
    this.previous.type = 'button';
    this.previous.addEventListener('click', this.goPrevious);
    this.next = node('button', 'opening-next');
    this.next.type = 'button';
    this.next.addEventListener('click', this.goNext);
    controls.appendChild(this.previous);
    controls.appendChild(this.next);
    footer.appendChild(controls);
    this.panel.appendChild(footer);
    const style = node('style', '', openingStyle());
    this.root.appendChild(style);
    this.root.appendChild(this.panel);
    this.document.body.appendChild(this.root);
    this.align();
    scene.scale.on('resize', this.align);
    this.window?.addEventListener('resize', this.align);
    this.window?.addEventListener('scroll', this.align);
    this.window?.addEventListener('keydown', this.onKey, { capture: true });
    scene.events.once('shutdown', this.destroy);
    scene.events.once('destroy', this.destroy);
    this.render();
  }

  private readonly align = (): void => {
    const bounds = this.scene.game.canvas.getBoundingClientRect();
    const width = bounds.width || this.scene.scale.width;
    const height = bounds.height || this.scene.scale.height;
    Object.assign(this.root.style, {
      left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${width}px`, height: `${height}px`,
    });
    this.panel.style.transform = `scale(${width / config.width}, ${height / config.height})`;
  };

  private readonly goPrevious = (event: MouseEvent): void => { if (!(event.detail > 1)) this.turn(-1); };
  private readonly goNext = (event: MouseEvent): void => { if (!(event.detail > 1)) this.turn(1); };
  private readonly onContentClick = (event: MouseEvent): void => {
    if (event.detail > 1) return;
    this.turn(1);
  };

  private turn(direction: number): void {
    if (this.closed || this.document.hidden || performance.now() < this.readyAt) return;
    if (this.page + direction < 0) return;
    if (this.page + direction >= config.pages.length) { this.finish(); return; }
    this.page += direction;
    gameAudio(this.scene).play('ui_page');
    this.render();
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.closed || this.document.hidden) return;
    if (!['Escape', 'ArrowRight', 'ArrowLeft', 'Enter', ' '].includes(event.key)) return;
    if (event.repeat) { event.preventDefault(); return; }
    // Native buttons already activate on Enter/Space; don't advance twice via the window handler.
    const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
    if ((event.key === 'Enter' || event.key === ' ') && tag === 'button') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') this.finish();
    else this.turn(event.key === 'ArrowLeft' ? -1 : 1);
  };

  private readonly finish = (): void => {
    if (this.closed) return;
    gameAudio(this.scene).play('ui_confirm');
    this.destroy();
    this.onComplete();
    const canvas = this.scene.game.canvas;
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });
  };

  readonly destroy = (): void => {
    if (this.closed) return;
    this.closed = true;
    this.root.remove();
    this.scene.scale.off('resize', this.align);
    this.window?.removeEventListener('resize', this.align);
    this.window?.removeEventListener('scroll', this.align);
    this.window?.removeEventListener('keydown', this.onKey, { capture: true });
    this.scene.events.off('shutdown', this.destroy);
    this.scene.events.off('destroy', this.destroy);
  };

  private render(): void {
    const page = config.pages[this.page];
    const cover = page.id === 'quote';
    this.panel.setAttribute('data-page', page.id);
    this.quote.style.display = cover ? 'block' : 'none';
    this.copy.style.display = cover ? 'none' : 'block';
    this.art.style.display = cover ? 'none' : 'grid';
    this.title.textContent = page.title;
    this.body.textContent = '';
    for (const paragraph of page.text.split('\n\n')) {
      const line = this.document.createElement('span');
      line.setAttribute('class', 'opening-paragraph');
      line.textContent = paragraph.replace(/\n/g, ' ');
      this.body.appendChild(line);
    }
    if (!this.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.copy.getAnimations?.().forEach(animation => animation.cancel());
      this.copy.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: config.fadeMs });
    }
    this.art.textContent = '';
    if (page.illustration) {
      const image = createOpeningArtwork(this.document, page.illustration);
      if (image) this.art.appendChild(image);
    } else if (!cover) {
      const record = this.document.createElement('div');
      record.setAttribute('class', 'opening-record');
      const label = this.document.createElement('div');
      label.textContent = '시민 기록';
      const value = this.document.createElement('strong');
      value.textContent = 'NULL';
      record.appendChild(label);
      record.appendChild(value);
      this.art.appendChild(record);
    }
    this.progress.textContent = `${this.page + 1} / ${config.pages.length}`;
    this.previous.disabled = this.page === 0;
    this.next.textContent = this.page === config.pages.length - 1 ? '캐릭터 선택' : '다음';
    this.readyAt = performance.now() + config.inputDelayMs;
  }
}

function openingStyle(): string {
  const c = config.colors;
  return `
    .opening-story { position:fixed; z-index:${config.depth}; overflow:hidden; color:${c.paper}; background:${c.black}; }
    .opening-story * { box-sizing:border-box; }
    .opening-panel { position:absolute; width:${config.width}px; height:${config.height}px; transform-origin:top left;
      font-family:${uiConfig.fontFamily}; background:radial-gradient(ellipse at 30% 45%,${c.ink},${c.black} 75%); }
    .opening-content { position:absolute; inset:0; overflow:hidden; cursor:pointer; }
    .opening-art { position:absolute; inset:0; place-items:center; }
    .opening-illustration { display:block; width:100%; height:100%; object-fit:cover;
      animation:opening-reveal ${config.fadeMs}ms ease-out both,opening-drift ${config.driftMs}ms ease-out forwards; }
    .opening-content::after { content:''; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(180deg,${c.black}99 0%,transparent 22%,transparent 40%,${c.black}bb 64%,${c.black}f5 84%,${c.black} 100%); }
    .opening-copy { position:absolute; z-index:1; left:50%; bottom:${config.captionBottom}px;
      width:${config.captionWidth}px; max-width:calc(100% - ${config.margin * 2}px); transform:translateX(-50%); text-align:center;
      text-shadow:0 2px 8px ${c.black}; }
    .opening-title { margin:0 0 20px; color:${c.amber}; font-size:${config.titleSize}px; line-height:1.4; font-weight:400; word-break:keep-all; }
    .opening-title::before { content:''; display:block; width:32px; height:2px; background:${c.amber}; margin:0 auto 16px; }
    .opening-body { margin:0; font:400 ${config.bodySize}px/1.6 ${uiConfig.fontFamily}; word-break:keep-all; }
    .opening-paragraph { display:block; }
    .opening-paragraph + .opening-paragraph { margin-top:${config.captionGap}px; }
    .opening-quote { position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); margin:0;
      z-index:1; white-space:pre-line; text-align:center; font-size:${config.quoteSize}px; line-height:2; letter-spacing:1px;
      animation:opening-reveal ${config.fadeMs}ms ease-out both; }
    .opening-quote::before { content:''; display:block; width:42px; height:1px; margin:0 auto 32px; background:${c.amber}; }
    .opening-quote::after { content:'THE NULL LINE'; display:block; margin-top:36px; font:${config.labelSize}px ${uiConfig.fontFamily}; letter-spacing:7px; color:${c.muted}; }
    .opening-record { width:80%; padding:36px 0; text-align:center; border-top:1px solid ${c.edge}; border-bottom:1px solid ${c.edge}; }
    .opening-record div { color:${c.muted}; font-size:${config.labelSize}px; letter-spacing:5px; }
    .opening-record strong { display:block; margin-top:28px; font:400 100px ${uiConfig.fontFamily}; letter-spacing:12px; color:${c.paper}; }
    .opening-footer { position:absolute; left:${config.margin}px; right:${config.margin}px; bottom:28px;
      display:flex; align-items:center; justify-content:space-between; }
    .opening-progress { color:${c.muted}; font-size:${config.labelSize}px; letter-spacing:3px; }
    .opening-controls { display:flex; gap:${config.buttonGap}px; }
    .opening-story button { cursor:pointer; height:${config.buttonHeight}px; width:${config.buttonWidth}px;
      font:${config.buttonSize}px ${uiConfig.fontFamily}; border:1px solid transparent; border-radius:0; background:transparent; color:${c.muted}; }
    .opening-story .opening-next { border-bottom-color:${c.amber}; color:${c.paper}; }
    .opening-story button:disabled { opacity:.3; cursor:default; }
    .opening-story button:hover:not(:disabled),.opening-story button:focus-visible { outline:2px solid ${c.amber}; outline-offset:4px; }
    .opening-story .opening-skip { position:absolute; right:${config.margin}px; top:32px; width:${config.skipWidth}px;
      color:${c.paper}; background:${c.black}88; border-color:transparent; }
    @keyframes opening-reveal { from { opacity:0; } to { opacity:1; } }
    @keyframes opening-drift { from { transform:scale(1); } to { transform:scale(${config.driftScale}); } }
    @media (prefers-reduced-motion:reduce) { .opening-illustration,.opening-quote { animation:none; } }
  `;
}
