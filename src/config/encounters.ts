import type { EnemyId } from './enemyRoster';
export interface WaveEntry { id: EnemyId; count: number; delay: number }
const w=(...pairs: [EnemyId,number,number?][]):WaveEntry[]=>pairs.map(([id,count,delay=0])=>({id,count,delay}));
export interface StageDefinition { name:string; waves:WaveEntry[][] }
// 원 설계의 고정 배치. 정예의 선택적 2초 지연을 같은 테이블에서 명시한다.
export const stages: StageDefinition[] = [
  {name:'추적과 이동',waves:[w(['E01',6]),w(['E01',8],['E02',2]),w(['E01',8],['E02',4])]},
  {name:'직선탄과 연속탄',waves:[w(['E01',6],['E04',2]),w(['E01',6],['E02',2],['E05',2]),w(['E01',6],['E04',2],['E05',1])]},
  {name:'무게와 돌진',waves:[w(['E01',6],['E03',2],['E08',1]),w(['E01',6],['E02',3],['E08',2]),w(['E01',6],['E03',2],['E04',2],['X01',1,2])]},
  {name:'범위 공격 종합',waves:[w(['E01',6],['E07',2]),w(['E01',6],['E02',2],['E06',2]),w(['E01',6],['E03',2],['E04',1],['E05',1],['E07',1],['E06',1],['E08',1])]},
  {name:'분실물 산',waves:[w(['B01',1])]},
  {name:'방패와 측후면',waves:[w(['E01',6],['E09',2]),w(['E01',6],['E02',2],['E10',1]),w(['E01',5],['E09',2],['E04',2],['E08',1])]},
  {name:'폭발과 이동 경로',waves:[w(['E01',6],['E11',2]),w(['E01',5],['E02',2],['E12',1],['E04',1]),w(['E01',4],['E09',1],['E11',2],['E12',1],['E05',1])]},
  {name:'소환자 우선 처리',waves:[w(['E01',6],['E13',1]),w(['E01',4],['E02',4],['E09',1],['E14',1]),w(['E01',4],['E09',2],['E04',1],['X02',1,2])]},
  {name:'처리 순서 종합',waves:[w(['E01',4],['E09',2],['E07',1],['E11',2]),w(['E01',4],['E02',2],['E10',1],['E06',1],['E14',1]),w(['E01',4],['E09',1],['E03',1],['E04',1],['E05',1],['E12',1],['E13',1],['X01',1,2])]},
  {name:'닫힌 창구',waves:[w(['B02',1])]},
  {name:'인양 경로 회피',waves:[w(['E01',6],['E15',1]),w(['E01',4],['E09',1],['E15',2],['E04',1]),w(['E02',3],['E03',1],['E15',1],['E08',1],['E05',1])]},
  {name:'절단선과 안전 통로',waves:[w(['E01',6],['E16',2]),w(['E01',4],['E09',1],['E16',1],['E07',1],['E11',1]),w(['E01',4],['E02',2],['E16',2],['E06',1],['E10',1])]},
  {name:'차폐와 정예 절단',waves:[w(['E01',4],['E09',1],['E17',1]),w(['E01',4],['E02',2],['E14',1],['E17',1]),w(['E01',4],['E09',1],['E16',1],['E17',1],['X03',1,2])]},
  {name:'최종 종합전',waves:[w(['E01',4],['E15',1],['E16',1],['E12',1],['E04',1]),w(['E01',4],['E02',2],['E10',1],['E14',1],['E17',1]),w(['E01',4],['E09',1],['E03',1],['E15',1],['E16',1],['E17',1],['E13',1],['X01',1,2])]},
  {name:'말소 경계',waves:[w(['B03',1])]},
];
export const encounterConfig = {
  waveDelay: 4, // 모든 배치·소환 적 처치 후 다음 웨이브까지 (초)
  spawnMargin: 24, // 카메라 밖 스폰 여백 (px)
  spawnClearance: 12, // 등장 몸체 간 여유 (px)
  spawnAttempts: 300, // 한 배치의 후보 탐색 횟수
  spawnBand: 220, // 화면 외곽 스폰 띠 두께 (px)
  summonSafeDistance: 180, // 소환 시 Player와 확보할 최소 중심 거리 (px)
  summonMarkRadius: 28, // 소환 위치 표시 반경 (px)
  bossPairGap: 72, // 보스 증원 외곽 한 지점의 두 개체 간 거리 (px)
  bossClusterGap: 160, // 보스 증원 두 외곽 지점 사이 최소 거리 (px)
  navigationInterval: .45, // 우회 경로 재탐색 간격 (초)
  stopGap: 5, // 비공격 이동 목표 앞 정지 여유 (px)
  commandSpeed: 1.25, // 지휘 버프의 증원 이동 배율
};
export const bossCalls: Partial<Record<EnemyId,{threshold:number;ids:EnemyId[]}[]>> = {
  B02:[{threshold:.75,ids:['E01','E01','E09','E04']},{threshold:.5,ids:['E02','E02','E03','E05']},{threshold:.25,ids:['E02','E02','E09','E07']}],
  B03:[{threshold:.65,ids:['E09','E16','E02']},{threshold:.3,ids:['E15','E05','E02']}],
};
