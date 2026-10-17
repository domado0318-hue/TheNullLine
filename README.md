# 로그라이크 액션 시작 프로젝트

TypeScript와 Phaser 3, Vite로 구성한 브라우저용 2D 게임 시작 프로젝트입니다.

## 개발 환경

- Node.js: `^20.19.0 || >=22.12.0` (현재 환경: `24.19.0`)
- npm: 현재 환경 `11.17.0`
- Phaser: `3.90.0`
- TypeScript: `7.0.2`
- Vite: `8.3.4`

Vite의 Node.js 요구 사항은 [공식 문서](https://vite.dev/guide/) 및 설치 버전의 `engines` 메타데이터에서 확인할 수 있습니다. 현재 Node.js는 요구 사항을 충족합니다.

## 실행

현재 프로젝트 폴더에서 실행합니다.

```sh
npm run dev
```

브라우저에서 <http://127.0.0.1:5173/>을 엽니다. 서버 종료는 터미널에서 `Ctrl+C`를 누릅니다. 5173 포트가 사용 중이면 기존 서버를 종료하거나 `npm run dev -- --port 5174`로 다른 포트를 지정합니다.

현재 Windows PowerShell은 실행 정책 때문에 `npm.ps1`이 차단됩니다. PowerShell에서는 아래처럼 `npm.cmd`를 사용하면 됩니다. 명령 프롬프트에서는 `npm`을 그대로 사용할 수 있습니다.

```powershell
npm.cmd run dev
npm.cmd run build
```

패키지는 설치된 상태이며, 다른 환경에서 처음 설치하거나 잠금 파일 기준으로 다시 설치할 때는 `npm ci` (PowerShell: `npm.cmd ci`)를 사용합니다.

## 빌드 및 미리 보기

```sh
npm run build
npm run preview
```

`build`는 `tsc --noEmit`으로 타입을 검사한 뒤 Vite로 빌드합니다. 타입 검사 실패 시 빌드도 중단됩니다. 결과는 `dist/`에 생성됩니다. 빌드 결과 미리 보기 주소는 <http://127.0.0.1:4173/>입니다.

## 기본 화면과 구조

- 게임 내부 해상도: **1280×720**. 브라우저 크기에 맞춰 16:9 비율을 유지하면서 표시합니다.
- 어두운 배경 위에 48×48 크기의 초록색 플레이어 사각형을 `(640, 360)`에 표시합니다.
- 외부 이미지, 이동, 전투, 물리 엔진 설정은 포함하지 않습니다.

```text
src/
  main.ts               # Phaser 게임 생성과 화면 설정
  style.css             # 브라우저 화면 배치
  scenes/
    GameScene.ts        # 기본 게임 장면과 플레이어 사각형
index.html              # 브라우저 진입점
tsconfig.json           # TypeScript 엄격 모드 설정
package.json            # 의존성과 실행 스크립트
package-lock.json       # 설치한 의존성 버전 잠금
```

다음 기능은 `GameScene`의 `create()` 또는 향후 추가할 `update()`부터 확장할 수 있습니다.
