import type { EnemyExperienceCategory } from './experience';

export const enemyIds = ['E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11','E12','E13','E14','E15','E16','E17','X01','X02','X03','B01','B02','B03'] as const;
export type EnemyId = typeof enemyIds[number];
export type EnemyRole = 'melee' | 'shot' | 'lob' | 'charge' | 'guard' | 'explode' | 'summon' | 'hook' | 'beam' | 'shield' | 'boss';
export interface EnemyDefinition {
  name: string;
  role: EnemyRole;
  hp: number; // 기본 보병 H 대비 체력 배율
  speed: number; // 기본 보병 이동 속도 대비 배율
  size: number; // 충돌 사각형 한 변 (px)
  height: number; // 투명 여백을 제외한 표시 높이 (px)
  sheet: number; // 게임용 투명 아틀라스 번호
  frame: number; // 아틀라스 내 프레임
  reward: EnemyExperienceCategory;
}
// 문서의 H·이동 배율. 표시 크기와 충돌 크기는 분리한다.
export const enemyRoster: Record<EnemyId, EnemyDefinition> = {
  E01: {
    name: '빈 우비', // 문서의 표시 이름
    role: 'melee', // 공격 역할
    hp: 1, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 32, // 충돌 사각형 한 변 (px)
    height: 72, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 0, // 아틀라스 프레임 번호
    reward: 'normal1', // 경험치 보상 분류
  },
  E02: {
    name: '달리는 우산', // 문서의 표시 이름
    role: 'melee', // 공격 역할
    hp: .6, // 기본 보병 H 대비 체력 배율
    speed: 1.35, // 기본 이동 속도 대비 배율
    size: 28, // 충돌 사각형 한 변 (px)
    height: 50, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 1, // 아틀라스 프레임 번호
    reward: 'normal1', // 경험치 보상 분류
  },
  E03: {
    name: '방음포 더미', // 문서의 표시 이름
    role: 'melee', // 공격 역할
    hp: 2.5, // 기본 보병 H 대비 체력 배율
    speed: .7, // 기본 이동 속도 대비 배율
    size: 48, // 충돌 사각형 한 변 (px)
    height: 80, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 2, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E04: {
    name: '접힌 영수증', // 문서의 표시 이름
    role: 'shot', // 공격 역할
    hp: .8, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 28, // 충돌 사각형 한 변 (px)
    height: 52, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 3, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E05: {
    name: '승차권 나방', // 문서의 표시 이름
    role: 'shot', // 공격 역할
    hp: .8, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 28, // 충돌 사각형 한 변 (px)
    height: 52, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 4, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E06: {
    name: '검표 부채', // 문서의 표시 이름
    role: 'shot', // 공격 역할
    hp: .8, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 32, // 충돌 사각형 한 변 (px)
    height: 52, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 5, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E07: {
    name: '빗물 주머니', // 문서의 표시 이름
    role: 'lob', // 공격 역할
    hp: .8, // 기본 보병 H 대비 체력 배율
    speed: .8, // 기본 이동 속도 대비 배율
    size: 32, // 충돌 사각형 한 변 (px)
    height: 60, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 6, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E08: {
    name: '결박 가방', // 문서의 표시 이름
    role: 'charge', // 공격 역할
    hp: 1.4, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 60, // 표시 높이 (px)
    sheet: 0, // 투명 아틀라스 번호
    frame: 7, // 아틀라스 프레임 번호
    reward: 'normal1', // 경험치 보상 분류
  },
  E09: {
    name: '걷는 광고판', // 문서의 표시 이름
    role: 'guard', // 공격 역할
    hp: 1.8, // 기본 보병 H 대비 체력 배율
    speed: .8, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 80, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 0, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E10: {
    name: '완충재 벽', // 문서의 표시 이름
    role: 'charge', // 공격 역할
    hp: 2.2, // 기본 보병 H 대비 체력 배율
    speed: .9, // 기본 이동 속도 대비 배율
    size: 44, // 충돌 사각형 한 변 (px)
    height: 68, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 1, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E11: {
    name: '밀봉 봉투', // 문서의 표시 이름
    role: 'explode', // 공격 역할
    hp: .6, // 기본 보병 H 대비 체력 배율
    speed: 1.15, // 기본 이동 속도 대비 배율
    size: 28, // 충돌 사각형 한 변 (px)
    height: 56, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 2, // 아틀라스 프레임 번호
    reward: 'normal1', // 경험치 보상 분류
  },
  E12: {
    name: '세 갈래 봉투', // 문서의 표시 이름
    role: 'explode', // 공격 역할
    hp: .9, // 기본 보병 H 대비 체력 배율
    speed: .85, // 기본 이동 속도 대비 배율
    size: 40, // 충돌 사각형 한 변 (px)
    height: 64, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 3, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E13: {
    name: '분류 주머니', // 문서의 표시 이름
    role: 'summon', // 공격 역할
    hp: 1.8, // 기본 보병 H 대비 체력 배율
    speed: .8, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 80, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 4, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E14: {
    name: '우산 둥지', // 문서의 표시 이름
    role: 'summon', // 공격 역할
    hp: 1.5, // 기본 보병 H 대비 체력 배율
    speed: .8, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 64, // 표시 높이 (px)
    sheet: 1, // 투명 아틀라스 번호
    frame: 5, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E15: {
    name: '매듭 포대', // 문서의 표시 이름
    role: 'hook', // 공격 역할
    hp: 2, // 기본 보병 H 대비 체력 배율
    speed: .65, // 기본 이동 속도 대비 배율
    size: 40, // 충돌 사각형 한 변 (px)
    height: 76, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 0, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  E16: {
    name: '절단 셔터', // 문서의 표시 이름
    role: 'beam', // 공격 역할
    hp: 1.1, // 기본 보병 H 대비 체력 배율
    speed: .7, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 64, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 1, // 아틀라스 프레임 번호
    reward: 'normal2', // 경험치 보상 분류
  },
  E17: {
    name: '반사 포장막', // 문서의 표시 이름
    role: 'shield', // 공격 역할
    hp: 1.5, // 기본 보병 H 대비 체력 배율
    speed: .75, // 기본 이동 속도 대비 배율
    size: 36, // 충돌 사각형 한 변 (px)
    height: 72, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 2, // 아틀라스 프레임 번호
    reward: 'normal3', // 경험치 보상 분류
  },
  X01: {
    name: '이중 결박 가방', // 문서의 표시 이름
    role: 'charge', // 공격 역할
    hp: 4, // 기본 보병 H 대비 체력 배율
    speed: 1, // 기본 이동 속도 대비 배율
    size: 46.8, // 충돌 사각형 한 변 (px)
    height: 78, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 3, // 아틀라스 프레임 번호
    reward: 'elite', // 경험치 보상 분류
  },
  X02: {
    name: '삼구 분류 주머니', // 문서의 표시 이름
    role: 'summon', // 공격 역할
    hp: 4, // 기본 보병 H 대비 체력 배율
    speed: .8, // 기본 이동 속도 대비 배율
    size: 46, // 충돌 사각형 한 변 (px)
    height: 96, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 4, // 아틀라스 프레임 번호
    reward: 'elite', // 경험치 보상 분류
  },
  X03: {
    name: '이중 절단 셔터', // 문서의 표시 이름
    role: 'beam', // 공격 역할
    hp: 3.3, // 기본 보병 H 대비 체력 배율
    speed: .7, // 기본 이동 속도 대비 배율
    size: 45, // 충돌 사각형 한 변 (px)
    height: 80, // 표시 높이 (px)
    sheet: 2, // 투명 아틀라스 번호
    frame: 5, // 아틀라스 프레임 번호
    reward: 'elite', // 경험치 보상 분류
  },
  B01: {
    name: '분실물 산', // 문서의 표시 이름
    role: 'boss', // 공격 역할
    hp: 25, // 기본 보병 H 대비 체력 배율
    speed: .7, // 기본 이동 속도 대비 배율
    size: 104, // 충돌 사각형 한 변 (px)
    height: 180, // 표시 높이 (px)
    sheet: 3, // 투명 아틀라스 번호
    frame: 0, // 아틀라스 프레임 번호
    reward: 'boss', // 경험치 보상 분류
  },
  B02: {
    name: '닫힌 창구', // 문서의 표시 이름
    role: 'boss', // 공격 역할
    hp: 40, // 기본 보병 H 대비 체력 배율
    speed: .65, // 기본 이동 속도 대비 배율
    size: 112, // 충돌 사각형 한 변 (px)
    height: 200, // 표시 높이 (px)
    sheet: 3, // 투명 아틀라스 번호
    frame: 1, // 아틀라스 프레임 번호
    reward: 'boss', // 경험치 보상 분류
  },
  B03: {
    name: '말소 경계', // 문서의 표시 이름
    role: 'boss', // 공격 역할
    hp: 55, // 기본 보병 H 대비 체력 배율
    speed: .6, // 기본 이동 속도 대비 배율
    size: 128, // 충돌 사각형 한 변 (px)
    height: 240, // 표시 높이 (px)
    sheet: 3, // 투명 아틀라스 번호
    frame: 2, // 아틀라스 프레임 번호
    reward: 'boss', // 경험치 보상 분류
  },
};

export const enemyArtConfig = {
  keyPrefix: 'enemy-v2-', // Phaser 텍스처 이름 접두사
  path: '/assets/enemies/', // 게임용 이미지·아틀라스 경로
  count: 4, // 아틀라스 수 (장)
  originY: .82, // 스프라이트 기준점의 세로 비율 (0~1)
  spawnAlpha: .45, // 등장 직후 최소 표시 불투명도 (0~1)
  telegraph: 0xff7855, // 적 공격 전조 색 (0xRRGGBB)
  active: 0xffdfba, // 실제 판정 중 선 색 (0xRRGGBB)
  shield: 0xcedbd4, // 차폐 연결선 색 (0xRRGGBB)
  shadowAlpha: .22, // 바닥 그림자 불투명도 (0~1)
  lineWidth: 2, // 전조 윤곽선 두께 (px)
  warningAlpha: .08, // 전조 면 불투명도 (0~1)
  warningFillAlpha: .32, // 공격 시점까지 차오르는 전조 면 불투명도 (0~1)
  warningFront: 0xffc48c, // 차오르는 전조의 선두 경계 색 (0xRRGGBB)
  activeAlpha: .24, // 실제 공격 면 불투명도 (0~1)
  gaitHz: 2.5, // 이동시 몸체 리듬 (회/초)
  bob: 2, // 이동 상하 진폭 (px)
  lean: .045, // 이동 좌우 기울기 (라디안)
  windupStretch: .08, // 준비시 몸체 압축·늘림 비율
  shadowWidth: 1.2, // 충돌 크기 대비 바닥 그림자 너비 배율
  shadowHeight: .45, // 충돌 크기 대비 바닥 그림자 높이 배율
  shadowOffset: .22, // 충돌 크기 대비 그림자 중심 아래 이동 배율
  shieldWidth: 1.4, // 충돌 크기 대비 차폐 테두리 너비 배율
  shieldHeight: .7, // 충돌 크기 대비 차폐 테두리 높이 배율
  dashStep: 12, // 차폐 점선 반복 간격 (px)
  dashLength: 5, // 차폐 점선 한 토막 길이 (px)
  projectileColor: 0xf3dfbd, // 종이 탄 채움 색 (0xRRGGBB)
  projectileBorder: 0x593f35, // 종이 탄 외곽선 색 (0xRRGGBB)
  projectileBack: 5, // 종이 탄 중심에서 꼬리까지 (px)
  projectileFront: 7, // 종이 탄 중심에서 앞끝까지 (px)
  projectileHalfWidth: 4, // 종이 탄 반너비 (px)
  hookColor: 0xc5b895, // 매듭 갈고리 색 (0xRRGGBB)
  tetherColor: 0xa49b79, // 인양 손잡이·끈 색 (0xRRGGBB)
  tetherWidth: 3, // 인양 끈 표시 두께 (px)
  hookWidth: 4, // 갈고리 고리 표시 두께 (px)
};
