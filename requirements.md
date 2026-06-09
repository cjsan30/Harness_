# Todo Classifier 요구사항 정의서 v0.1

## 1. 프로젝트 개요

### 1.1 프로젝트명

Todo Classifier

### 1.2 목적

사용자가 자연어로 입력한 할 일 문장을 AI가 구조화된 Todo 데이터로 변환하고, Harness Engineering을 통해 AI 응답의 형식, 정확성, 일관성을 테스트하는 미니 프로젝트를 제작한다.

이 프로젝트의 핵심 목적은 완성도 높은 Todo 서비스 제작이 아니라, AI 응답을 평가하고 검증하는 Harness 테스트 환경을 빠르게 구축하는 것이다.

### 1.3 프로젝트 성격

본 프로젝트는 실서비스용 Todo 앱이 아니라, AI 출력 검증을 위한 테스트용 애플리케이션이다.

따라서 기능 범위는 최소화하며, 다음 흐름을 검증하는 데 집중한다.

```text
사용자 자연어 입력
→ AI Todo 분류
→ JSON 구조화
→ Harness 평가
→ 결과 및 로그 확인
```

---

## 2. 주요 목표

### 2.1 기능 목표

* 사용자가 자연어로 Todo 문장을 입력할 수 있다.
* AI가 입력 문장을 하나 이상의 Todo 항목으로 분리할 수 있다.
* 각 Todo 항목은 정해진 JSON Schema에 맞게 출력되어야 한다.
* Harness는 AI 응답을 기준에 따라 평가한다.
* 평가 결과는 PASS / FAIL / Score 형태로 확인할 수 있다.
* 테스트 케이스별 입력, 기대값, 실제값, 평가 결과를 기록한다.

### 2.2 테스트 목표

이 프로젝트에서 검증하고 싶은 Harness 항목은 다음과 같다.

* AI 응답이 JSON 형식을 지키는가
* 필수 필드가 누락되지 않았는가
* category 값이 허용된 범위 안에 있는가
* priority 값이 허용된 범위 안에 있는가
* 날짜 표현을 적절히 해석했는가
* 하나의 문장에 여러 할 일이 포함된 경우 분리했는가
* 애매한 입력에 대해 과도하게 추측하지 않는가
* 동일 입력에 대해 결과가 지나치게 흔들리지 않는가

---

## 3. 사용자 시나리오

### 3.1 기본 시나리오

사용자는 입력창에 자연어 Todo를 입력한다.

예시:

```text
오늘 저녁에 운동하고 내일 이력서 수정하기
```

AI는 이를 구조화된 Todo 데이터로 변환한다.

예상 결과:

```json
[
  {
    "task": "운동하기",
    "category": "health",
    "priority": "medium",
    "due": "today_evening",
    "confidence": 0.86
  },
  {
    "task": "이력서 수정하기",
    "category": "career",
    "priority": "high",
    "due": "tomorrow",
    "confidence": 0.91
  }
]
```

Harness는 결과를 평가한다.

예시:

```json
{
  "schema_valid": true,
  "category_valid": true,
  "priority_valid": true,
  "task_split_valid": true,
  "due_parsing_valid": true,
  "score": 92,
  "status": "PASS"
}
```

---

## 4. 기능 요구사항

## 4.1 자연어 Todo 입력 기능

### 설명

사용자는 자유로운 문장으로 할 일을 입력할 수 있다.

### 입력 예시

```text
내일까지 이력서 수정하고 잡코리아 지원하기
```

```text
오늘 저녁에 헬스장 가기
```

```text
이번 주 안에 포트폴리오 정리하기
```

### 요구사항

* 사용자는 텍스트 입력창에 자연어 Todo를 입력할 수 있어야 한다.
* 입력값은 최소 1자 이상이어야 한다.
* 빈 입력값은 제출할 수 없어야 한다.
* 제출 버튼 클릭 시 AI 분류 요청이 실행되어야 한다.
* 요청 중에는 loading 상태를 표시해야 한다.

---

## 4.2 Todo 분류 기능

### 설명

AI는 사용자의 자연어 입력을 분석하여 Todo 항목으로 변환한다.

### 분류 필드

AI는 각 Todo에 대해 다음 필드를 생성해야 한다.

| 필드         | 타입          | 필수 여부 | 설명           |
| ---------- | ----------- | ----- | ------------ |
| task       | string      | 필수    | 실제 할 일 내용    |
| category   | string      | 필수    | 할 일 분류       |
| priority   | string      | 필수    | 우선순위         |
| due        | string/null | 필수    | 마감일 또는 시간 표현 |
| confidence | number      | 필수    | AI가 판단한 신뢰도  |

