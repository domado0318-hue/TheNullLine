export const combatConfig = {
  hitFlashSeconds: 0.18, // 피격 점멸 효과를 유지하는 시간 (초)
  flashIntervalSeconds: 0.045, // 피격 색상과 기본 색상을 번갈아 표시할 간격 (초)
  hitColor: 0xff2424, // 피격 시 점멸 색상 (0xRRGGBB)
  invulnerabilitySeconds: {
    player: 0.25, // Player 피격 후 추가 피해를 무시하는 시간 (초)
    enemy: 0.06, // Enemy 피격 후 추가 피해를 무시하는 시간 (초)
  },
  knockbackSpeed: 160, // 피격 밀림의 시작 속도 (px/초, 남은 시간에 따라 감쇠)
  knockbackSeconds: 0.14, // 피격 밀림 지속 시간 (초)
};
