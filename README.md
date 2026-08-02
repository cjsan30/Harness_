# Todo Classifier × Portable AI Agent Harness

한국어 자연어 Todo를 구조화된 JSON으로 분류하고, 그 결과를 규칙 기반 평가와 테스트 로그로 검증하는 예제 애플리케이션입니다.

이 저장소는 두 가지를 함께 제공합니다.

- **Todo Classifier**: 자연어 입력을 Todo 배열(JSON)로 변환하고, 분류·평가 결과를 화면과 로그로 확인하는 테스트 대상 애플리케이션
- **Portable AI Agent Harness**: 요구사항을 작업으로 분해하고, 구현 결과를 테스트로 검증하며, 실패 분류·재시도·Git 승격 흐름을 재사용할 수 있도록 구성한 개발 운영 레이어

> Todo Classifier는 완성형 Todo 서비스가 아니라, AI 응답의 형식·일관성·평가 가능성을 검증하기 위한 Harness 적용 사례입니다.

## 검증 흐름

```text
자연어 Todo 입력
  → 구조화된 JSON 출력
  → Schema·카테고리·우선순위·날짜·작업 분리 평가
  → PASS / FAIL · 점수 · 로그 확인
```

## 주요 기능

- 한국어 자연어 Todo를 하나 이상의 구조화된 Todo 항목으로 분류
- `task`, `category`, `priority`, `due`, `confidence` 스키마 검사
- 복수 Todo 분리, 허용 카테고리·우선순위, 날짜 표현 처리 평가
- 결정론적 로컬 분류기 기본 제공 — API 키 없이 재현 가능
- 선택적으로 OpenAI Responses API의 structured output 사용 가능
- JSONL 기본 로그 저장 및 선택적 PostgreSQL 로그 저장
- 단위·통합·벤치마크 스모크 테스트 및 Harness 실행 사이클 제공

## 빠른 시작

### 요구 환경

- Node.js 20 이상
- npm
- Windows에서 Harness PowerShell 스크립트를 실행하려면 PowerShell 7 권장

```sh
git clone https://github.com/cjsan30/Harness_test.git
cd Harness_test
npm install
npm start
```

브라우저에서 [http://127.0.0.1:4173](http://127.0.0.1:4173)을 엽니다.

기본값은 외부 API 키가 필요 없는 결정론적 분류 및 JSONL 로그 저장입니다.

```env
TODO_CLASSIFIER_PROVIDER=deterministic
LOG_STORE=jsonl
```

환경 변수 예시는 [.env.example](.env.example)를 참고하세요.

## 테스트

```sh
npm run build
npm run test:unit
npm run test:integration
npm run benchmark:smoke
```

Make가 설치되어 있다면 다음 명령으로 한 번에 실행할 수 있습니다.

```sh
make test
```

## Harness 적용

`harness/` 디렉터리는 다른 프로젝트에 이식할 수 있는 AI 에이전트 개발·검증 워크플로우입니다.

- 프로젝트 요구사항과 완료 기준 정리
- 작업 단위 분해 및 담당 작업 할당
- 빌드·테스트·운영 스모크 검증
- 실패 원인 분류 및 재시도 프롬프트 생성
- Git hook, PR 상태, 브랜치 승격 정책 점검

Todo Classifier에 적용된 Harness 사이클은 다음 명령으로 실행할 수 있습니다.

```powershell
pwsh -NoProfile -File harness/scripts/run_harness_cycle.ps1 -SkipRetryPrompt
```

Harness를 다른 저장소에 적용하는 방법은 [harness/docs/PORTING.md](harness/docs/PORTING.md), 세부 스크립트는 [harness/scripts/README.md](harness/scripts/README.md)를 참고하세요.

## 선택 구성

### OpenAI 구조화 출력

```env
TODO_CLASSIFIER_PROVIDER=openai
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_MODEL=gpt-5
```

### PostgreSQL 로그 저장

```env
LOG_STORE=postgres
DATABASE_URL=postgres://todo:todo@127.0.0.1:5432/todo_classifier
```

테이블 정의는 [db/schema.sql](db/schema.sql)에 있습니다.

## 문서

- [요구사항 정의서](requirements.md)
- [Harness 개요](harness/README.md)
- [Harness 이식 가이드](harness/docs/PORTING.md)
- [Harness 스크립트 안내](harness/scripts/README.md)

## License

Personal portfolio and demonstration project.
