# AI 트러블슈팅 게시판 구현 작업 문서

> 1번 요구사항 문서와 2번 UX/UI 가이드를 실제 개발 가능한 작업 단위로 분해한 문서  
> Codex, 팀원, 또는 본인이 작업할 때 한 번에 전체를 맡기지 않고 단계별로 진행하기 위한 기준이다.

| 항목 | 내용 |
|---|---|
| 문서명 | AI 트러블슈팅 게시판 구현 작업 문서 |
| 버전 | v1.0 |
| 작성일 | 2026-06-09 |
| 기준 문서 | `01_REQUIREMENTS.md`, `02_UX_GUIDE.md` |
| 목표 | MVP부터 RAG, Agent, MCP 확장까지 구현 순서와 완료 기준을 정의한다. |
| 권장 스택 | Spring Boot, React, TypeScript, Tailwind CSS, PostgreSQL, pgvector |

---

## 1. 개발 원칙

1. 한 번에 전체 프로젝트를 생성하지 않는다.
2. 요구사항 문서와 UX 가이드를 기준으로 화면/기능 단위로 작업한다.
3. MVP 범위는 게시판, 인증, AI 분석, RAG 유사 사례 검색까지로 제한한다.
4. Agent와 MCP는 기본 구조만 준비하고 후순위로 확장한다.
5. AI가 생성한 코드도 반드시 실행, 빌드, 테스트 기준으로 검증한다.
6. 화면은 mock data로 먼저 구현한 뒤 API를 연결한다.
7. 상태값은 백엔드 enum과 프론트 타입으로 동일하게 관리한다.

---

## 2. 전체 구현 순서

```text
Phase 0. 프로젝트 초기 세팅
Phase 1. 도메인/DB/API 기반 구축
Phase 2. 게시판 MVP 구현
Phase 3. 프론트 화면 구현
Phase 4. AI 분석 기능 구현
Phase 5. RAG 유사 사례 검색 구현
Phase 6. Agent 실행 로그 구조 구현
Phase 7. MCP/GitHub read-only 연동 확장
Phase 8. 품질 개선/데모 정리
```

---

## 3. Phase 0: 프로젝트 초기 세팅

### TASK-0001. 레포지토리 구조 생성

| 항목 | 내용 |
|---|---|
| 목표 | 백엔드와 프론트엔드 프로젝트 기본 구조 생성 |
| 작업 | `/backend`, `/frontend`, `/docs` 디렉터리 구성 |
| 산출물 | 프로젝트 폴더 구조, README 초안 |
| 완료 기준 | 백엔드/프론트 각각 실행 가능한 상태 |

권장 구조:

```text
project-root/
├─ backend/
├─ frontend/
├─ docs/
│  ├─ 01_REQUIREMENTS.md
│  ├─ 02_UX_GUIDE.md
│  └─ 03_IMPLEMENTATION_TASKS.md
└─ README.md
```

### TASK-0002. 문서 배치

| 항목 | 내용 |
|---|---|
| 목표 | 개발 기준 문서를 레포에 포함 |
| 작업 | 1번, 2번, 3번 문서를 `/docs`에 배치 |
| 완료 기준 | README에서 각 문서 링크 제공 |

### TASK-0003. 개발 환경 설정

| 영역 | 작업 |
|---|---|
| Backend | Spring Boot, Java 21, Gradle 또는 Maven 설정 |
| Frontend | React, TypeScript, Vite 또는 Next.js 설정 |
| DB | PostgreSQL 설정 |
| Vector | pgvector 사용 준비 |
| Style | Tailwind CSS, shadcn/ui 사용 여부 결정 |

---

## 4. Phase 1: 백엔드 도메인/DB/API 기반

### TASK-0101. enum 상태값 정의

| 목표 | 요구사항 문서의 상태값을 백엔드 enum으로 정의 |
|---|---|

대상 enum:

```text
PostStatus
AiAnalysisStatus
RagSearchStatus
AgentRunStatus
SolutionStatus
McpConnectionStatus
```

완료 기준:

