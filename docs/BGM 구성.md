# THE NULL LINE — BGM 구성

> 수정: 2026-10-24 · 타이틀·오프닝 공용곡으로 통합, 짧은 BGM 루프 프롬프트로 변경  
> 효과음 55개·결과 큐 2개와 전환 검토용 임시 BGM 7곡을 제작하고 게임에 연결했다. BGM은 추후 Suno 제작본으로 교체할 수 있다.  
> 아래 Suno 표의 길이·BPM은 생성 요청 목표이며, 효과음 표의 길이는 제작한 파일의 측정값이다. 현재 적용값과 최종 제작 제안은 구분해 기록했다.

## 현재 게임 적용 현황

- **타이틀 → 오프닝 → 직업 선택:** 같은 `title` 루프를 재시작 없이 이어간다. 브라우저에서 첫 클릭 또는 키 입력 후 재생을 시작한다.
- **전투:** 1~4 / 6~9 / 11~14스테이지 일반곡과 5 / 10 / 15스테이지 보스곡을 사용한다. 같은 구간 안에서는 곡을 재시작하지 않는다.
- **전환:** 일반 곡 교체 1.2초, 보스 진입 0.7초 크로스페이드. 빠르게 전환해도 음악 소스는 최대 2개다. 중간 보스 처치 시 음악을 감쇠하고 다음 구간 진입 때 새 곡을 시작한다.
- **레벨업:** 음악은 32% 음량으로 이어가고 진행 중인 짧은 전투 효과음은 정리한다. 연속 카드 선택 중에는 낮은 음량을 유지한다. 지난 전조를 뒤늦게 몰아서 재생하지 않는다.
- **효과음:** 실제 공격 발동·적중·폭발·경고·처치·경험치 획득에 연결했다. 장판 피해 틱은 타격음을 생략하고, 연쇄 전이는 한 번만 작게 강조한다.
- **중복 억제:** 전체 동시 효과음 최대 10개, 일반 타격 최대 2개·계열 간격 90ms, 경험치 최대 1개·간격 100ms. 경고와 플레이어 피격은 별도 계열이며, 상한에 도달하면 위험 경고가 낮은 우선순위 소리를 교체한다.
- **거리와 음량:** 멀리 있는 소리는 감쇠하고 좌우 방향을 약하게 반영한다. 경고는 일반 효과음보다 먼 거리까지 들린다. 최종 출력에는 피크 압축을 적용한다.
- **정리:** 패배·승리·재시작 시 이전 전투음을 정리한다. 숨겨진 탭에서는 오디오 컨텍스트를 일시정지한다. 음원 로딩이 늦어도 지난 효과음을 대기열에 쌓지 않는다.

조절 위치는 `src/config/audio.ts`다. 임시 BGM은 `scripts/generate-bgm.cjs`에서 외부 샘플 없이 합성한 16마디 곡이며, 29~53초·스테레오 Ogg 형식이다. 7곡의 원본 평균 레벨을 -25 dBFS RMS로 맞췄다. 파일 정보는 [BGM 목록](audio/bgm-manifest.json)에 있다.

아래의 Suno 프롬프트와 제작 방향은 최종 음원 교체용으로 유지한다. 아래 표의 제안값과 위 적용값이 다르면 **현재 적용 현황과 `src/config/audio.ts`가 실제 동작 기준**이다.

## 1. 전체 방향

**“사람이 사라진 역에서, 도시의 업무와 회수 절차만 계속된다.”**

차가운 전자음, 둔탁한 기계 리듬, 낡은 철도의 울림을 중심으로 한다. 전투에서는 이동을 밀어주는 박자를 유지하고, 메뉴와 오프닝에서는 빈 공간과 불편한 정적을 강조한다. 모든 BGM은 가사·보컬 없이 제작한다.

현재 적은 빈 우비, 달리는 우산, 접힌 영수증, 결박 가방, 절단 셔터처럼 생활용품과 폐기물의 모습을 사용한다. 효과음도 이 재질을 반영한다. 모든 적을 금속 로봇 소리로 통일하거나 생물의 비명·고어 효과를 넣지 않는다.

| 요소 | 권장 방향 |
| --- | --- |
| 음악 장르 | 다크 앰비언트 + 절제된 인더스트리얼 전자음악 + 생존 액션용 반복 리듬 |
| 공통 음색 | 낮은 아날로그 신스, 먹먹한 금속 타격, 철도 리듬을 연상시키는 펄스, 가공한 전기피아노·벨 |
| 기억에 남는 요소 | 자체 제작한 짧은 3음 신호. 타이틀에서는 느리게, 보스에서는 거칠게, 승리에서는 조금 열린 화음으로 사용 |
| 전투의 에너지 | 초반의 신중함 → 중반의 압박 → 후반의 추격. 음량보다 리듬 밀도와 음색으로 차이를 만든다. |
| 피할 요소 | 노래, 합창, 속삭임, 실제 안내 방송, 과도한 고음, 지속적인 사이렌, 큰 EDM 드롭, 긴 무음 브레이크 |
| 경고음 원칙 | 공격 전조와 닮은 비프·충전·경보는 BGM에 넣지 않고 효과음으로 분리 |

