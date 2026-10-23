import type Phaser from 'phaser';
import { openingConfig } from '../config/opening';
import type { OpeningIllustration } from '../config/opening';

export function preloadOpeningArt(scene: Phaser.Scene): void {
  for (const [shot, path] of Object.entries(openingConfig.illustrations)) {
    const key = `opening-${shot}-v5`;
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  }
}

/** Art has no baked-in text; the readable story remains live text above it. */
export function createOpeningArtwork(document: Document, shot: OpeningIllustration): HTMLImageElement | undefined {
  if (!(shot in openingConfig.illustrations)) return;
  const path = openingConfig.illustrations[shot as keyof typeof openingConfig.illustrations];
  const image = document.createElement('img');
  image.setAttribute('class', 'opening-illustration');
  image.setAttribute('src', path);
  image.setAttribute('alt', '');
  image.setAttribute('draggable', 'false');
  return image;
}