- 각 enum이 백엔드 코드에 정의되어 있다.
- DB 저장 시 문자열 enum 또는 명확한 매핑 정책이 있다.
- 프론트와 공유할 상태값 문서가 있다.

### TASK-0102. 주요 엔티티 설계

대상 엔티티:

```text
User
Post
Comment
Tag
PostTag
Solution
AiAnalysis
RagChunk
AgentRun
AgentStep
ToolCall
ExternalConnection
```

MVP 필수 엔티티:

```text
User
Post
Comment
Tag
PostTag
Solution
AiAnalysis
RagChunk
```

완료 기준:

- ERD 초안 작성
- JPA Entity 또는 schema.sql 작성
- createdAt, updatedAt 기본 필드 포함
- soft delete 정책 반영

### TASK-0103. 공통 API 응답 구조 정의

예시:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

실패 예시:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "이 작업을 수행할 권한이 없습니다."
  }
}
```

완료 기준:

- 성공/실패 응답 구조 통일
- validation error 응답 구조 정의
- 프론트에서 공통 처리 가능

---

## 5. Phase 2: 게시판 MVP 백엔드

### TASK-0201. 인증 기능 구현

| API | 설명 |
|---|---|
| `POST /api/auth/signup` | 회원가입 |
| `POST /api/auth/login` | 로그인 |
| `POST /api/auth/logout` | 로그아웃 |
| `GET /api/auth/me` | 현재 사용자 조회 |

완료 기준:

- 회원가입/로그인 가능
- 인증 사용자만 글 작성 가능
- 작성자만 본인 글 수정/삭제 가능

### TASK-0202. 게시글 CRUD 구현

| API | 설명 |
|---|---|
| `GET /api/posts` | 목록/검색/필터 |
| `POST /api/posts` | 작성 |
| `GET /api/posts/{postId}` | 상세 |
| `PATCH /api/posts/{postId}` | 수정 |
| `DELETE /api/posts/{postId}` | 삭제 |

검색/필터 조건:

```text
keyword
tag
status
solved
sort
page
size
```

완료 기준:

- 목록 조회 가능
- 상세 조회 가능
- 작성/수정/삭제 권한 검증
- 상태 배지에 필요한 값 반환

### TASK-0203. 댓글 기능 구현

| API | 설명 |
|---|---|
| `POST /api/posts/{postId}/comments` | 댓글 작성 |
| `DELETE /api/comments/{commentId}` | 댓글 삭제 |

완료 기준:

- 로그인 사용자 댓글 작성 가능
- 본인 댓글 삭제 가능
- 게시글 상세 응답에 댓글 목록 포함 가능

### TASK-0204. 태그 기능 구현

| API | 설명 |
|---|---|
| `GET /api/tags` | 태그 목록 |
| `POST /api/admin/tags` | 태그 생성, 관리자용 |

완료 기준:

- 게시글 작성 시 태그 지정 가능
- 목록에서 태그 필터 가능
- 샘플 태그 포함: Spring, React, PostgreSQL, Docker, AWS, Git, Security, JWT

### TASK-0205. 해결 등록 기능 구현

| API | 설명 |
|---|---|
| `POST /api/posts/{postId}/solutions` | 해결 방법 등록 |
| `PATCH /api/solutions/{solutionId}` | 해결 방법 수정 |

완료 기준:

- 작성자가 최종 원인/해결 방법/검증 방법 등록 가능
- 등록 시 게시글 상태가 `SOLVED`로 변경 가능
- 해결 완료 글은 RAG 인덱싱 대상이 된다.

---

## 6. Phase 3: 프론트 MVP 화면

### TASK-0301. 공통 레이아웃 구현

구조:

```text
LeftSidebar
TopSearchBar
MainContent
RightAiPanel
```

완료 기준:

- 데스크톱 3열 구조 구현
- 모바일 1열 구조 대응 초안
- 사이드바 메뉴 표시
- 공통 카드/배지/버튼 스타일 정의

### TASK-0302. 게시글 목록 화면 구현

표시 항목:

```text
제목
요약
상태 배지
태그
작성자
작성 시간
댓글 수
조회 수
AI 분석 여부
```

완료 기준:

- mock data로 게시글 카드 표시
- 검색창/필터 UI 제공
- 새 글 작성 버튼 제공
- empty/loading/error 상태 구현
- API 연결 후 목록 조회 가능

### TASK-0303. 게시글 작성 화면 구현

입력 항목:

```text
제목
기술 태그
실행 환경
문제 설명
에러 로그
재현 방법
시도한 방법
현재 막힌 지점
AI 분석 함께 실행
```

완료 기준:

- 필수값 검증
- 에러 로그 입력 영역은 monospace 스타일
- 민감정보 경고 문구 표시
- 제출 시 게시글 생성 API 호출
- 저장 후 상세 화면 이동

### TASK-0304. 게시글 상세 화면 구현

화면 구조:

```text
상단: 제목, 상태, 태그, 액션 버튼
중앙: 환경, 문제 설명, 에러 로그, 재현 방법, 시도한 방법, 댓글, 해결 기록
우측: AI 분석 패널
```

완료 기준:

- 상세 데이터 표시
- 작성자 액션 버튼 조건부 표시
- 댓글 작성/삭제 가능
- 해결 등록 버튼 표시
- AI 패널 빈 상태 표시

### TASK-0305. 해결 등록 화면/모달 구현

입력 항목:

```text
최종 원인
해결 방법
검증 방법
참고 링크
배운 점
```

완료 기준:

- 작성자만 접근 가능
- 해결 등록 API 호출
- 등록 후 게시글 상태 `SOLVED` 표시
- 해결 영역 강조 표시

---

## 7. Phase 4: AI 분석 기능

### TASK-0401. AI 분석 요청 API 구현

| API | 설명 |
|---|---|
| `POST /api/posts/{postId}/ai-analysis` | AI 분석 요청 |
| `GET /api/posts/{postId}/ai-analysis` | 분석 결과 목록 |
| `GET /api/ai-analysis/{analysisId}` | 분석 상세 |

완료 기준:

- 분석 요청 시 `PENDING/RUNNING/SUCCEEDED/FAILED` 상태 저장
- AI 응답 JSON 파싱 및 저장
- 모델명, 입력 토큰, 출력 토큰 저장
- 실패 시 실패 원인 저장

### TASK-0402. AI 분석 출력 스키마 고정

기본 JSON 구조:

```json
{
  "summary": "문제 요약",
  "possibleCauses": [
    {
      "rank": 1,
      "title": "원인 후보",
      "reason": "이유",
      "confidence": 0.86
    }
  ],
  "checklist": ["확인할 항목"],
  "missingContext": ["추가로 필요한 정보"],
  "similarCases": [],
  "usage": {
    "model": "gpt-4o-mini",
    "inputTokens": 1245,
    "outputTokens": 892
  }
}
```

완료 기준:

- 백엔드 DTO 정의
- 프론트 타입 정의
- 잘못된 AI 응답에 대한 fallback 처리

### TASK-0403. AI 분석 패널 구현

섹션:

```text
분석 상태
문제 요약
원인 후보 TOP 3
검증 체크리스트
부족한 정보
유사 사례
사용 모델/토큰
```

완료 기준:

- NOT_REQUESTED, RUNNING, SUCCEEDED, FAILED 상태별 UI 구현
- 재분석 버튼 구현
- 체크리스트 UI 구현
- 실패 시 재시도 가능

---

## 8. Phase 5: RAG 유사 사례 검색

### TASK-0501. RAG chunk 생성 구조 구현

대상 데이터:

```text
해결 완료 게시글
해결 방법
공식 문서 또는 내부 정리 문서, 후순위
```

완료 기준:

- 게시글/해결 내용을 chunk로 분리
- chunk type 저장: POST, SOLUTION, DOC
- source id 저장

### TASK-0502. embedding 생성 및 pgvector 저장

완료 기준:

- embedding 생성 API 또는 모델 연결
- pgvector 컬럼 생성
- chunk별 embedding 저장
- 인덱싱 실패 상태 저장

### TASK-0503. 유사 사례 검색 API 구현

| API | 설명 |
|---|---|
| `POST /api/posts/{postId}/similar` | 유사 사례 검색 실행 |
| `GET /api/posts/{postId}/similar` | 검색 결과 조회 |

완료 기준:

- similarity threshold 적용
- 기본 5개 반환
- 제목, 요약, 유사도, 해결 여부, 태그 반환
- 해결 완료 글에 가중치 적용 가능

### TASK-0504. AI 분석에 RAG 결과 포함

완료 기준:

- AI 분석 prompt에 유사 사례 context 포함
- AI 결과에 참고 사례 id 포함
- 프론트에서 참고 사례 표시

---

## 9. Phase 6: Agent 구조

### TASK-0601. AgentRun / AgentStep 테이블 구현

저장 항목:

```text
agent_run_id
post_id
status
started_at
completed_at
step_order
tool_name
tool_input
tool_output_summary
error_message
```

완료 기준:

- Agent 실행 이력 저장 가능
- 단계별 tool call 로그 저장 가능
- 실패/부분 완료 상태 표현 가능

### TASK-0602. 명시적 Agent 단계 구현

초기 Agent는 자율성이 높은 구조보다 명시적 순서 실행을 사용한다.

```text
1. 문제 유형 분류
2. 부족 정보 탐지
3. RAG 유사 사례 검색
4. 원인 후보 생성
5. 체크리스트 생성
6. 태그 추천
7. 해결 후 요약 생성
```

완료 기준:

- 각 단계 결과가 AgentStep에 저장된다.
- 실패한 단계가 있어도 가능한 경우 PARTIAL_COMPLETED 처리 가능하다.
- 사용자는 상세 화면에서 분석 과정 일부를 확인할 수 있다.

### TASK-0603. Agent 실행 로그 화면 구현

완료 기준:

- 게시글별 Agent 실행 이력 조회
- 단계, tool, 상태, 요약 표시
- 실패 원인 표시

---

## 10. Phase 7: MCP/GitHub 연동 확장

### TASK-0701. 외부 연동 설정 화면 구현

표시 항목:

```text
GitHub 연결 상태
인증 만료 여부
연결/해제 버튼
권한 범위 안내
```

완료 기준:

- 연결 상태 enum 표시
- 인증 만료/권한 없음 상태 표시
- MVP에서는 실제 MCP 미연동이어도 mock 또는 설계 화면 가능

### TASK-0702. GitHub read-only tool 설계

가능 기능:

```text
repository 조회
issue 검색
PR 검색
commit 검색
README 또는 파일명 검색
```

금지 기능:

```text
파일 수정
commit
push
issue 작성
PR 생성
```

완료 기준:

- read-only 원칙 문서화
- Agent tool call 로그에 외부 조회 기록 저장

---

## 11. Phase 8: 품질 개선 및 데모 정리

### TASK-0801. 샘플 데이터 구성

샘플 글:

```text
Spring Security 로그인 후 403 Forbidden 발생
React useEffect 무한 실행 문제
Docker 컨테이너 간 통신이 안 됨
JPA N+1 문제 해결 방법
S3 파일 업로드 시 권한 오류
```

완료 기준:

- 목록/상세/AI 패널/RAG 검색을 보여줄 수 있는 샘플 데이터 준비
- 해결 완료 글 2개 이상 포함
- AI 분석 성공/실패 상태 데이터 포함

### TASK-0802. 데모 시나리오 작성

데모 흐름:

```text
1. 로그인
2. 트러블슈팅 글 작성
3. AI 분석 요청
4. 원인 후보와 체크리스트 확인
5. 유사 사례 확인
6. 해결 등록
7. 해결된 글이 RAG 검색 대상이 되는 구조 설명
```

완료 기준:

- 3~5분 발표 가능
- 핵심 차별점: RAG, Agent 로그, 토큰 저장 설명 가능

### TASK-0803. README 정리

README 포함 항목:

```text
프로젝트 소개
문제 정의
핵심 기능
기술 스택
아키텍처
ERD
실행 방법
데모 시나리오
향후 확장: Agent, MCP
```

---

## 12. Codex 작업 지시 예시

### 12.1 게시글 목록 화면 요청 예시

```text
다음 문서를 기준으로 게시글 목록 화면을 구현해주세요.
- docs/01_REQUIREMENTS.md
- docs/02_UX_GUIDE.md

