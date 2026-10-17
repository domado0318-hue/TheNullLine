export type EnemyExperienceCategory = 'normal1' | 'normal2' | 'normal3' | 'elite' | 'boss';

export const experienceConfig = {
  maxLevel: 30, // 개별 필요 경험치 표를 사용하는 마지막 레벨 (최종 레벨 제한이 아님)
  beyondMaxLevelMultiplier: 1.15, // 표 이후 레벨당 필요 경험치 배율 (1보다 크게 설정)
  requiredExperience: [
    10, // Lv.1 → 2 필요 경험치
    15, // Lv.2 → 3 필요 경험치
    22, // Lv.3 → 4 필요 경험치
    30, // Lv.4 → 5 필요 경험치
    40, // Lv.5 → 6 필요 경험치
    52, // Lv.6 → 7 필요 경험치
    66, // Lv.7 → 8 필요 경험치
    82, // Lv.8 → 9 필요 경험치
    100, // Lv.9 → 10 필요 경험치
    120, // Lv.10 → 11 필요 경험치
    145, // Lv.11 → 12 필요 경험치
    175, // Lv.12 → 13 필요 경험치
    210, // Lv.13 → 14 필요 경험치
    250, // Lv.14 → 15 필요 경험치
    295, // Lv.15 → 16 필요 경험치
    345, // Lv.16 → 17 필요 경험치
    400, // Lv.17 → 18 필요 경험치
    460, // Lv.18 → 19 필요 경험치
    525, // Lv.19 → 20 필요 경험치
    595, // Lv.20 → 21 필요 경험치
    670, // Lv.21 → 22 필요 경험치
    750, // Lv.22 → 23 필요 경험치
    835, // Lv.23 → 24 필요 경험치
    925, // Lv.24 → 25 필요 경험치
    1020, // Lv.25 → 26 필요 경험치
    1120, // Lv.26 → 27 필요 경험치
    1225, // Lv.27 → 28 필요 경험치
    1335, // Lv.28 → 29 필요 경험치
    1450, // Lv.29 → 30 필요 경험치
    1570, // Lv.30 → 31 필요 경험치 (Lv.31부터 ceil(1570 × 배율^(현재레벨-30)))
  ],
  rewards: {
    normal1: 5, // 일반 적 분류 1의 아이콘당 경험치 (0이면 드롭 없음)
    normal2: 8, // 일반 적 분류 2의 아이콘당 경험치
    normal3: 12, // 일반 적 분류 3의 아이콘당 경험치 (향후 분류용)
    elite: 40, // 정예 적의 아이콘당 경험치 (향후 분류용)
    boss: 150, // 보스 적의 아이콘당 경험치 (향후 분류용)
  },
  pickup: {
    attractionRadius: 150, // Player 중심과 아이콘 중심 사이의 흡수 시작 거리 (px)
    collectionRadius: 20, // Player 중심에서 이 거리 이내 도착하면 경험치 지급 (px)
    initialSpeed: 220, // 흡수 시작 속도 (px/초)
    acceleration: 1000, // 흡수 이동 가속도 (px/초²)
    maximumSpeed: 800, // 흡수 이동 최대 속도 (px/초)
  },
  icon: {
    points: 5, // 별 꼭짓점 개수
    innerRadius: 5, // 별 안쪽 반지름 (px)
    outerRadius: 11, // 별 바깥쪽 반지름 (px)
    color: 0xfacc15, // 경험치 별 색상 (0xRRGGBB)
    depth: 5, // 월드 내 경험치 아이콘 표시 깊이
  },
};

export type ExperienceConfig = typeof experienceConfig;