### category 허용값

```text
career
study
health
personal
finance
household
social
etc
```

### priority 허용값

```text
high
medium
low
unknown
```

### due 처리 규칙

| 사용자 표현 | 변환값           |
| ------ | ------------- |
| 오늘     | today         |
| 오늘 저녁  | today_evening |
| 내일     | tomorrow      |
| 이번 주   | this_week     |
| 다음 주   | next_week     |
| 날짜 없음  | null          |
| 애매함    | unknown       |

---

## 4.3 복수 Todo 분리 기능

### 설명

하나의 문장에 여러 할 일이 포함된 경우, AI는 이를 여러 Todo 항목으로 분리해야 한다.

### 입력 예시

```text
오늘 운동하고 내일 이력서 수정하고 주말에 방 청소하기
```

### 예상 출력

```json
[
  {
    "task": "운동하기",
    "category": "health",
    "priority": "medium",
    "due": "today",
    "confidence": 0.85
  },
  {
    "task": "이력서 수정하기",
    "category": "career",
    "priority": "high",
    "due": "tomorrow",
    "confidence": 0.9
  },
  {
    "task": "방 청소하기",
    "category": "household",
    "priority": "medium",
    "due": "this_weekend",
    "confidence": 0.82
  }
]
```

### 요구사항

* 접속사 “하고”, “그리고”, “또”, 쉼표 등으로 연결된 Todo를 분리할 수 있어야 한다.
* Todo가 2개 이상이면 배열 형태로 반환해야 한다.
* 분리하기 어려운 경우 하나의 Todo로 처리하되 confidence를 낮게 설정한다.

---

## 4.4 JSON Output 표시 기능

### 설명

AI가 반환한 결과를 화면에서 JSON 형태로 확인할 수 있어야 한다.

### 요구사항

* AI 응답 결과는 보기 쉬운 JSON 형태로 출력한다.
* JSON 복사 버튼을 제공한다.
* JSON 형식이 잘못된 경우 오류 메시지를 표시한다.
* JSON 결과와 카드형 Todo 결과를 함께 보여준다.

---

## 4.5 Harness 평가 기능

### 설명

AI가 반환한 Todo JSON을 Harness가 평가한다.

### 평가 항목

| 평가 항목               | 설명                             |
| ------------------- | ------------------------------ |
| Schema Validation   | JSON Schema를 지켰는가              |
| Required Fields     | 필수 필드가 모두 있는가                  |
| Category Validation | category가 허용값 안에 있는가           |
| Priority Validation | priority가 허용값 안에 있는가           |
| Due Parsing         | 날짜 표현이 적절히 변환되었는가              |
| Task Split          | 여러 Todo를 올바르게 분리했는가            |
| Confidence Check    | 애매한 입력에 대해 confidence가 낮게 나왔는가 |

### 평가 결과 예시

```json
{
  "schema_validation": "PASS",
  "required_fields": "PASS",
  "category_validation": "PASS",
  "priority_validation": "PASS",
  "due_parsing": "PASS",
  "task_split": "PASS",
  "confidence_check": "PASS",
  "score": 95,
  "status": "PASS"
}
```

### PASS 기준

* 전체 점수 80점 이상이면 PASS
* 전체 점수 80점 미만이면 FAIL
* JSON 파싱 실패 시 즉시 FAIL
* 필수 필드 누락 시 FAIL

---

## 4.6 테스트 케이스 실행 기능

### 설명

미리 정의된 테스트 케이스를 실행하여 AI 응답과 기대 결과를 비교한다.

### 테스트 케이스 예시

```json
{
  "id": 1,
  "input": "내일까지 이력서 수정하고 잡코리아 지원하기",
  "expected": {
    "task_count": 2,
    "categories": ["career"],
    "due_values": ["tomorrow"]
  }
}
```

### 요구사항

* 사용자는 샘플 테스트 케이스를 선택할 수 있어야 한다.
* 선택한 테스트 케이스를 실행할 수 있어야 한다.
* 실행 결과는 PASS / FAIL로 표시한다.
* 기대값과 실제값을 비교할 수 있어야 한다.
* 실패한 경우 실패 이유를 표시한다.

---

## 4.7 평가 로그 기능

### 설명

AI 분류 요청과 Harness 평가 결과를 로그로 저장하고 확인한다.

### 저장 항목

