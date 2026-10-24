import type Phaser from 'phaser';
import { effectArt as art, effectFrames, effectLine as lineArt, effectGround as groundArt } from '../config/effects';
import type { EffectFrame } from '../config/effects';

export function preloadEffects(scene: Phaser.Scene): void {
  if (!scene.textures.exists(art.key)) scene.load.atlas(art.key, art.path, art.atlas);
}

/** Simulation ages animate images, so selection and pause freeze VFX too. */
export class EffectSprites {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private readonly scene: Phaser.Scene;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly ground: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lines = scene.add.graphics().setDepth(art.depth);
    this.ground = scene.add.graphics().setDepth(art.groundDepth);
  }
  begin(): void { this.used = 0; this.lines.clear(); this.ground.clear(); }
  ring(x:number,y:number,radius:number,alpha:number,color=groundArt.metal,filled=false):void {
    if(radius<=0||alpha<=0)return;
    if(filled)this.ground.fillStyle(color,alpha*groundArt.fillAlpha).fillCircle(x,y,radius);
    this.ground.lineStyle(groundArt.haloWidth,color,alpha*groundArt.haloAlpha).strokeCircle(x,y,radius)
      .lineStyle(groundArt.lineWidth,color,alpha).strokeCircle(x,y,radius);
  }
  draw(frame: EffectFrame, x: number, y: number, width: number, height = width, angle = 0, alpha = 1, depth = art.depth): void {
    if (width <= 0 || height <= 0 || alpha <= 0) return;
    let image = this.images[this.used];
    if (!image) { image = this.scene.add.image(x, y, art.key, effectFrames[frame]); this.images.push(image); }
    this.used++;
    image.setTexture(art.key, effectFrames[frame]);
    const scale = Math.min(width / image.frame.realWidth, height / image.frame.realHeight);
    image.setPosition(x, y).setDisplaySize(image.frame.realWidth * scale, image.frame.realHeight * scale)
      .setRotation(angle).setAlpha(Math.min(1, alpha)).setDepth(depth).setVisible(true);
  }
  line(frame: EffectFrame, from: {x: number; y: number}, to: {x: number; y: number}, width: number, alpha = 1): void {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length <= 0 || width <= 0 || alpha <= 0) return;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const count = Math.max(1, Math.min(lineArt.maxSegments, Math.ceil(length / lineArt.segmentLength)));
    const thickness = Math.max(lineArt.minWidth, Math.min(lineArt.maxWidth, width * lineArt.widthRatio));
    const amplitude = frame === 'lightning' ? Math.min(lineArt.amplitude, width * lineArt.widthRatio, length / 8) : 0;
    const points = Array.from({length: count + 1}, (_, i) => {
      const offset = i === 0 || i === count ? 0 : (i % 2 ? 1 : -1) * amplitude;
      return {x: from.x + (to.x - from.x) * i / count - Math.sin(angle) * offset,
        y: from.y + (to.y - from.y) * i / count + Math.cos(angle) * offset};
    });
    const color = frame === 'lightning' ? lineArt.lightning : lineArt.beam;
    for (const [size, tint, opacity] of [[thickness * lineArt.haloScale, color, lineArt.haloAlpha],
      [thickness, color, 1], [thickness / 2, lineArt.core, lineArt.coreAlpha]]) {
      this.lines.lineStyle(size, tint, Math.min(1, alpha) * opacity).beginPath().moveTo(from.x, from.y);
      for (const p of points.slice(1)) this.lines.lineTo(p.x, p.y);
      this.lines.strokePath();
    }
    const tip = Math.min(lineArt.tipSize, width, length);
    this.draw(frame, to.x, to.y, tip, tip, angle, alpha);
  }
  segment(from:{x:number;y:number},to:{x:number;y:number},color:number,width:number,alpha:number):void {
    if(width<=0||alpha<=0)return;
    this.lines.lineStyle(width,color,Math.min(1,alpha)).lineBetween(from.x,from.y,to.x,to.y);
  }
  end(): void { while (this.images.length > this.used) this.images.pop()!.destroy(); }
}