공통 3음은 제작 방향이다. 같은 문구를 프롬프트에 넣어도 Suno가 서로 다른 곡에서 같은 선율을 재현한다고 보장할 수 없다. 최종적으로 같은 선율이 필요하면 먼저 고른 3음 원본을 편집 단계에서 재사용한다. 실제 철도회사 도착음이나 알려진 곡의 멜로디는 참조하지 않는다.

## 2. 현재 게임과 연결되는 지점

기존 세계관 기획서는 분위기의 근거로, 현재 코드와 설정은 화면 흐름·전투 구성의 근거로 사용했다. 오래된 기획서의 ‘미구현’ 설명을 현재 상태로 옮기지 않았다.

- 화면 흐름: 타이틀 → 클릭식 오프닝 → 직업 선택 → 전투 → 레벨업 선택 → 승리 또는 패배 → 다시 시작.
- 직업: 철도 정비공 / 신호 기술자 / 폐기물 운반원.
- 일반 전투: 1~4, 6~9, 11~14스테이지의 세 구간.
- 보스: 5스테이지 **분실물 산**, 10스테이지 **닫힌 창구**, 15스테이지 **말소 경계**.
- 오프닝은 자동 진행하지 않는다. 장면마다 정해진 초에 음악이 터지는 구성은 피한다.
- 레벨업 선택 중에는 전투 진행이 멈춘다. 음악은 작게 이어가도록 적용했다.
- 현재 `src/audio/`의 재생 관리와 각 시스템의 실제 이벤트를 연결했다. 아래 설계안 중 실제 적용 여부는 문서 상단에서 구분한다.

참조한 주요 파일: `src/scenes/TitleScene.ts`, `src/scenes/GameScene.ts`, `src/ui/GameOverlay.ts`, `src/config/opening.ts`, `src/config/encounters.ts`, `src/config/characters.ts`, `src/config/characterWeapons.ts`, `src/config/skills.ts`, `src/config/enemyRoster.ts`, `src/config/enemyAttacks.ts`, `docs/게임_기획서.md`.

## 3. BGM 목록 — 반복곡 7개 + 제작된 결과 큐 2개

**타이틀·오프닝·직업 선택은 M01 한 곡을 끊지 않고 사용한다.** 별도 오프닝곡 M02는 제거했으며, 다른 곡의 ID는 유지했다. BGM은 긴 곡 대신 **4/4박자 16마디, 약 29~53초의 짧은 루프**를 목표로 한다. 전투곡은 각 스테이지 시작마다 처음부터 다시 틀지 않고 해당 구간 동안 이어서 재생한다.

| ID / 파일명 기준 | 곡명 | 사용 위치 | BPM 목표 | 편집 길이 | 형태 |
| --- | --- | --- | --- | --- | --- |
| M01 `bgm_title_null_line` | 이름 없는 노선 | 타이틀·오프닝·직업 선택 공용 | 72 | 약 53초 / 16마디 | 루프 |
| M03 `bgm_combat_01_collection` | 회수 절차 개시 | 1~4스테이지 | 100 | 약 38초 / 16마디 | 루프 |
| M04 `bgm_combat_02_sorting` | 분류 대기열 | 6~9스테이지 | 112 | 약 34초 / 16마디 | 루프 |
| M05 `bgm_combat_03_boundary` | 말소선 접근 | 11~14스테이지 | 124 | 약 31초 / 16마디 | 루프 |
| M06 `bgm_boss_01_lost_property` | 분실물 산 | 5스테이지 보스 | 108 | 약 36초 / 16마디 | 루프 |
| M07 `bgm_boss_02_closed_counter` | 닫힌 창구 | 10스테이지 보스 | 116 | 약 33초 / 16마디 | 루프 |
| M08 `bgm_boss_03_erasure` | 말소 경계 | 15스테이지 보스 | 132 | 약 29초 / 16마디 | 루프 |
| M09 `cue_victory_still_alive` | 나는 아직 살아 있었다 | 최종 승리 화면 진입 | 자유 | 약 2.37초 / WAV 제작됨 | 한 번 재생 |
| M10 `cue_defeat_record_closed` | 처리 완료 | 패배 화면 진입 | 자유 | 약 1.47초 / WAV 제작됨 | 한 번 재생 |

직업마다 별도 BGM을 만들 필요는 없다. 같은 전장의 음악을 공유하고, 무기 효과음으로 직업의 개성을 표현한다. 레벨업도 전용 반복곡 대신 짧은 알림과 기존 음악의 음량 조절로 처리한다.

## 4. Suno에서 제작하는 방법

### 짧은 BGM은 Sounds / Loop부터 시도

