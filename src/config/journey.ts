import { assertInteger } from './validate';

export type JourneyChapter = 'boarding' | 'onboard' | 'terminal';
export interface JourneyStage {
  key: string;
  file: string;
  name: string;
  chapter: JourneyChapter;
  floorScale?: number; // 원화 바닥 패널이 큰 구역의 개별 배율 (월드 px / 원본 px)
  floor: { x: number; y: number; width: number; height: number }; // 실제 원화에서 확인한 빈 바닥 영역 (원본 px)
  repeatFloor?: { x: number; y: number; width: number; height: number }; // 장식 없는 반복용 바닥 (원본 px)
  centerpiece?: { key: string; file: string; width: number; height: number; alpha: number }; // 맵 중앙에 한 번 표시할 투명 바닥 문양 (월드 px, 불투명도 0~1)
}

export const journeyConfig = {
  path: '/assets/backgrounds/', // 스테이지별 배경 경로
  sourceWidth: 2048, // 배경 원화 가로 크기 (px)
  sourceHeight: 768, // 배경 원화 세로 크기 (px)
  floorDetailScale: 0.75, // 바닥 타일의 원화 배율 (월드 px / 원본 px), 맵 크기와 독립
  floorInset: 32, // 반복 바닥에서 외곽 기둥·벽 그림자를 제외하는 안쪽 여백 (원본 px)
  borderDetailScale: 0.75, // 벽·문·설비의 길이 방향 원화 배율 (월드 px / 원본 px)
  leftBorder: 48, // 왼쪽 외곽 설비 표시 폭 및 카메라 여백 (px)
  rightBorder: 48, // 오른쪽 외곽 설비 표시 폭 및 카메라 여백 (px)
  topBorder: 80, // 위쪽 외곽 설비 표시 높이 및 카메라 여백 (px)
  bottomBorder: 96, // 아래쪽 선로·설비 표시 높이 및 카메라 여백 (px)
};

// 1~5 역사, 6~10 회수 열차 내부, 11~15 종착 말소 시설. 원래 적·보스·웨이브는 유지한다.
export const journeyStages: JourneyStage[] = [
  { key: 'journey-01', file: 'abandoned-platform.png', name: '탑승 대기 승강장', chapter: 'boarding', floor: { x: 60, y: 110, width: 1928, height: 516 } },
  { key: 'journey-02', file: 'ticket-concourse.png', name: '폐쇄 개찰 구역', chapter: 'boarding', floor: { x: 90, y: 112, width: 1868, height: 518 } },
  { key: 'journey-03', file: 'service-platform.png', name: '역사 정비 구역', chapter: 'boarding', floor: { x: 80, y: 104, width: 1888, height: 520 } },
  { key: 'journey-04', file: 'freight-platform.png', name: '회수 열차 적재장', chapter: 'boarding', floor: { x: 60, y: 104, width: 1928, height: 450 } },
  { key: 'journey-05', file: 'lost-property.png', name: '분실물 집하장', chapter: 'boarding', floor: { x: 90, y: 150, width: 1868, height: 478 } },
  { key: 'journey-06', file: 'boarding-car.png', name: 'NULL LINE · 탑승 화물칸', chapter: 'onboard', floor: { x: 96, y: 122, width: 1856, height: 508 } },
  { key: 'journey-07', file: 'battery-car.png', name: 'NULL LINE · 폐배터리칸', chapter: 'onboard', floor: { x: 96, y: 152, width: 1856, height: 472 } },
  { key: 'journey-08', file: 'sorting-car.png', name: 'NULL LINE · 자동 분류칸', chapter: 'onboard', floorScale: 0.4, floor: { x: 70, y: 126, width: 1908, height: 454 } },
  { key: 'journey-09', file: 'sealed-car.png', name: 'NULL LINE · 봉인 화물칸', chapter: 'onboard', floor: { x: 140, y: 134, width: 1768, height: 416 } },
  { key: 'journey-10', file: 'inspection-car.png', name: 'NULL LINE · 회수 검수칸', chapter: 'onboard', floor: { x: 72, y: 112, width: 1904, height: 464 } },
  { key: 'journey-11', file: 'terminal-unload.png', name: '종착역 · 하역 구역', chapter: 'terminal', floor: { x: 112, y: 134, width: 1824, height: 478 } },
  { key: 'journey-12', file: 'dismantling-hall.png', name: '종착역 · 해체 작업장', chapter: 'terminal', floor: { x: 64, y: 118, width: 1920, height: 510 } },
  { key: 'journey-13', file: 'relay-hall.png', name: '종착역 · 차폐 중계실', chapter: 'terminal', floor: { x: 104, y: 104, width: 1840, height: 516 } },
  { key: 'journey-14', file: 'erasure-approach.png', name: '말소 시설 · 최종 진입로', chapter: 'terminal', floor: { x: 100, y: 108, width: 1848, height: 502 } },
  { key: 'journey-15', file: 'erasure-core.png', name: '말소 경계 · 최종 집행실', chapter: 'terminal', floor: { x: 120, y: 96, width: 1808, height: 536 }, repeatFloor: { x: 1728, y: 438, width: 128, height: 128 }, centerpiece: { key: 'journey-erasure-mark', file: 'erasure-mark.png', width: 600, height: 600, alpha: 0.3 } },
];