작업 범위:
- React + TypeScript + Tailwind
- 게시글 카드 목록
- 검색창
- 상태/태그 필터
- 새 글 작성 버튼
- loading/empty/error 상태

이번 작업에서는 API 연결 없이 mock data로 구현해주세요.
완료 후 변경 파일과 실행 방법을 요약해주세요.
```

### 12.2 AI 분석 패널 요청 예시

```text
게시글 상세 화면의 우측 AI 분석 패널을 구현해주세요.

포함할 섹션:
- 분석 상태
- 문제 요약
- 원인 후보 TOP 3
- 검증 체크리스트
- 부족한 정보
- 유사 사례
- 모델명/토큰 사용량

상태별 UI:
- NOT_REQUESTED
- RUNNING
- SUCCEEDED
- FAILED

mock data로 모든 상태를 확인할 수 있게 해주세요.
```

### 12.3 백엔드 게시글 CRUD 요청 예시

```text
Spring Boot 백엔드에서 게시글 CRUD API를 구현해주세요.

기준 문서:
- docs/01_REQUIREMENTS.md

구현 범위:
- Post entity
- PostStatus enum
- CreatePostRequest
- PostResponse
- PostController
- PostService
- PostRepository
- 목록/상세/작성/수정/삭제 API

권한:
- 로그인 사용자만 작성 가능
- 작성자만 수정/삭제 가능

