# Harness Backport Additions

이 파일은 현재 폴더에서 확인한 harness 동작 보정, runtime 검증, E2E 관련 변경 중 원본 harness에도 반영할 후보를 분리해 둔 목록이다.

## Harness 동작 보정

- standalone harness 루트 감지
  - `scripts/harness_common.ps1`가 `harness/` 하위 배치뿐 아니라 현재 폴더처럼 harness 자체가 Git 루트인 구조도 감지해야 한다.
  - `project/configs/project_profile.json`를 standalone 위치에서도 찾는다.
- generated artifact audit 보정
  - standalone 루트의 `reports/`, `state/`, `assignments/`도 generated artifact 후보로 검사한다.
  - target repo의 `harness/reports/`, `harness/state/`, `harness/assignments/` 패턴과 함께 유지한다.
- porting layout audit 보정
  - target repo 안의 `harness/` 배치와 standalone harness Git 루트 배치를 모두 정상 layout으로 인정한다.
- Git hook 설치 보정
  - `scripts/install_git_hooks.ps1`가 standalone 루트의 `githooks/` 템플릿도 찾도록 한다.
  - 설치 결과 `.githooks/`와 `core.hooksPath`가 일관되게 잡혀야 한다.
- Git ignore/attributes baseline
  - generated reports/state, Playwright report/test-results, Gradle build output, node_modules, wrapper cache성 산출물을 ignore한다.
  - shell, PowerShell, Gradle wrapper, Markdown, JSON, JavaScript, Java 파일의 line ending 정책을 명시한다.

## Runtime 앱 검증 보정

- Gradle은 시스템 설치 Gradle이 아니라 프로젝트 안의 `backend/gradlew` wrapper로 실행한다.
- sandbox 또는 권한 제한 환경에서는 `GRADLE_USER_HOME=/tmp/codex-gradle-home`처럼 repository 밖 cache 경로를 쓴다.
- Spring Boot runtime app은 문서/정적 목업이 아니라 실제 HTTP API를 띄우는 실행 가능한 backend다.
- MVP 단계에서는 in-memory 저장소로도 runtime 검증이 가능하지만, 실제 DB/JPA/LLM/RAG는 다음 phase로 명확히 분리해 기록한다.

## 브라우저 E2E 기능

- Playwright Chromium 기반 사용자 플로우 검증을 포함한다.
- 검증 범위:
  - 게시글 목록 로드
  - 검색
  - 필수값 검증
  - 게시글 작성
  - AI 분석 요청/결과 표시
  - 댓글 작성
  - 해결 등록
  - 해결됨 상태와 RAG 포함 여부 확인
  - 모바일 viewport 기본 사용성 확인
- E2E는 backend health URL과 frontend URL을 각각 기다린 뒤 테스트를 시작한다.
- `BACKEND_PORT`, `FRONTEND_PORT`, `API_BASE_URL` 환경변수로 포트를 바꿔도 같은 테스트가 동작해야 한다.
- Playwright `webServer.env`를 사용해 WSL/bash와 PowerShell의 환경변수 문법 차이를 줄인다.

## 백엔드/프론트엔드 통합 기동

- 루트 `npm run dev`로 backend와 frontend를 한 번에 실행한다.
- Windows PowerShell/Node에서는 `.bat`를 직접 `spawn()`하지 않고 shell 경유로 실행한다.
- `spawn EINVAL` 같은 시작 실패는 raw stack trace 대신 프로세스별 실패 메시지로 표시한다.
- 기본값:
  - backend API: `http://127.0.0.1:8080/api`
  - frontend: `http://127.0.0.1:4173`
- 포트 충돌 시 raw stack trace 대신 어떤 포트가 막혔는지 출력한다.
- 포트 override:

```bash
BACKEND_PORT=8081 FRONTEND_PORT=4175 npm run dev
```

PowerShell:

```powershell
$env:BACKEND_PORT="8081"; $env:FRONTEND_PORT="4175"; npm run dev
```

## 현재 확인된 검증 결과

- `node --check scripts/dev-all.mjs`: pass
- Windows PowerShell `gradlew.bat` spawn 경로 보정 반영
- `node --check frontend/scripts/serve.mjs`: pass
- `node --check frontend/playwright.config.mjs`: pass
- `BACKEND_PORT=18080 FRONTEND_PORT=14173 npm run dev`: backend/frontend 동시 기동 확인
- `curl http://127.0.0.1:18080/api/health`: `UP`
- `curl -I http://127.0.0.1:14173/`: HTTP 200
- `BACKEND_PORT=18080 FRONTEND_PORT=14173 npm run e2e`: 4 passed
