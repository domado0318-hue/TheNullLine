export const audioConfig = {
  masterGain: 0.72, // 전체 선형 음량 (0~1)
  musicGain: 0.48, // BGM 선형 음량 (0~1), 원본은 약 -25 dBFS RMS
  effectGain: 0.66, // 효과음 선형 음량 (0~1)
  crossfadeSeconds: 1.2, // 일반 곡 교체 시간 (초)
  bossFadeSeconds: 0.7, // 보스곡 교체 시간 (초)
  resultFadeSeconds: 0.35, // 결과 진입 시 음악 감쇠 시간 (초)
  selectionGain: 0.32, // 레벨업 중 BGM 음량 배율 (0~1)
  duckSeconds: 0.2, // 레벨업 음악 음량 변경 시간 (초)
  maxEffects: 10, // 전체 동시 효과음 수 (개), 경고도 이 상한을 지킨다
  fullDistance: 200, // 거리 감쇠 시작 거리 (px)
  maxDistance: 950, // 일반 월드 효과음 가청 거리 (px)
  warningDistance: 1250, // 경고 가청 거리 (px)
  panDistance: 650, // 좌우 최대 편향에 도달하는 수평 거리 (px)
  maxPan: 0.55, // 최대 좌우 편향 (0~1)
  limiterThreshold: -6, // 최종 압축 시작 레벨 (dB)
  limiterKnee: 6, // 압축 전환 폭 (dB)
  limiterRatio: 12, // 최종 압축 비율 (입력 dB / 출력 dB)
  limiterAttack: 0.003, // 피크 압축 시작 시간 (초)
  limiterRelease: 0.15, // 피크 압축 해제 시간 (초)
};

// priority: 높을수록 먼저 재생, cap: 동시 개수, gap: 계열 전체 최소 간격 (초).
export const soundGroups = {
  ui: { priority: 4, cap: 2, gap: 0 },
  player: { priority: 5, cap: 2, gap: 0.10 },
  warning: { priority: 6, cap: 3, gap: 0.03 },
  weapon: { priority: 3, cap: 3, gap: 0.055 },
  impact: { priority: 1, cap: 2, gap: 0.09 },
  enemy: { priority: 2, cap: 2, gap: 0.11 },
  pickup: { priority: 0, cap: 1, gap: 0.10 },
  status: { priority: 2, cap: 2, gap: 0.18 },
  event: { priority: 7, cap: 2, gap: 0.15 },
} as const;
export type SoundGroup = keyof typeof soundGroups;
// [계열, 개별 음량 배율 (0~1), 같은 소리 최소 간격 (초)].
export const soundCatalog = {
  ui_focus: ['ui', 0.35, 0.14],
  ui_confirm: ['ui', 0.8, 0.1],
  ui_page: ['ui', 0.55, 0.15],
  level_up: ['ui', 0.8, 0.35],
  xp_pickup: ['pickup', 0.45, 0.1],
  player_hit: ['player', 1, 0.15],
  shield_gain: ['status', 0.65, 0.45],
  shield_hit: ['player', 0.75, 0.15],
  shield_break: ['player', 0.85, 0.2],
  heal: ['status', 0.6, 0.8],
  magnet_collect: ['ui', 0.65, 0.4],
  charge_ready: ['status', 0.55, 0.5],
  mechanic_cutter: ['weapon', 0.65, 0.15],
  mechanic_strong: ['weapon', 0.85, 0.12],
  signal_discharge: ['weapon', 0.65, 0.15],
  signal_chain: ['status', 0.32, 0.12],
  carrier_place: ['weapon', 0.45, 0.15],
  carrier_arm: ['status', 0.25, 0.3],
  carrier_blast: ['weapon', 0.75, 0.10],
  carrier_blast_charged: ['weapon', 0.85, 0.10],
  weld_spark: ['weapon', 0.5, 0.12],
  pressure_pulse: ['weapon', 0.65, 0.15],
  saw_throw: ['weapon', 0.55, 0.12],
  heat_zone_start: ['weapon', 0.4, 0.2],
  electric_pulse: ['weapon', 0.6, 0.15],
  spark_shot: ['weapon', 0.5, 0.12],
  beacon_start: ['weapon', 0.45, 0.2],
  capacitor_blast: ['weapon', 0.65, 0.15],
  scrap_scatter: ['weapon', 0.5, 0.15],
  leak_start: ['weapon', 0.35, 0.2],
  waste_shot: ['weapon', 0.55, 0.15],
  enemy_hit_soft: ['impact', 0.5, 0.09],
  enemy_hit_metal: ['impact', 0.5, 0.09],
  enemy_guard: ['impact', 0.6, 0.12],
  enemy_defeat: ['impact', 0.45, 0.12],
  enemy_melee: ['enemy', 0.45, 0.12],
  paper_shot: ['enemy', 0.4, 0.12],
  ground_warning: ['warning', 0.85, 0.12],
  wet_impact: ['enemy', 0.6, 0.15],
  charge_warning: ['warning', 0.9, 0.15],
  charge_release: ['enemy', 0.6, 0.15],
  explosion_warning: ['warning', 0.85, 0.15],
  packet_burst: ['enemy', 0.65, 0.15],
  summon_open: ['enemy', 0.55, 0.25],
  hook_warning: ['warning', 0.9, 0.15],
  hook_release: ['enemy', 0.65, 0.15],
  beam_warning: ['warning', 0.9, 0.15],
  beam_release: ['enemy', 0.7, 0.15],
  enemy_shield: ['enemy', 0.5, 0.25],
  boss_stamp: ['enemy', 0.8, 0.2],
  boss_command: ['enemy', 0.65, 0.3],
  wave_start: ['event', 0.5, 0.8],
  boss_enter: ['event', 0.85, 1],
  boss_phase: ['event', 0.75, 1],
  boss_defeat: ['event', 0.85, 1],
  cue_victory_still_alive: ['event', 0.85, 1],
  cue_defeat_record_closed: ['event', 0.85, 1],
} as const satisfies Record<string, readonly [SoundGroup, number, number]>;
export type SoundId = keyof typeof soundCatalog;
export type SoundEmitter = (id: SoundId, at?: { x: number; y: number }) => void;

export const musicFiles = {
  title: 'bgm_title_null_line',
  combat1: 'bgm_combat_01_collection',
  combat2: 'bgm_combat_02_sorting',
  combat3: 'bgm_combat_03_boundary',
  boss1: 'bgm_boss_01_lost_property',
  boss2: 'bgm_boss_02_closed_counter',
  boss3: 'bgm_boss_03_erasure',
} as const;
export type MusicId = keyof typeof musicFiles;
export function musicForStage(stage: number): MusicId {
  if (stage === 4) return 'boss1';
  if (stage === 9) return 'boss2';
  if (stage === 14) return 'boss3';
  return stage < 5 ? 'combat1' : stage < 10 ? 'combat2' : 'combat3';
}
export function soundUrl(id: SoundId): string {
  return `/assets/audio/${id.startsWith('cue_') ? 'cues' : 'sfx'}/${id}.wav`;
}