| 항목                | 설명            |
| ----------------- | ------------- |
| id                | 로그 ID         |
| input_text        | 사용자 입력        |
| ai_output         | AI 응답 JSON    |
| evaluation_result | Harness 평가 결과 |
| score             | 평가 점수         |
| status            | PASS / FAIL   |
| created_at        | 실행 시간         |

### 요구사항

* 모든 분류 요청은 로그로 저장한다.
* 로그 목록에서 최근 실행 결과를 확인할 수 있다.
* 각 로그는 입력값, AI 응답, 평가 결과를 포함해야 한다.
* 실패 로그는 실패 이유를 확인할 수 있어야 한다.

---

## 5. 화면 요구사항

## 5.1 전체 화면 구조

화면은 테스트 도구처럼 구성한다.

```text
[Sidebar]
- Playground
- Test Cases
- Evaluation Logs
- Schema Rules

[Main Area]
- Natural Language Input
- Parsed Todo Cards
- JSON Output
- Harness Evaluation Result
- Test Case Log
```

## 5.2 Playground 화면

### 구성 요소

* 자연어 Todo 입력창
* Classify 버튼
* Sample Input 버튼
* 분류된 Todo 카드 목록
* JSON Output 패널
* Harness Score 패널

### 목적

사용자가 직접 Todo 문장을 입력하고, AI 분류 결과와 평가 결과를 즉시 확인한다.

---

## 5.3 Test Cases 화면

### 구성 요소

* 테스트 케이스 목록
* 테스트 케이스 상세 보기
* Run Test 버튼
* Expected Result
* Actual Result
* PASS / FAIL 결과

### 목적

미리 준비된 테스트 케이스로 AI 응답 품질을 검증한다.

---

## 5.4 Evaluation Logs 화면

### 구성 요소

* 실행 로그 목록
* 상태 필터: ALL / PASS / FAIL
* 점수 표시
* 실행 시간 표시
* 상세 결과 보기

### 목적

과거 테스트 실행 결과를 확인하고, 실패 패턴을 분석한다.

---

## 5.5 Schema Rules 화면

### 구성 요소

* Todo JSON Schema 설명
* category 허용값 목록
* priority 허용값 목록
* 평가 기준 설명

### 목적

AI가 지켜야 할 응답 규칙과 Harness 평가 기준을 명확히 보여준다.

---

## 6. 디자인 방향

### 6.1 디자인 목표

본 프로젝트는 디자인 완성도가 핵심 목적이 아니므로, 빠르게 구현 가능한 컴포넌트 중심 디자인을 적용한다.

단, 화면은 단순 Todo 앱이 아니라 AI 테스트 대시보드처럼 보여야 한다.

### 6.2 참고 방향

* Uiverse: input, button, card, badge, toggle 등 구현용 컴포넌트 참고
* Muzli: dashboard, productivity app, AI dashboard 레이아웃 참고
* Godly: SaaS 스타일의 전체적인 화면 분위기 참고
* Design Spells: 카드 등장, PASS/FAIL 전환 등 마이크로인터랙션 참고
* Toools.design: 추가 디자인 리소스 탐색용

### 6.3 권장 스타일

| 항목     | 방향                                |
| ------ | --------------------------------- |
| 전체 톤   | 개발자 도구형 대시보드                      |
| 배경     | 밝은 회색 또는 다크 톤                     |
| 포인트 색상 | 보라색 또는 파란색                        |
| 주요 UI  | 카드, 배지, 코드 블록, 점수 패널              |
| 애니메이션  | 최소한의 hover, loading, PASS/FAIL 전환 |

### 6.4 디자인 우선순위

1. 입력 영역이 명확해야 한다.
2. AI 결과 JSON이 잘 보여야 한다.
3. Harness 평가 결과가 한눈에 보여야 한다.
4. 실패 이유를 쉽게 확인할 수 있어야 한다.
5. Todo 앱처럼 보이기보다 AI 평가 도구처럼 보여야 한다.

---

## 7. 데이터 모델

## 7.1 TodoResult

```json
{
  "task": "string",
  "category": "career | study | health | personal | finance | household | social | etc",
  "priority": "high | medium | low | unknown",
  "due": "string | null",
  "confidence": "number"
}
```

## 7.2 EvaluationResult

```json
{
  "schema_validation": "PASS | FAIL",
  "required_fields": "PASS | FAIL",
  "category_validation": "PASS | FAIL",
  "priority_validation": "PASS | FAIL",
  "due_parsing": "PASS | FAIL",
  "task_split": "PASS | FAIL",
  "confidence_check": "PASS | FAIL",
  "score": "number",
  "status": "PASS | FAIL",
  "reason": "string"
}
```

