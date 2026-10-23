import type { CharacterId } from '../config/characters';
import { uiConfig } from '../config/ui';

export type RailwayIcon = keyof typeof uiConfig.art.iconFrames;

export function skillIcon(character: CharacterId, id: number): RailwayIcon {
  if (character === 'mechanic' && (id === 7 || id === 9)) return 'saw';
  if (character === 'signal' && (id === 8 || id === 10)) return 'bolt';
  if (character === 'carrier' && (id === 7 || id === 10)) return 'battery';
  if (character === 'carrier' && id === 9) return 'magnet';
  if (id === 21) return 'bearing';
  if (id === 22) return 'bolt';
  if (id === 2) return 'bearing';
  if (id === 3) return character === 'mechanic' ? 'arm' : 'pulse';
  if (id === 17) return 'boot';
  if (id === 18) return 'magnet';
  if (id === 16 || id === 19) return 'shield';
  if (id === 15 || id === 20) return 'repair';
  if (id >= 7 && id <= 10) return 'pulse';
  return character === 'mechanic' ? 'saw' : character === 'signal' ? 'bolt' : 'battery';
}

/** Crop the painted atlas without stretching equipment silhouettes. */
export function createRailwayIcon(document: Document, icon: RailwayIcon): HTMLSpanElement {
  const a = uiConfig.art, frame = a.iconFrames[icon], size = Math.max(frame.w, frame.h);
  const wrapper = document.createElement('span');
  wrapper.setAttribute('class', 'rail-icon');
  wrapper.setAttribute('aria-hidden', 'true');
  const art = document.createElement('span');
  art.setAttribute('class', 'rail-icon-art');
  Object.assign(art.style, {
    width: `${frame.w / size * 100}%`, height: `${frame.h / size * 100}%`,
    backgroundImage: `url('${a.icons}')`,
    backgroundSize: `${a.iconsSize.width / frame.w * 100}% ${a.iconsSize.height / frame.h * 100}%`,
    backgroundPosition: `${frame.x / (a.iconsSize.width - frame.w) * 100}% ${frame.y / (a.iconsSize.height - frame.h) * 100}%`,
  });
  wrapper.appendChild(art);
  return wrapper;
}
