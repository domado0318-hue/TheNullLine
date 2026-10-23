제작 자료 안내 (2026-10-24)

public/assets/는 현재 게임에서 사용하는 파일만 보관합니다.
images/는 현재 사용본의 재제작에 필요한 원본과 제작 기록만 보관합니다.
이전 이미지 버전, 미선택 단독 시안, 일회성 확인 화면은 제거했습니다.

players/source/       걷기 패킹 원본 PNG·승인 좌표 JSON 3쌍
players/portraits/    선택창 추출 원본 비교판 3장
players/portrait-extraction.json  선택 위치·추출 좌표·여백 기록
fonts/               WOFF2 제작용 OTF 원본
backgrounds/         현재 배경 15장·말소 표식·소품 9종의 제작 기록
opening/             현재 삽화 5장의 프롬프트
title/               채택한 C 타이틀 프롬프트
ui/                  현재 무광 패널·장비 아이콘 프롬프트
effects/             현재 전투 효과 제작 프롬프트

선택창 원본은 정비공 B / 기술자 B / 운반원 A입니다.
비교판에 다른 후보가 함께 그려져 있지만 현재 추출 코드가 직접 읽는
필수 원본입니다. 이미지 수정 보류에 따라 비교판 픽셀은 변경하지 않았습니다.
새 아트는 이 선택 디자인을 기준으로 하며, 기존 걷기 시트가 아트 품질
승인 자료인 것은 아닙니다.

node scripts/pack-player-atlases.cjs
  players/source/의 PNG와 현재 JSON으로 배포 시트를 패킹합니다.
  옛 좌표 재계산 스크립트는 현재 결과와 달라 제거했습니다.
node scripts/extract-selection-portraits.cjs
  players/portraits/의 원본에서 현재 선택창 PNG를 추출합니다.
tests/asset-sources.test.cjs는 두 명령을 임시 폴더에서 실행하고 현재
배포 PNG의 RGBA 픽셀과 아틀라스·추출 JSON의 일치를 확인합니다.

적은 public/assets/enemies/sheet-*.png와 JSON이 현재 기준 원본입니다.
별도의 패킹 전 원본은 보존되어 있지 않습니다. 과거 enemies/source/는
현재 적과 다른 그림을 생성하므로 해당 폴더와 옛 패커를 제거했습니다.
배경·소품·타이틀·오프닝·UI·효과도 public/assets의 현재 PNG가 기준입니다.
같은 PNG를 제작 폴더에 중복 보관하지 않습니다.

프롬프트는 제작 기록이며 같은 픽셀을 재생성하는 보장이 아닙니다.
현재 사용하지 않는 과거 참조 이미지는 삭제했고 관련 기록에 이를 표시했습니다.
소품 투명 여백의 알파 잔여물은 미해결이며 이미지 수정은 보류 중입니다.

images/는 게임 빌드에 포함되지 않습니다.