## 7.3 EvaluationLog

```json
{
  "id": "number",
  "input_text": "string",
  "ai_output": "TodoResult[]",
  "evaluation_result": "EvaluationResult",
  "score": "number",
  "status": "PASS | FAIL",
  "created_at": "datetime"
}
```

---

## 8. API 요구사항

## 8.1 Todo 분류 요청 API

### Endpoint

```http
POST /api/todos/classify
```

### Request

```json
{
  "input": "오늘 저녁에 운동하고 내일 이력서 수정하기"
}
```

### Response

```json
{
  "input": "오늘 저녁에 운동하고 내일 이력서 수정하기",
  "todos": [
    {
      "task": "운동하기",
      "category": "health",
      "priority": "medium",
      "due": "today_evening",
      "confidence": 0.86
    },
    {
      "task": "이력서 수정하기",
      "category": "career",
      "priority": "high",
      "due": "tomorrow",
      "confidence": 0.91
    }
  ],
  "evaluation": {
    "score": 92,
    "status": "PASS"
  }
}
```

---

## 8.2 테스트 케이스 목록 조회 API

### Endpoint

```http
GET /api/test-cases
```

### Response

```json
[
  {
    "id": 1,
    "input": "내일까지 이력서 수정하고 잡코리아 지원하기",
    "expected": {
      "task_count": 2,
      "categories": ["career"],
      "due_values": ["tomorrow"]
    }
  }
]
```

---

## 8.3 테스트 케이스 실행 API

### Endpoint

```http
POST /api/test-cases/{id}/run
```

### Response

```json
{
  "test_case_id": 1,
  "input": "내일까지 이력서 수정하고 잡코리아 지원하기",
  "expected": {
    "task_count": 2,
    "categories": ["career"],
    "due_values": ["tomorrow"]
  },
  "actual": [
    {
      "task": "이력서 수정하기",
      "category": "career",
      "priority": "high",
      "due": "tomorrow",
      "confidence": 0.91
    },
    {
      "task": "잡코리아 지원하기",
      "category": "career",
      "priority": "high",
      "due": "tomorrow",
      "confidence": 0.88
    }
  ],
  "evaluation": {
    "score": 95,
    "status": "PASS",
    "reason": "기대 task_count와 category, due 조건을 만족함"
  }
}
```

---

## 8.4 평가 로그 조회 API

### Endpoint

```http
GET /api/evaluation-logs
```

### Response

```json
[
  {
    "id": 1,
    "input_text": "오늘 운동하기",
    "score": 90,
    "status": "PASS",
    "created_at": "2026-06-09T10:30:00"
  }
]
```

---

## 9. 비기능 요구사항

## 9.1 성능

* 일반 분류 요청은 10초 이내에 응답해야 한다.
* 테스트 케이스 단건 실행은 10초 이내에 완료되어야 한다.
* 초기 MVP에서는 대량 테스트 실행은 필수로 구현하지 않는다.

## 9.2 안정성

* AI 응답이 잘못된 JSON일 경우 서버에서 오류를 처리해야 한다.
* AI 응답 파싱 실패 시 사용자에게 명확한 실패 메시지를 보여준다.
* Harness 평가 실패가 전체 애플리케이션 오류로 이어지면 안 된다.

## 9.3 확장성

추후 다음 기능을 추가할 수 있도록 구조를 단순하게 분리한다.

* 프롬프트 버전 관리
* 모델별 결과 비교
* 여러 테스트 케이스 일괄 실행
* 평가 기준 커스터마이징
* RAG 기반 분류 규칙 적용
* CSV 테스트 케이스 업로드

---

## 10. MVP 범위

## 10.1 MVP에 포함할 기능

* 자연어 Todo 입력
* AI Todo 분류
* JSON Output 표시
* Harness 평가
* 샘플 테스트 케이스 실행
* 평가 로그 저장
* 간단한 대시보드 UI

## 10.2 MVP에서 제외할 기능

* 회원가입 / 로그인
* 실제 Todo 완료 체크 기능
* 알림 기능
* 캘린더 연동
* 모바일 앱
* 팀 협업 기능
* 복잡한 권한 관리
* 대량 테스트 자동화
* 결제 기능

---

## 11. 기술 스택

### Frontend

* React
* TypeScript
* Tailwind CSS
* 필요 시 Uiverse 컴포넌트 참고

### Backend

* Spring Boot
* Java 21
* Gradle 또는 Maven
* OpenAI API 또는 선택한 LLM API

### Database