Create → **Sounds → Loop**를 선택하고 아래 프롬프트를 입력한다. BPM 입력란이 있으면 곡 표의 값도 입력한다. 공식 안내는 Sounds의 One Shot/Loop와 BPM·Key 설정을 설명한다. 짧은 음악 루프를 우선 시도하는 것은 이 기능에 맞춘 제작 제안이다. [Suno Sounds 공식 안내](https://help.suno.com/en/articles/10625537)

기존 프롬프트의 120~180초 등 긴 구간 요청을 제거하고, **16마디·한 패턴·인트로와 엔딩 없는 반복 구간**으로 수정했다. 다만 프롬프트는 파일 길이를 강제하는 설정이 아니다. 새 요청으로도 3분이 나오면 시간 문구만 바꿔 반복 생성하지 말고, 안정적인 16마디를 골라 잘라 루프로 편집한다. 표의 초 수는 BPM을 지켰을 때의 계산값이다.

Sounds의 결과가 너무 단순하거나 해당 메뉴가 없다면 일반 Create의 **Instrumental**로 같은 프롬프트를 사용한 뒤 16마디를 추출한다. 이 경로에서는 전체 생성 길이가 길어질 수 있다. [Suno Instrumental 안내](https://suno.com/tools/instrumental-generator)

제외 항목 입력란이 제공되면 다음 문구를 공통으로 사용할 수 있다. 해당 입력란이 없으면 프롬프트 끝의 제외 설명만 사용한다.

```text
vocals, lyrics, spoken words, whispers, choir, heroic brass, big EDM drops, piercing hi-hats, harsh alarms, long silent breaks
```

### 효과음은 제작한 WAV 사용

효과음 55개와 결과 큐 2개는 외부 녹음 없이 오실레이터·필터링한 노이즈·금속 공명·감쇠 포락선을 조합해 직접 합성했다. 별도 Suno 생성이 필요 없다. 전부 **48kHz / 16-bit / mono PCM WAV**이며, 시작·끝 페이드와 낮은 신호 뒤의 여백 정리를 적용했다. 환경음 3개는 선택 제작안으로 남겨 둔다.

## 5. BGM별 복사용 프롬프트

### M01 — 이름 없는 노선

빈 역의 안내판과 클릭식 이야기 화면에서 함께 사용하는 한 곡. 타이틀에서 오프닝으로 넘어가거나 페이지를 바꿔도 같은 재생 위치를 이어간다. 읽는 동안 정해진 시점의 클라이맥스가 발생하지 않게 한다.

```text
Short instrumental game menu and story loop. 16 bars only, 4/4, 72 BPM, approximately 53 seconds. Empty dystopian railway station, cold dark ambient electronica. Soft low synth, muted electric piano, sparse original three-note motif, faint metal resonance. One quiet repeating pattern, steady low intensity suitable for reading. Start directly in the texture; return to the opening texture at the loop boundary. No intro, outro, climax, song sections, vocals, speech, alarms or silence.
```

### M03 — 회수 절차 개시

초반 전투. 공격 리듬을 살리되 경고음·타격음이 앞에 들릴 공간을 둔다.

```text
Short instrumental survival combat loop. 16 bars only, 4/4, 100 BPM, approximately 38 seconds. Minimal dark industrial electronica, muted kick, dry mechanical percussion, low analog bass pulse, sparse metallic motif. Cautious forward motion with space for weapon sounds. One stable repeating groove, start on the first beat, loop back to the same groove. No intro, outro, verse, chorus, drop, breakdown, vocals, speech, alarms or silence.
```

### M04 — 분류 대기열

방패·폭발·소환 적이 섞이는 중반. 저음 볼륨을 키우기보다 리듬이 촘촘해지는 느낌으로 차이를 낸다.

```text
Short instrumental industrial breakbeat combat loop. 16 bars only, 4/4, 112 BPM, approximately 34 seconds. Cold automated sorting machinery, tight bass sequence, muted snare, dry mechanical clicks, short low synth stabs. Moderate rhythmic density, sparse melody, smooth highs, space for warning effects. One repeating groove, immediate beat, return to the beginning without a final chord. No intro, outro, song sections, drop, breakdown, vocals, speech, alarms or silence.
```

### M05 — 말소선 접근

인양·절단선·차폐가 겹치는 후반. 속도감은 올리되 고음과 경보를 계속 쌓지 않는다.

```text
Short instrumental late-game combat loop. 16 bars only, 4/4, 124 BPM, approximately 31 seconds. Urgent dark industrial electronics, rolling low synth sequence, tight kick, clipped metal percussion, restrained tense chords. Focused pursuit through a deserted railway system. One driving repeated pattern, smooth highs, space for danger cues. Immediate groove, loopable ending matching the start. No intro, outro, song sections, drop, breakdown, vocals, speech, alarms or silence.
```

### M06 — 분실물 산

무겁고 둔탁한 압박. 물건 더미가 밀려오는 느낌을 만들되 실제 낙하 충돌음은 음악에 넣지 않는다.

```text
Short instrumental boss loop, Lost Property Mountain. 16 bars only, 4/4, 108 BPM, approximately 36 seconds. Heavy industrial downtempo with a lumbering half-time feel, dense low synth pulses, damped metal drums, rough low strings. Crushing weight, steady pressure, clear gaps for impact warnings. One repeating pattern, immediate rhythm, ending returns to the first bar. No intro, outro, song sections, climax, breakdown, vocals, screams, alarms or silence.
```

### M07 — 닫힌 창구

창구의 무심한 처리와 지휘를 규칙적인 박자로 표현한다. M06보다 가볍고 정확하며 차갑게 들리도록 한다.

```text
Short instrumental boss loop, Closed Counter. 16 bars only, 4/4, 116 BPM, approximately 33 seconds. Precise cold industrial electronics, dry office-machine clacks, clipped bass, narrow metallic chords, sparse detuned bell notes. Impersonal bureaucratic authority. One exact repetitive groove with restrained syncopation, room for command effects. Start in rhythm, loop back without resolution. No intro, outro, song sections, drop, breakdown, vocals, speech, alarms or silence.
```

### M08 — 말소 경계

최종 보스. 큰 소리로만 구별하지 않고 공통 모티프와 더 단단한 리듬으로 결전의 느낌을 만든다.

```text
Short instrumental final boss combat loop. 16 bars only, 4/4, 132 BPM, approximately 29 seconds. Relentless industrial electronics, tight drums, controlled distorted bass, pulsing low strings, cold metallic chords, sparse original three-note motif. Oppressive and defiant, smooth highs, space for danger cues. One intense repeating pattern, immediate first beat, ending connects to the opening groove. No intro, outro, song sections, climax, drop, breakdown, vocals, choir, alarms or silence.
```

### M09 — 나는 아직 살아 있었다

직접 제작한 짧은 3음 상승 큐. 환호보다 ‘살아남았다’는 안도감으로 구성했다. [WAV 파일](../public/assets/audio/cues/cue_victory_still_alive.wav). Suno에서 따로 만들 필요 없다.

### M10 — 처리 완료

직접 제작한 짧은 3음 하강 큐. 작은 기계 클릭과 저음으로 기록이 닫히는 느낌을 구성했다. [WAV 파일](../public/assets/audio/cues/cue_defeat_record_closed.wav). 피격음과 겹치면 조금 늦게 재생하는 안을 사용한다.

## 6. 제작한 효과음 55개

아래 표의 파일은 모두 생성했다. 현재는 각 항목당 1개이며 변형 2~3개 제작은 후속 선택사항이다. 길이는 실제 WAV 측정값이다. 모든 파일은 한 번의 동작을 담으며, 음악·대사·긴 배경음을 포함하지 않는다.

- 원본 합성 스크립트: `scripts/generate-sfx.cjs`. `node scripts/generate-sfx.cjs --check`로 파일 규격·길이·여백·피크·목록 일치·재현성을 검사한다.

우선순위는 **P0: 첫 적용에 필요한 핵심**, **P1: 전투 종류를 구별하는 소리**, **P2: 분위기 보강**이다. P1도 전체 제작 목록에 포함된다. 예산이 적으면 P0부터 만든다.

### 6.1 UI·성장·플레이어 상태

| ID / 파일명 기준 | 우선 | 사용 순간·느낌 | 실제 길이 | 제작 파일 |
| --- | --- | --- | --- | --- |
| U01 `ui_focus` | P2 | 버튼·카드에 새로 초점이 들어옴. 아주 작게 | 0.090초 | [WAV](../public/assets/audio/sfx/ui_focus.wav) |
| U02 `ui_confirm` | P0 | 시작·직업·스킬 선택 확정 | 0.229초 | [WAV](../public/assets/audio/sfx/ui_confirm.wav) |
| U03 `ui_page` | P2 | 오프닝 이전·다음 | 0.212초 | [WAV](../public/assets/audio/sfx/ui_page.wav) |
| U04 `level_up` | P0 | 레벨업 선택창 진입 | 0.950초 | [WAV](../public/assets/audio/sfx/level_up.wav) |
| U05 `xp_pickup` | P0 | 경험치 실제 획득 | 0.113초 | [WAV](../public/assets/audio/sfx/xp_pickup.wav) |
| U06 `player_hit` | P0 | 실제 HP 피해 | 0.219초 | [WAV](../public/assets/audio/sfx/player_hit.wav) |
| U07 `shield_gain` | P1 | 보호막 새 획득 | 0.420초 | [WAV](../public/assets/audio/sfx/shield_gain.wav) |
| U08 `shield_hit` | P1 | 보호막으로 피해 흡수 | 0.161초 | [WAV](../public/assets/audio/sfx/shield_hit.wav) |
| U09 `shield_break` | P1 | 보호막 소진 | 0.316초 | [WAV](../public/assets/audio/sfx/shield_break.wav) |
| U10 `heal` | P1 | 회복·응급 수리 | 0.450초 | [WAV](../public/assets/audio/sfx/heal.wav) |
| U11 `magnet_collect` | P1 | 주변 회수 보급 선택 | 0.572초 | [WAV](../public/assets/audio/sfx/magnet_collect.wav) |
| U12 `charge_ready` | P1 | 이동 충전으로 다음 공격 강화 준비 | 0.230초 | [WAV](../public/assets/audio/sfx/charge_ready.wav) |

효과가 유지되는 매 프레임마다 소리를 내지 않는다. 보호막 갱신·회복·경험치가 한꺼번에 발생하면 묶어서 재생한다. 저체력 반복 경보는 초기 구성에서 제외한다. 전투 전조와 혼동되고 피로도가 높아질 수 있기 때문이다.

### 6.2 직업별 주무기

| ID / 파일명 기준 | 우선 | 사용 순간·느낌 | 실제 길이 | 제작 파일 |
| --- | --- | --- | --- | --- |
| W01 `mechanic_cutter` | P0 | 회전 절단기 1회 시작 | 0.440초 | [WAV](../public/assets/audio/sfx/mechanic_cutter.wav) |
| W02 `mechanic_strong` | P0 | 강타 적중. 일반 타격음을 대체 | 0.345초 | [WAV](../public/assets/audio/sfx/mechanic_strong.wav) |
| W03 `signal_discharge` | P0 | 연쇄 방전 시작 | 0.250초 | [WAV](../public/assets/audio/sfx/signal_discharge.wav) |
| W04 `signal_chain` | P1 | 전이 연결을 작게 강조 | 0.090초 | [WAV](../public/assets/audio/sfx/signal_chain.wav) |
| W05 `carrier_place` | P0 | 폐배터리 함정 설치 | 0.208초 | [WAV](../public/assets/audio/sfx/carrier_place.wav) |
| W06 `carrier_arm` | P2 | 함정 감지 준비 완료 | 0.090초 | [WAV](../public/assets/audio/sfx/carrier_arm.wav) |
| W07 `carrier_blast` | P0 | 함정 폭발 | 0.379초 | [WAV](../public/assets/audio/sfx/carrier_blast.wav) |
| W08 `carrier_blast_charged` | P1 | 강화 함정 폭발. 일반 폭발음을 대체 | 0.556초 | [WAV](../public/assets/audio/sfx/carrier_blast_charged.wav) |

주무기 발생음과 실제 적중음은 분리한다. 회전 절단기는 여러 적을 맞혀도 시작음을 한 번만 재생하고, 강타도 공격 한 번의 첫 적중에서만 강조한다. 연쇄 방전은 전이 대상 수만큼 같은 크기의 소리를 쌓지 않는다.

### 6.3 보조 공격 — 12개 스킬의 소리를 계열로 공유

| ID / 파일명 기준 | 우선 | 적용 스킬 | 실제 길이 | 제작 파일 |
| --- | --- | --- | --- | --- |
| A01 `weld_spark` | P1 | 용접 불꽃 | 0.221초 | [WAV](../public/assets/audio/sfx/weld_spark.wav) |
| A02 `pressure_pulse` | P1 | 비상 충격파·비상 방출 | 0.356초 | [WAV](../public/assets/audio/sfx/pressure_pulse.wav) |
| A03 `saw_throw` | P1 | 투척 톱날 | 0.350초 | [WAV](../public/assets/audio/sfx/saw_throw.wav) |
| A04 `heat_zone_start` | P1 | 용접 잔열 생성 | 0.477초 | [WAV](../public/assets/audio/sfx/heat_zone_start.wav) |
| A05 `electric_pulse` | P1 | 접지 펄스 | 0.338초 | [WAV](../public/assets/audio/sfx/electric_pulse.wav) |
| A06 `spark_shot` | P1 | 유도 스파크 | 0.180초 | [WAV](../public/assets/audio/sfx/spark_shot.wav) |
| A07 `beacon_start` | P1 | 전자기 비콘 생성 | 0.480초 | [WAV](../public/assets/audio/sfx/beacon_start.wav) |
| A08 `capacitor_blast` | P1 | 축전 폭탄·차단 방전 | 0.303초 | [WAV](../public/assets/audio/sfx/capacitor_blast.wav) |
| A09 `scrap_scatter` | P1 | 파편 주머니 | 0.297초 | [WAV](../public/assets/audio/sfx/scrap_scatter.wav) |
| A10 `leak_start` | P1 | 누출 흔적 생성 | 0.437초 | [WAV](../public/assets/audio/sfx/leak_start.wav) |
| A11 `waste_shot` | P1 | 압축 폐기탄 | 0.209초 | [WAV](../public/assets/audio/sfx/waste_shot.wav) |

장판은 생성 시에만 소리를 내고 피해 틱마다 반복하지 않는 구성을 우선한다. 축전 폭탄 발사는 A06, 폭발은 A08을 재사용한다. 단순 피해·사거리·속도 증가에는 별도 효과음을 만들지 않는다.

### 6.4 적 피격·공격·위험 신호

| ID / 파일명 기준 | 우선 | 사용 순간·대상 | 실제 길이 | 제작 파일 |
| --- | --- | --- | --- | --- |
| E01 `enemy_hit_soft` | P0 | 우비·종이·포대 계열 적중 | 0.150초 | [WAV](../public/assets/audio/sfx/enemy_hit_soft.wav) |
| E02 `enemy_hit_metal` | P1 | 셔터·광고판 계열 적중 | 0.170초 | [WAV](../public/assets/audio/sfx/enemy_hit_metal.wav) |
| E03 `enemy_guard` | P1 | 정면 방어·차폐로 피해 감소 | 0.220초 | [WAV](../public/assets/audio/sfx/enemy_guard.wav) |
| E04 `enemy_defeat` | P0 | 일반 적 처치 | 0.346초 | [WAV](../public/assets/audio/sfx/enemy_defeat.wav) |
| E05 `enemy_melee` | P1 | 근접 휘두르기 | 0.239초 | [WAV](../public/assets/audio/sfx/enemy_melee.wav) |
| E06 `paper_shot` | P1 | 영수증·승차권·검표 부채 발사 | 0.140초 | [WAV](../public/assets/audio/sfx/paper_shot.wav) |
| E07 `ground_warning` | P0 | 낙하·범위 공격 위치 표시 시작 | 0.260초 | [WAV](../public/assets/audio/sfx/ground_warning.wav) |
| E08 `wet_impact` | P1 | 빗물 주머니 낙하 | 0.393초 | [WAV](../public/assets/audio/sfx/wet_impact.wav) |
| E09 `charge_warning` | P0 | 결박 가방·보스 돌진 준비 | 0.420초 | [WAV](../public/assets/audio/sfx/charge_warning.wav) |
| E10 `charge_release` | P1 | 돌진 시작 | 0.328초 | [WAV](../public/assets/audio/sfx/charge_release.wav) |
| E11 `explosion_warning` | P0 | 밀봉 봉투·분열 폭발 준비 | 0.428초 | [WAV](../public/assets/audio/sfx/explosion_warning.wav) |
| E12 `packet_burst` | P1 | 봉투 폭발·분열 폭탄 폭발 | 0.328초 | [WAV](../public/assets/audio/sfx/packet_burst.wav) |
| E13 `summon_open` | P1 | 주머니·둥지·보스 증원 등장 | 0.576초 | [WAV](../public/assets/audio/sfx/summon_open.wav) |
| E14 `hook_warning` | P0 | 매듭 포대 인양 준비 | 0.359초 | [WAV](../public/assets/audio/sfx/hook_warning.wav) |
| E15 `hook_release` | P1 | 인양 갈고리 발사 | 0.398초 | [WAV](../public/assets/audio/sfx/hook_release.wav) |
| E16 `beam_warning` | P0 | 절단 셔터·보스 절단선 준비 | 0.520초 | [WAV](../public/assets/audio/sfx/beam_warning.wav) |
| E17 `beam_release` | P1 | 절단선 활성화 | 0.458초 | [WAV](../public/assets/audio/sfx/beam_release.wav) |
| E18 `enemy_shield` | P1 | 반사 포장막 차폐 연결 시작 | 0.469초 | [WAV](../public/assets/audio/sfx/enemy_shield.wav) |
| E19 `boss_stamp` | P1 | 말소 경계 낙하 판정 | 0.474초 | [WAV](../public/assets/audio/sfx/boss_stamp.wav) |
| E20 `boss_command` | P1 | 닫힌 창구 지휘 발동 | 0.616초 | [WAV](../public/assets/audio/sfx/boss_command.wav) |

E07·E09·E11·E14·E16은 전조가 시작될 때 재생한다. 샘플 길이는 실제 공격 판정 시간을 결정하지 않는다. 전조의 전체 길이는 현재 공격 설정을 따라가고, 긴 준비 동안 소리를 무작정 반복하지 않는다. X01·X03의 두 번째 공격은 실제 두 번째 전조에서 다시 신호를 준다.

연속탄은 실제 발사 시점마다 E06을 재생하되 작게 제한한다. 부채꼴 동시 발사는 탄 하나마다 재생하지 않고 발사 묶음당 한 번만 낸다. 보스의 공통 공격은 위 효과음을 재사용하되 낮은 음색의 별도 변형을 고를 수 있다.

### 6.5 진행·등장 연출

| ID / 파일명 기준 | 우선 | 사용 순간 | 실제 길이 | 제작 파일 |
| --- | --- | --- | --- | --- |
| T01 `wave_start` | P1 | 다음 웨이브 실제 진입 | 0.426초 | [WAV](../public/assets/audio/sfx/wave_start.wav) |
| T02 `boss_enter` | P0 | 보스 등장 | 1.269초 | [WAV](../public/assets/audio/sfx/boss_enter.wav) |
| T03 `boss_phase` | P1 | 보스 단계 전환 | 0.670초 | [WAV](../public/assets/audio/sfx/boss_phase.wav) |
| T04 `boss_defeat` | P0 | 중간 보스 처치 | 1.477초 | [WAV](../public/assets/audio/sfx/boss_defeat.wav) |

최종 보스에서는 T04와 M09를 동시에 크게 틀지 않는다. T04의 첫 충돌 후 약 0.5초 뒤 M09를 시작하는 안으로 먼저 비교한다. 일반 웨이브마다 승리 팡파르를 넣지 않는다.

## 7. 환경음 — 선택 제작 3개

**Sounds / Loop.** 아래는 P2다. 곡처럼 박자가 있는 배경음이 섞이면 다시 생성한다. 전투에서는 음악과 효과음이 먼저 들리도록 매우 작게 사용한다.

| ID / 파일명 기준 | 사용 위치 | 편집 목표 | 복사용 영문 프롬프트 |
| --- | --- | --- | --- |
| N01 `amb_empty_station` | 타이틀·직업 선택·결과 화면 | 30~60초 루프 | Empty underground station room tone, faint ventilation hum, distant electrical cabinet resonance, very soft broad tunnel air. Static quiet perspective, continuous loopable texture, no people, no voices, no footsteps, no music, no sudden events. |
| N02 `amb_rail_tunnel` | 오프닝 회수 열차 장면에 선택적으로 사용 | 20~40초 루프 | Distant freight railway rumble heard through a concrete tunnel, soft low wheel texture and broad air movement, far away and steady, no distinct approach or departure. Continuous ambient loop, no horn, no bells, no announcements, no rhythm track, no music. |
| N03 `amb_service_district` | 전투 공간 공용 | 30~60초 루프 | Quiet deserted industrial service district, distant ventilation machinery, soft electrical transformer hum and faint broad outdoor air. Stable restrained ambient bed, no discrete impacts, no voices, no creatures, no sirens, no music, suitable for looping. |

정확한 한국어 안내 대사는 이번 기본 제작 목록에 포함하지 않는다. 문구 전달이 필요해지면 오프닝의 확정 텍스트를 별도 음성 트랙으로 제작하는 편이 편집과 타이밍 관리에 적합하다. BGM 생성 프롬프트에 대사를 섞지 않는다.

## 8. 화면별 재생·전환 제안

| 상황 | 제안 동작 |
| --- | --- |
| 타이틀 첫 진입 | 브라우저에서 오디오 시작이 허용된 뒤 M01 재생. 첫 클릭 전 무음일 수 있는 진입도 실제 브라우저에서 확인 |
| 시작 → 오프닝 | M01의 재생 위치와 음량을 유지. 곡 교체·재시작 없음 |
| 오프닝 페이지 이동 | M01 유지. U03만 작게 재생. 열차 페이지에서는 N02를 선택적으로 더함 |
| 오프닝 종료·건너뛰기 | N02를 썼다면 정리하고, 직업 선택에서도 M01을 그대로 이어감 |
| 직업 선택 확정 | U02 → M03으로 약 0.8초 전환 |
| 같은 일반 구간의 다음 웨이브·스테이지 | 현재 음악을 이어감. 새 웨이브 진입 때 T01을 작게 사용 |
| 보스 등장 | T02 한 번, 일반 전투곡에서 해당 보스곡으로 약 0.5초 전환 |
| 보스 단계 전환 | 보스곡 유지, T03 한 번. 단계마다 BGM을 처음부터 다시 틀지 않음 |
| 중간 보스 격파 | T04, 보스곡 약 0.5초 감쇠. 다음 일반 구간이 실제 시작할 때 M04 또는 M05 진입 |
| 레벨업 선택 | U04, 현재 음악을 약 8dB 낮추고 계속 재생. 진행 중이던 공격·전조 소리는 일시정지하고 선택 확정 후 같은 위치에서 재개하는 안을 우선 검토 |
| 연속 레벨업 선택 | 낮춘 음악을 유지. 카드 한 장 선택마다 전투 음량으로 올렸다 내리지 않음 |
| 패배 | 전투 루프·예약 전조를 정리하고 M10 한 번. 이후 N01만 작게 남김 |
| 최종 승리 | 전투 루프·예약 전조 정리, T04 후 M09 한 번. 이후 N01만 작게 남김 |
| 다시 시작 | 이전 곡·환경음·남은 효과음 정리 후 직업 선택 M01. 중복 재생 방지 |

일반곡·보스곡 간 크로스페이드는 서로 다른 BPM에서도 안전하게 들리는 구간으로 편집한다. 처음부터 비트가 완벽하게 맞는 적응형 음악을 전제하지 않는다. 중간 보스 이후 결과 화면이나 열차 거점이 있는 것으로 가정하지 않는다.

## 9. 반복 재생과 믹싱 기준

### 게임에 넣기 전 편집

1. **BGM:** 긴 인트로·엔딩을 제외하고 일정한 에너지의 구간을 고른다. 실제 박자를 확인해 마디 경계에서 자르고, 잔향이 다음 시작에 자연스럽게 이어지도록 편집한다.
2. **환경음:** 시작과 끝의 질감·음량을 맞추고 적절한 겹침을 만든다. 갑작스러운 열차 접근 같은 사건이 반복되지 않게 한다.
3. **효과음:** 제작본에 시작·끝 페이드와 뒷부분 여백 정리를 적용했다. 실제 재생에서 타격의 첫 순간과 끝부분이 자연스러운지는 청취로 확인한다.
4. **보관:** 다운로드 가능한 원본을 보관하고 편집본을 별도로 만든다. 원본이 압축 파일이면 WAV로 바꿔도 원래 품질이 복원되는 것은 아니다.
5. **게임용 파일:** BGM·환경음은 루프 연결을 실제 대상 브라우저에서 확인한 포맷을 사용한다. 짧은 효과음은 WAV를 우선 후보로 삼되 실제 로딩 크기도 확인한다.

프롬프트의 `loop`는 요구 방향이며 완성 검증을 대신하지 않는다. 최소 5회 이어 들어 음악의 끝맺음, 클릭, 무음, 잔향 단절, 반복할 때 튀는 강조음을 확인한다.

### 소리의 우선순위

**공격 경고·플레이어 피격 → 주요 무기·실제 적중 → 성장·UI → BGM → 환경음** 순으로 읽히게 한다. 최종 음량은 실제 플레이 청취로 정한다.

| 항목 | 적용 검토용 시작값·규칙 |
| --- | --- |
| BGM 음량 | 주요 무기 효과음이 앞에 들리게 설정. 원본 음량 차이를 먼저 정리한 뒤 비교 |
| 레벨업 | BGM 약 -8dB, 선택 완료 후 약 0.3초에 걸쳐 복귀 |
| 보스 등장·중요 알림 | 필요하면 음악만 약 3~5dB 낮추고 0.5~1초 안에 복귀. 일반 공격마다 적용하지 않음 |
| 일반 적중·처치 | 같은 계열 소리가 50~80ms 안에 겹치면 대표 소리만 재생하는 방식부터 비교 |
| 경험치 | 60~100ms 안의 획득을 묶음 처리. 대량 회수 시 수십 개를 동시에 재생하지 않음 |
| 연쇄 방전 | 첫 방전은 명확히, 전이음은 최대 2~3개만 작게 강조 |
| 일반 효과음 동시 재생 | 일반 소리 약 8~12개부터 시험. 필수 전조·플레이어 피격은 별도 우선권 확보 |
| 경고 동시 발생 | 가까운 위험·곧 판정되는 위험 우선. 일반 소리 제한 때문에 필수 경고가 잘리지 않도록 설계 |
| 공간감 | 월드 소리는 거리 감쇠와 좌우 방향을 약하게 반영. UI는 중앙. 화면 밖 위험은 무조건 무음으로 처리하지 않음 |
| 변형 | 일반 타격·처치만 미세한 음높이 변화를 검토. 전조는 일정한 음색을 유지해 의미를 학습할 수 있게 함 |

위 수치는 아직 청취로 검증하지 않은 시작점이다. 소리가 많을 때 무조건 전체 음량을 키우지 말고 중복 수, 잔향, 고음 밀도를 먼저 줄인다.

## 10. 제작 순서

### 1차 — BGM 제작과 효과음 비교

1. M01 타이틀·오프닝 공용과 M03 초반 전투를 짧은 루프로 제작한다.
2. 제작한 W01 절단기, W03 방전, W07 배터리 폭발, U06 피격, E07 범위 경고를 먼저 들어본다.
3. 효과음을 전투곡 위에 겹쳐 들어 음색과 가독성을 판단한다. 이 단계에서 고음·저음·잔향의 방향을 정한다.

### 2차 — 한 판의 시작부터 끝까지 채우기

1. M08 최종 보스와 M04~M07을 제작해 일반 전투 3구간과 보스 3종의 차이를 완성한다.
2. 제작된 P0 효과음과 M09 승리·M10 패배 큐의 음량을 BGM에 맞춘다.
3. 승인된 게임 연결 작업에서 실제 전환·반복·전조 타이밍을 확인한다.

### 3차 — 세부 구별과 분위기

1. 제작된 P1 효과음으로 보조 공격·적 공격·보호막·보급의 구별을 확인한다.
2. 자주 반복되는 소리는 실제 청취 후 필요한 경우 2~3개 변형을 추가한다. 현재 변형은 미제작이다.
3. P2 UI는 제작본을 사용한다. 환경음은 필요할 때 별도 제작하고, 실제 전투에서 불필요하게 복잡해지면 줄인다.

최소 방향 검증은 **M01·M03 두 곡과 대표 효과음 다섯 종류**로 시작한다. 전체 구성은 **반복 BGM 7개, 제작된 결과 큐 2개, 제작된 효과음 55개, 선택 환경음 3개**다.

## 11. 제작 파일과 확인 범위

효과음·결과 큐·임시 BGM을 게임에 연결했다. 환경음은 아직 적용하지 않았다.

```text
public/assets/audio/
  cues/     cue_victory_still_alive.wav 등 결과 큐 2개 — 생성됨
  sfx/      mechanic_cutter.wav 등 효과음 55개 — 생성됨
  bgm/      공용 메뉴곡·일반 전투·보스곡 7개 — 임시곡 생성 및 적용
  ambience/ 환경음 — 미제작
docs/audio/
  sfx-manifest.json       파일별 길이·레벨·해시
```

효과음은 파일별 ID, 길이, 피크·평균 레벨, 앞뒤 여백, SHA-256을 기록했다. `scripts/generate-sfx.cjs`로 동일 파일을 재생성할 수 있다. BGM은 제작 후 Suno 원본 링크, 프롬프트, 채택 버전과 루프 구간을 기록한다.

완료 판정은 파일 생성 여부가 아니라 아래 청취와 실제 화면 확인으로 한다.

- 타이틀 → 오프닝 → 건너뛰기 → 직업 선택 → 전투에서 곡이 중복되지 않는가.
- 오프닝 각 장을 오래 읽어도 클라이맥스가 먼저 끝나거나 음악이 끊기지 않는가.
- 3개 직업의 주무기를 눈을 감아도 구분할 수 있는가.
- 적이 몰려도 범위·돌진·폭발·인양·절단 전조가 구별되는가.
- 연쇄 방전·함정 다중 폭발·경험치 대량 흡수에서 소리가 뭉개지지 않는가.
- 레벨업 중 공격음과 전조가 엉뚱하게 계속 재생되지 않고, 복귀 후 판정 시점과 맞는가.
- 보스 등장·단계 전환·처치·패배·재시작 때 이전 효과음이 남지 않는가.
- 모든 루프를 5회 반복해도 경계가 튀지 않는가.
- 헤드폰과 일반 스피커에서 낮은 음량으로도 위험 신호가 들리는가.

**적용 검증 (2026-10-24):** 기존 테스트 155개를 유지하고 오디오 회귀·통합 테스트 13개를 추가했다. `npm.cmd test` 168개 통과, `npm.cmd run build` 통과. 빌드에는 500kB 초과 번들 경고가 남아 있다. BGM 7개는 FFmpeg 전체 디코딩을 통과했다.

실제 브라우저의 일반 시작 경로와 `tests/audio-browser.html` 통합 검증 화면에서 음원 64개 로드, 오디오 신호 출력, 메뉴곡 유지, 전투·보스곡 전환, 연속 레벨업 선택 중 감쇠 유지, 승리·패배·재시작 정리를 확인했다. 통합 화면에서는 보스와 결과 상태로 직접 이동했으며, 15스테이지 전체를 수동 완주한 검사는 아니다. 버튼 포커스 직후 확인음 누락, 접근성 클릭 시 오디오 잠금, 보스 진입음이 일반 웨이브 알림에 막히는 경우를 재현하고 수정했다.

현재 오디오 확인 경로는 `tests/audio-browser.html`이다. 이전 일회성 녹음·미리듣기·ZIP은 제거했다. 청각적 취향, 모든 루프의 5회 반복 청취, 장시간 피로도와 기기별 위험 신호 구별은 아직 검증하지 않았다.
