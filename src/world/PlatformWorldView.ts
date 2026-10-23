import type Phaser from 'phaser';
import { platformConfig as config } from '../config/platform';
import { journeyConfig as art, journeyProps, journeyPropVariants, journeyStage, journeyStages } from '../config/journey';
import type { JourneyStage } from '../config/journey';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import type { PlatformWorld } from './PlatformWorld';
import type { Point, Viewport } from './geometry';

export function validateJourneyArt(): void {
  for (const [chapter, variants] of Object.entries(journeyPropVariants)) {
    if (variants.length !== config.companionOffsets.length + 1) throw new Error(`journey.props.${chapter}: 배치 수와 원화 수가 다릅니다.`);
    for (const prop of variants) {
    assertPositive(`journey.props.${chapter}.width`, prop.width);
    assertPositive(`journey.props.${chapter}.originY`, prop.originY);
    if (prop.originY > 1) throw new Error(`journey.props.${chapter}.originY: 1 이하여야 합니다.`);
    }
  }
  assertPositive('journey.borderDetailScale', art.borderDetailScale);
  assertPositive('journey.floorDetailScale', art.floorDetailScale);
  assertInteger('journey.floorInset', art.floorInset);
  for (const [index, theme] of journeyStages.entries()) {
    if (theme.floorScale !== undefined) assertPositive(`journey.${index}.floorScale`, theme.floorScale);
    for (const key of ['x', 'y', 'width', 'height'] as const) assertInteger(`journey.${index}.floor.${key}`, theme.floor[key], 1);
    const f = theme.floor;
    if (f.width <= art.floorInset * 2 || f.height <= art.floorInset * 2) throw new Error(`journey.${index}.floor: 반복 바닥 여백이 너무 큽니다.`);
    if (f.x + f.width >= art.sourceWidth || f.y + f.height >= art.sourceHeight) throw new Error(`journey.${index}.floor: 원화 안쪽 바닥 영역이 필요합니다.`);
    if (theme.repeatFloor) {
      const r = theme.repeatFloor;
      for (const key of ['x', 'y', 'width', 'height'] as const) assertInteger(`journey.${index}.repeatFloor.${key}`, r[key], 1);
      if (r.x < f.x || r.y < f.y || r.x + r.width > f.x + f.width || r.y + r.height > f.y + f.height) throw new Error(`journey.${index}.repeatFloor: 바닥 안쪽 영역이 필요합니다.`);
    }
    if (theme.centerpiece) {
      for (const key of ['width', 'height', 'alpha'] as const) assertPositive(`journey.${index}.centerpiece.${key}`, theme.centerpiece[key]);
      if (theme.centerpiece.alpha > 1) throw new Error(`journey.${index}.centerpiece.alpha: 1 이하여야 합니다.`);
    }
  }
}

export function preloadPlatform(scene: Phaser.Scene): void {
  validateJourneyArt();
  const images = [...journeyStages.map(theme => [theme.key, art.path + theme.file]),
    ...journeyStages.flatMap(theme => theme.centerpiece ? [[theme.centerpiece.key, art.path + theme.centerpiece.file]] : []),
    ...Object.values(journeyPropVariants).flat().map(prop => [prop.key, prop.image])];
  for (const [key, image] of images) if (!scene.textures.exists(key)) scene.load.image(key, image);
}

/** Finite floor plus small-scale perimeter strips. Enlarging the arena does not enlarge rails or doors. */
export class PlatformWorldView {
  readonly floor: Phaser.GameObjects.TileSprite;
  private readonly edges: Phaser.GameObjects.TileSprite[];
  private readonly corners: Phaser.GameObjects.Image[];
  private readonly centerpiece: Phaser.GameObjects.Image;
  private readonly props: { x: number; y: number; variant: number; width: number; height: number; originY: number; view: Phaser.GameObjects.Image }[];
  private readonly scene: Phaser.Scene;
  private readonly width: number;
  private readonly height: number;
  private stage = -1;