* PostgreSQL

### 기타

* JSON Schema Validator
* Docker 또는 로컬 PostgreSQL
* GitHub

---

## 12. 기본 테스트 케이스

## 12.1 단일 Todo

```json
{
  "input": "오늘 저녁에 운동하기",
  "expected": {
    "task_count": 1,
    "categories": ["health"],
    "due_values": ["today_evening"]
  }
}
```

## 12.2 복수 Todo

```json
{
  "input": "내일까지 이력서 수정하고 잡코리아 지원하기",
  "expected": {
    "task_count": 2,
    "categories": ["career"],
    "due_values": ["tomorrow"]
  }
}
```

## 12.3 날짜 없음

```json
{
  "input": "포트폴리오 정리하기",
  "expected": {
    "task_count": 1,
    "categories": ["career"],
    "due_values": [null]
  }
}
```

## 12.4 애매한 입력

```json
{
  "input": "나중에 그거 하기",
  "expected": {
    "task_count": 1,
    "categories": ["etc"],
    "due_values": ["unknown"],
    "confidence_max": 0.6
  }
}
```

## 12.5 생활 Todo

```json
{
  "input": "주말에 방 청소하고 빨래하기",
  "expected": {
    "task_count": 2,
    "categories": ["household"],
    "due_values": ["this_weekend"]
  }
}
```

---

## 13. 완료 기준

MVP는 다음 조건을 만족하면 완료된 것으로 본다.

* 사용자가 자연어 Todo를 입력할 수 있다.
* AI가 Todo JSON 배열을 반환한다.
* 반환된 JSON이 화면에 표시된다.
* Todo 카드가 화면에 표시된다.
* Harness 평가 결과가 표시된다.
* 최소 5개 이상의 테스트 케이스를 실행할 수 있다.
* 평가 로그가 DB에 저장된다.
* 실패 케이스의 이유를 확인할 수 있다.

---

## 14. 개발 우선순위

### 1단계: 백엔드 기본 구조

* Spring Boot 프로젝트 생성
* Todo 분류 API 생성
* LLM API 연동
* JSON 파싱 처리

### 2단계: Harness 평가 로직

* JSON Schema 검증
* category 검증
* priority 검증
* due 검증
* score 계산

### 3단계: 프론트엔드 Playground

* 입력창 구현
* Classify 버튼 구현
* 결과 카드 구현
* JSON Output 패널 구현
* 평가 결과 패널 구현

### 4단계: 테스트 케이스 기능

* 샘플 테스트 케이스 생성
* 테스트 케이스 실행 API
* Expected / Actual 비교 화면

### 5단계: 로그 기능

* 평가 로그 저장
* 로그 목록 조회
* 상세 결과 보기

### 6단계: 디자인 정리

* Uiverse 컴포넌트 적용
* 카드 UI 정리
* PASS / FAIL 배지 적용
* loading / hover / transition 적용

---

## 15. 리스크 및 주의사항

### 15.1 AI 응답 불안정성

AI가 동일한 입력에도 다른 결과를 반환할 수 있다.

대응 방법:

* 프롬프트를 명확하게 작성한다.
* temperature를 낮게 설정한다.
* JSON Schema를 강제한다.
* 응답 후 서버에서 재검증한다.

### 15.2 평가 기준 과도화

초기부터 평가 기준을 너무 복잡하게 만들면 Harness 자체 구현이 무거워진다.

대응 방법:

* MVP에서는 Schema, category, priority, due, task_count 정도만 평가한다.
* 의미적 정확성 평가는 후순위로 둔다.

### 15.3 디자인 과투자

본 프로젝트의 목적은 Harness 테스트이므로 디자인에 과도한 시간을 쓰면 안 된다.

대응 방법:

* 디자인은 Uiverse 컴포넌트 조합으로 빠르게 구성한다.
* 화면 구조는 대시보드 형태로 단순하게 유지한다.
* Figma 작업은 생략한다.

---

## 16. 최종 방향

Todo Classifier는 일반적인 Todo 서비스가 아니라, AI 응답을 구조화하고 Harness로 평가하기 위한 테스트 프로젝트다.

따라서 핵심은 다음 세 가지다.

```text
1. 자연어 입력을 구조화된 JSON으로 바꾸는가
2. Harness가 AI 응답을 검증할 수 있는가
3. 실패 이유와 평가 로그를 확인할 수 있는가
```

디자인은 후순위이며, MVP에서는 구현 가능한 컴포넌트를 조합하여 빠르게 테스트 가능한 화면을 만드는 것을 우선한다.
