import type { EnemyExperienceCategory } from './experience';

export const enemyConfig = {
  size: 32, // 두 Enemy 타입에 공통인 사각형 한 변 길이 (px)
  colors: {
    horizontal: 0xf43f5e, // 좌우 순찰 Enemy 색상 (0xRRGGBB)
    circular: 0x38bdf8, // 원형 순찰 Enemy 색상 (0xRRGGBB)
  },
  stats: {
    horizontal: {
      maxHp: 72, // 좌우 순찰 Enemy 최대/시작 HP
      attackDamage: 12, // 좌우 순찰 Enemy 기본 공격력
      experienceCategory: 'normal1' as const satisfies EnemyExperienceCategory, // 경험치 보상 분류 (이동 타입과 별개)
    },
    circular: {
      maxHp: 48, // 원형 순찰 Enemy 최대/시작 HP
      attackDamage: 8, // 원형 순찰 Enemy 기본 공격력
      experienceCategory: 'normal2' as const satisfies EnemyExperienceCategory, // 경험치 보상 분류 (experience.ts에서 보상 조정)
    },
  },
  spawn: {
    referenceArea: 3000 * 3000, // 개체 수 비례 계산의 기준 월드 면적 (px²)
    initialCount: 10, // 기준 면적에서 시작할 때 생성하는 Enemy 수 (마리)
    maximumCount: 20, // 기준 면적에서 허용할 최대 생존 Enemy 수 (마리)
    intervalSeconds: 3, // 추가 스폰 주기 (초, 0보다 커야 함)
    minimumPerWave: 1, // 기준 면적에서 주기당 생성할 최소 수 (마리)
    maximumPerWave: 2, // 기준 면적에서 주기당 생성할 최대 수 (마리)
    cameraMargin: 64, // 카메라 밖 생성 시 화면과 추가로 띄울 거리 (px)
    clearance: 12, // 생성 시 장애물/개체와 확보할 추가 여유 (px)
    maximumAttempts: 600, // 한 번의 스폰 요청에서 위치를 찾을 최대 시도 횟수
  },
  patrol: {
    speed: 75, // 순찰 이동 속도 (px/초)
    horizontalRange: 180, // 좌우 순찰 기준점에서 한쪽 방향으로 이동할 거리 (px)
    circleRadius: 120, // 원형 순찰 반지름 (px)
    idleSeconds: {
      min: 0.8, // 순찰 대기 시간 최솟값 (초)
      max: 1.6, // 순찰 대기 시간 최댓값 (초)
    },
    moveSeconds: {
      min: 1.5, // 순찰 이동 유지 시간 최솟값 (초)
      max: 2.5, // 순찰 이동 유지 시간 최댓값 (초)
    },
  },
  chase: {
    speed: 165, // 추적 이동 속도 (px/초)
    detectionRadius: 620, // Player를 발견하고 추적을 시작할 중심 거리 (px)
    releaseRadius: 850, // 추적을 해제할 중심 거리 (px, 감지 거리보다 크게 설정)
    minimumGap: 16, // 포위 시 Player와 Enemy 외곽 사이의 최소 여유 (px)
    resumeDistance: 24, // 대기 위치/공격 사거리에서 재이동할 추가 거리 (px)
    outOfRangeGraceSeconds: 0.2, // 사거리와 재추적 거리 사이에서 정지할 최대 시간 (초, 이후 재접근)
    arrivalDistance: 3, // 예약한 자리 도착으로 판단할 거리 (px)
    ringGap: 12, // 포위 자리의 개체 간격 계산에 더할 여유 (px)
    maximumRings: 12, // Player 주변에서 탐색할 최대 포위 원 개수
    assignmentIntervalSeconds: 0.25, // 포위 자리 예약 갱신 주기 (초)
  },
};
