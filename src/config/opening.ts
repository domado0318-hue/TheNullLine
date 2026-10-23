export type OpeningIllustration = 'record-erasure' | 'reclaimed-lives' | 'unmapped-freight' | 'nameless-route' | 'living-outcast';
export interface OpeningPage {
  id: string;
  title: string;
  text: string;
  illustration?: OpeningIllustration;
}

export const openingConfig = {
  quote: '이 도시에서 죽음은 끝이 아니다.\n재활용의 시작일 뿐이다.', // 첫 장에 즉시 표시하는 문구
  illustrations: {
    'record-erasure': '/assets/opening/record-erasure.png', // 말소된 시민을 추적하기 시작하는 감시 장치 삽화 경로
    'reclaimed-lives': '/assets/opening/reclaimed-lives.png', // 주인 없이 재사용되는 물건과 업무 삽화 경로
    'unmapped-freight': '/assets/opening/unmapped-freight.png', // 회수 열차가 도착하는 적재장 삽화 경로
    'nameless-route': '/assets/opening/nameless-route.png', // 이름이 지워진 역사와 운행 중인 철도 삽화 경로
    'living-outcast': '/assets/opening/living-outcast.png', // 공구를 쥐고 회수 기계에 맞서는 1인칭 삽화 경로
  },
  pages: [
    { id: 'quote', title: '', text: '' },
    {
      id: 'citizens', title: '오늘부터 시민이 아니었다', illustration: 'record-erasure',
      text: '“시민 등록 말소.\n사유: 도시 운영에 불필요.”\n\n그 통보와 함께 내 이름이 지워졌다.\n감시 카메라가 천천히 내 쪽으로 돌아갔다.\n\n도시가 나를 회수 대상으로 인식하기 시작했다.',
    },
    {
      id: 'recycling', title: '내가 없어도 일은 계속된다', illustration: 'reclaimed-lives',
      text: '버려진 공구는 수리해 다시 썼다.\n작업 기록을 넘겨받은 기계는\n주인 없는 작업대에서 일을 계속했다.\n\n사람 하나를 지우는 것쯤은\n도시가 멈출 이유가 되지 않았다.',
    },
    {
      id: 'railway', title: '회수 명령', illustration: 'unmapped-freight',
      text: '“지정된 열차에 탑승하십시오.”\n\n회수 열차가 폐기 구역으로 들어왔다.\n고장 난 기계와 버려진 물건을 싣고\n자원 회수 시설로 가는 열차였다.\n\n오늘은 나도 그 화물로 분류돼 있었다.',
    },
    {
      id: 'null-line', title: 'THE NULL LINE', illustration: 'nameless-route',
      text: '공식 노선도에서 지워진 철도였다.\n기록에는 노선 이름 대신 NULL만 남았다.\n\n우리는 그 길을 ‘널 라인’이라 불렀다.\n이름이 지워진 사람들을\n폐기물과 함께 실어 나르는 길이었다.',
    },
    {
      id: 'erased', title: '나는 탑승하지 않았다', illustration: 'living-outcast',
      text: '“탑승 거부. 강제 회수를 시작합니다.”\n\n회수 기계가 내 쪽으로 움직였다.\n나는 공구를 고쳐 쥐었다.\n\n나는 아직 살아 있었다.\n도시가 내 이름을 지웠다고 해서\n내 목숨까지 내줄 생각은 없었다.',
    },
  ] as OpeningPage[], // 클릭해서 순서대로 읽는 장면 목록, 자동 진행 없음
  inputDelayMs: 200, // 연속 클릭·키 입력이 여러 장을 건너뛰지 않게 하는 최소 간격 (ms), 0 이상
  width: 1280, // 화면 배치의 기준 가로 크기 (px)
  height: 720, // 화면 배치의 기준 세로 크기 (px)
  margin: 48, // 화면 가장자리 여백 (px)
  captionWidth: 1080, // 중앙 하단 자막 최대 가로 크기 (px)
  captionBottom: 106, // 자막 아래쪽과 화면 하단 사이 거리 (px)
  captionGap: 12, // 자막 문단 사이 간격 (px)
  fadeMs: 650, // 장면·자막 등장 시간 (ms)
  driftMs: 18000, // 삽화가 천천히 확대되는 시간 (ms), 자동 넘김과 무관
  driftScale: 1.035, // 삽화 확대 최종 배율 (배)
  quoteSize: 35, // 첫 장 글귀 크기 (px)
  titleSize: 28, // 장면 제목 크기 (px)
  bodySize: 22, // 이야기 자막 크기 (px)
  labelSize: 15, // 쪽수·부가 표기 크기 (px)
  buttonSize: 18, // 이동·건너뛰기 버튼 글자 크기 (px)
  buttonWidth: 132, // 이전·다음 버튼 가로 크기 (px)
  buttonHeight: 44, // 이동·건너뛰기 버튼 세로 크기 (px)
  buttonGap: 16, // 이전·다음 버튼 사이 간격 (px)
  skipWidth: 188, // 건너뛰기 버튼 가로 크기 (px)
  depth: 1100, // HTML 이야기 화면 표시 순서 (z-index)
  colors: {
    black: '#080f12', // 화면 바탕색 (CSS)
    ink: '#102329', // 버튼·그림 영역 바탕색 (CSS)
    edge: '#486066', // 테두리·구분선 색 (CSS)
    paper: '#efe5ca', // 이야기 글자색 (CSS)
    muted: '#a7b7ae', // 쪽수·보조 글자색 (CSS)
    amber: '#d6aa59', // 강조 글자·현재 쪽 표시 색 (CSS)
  },
};