AI/RAG 기능은 이번 작업에서 구현하지 말고 확장 가능한 필드만 준비해주세요.
```

---

## 13. MVP 완료 기준

| ID | 기준 |
|---|---|
| MVP-001 | 사용자는 회원가입/로그인할 수 있다. |
| MVP-002 | 사용자는 트러블슈팅 게시글을 작성/조회/수정/삭제할 수 있다. |
| MVP-003 | 게시글은 상태, 태그, 환경, 로그, 시도한 방법을 포함한다. |
| MVP-004 | 사용자는 댓글을 작성할 수 있다. |
| MVP-005 | 작성자는 해결 방법을 등록할 수 있다. |
| MVP-006 | AI 분석 요청과 결과 저장이 가능하다. |
| MVP-007 | AI 분석 패널은 요약, 원인 후보, 체크리스트, 부족 정보, 유사 사례를 표시한다. |
| MVP-008 | 해결 완료 글은 RAG chunk로 저장된다. |
| MVP-009 | 유사 사례 검색 결과를 게시글 상세에서 볼 수 있다. |
| MVP-010 | 모델명, 입력 토큰, 출력 토큰이 저장된다. |
| MVP-011 | AI 실패/RAG 실패/토큰 초과 상태가 UI에 표시된다. |
| MVP-012 | README와 데모 시나리오가 준비되어 있다. |

---

## 14. 작업 순서 요약

가장 안전한 실제 개발 순서는 아래와 같다.

```text
1. 레포 구조와 문서 배치
2. 백엔드 enum/entity/API 기본 구조
3. 프론트 공통 레이아웃
4. 게시글 목록/작성/상세 화면 mock 구현
5. 게시글 CRUD API 연결
6. 댓글/태그/해결 등록 구현
7. AI 분석 API와 패널 구현
8. RAG chunk/embedding/검색 구현
9. AgentRun/AgentStep 로그 구조 구현
10. GitHub/MCP 연동은 후순위 확장
11. 샘플 데이터와 README 정리
```

이 문서는 작업 진행 중 계속 갱신한다. 요구사항이 바뀌면 1번 문서부터 수정하고, UX 변경이 필요하면 2번 문서를 수정한 뒤, 3번 작업 문서를 갱신한다.