  constructor(scene: Phaser.Scene, world: PlatformWorld) {
    this.scene = scene;
    this.width = world.width; this.height = world.height;
    validateJourneyArt();
    assertPositive('platform.occlusionAlpha', config.occlusionAlpha);
    assertNonNegative('platform.occlusionPadding', config.occlusionPadding);
    if (config.occlusionAlpha > 1) throw new Error('platform.occlusionAlpha: 1 이하여야 합니다.');
    const first = journeyStage(0);
    this.prepareFrames(first);
    this.floor = scene.add.tileSprite(0, 0, world.width, world.height, first.key, 'floor').setOrigin(0, 0)
      .setTileScale(art.floorDetailScale).setDepth(config.groundDepth);
    const { width: w, height: h } = world;
    const { leftBorder: l, rightBorder: r, topBorder: t, bottomBorder: b } = art;
    this.edges = [
      [0, -t, w, t], [0, h, w, b], [-l, 0, l, h], [w, 0, r, h],
    ].map(([x, y, width, height], index) => scene.add.tileSprite(x, y, width, height, first.key, `edge-${index}`)
      .setOrigin(0, 0).setDepth(config.groundDepth));
    this.corners = [[-l, -t, l, t], [w, -t, r, t], [-l, h, l, b], [w, h, r, b]]
      .map(([x, y, width, height], index) => scene.add.image(x, y, first.key, `corner-${index}`)
        .setOrigin(0, 0).setDisplaySize(width, height).setDepth(config.groundDepth));
    this.props = world.obstacles.map(obstacle => ({ x: obstacle.x, y: obstacle.y, variant: obstacle.variant, width: 0, height: 0, originY: 0,
      view: scene.add.image(obstacle.x, obstacle.y, journeyProps.boarding.key) }));
    this.centerpiece = scene.add.image(world.width / 2, world.height / 2, first.key, 'floor')
      .setDepth(config.groundDepth + 1).setVisible(false);
    this.setStage(0);
  }

  private prepareFrames(theme: JourneyStage): void {
    const texture = this.scene.textures.get(theme.key);
    if (texture.has('floor')) return;
    const source = texture.getSourceImage() as HTMLImageElement;
    if (source.width !== art.sourceWidth || source.height !== art.sourceHeight) throw new Error(`journey.${theme.key}: 원화 크기가 설정과 다릅니다.`);
    const { x, y, width: w, height: h } = theme.floor;
    const right = source.width - x - w, bottom = source.height - y - h;
    const inset = art.floorInset;
    const repeat = theme.repeatFloor ?? { x: x + inset, y: y + inset, width: w - inset * 2, height: h - inset * 2 };
    texture.add('floor', 0, repeat.x, repeat.y, repeat.width, repeat.height);
    [[x, 0, w, y], [x, y + h, w, bottom], [0, y, x, h], [x + w, y, right, h]]
      .forEach(([fx, fy, fw, fh], index) => texture.add(`edge-${index}`, 0, fx, fy, fw, fh));
    [[0, 0, x, y], [x + w, 0, right, y], [0, y + h, x, bottom], [x + w, y + h, right, bottom]]
      .forEach(([fx, fy, fw, fh], index) => texture.add(`corner-${index}`, 0, fx, fy, fw, fh));
  }

  private setStage(stage: number): void {
    if (stage === this.stage) return;
    const theme = journeyStage(stage);
    this.prepareFrames(theme);
    this.floor.setTexture(theme.key, 'floor').setSize(this.width, this.height).setTileScale(theme.floorScale ?? art.floorDetailScale);
    this.centerpiece.setVisible(!!theme.centerpiece);
    if (theme.centerpiece) this.centerpiece.setTexture(theme.centerpiece.key)
      .setDisplaySize(theme.centerpiece.width, theme.centerpiece.height).setAlpha(theme.centerpiece.alpha);
    const f = theme.floor;
    const scales = [[art.borderDetailScale, art.topBorder / f.y],
      [art.borderDetailScale, art.bottomBorder / (art.sourceHeight - f.y - f.height)],
      [art.leftBorder / f.x, art.borderDetailScale],
      [art.rightBorder / (art.sourceWidth - f.x - f.width), art.borderDetailScale]];
    this.edges.forEach((edge, i) => edge.setTexture(theme.key, `edge-${i}`).setTileScale(...scales[i] as [number, number]));
    const cornerSizes = [[art.leftBorder, art.topBorder], [art.rightBorder, art.topBorder],
      [art.leftBorder, art.bottomBorder], [art.rightBorder, art.bottomBorder]];
    this.corners.forEach((corner, i) => corner.setTexture(theme.key, `corner-${i}`).setDisplaySize(...cornerSizes[i] as [number, number]));
    for (const item of this.props) {
      const prop = journeyPropVariants[theme.chapter][item.variant];
      const source = this.scene.textures.get(prop.key).getSourceImage() as HTMLImageElement;
      item.width = prop.width; item.height = prop.width * source.height / source.width; item.originY = prop.originY;
      item.view.setTexture(prop.key).setOrigin(0.5, prop.originY).setDisplaySize(item.width, item.height);
    }
    this.stage = stage;
  }

  sync(viewport: Viewport, player: Point, stage = 0): void {
    this.setStage(stage);
    for (const prop of this.props) {
      const { originY, width, height } = prop;
      const padding = config.occlusionPadding;
      const coversPlayer = prop.y > player.y && Math.abs(prop.x - player.x) < width / 2 + padding
        && player.y + padding > prop.y - height * originY
        && player.y - padding < prop.y + height * (1 - originY);
      prop.view.setDepth(config.actorDepth + (prop.y - player.y) / viewport.height)
        .setAlpha(coversPlayer ? config.occlusionAlpha : 1);
    }
  }
}
