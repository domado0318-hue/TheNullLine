// 이미지 생성 전투 아틀라스. 피해·충돌 판정과 독립적인 표시 설정.
export const effectArt = {
  key: 'battle-effects-v1', // Phaser 텍스처 키
  path: '/assets/effects/battle-effects.png', // 투명 PNG 경로
  atlas: '/assets/effects/battle-effects.json', // 원본 픽셀을 유지하는 4×4 프레임 좌표
  depth: 12, // 캐릭터 위 연출 깊이
  groundDepth: 3, // 바닥 장판 깊이
  paddingScale: 1.5, // 프레임 투명 여백 보정 배율
  impactSeconds: 0.24, // 피격 불꽃 수명 (초)
  impactSize: 34, // 피격 불꽃 한 변 (px)
  projectileScale: 2.6, // 판정 지름 대비 원본 비율 투사체 프레임 크기 배율
  mineSize: 34, // 함정 이미지 한 변 (px)
  boltWidth: 42, // 연쇄 번개 프레임 높이 (px)
  pulseHz: 3, // 함정 밝기 진동 (회/초)
  pulseAlpha: 0.15, // 진동 불투명도 변화 폭 (비율)
  zoneAlpha: 0.62, // 장판 불투명도 (비율)
  warningAlpha: 0.45, // 준비 상태 불투명도 (비율)
  shieldScale: 1.6, // 몸체 대비 보호막 지름 배율
  beamHeight: 2, // 판정 폭 대비 빔 이미지 높이 배율
};
export const enemyDeath = {
  seconds: 0.26, // 적 몸체가 제자리에서 사라지는 시간 (초)
};
export const effectLine = {
  segmentLength: 28, // 번개 꺾임 간격 (px)
  maxSegments: 80, // 연결선당 최대 선분 수 (개)
  amplitude: 6, // 번개 중심선에서 최대 꺾임 거리 (px)
  widthRatio: 0.12, // 요청 프레임 높이 대비 실제 선 두께 비율
  maxWidth: 12, // 연결선 최대 두께 (px)
  minWidth: 1.5, // 가는 갈고리 연결선 최소 두께 (px)
  haloScale: 2.5, // 바깥 빛 두께 배율
  haloAlpha: 0.14, // 바깥 빛 불투명도 배율
  coreAlpha: 0.8, // 중심선 불투명도 배율
  tipSize: 48, // 끝점 원본 이미지 최대 프레임 크기 (px)
  lightning: 0x80cec9, // 아군 번개 색 (0xRRGGBB)
  beam: 0xf38c67, // 적 빔 색 (0xRRGGBB)
  core: 0xffefd0, // 연결선 중심 색 (0xRRGGBB)
};
export const effectGround = {
  lineWidth: 1.5, // 장판·충격파 경계 선 두께 (px)
  haloWidth: 5, // 바닥 경계의 옅은 외곽 빛 두께 (px)
  haloAlpha: 0.2, // 외곽 빛 불투명도 배율
  fillAlpha: 0.12, // 장판 내부 불투명도 배율
  stampSize: 88, // 바닥 중심 원본 그림의 최대 프레임 크기 (px)
  stampAlpha: 0.65, // 바닥 중심 그림 불투명도 배율
  metal: 0xe4c487, // 충격파 색 (0xRRGGBB)
  signal: 0x80cec9, // 전기 장판 색 (0xRRGGBB)
  poison: 0xb4b77a, // 독 장판 색 (0xRRGGBB)
};
export const effectFrames = {
  saw: 0, cut: 1, lightning: 2, mine: 3,
  explosion: 4, rivet: 5, bolt: 6, capsule: 7,
  shield: 8, pulse: 9, poison: 10, hit: 11,
  enemyCut: 12, shard: 13, beam: 14, crush: 15,
} as const;
export type EffectFrame = keyof typeof effectFrames;

export const effectMotion = {
  enterSeconds: 0.035, // 순간 효과가 서서히 나타나는 시간 (초)
  exitSeconds: 0.12, // 순간 효과가 사라지는 시간 (초), 수명의 45% 이내
  startScale: 0.82, // 순간 효과 시작 크기 (최종 크기 비율)
  ringStartScale: 0.2, // 충격파 시작 반경 (최종 반경 비율)
  growthPortion: 0.75, // 최종 크기에 도달할 때까지의 수명 비율
  sawSpinSpeed: Math.PI * 2, // 톱니 자체 회전 속도 (rad/초), 공전과 독립적으로 초당 한 바퀴
  slashAlpha: 0.56, // 일반 절단 궤적 최대 불투명도 (비율)
  crossSlashAngle: Math.PI / 4, // 교차 절삭의 두 궤적 회전 편차 (rad)
  strongTrailAlpha: 0.42, // 회전 분쇄 강타의 넓은 절삭 궤적 불투명도 (비율)
  swordTrailSeconds: 0.11, // 회전 검 궤적의 잔상 길이 (초)
  swordTrailWidth: 2, // 회전 검 궤적 두께 (px)
  bulletTrailPixels: 16, // 투사체 뒤쪽 꼬리 길이 (px)
  bulletTrailAlpha: 0.34, // 투사체 꼬리 불투명도 (비율)
  playerTrailColor: 0xe4c487, // 플레이어 무기 잔상 색 (0xRRGGBB)
  enemyTrailColor: 0xf38c67, // 적 무기 잔상 색 (0xRRGGBB)
  chainStepSeconds: 0.045, // 연쇄 번개가 다음 대상에 도달하는 시차 (초)
  enemyWarningFlashSeconds: 0.12, // 적 공격 발동 직후 경계 강조 시간 (초)
  enemyWarningFlashWidth: 2, // 적 공격 발동 경계 추가 두께 (px)
  lureSize: 48, // 유인 장치 표시 크기 (px)
  lureRingAlpha: 0.12, // 유인 범위의 옅은 파동 불투명도 (비율)
  lurePulseHz: 1.5, // 유인 파동 반복 속도 (회/초)
  coreDiameter: 72, // 폭발·충격 중심 이미지의 최대 지름 (여백 제외 px)
  coreAlpha: 0.65, // 폭발·충격 중심 최대 불투명도 (비율)
  ringAlpha: 0.22, // 퍼지는 충격파 최대 불투명도 (비율)
  zoneEnterSeconds: 0.18, // 장판이 나타나는 시간 (초)
  zoneExitSeconds: 0.35, // 장판이 사라지는 시간 (초)
  zoneAlpha: 0.34, // 지속 장판 최대 불투명도 (비율)
  zoneRotation: 0, // 장판 이미지 회전 속도 (rad/초), 바닥에 고정
  shieldAlpha: 0.4, // 보호막 최대 불투명도 (비율)
  impactGrowth: 0.04, // 피격 불꽃이 추가로 커지는 최대 비율
};
