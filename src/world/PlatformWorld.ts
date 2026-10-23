import { platformConfig as config } from '../config/platform';
import { worldConfig } from '../config/world';
import { journeyConfig } from '../config/journey';
import { assertPositive } from '../config/validate';
import { clamp } from './geometry';
import type { CollisionWorld, Obstacle, Point, Viewport } from './geometry';

/** A single finite platform; scenery and collision coordinates never roll with the camera. */
export class PlatformWorld implements CollisionWorld {
  readonly width = worldConfig.width;
  readonly height = worldConfig.height;
  readonly obstacles: (Obstacle & { key: string; variant: number })[];

  constructor() {
    assertPositive('world.width', this.width);
    assertPositive('world.height', this.height);
    for (const key of ['leftBorder', 'rightBorder', 'topBorder', 'bottomBorder'] as const) assertPositive(`journey.${key}`, journeyConfig[key]);
    assertPositive('platform.footprintWidth', config.footprintWidth);
    assertPositive('platform.footprintHeight', config.footprintHeight);
    const offsets = [{ x: 0, y: 0, width: config.footprintWidth, height: config.footprintHeight }, ...config.companionOffsets];
    this.obstacles = config.benchPositions.flatMap((position, index) => offsets.map((offset, variant) => {
      assertPositive(`platform.props.${variant}.width`, offset.width);
      assertPositive(`platform.props.${variant}.height`, offset.height);
      const x = position.x * this.width + offset.x, y = position.y * this.height + offset.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)
        || x < offset.width / 2 || x > this.width - offset.width / 2
        || y < offset.height / 2 || y > this.height - offset.height / 2) {
        throw new Error(`platform.benchPositions.${index}: 시설물은 승강장 안에 있어야 합니다.`);
      }
      return { key: `bench-${index}-${variant}`, variant, x, y, shape: 'rectangle' as const, size: offset.width,
        width: offset.width, height: offset.height };
    }));
  }

  get bounds(): Viewport {
    const c = journeyConfig;
    return { x: -c.leftBorder, y: -c.topBorder, width: this.width + c.leftBorder + c.rightBorder,
      height: this.height + c.topBorder + c.bottomBorder };
  }

  viewport(center: Point, width: number, height: number): Viewport {
    const bounds = this.bounds;
    const axis = (value: number, start: number, span: number, size: number): number =>
      size >= span ? start + (span - size) / 2 : clamp(value - size / 2, start, start + span - size);
    return { x: axis(center.x, bounds.x, bounds.width, width), y: axis(center.y, bounds.y, bounds.height, height), width, height };
  }
}
