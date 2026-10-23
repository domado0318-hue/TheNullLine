import type Phaser from 'phaser';
import { uiConfig } from '../config/ui';
import type { RailwayIcon } from './RailwayIcons';

export const railwayColor = (hex: string): number => Number.parseInt(hex.slice(1), 16);

/** Load once; canvas HUD and DOM menus share the same production artwork. */
export function preloadRailwayArt(scene: Phaser.Scene): void {
  const a = uiConfig.art;
  if (!scene.textures.exists(a.panelKey)) scene.load.atlas(a.panelKey, a.panel, a.panelAtlas);
  if (!scene.textures.exists(a.iconsKey)) scene.load.atlas(a.iconsKey, a.icons, a.iconsAtlas);
}

export function createRailwayPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, uiConfig.art.panelKey, 'panel')
    .setOrigin(0).setDisplaySize(width, height).setScrollFactor(0).setDepth(uiConfig.experience.depth);
}

export function setRailwayIcon(image: Phaser.GameObjects.Image, icon: RailwayIcon, size: number): void {
  const a = uiConfig.art, f = a.iconFrames[icon], longest = Math.max(f.w, f.h);
  image.setTexture(a.iconsKey, icon).setDisplaySize(size * f.w / longest, size * f.h / longest);
}