export const journeyProps = {
  boarding: { key: 'journey-prop-station-v3', image: '/assets/props/boarding.png', width: 176, originY: 0.49 }, // 표시 폭 (px), 원본 높이 대비 바닥 중심 비율
  onboard: { key: 'journey-prop-cargo-v3', image: '/assets/props/onboard.png', width: 152, originY: 0.51 }, // 표시 폭 (px), 원본 높이 대비 바닥 중심 비율
  terminal: { key: 'journey-prop-terminal-v3', image: '/assets/props/terminal.png', width: 172, originY: 0.51 }, // 표시 폭 (px), 원본 높이 대비 바닥 중심 비율
}; // 투명 여백을 포함한 표시 폭. 실제 다리·하단이 충돌 영역의 아래쪽 변에 닿도록 정렬한다.

export interface JourneyProp { key: string; image: string; width: number; originY: number }
// 묶음 안 순서: 중심 시설물, 왼쪽 보조 설비, 오른쪽 적재·수거 설비.
export const journeyPropVariants: Record<JourneyChapter, JourneyProp[]> = {
  boarding: [
    journeyProps.boarding,
    { key: 'journey-ticket', image: '/assets/props/ticket.png', width: 140, originY: 0.735 }, // 표시 폭 px, 바닥 중심 비율
    { key: 'journey-bins', image: '/assets/props/bins.png', width: 100, originY: 0.539 }, // 표시 폭 px, 바닥 중심 비율
  ],
  onboard: [
    journeyProps.onboard,
    { key: 'journey-battery', image: '/assets/props/battery.png', width: 74, originY: 0.459 }, // 표시 폭 px, 바닥 중심 비율
    { key: 'journey-pallet', image: '/assets/props/pallet.png', width: 94, originY: 0.565 }, // 표시 폭 px, 바닥 중심 비율
  ],
  terminal: [
    journeyProps.terminal,
    { key: 'journey-cabinet', image: '/assets/props/cabinet.png', width: 74, originY: 0.554 }, // 표시 폭 px, 바닥 중심 비율
    { key: 'journey-reel', image: '/assets/props/reel.png', width: 106, originY: 0.670 }, // 표시 폭 px, 바닥 중심 비율
  ],
};

export function journeyStage(stage: number): JourneyStage {
  assertInteger('journey.stage', stage);
  const result = journeyStages[stage];
  if (!result) throw new Error(`journey.stage: ${stage}`);
  return result;
}

export function nextLocation(stage: number): string {
  if (stage === 4) return 'NULL LINE 탑승';
  if (stage === 9) return '종착 말소 시설 진입';
  return journeyStages[stage + 1]?.name ?? '말소 경계 돌파';
}

