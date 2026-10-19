# 후속 대화·수정·결정 기록 — 2026-10-15

이 문서는 [초기 대화·평가·비용 기록](conversation_history_2026-10-14.md) 이후의 요청과 구현 결과를 정리합니다. 대화 전체의 원문 전사는 아니며, 확인 가능한 사용자 요청·소스 변경·검증 결과를 연결한 인계 기록입니다. 최신 상태는 [세션 인계](SESSION_HANDOFF.md), 남은 과제는 [개선 진행표](improvement_backlog.md)를 기준으로 합니다.

## 대화 흐름과 결정

| 순서 | 사용자 요청·관심사 | 처리 및 현재 결론 |
| --- | --- | --- |
| 15 | 다음 개선 구현, 승인·의견이 필요하지 않으면 계속 진행 | 복구 이후 독립/중첩 배치 경로, 사용량 기록·다음 실행 제한 등을 보완. 변경별 범위와 당시 검증은 인계 문서에 보존 |
| 16 | 실행 증거에 기반한 작업 성공 판정 구현 | 실제 validation 실행과 source/HEAD/branch/index/log/assignment/worker를 연결. pass 표기만 있는 작업은 완료로 신뢰하지 않음 |
| 17 | 유닛·통합·보안 테스트가 없으면 먼저 진행·보고 | 검증된 묶음과 후속 변경의 재검증을 구분하고 결과 파일·실패 이력을 남기는 방식 유지 |
| 18 | provider 실행·결과·사용량 계약 분리 | 공통 요청/결과/usage 계약과 Codex adapter 분리. 명시적 provider 실패는 프로세스 exit 0이어도 성공이 아님 |
| 19 | Claude adapter 구현, 실제 유료 호출 없이 검증 | Claude adapter와 계약 검사를 구현. final result·권한 거부·캐시 사용량 등을 모의 응답/프로세스로 검증. 실제 유료 API 검증은 아님 |
| 20 | 남은 개선과 다음 변경 설명, 다른 프로젝트의 CLI 꼬임 경험 공유 | 명령 통일의 실제 오류 감소를 검증하는 방향으로 진행. 다른 격리 프로젝트에 Node CLI를 만들어 변경 전후 비교 |
| 21 | WSL/Linux/PowerShell/CMD/Bash 모두 검증 | Windows PS5/7·CMD·Git Bash, WSL2 Ubuntu native PowerShell/Bash 검사와 OS 간 hook 재설치 확인. 실행별 수치는 플랫폼 검증 문서에 보존 |
| 22 | 추가 핵심 구현은 보류하고 GUI 현황판 제작 가능성 논의 | 사용자가 원하는 정보는 단계별 진행, 가동 에이전트 수, 토큰/사용량, 종합 실행 상태. 핵심 schema/DAG 등은 자동으로 이어 구현하지 않기로 범위 전환 |
| 23 | harness-dashboard.html / v2 인라인 시각화 오류 수정 및 다시 열기 | `Invalid visualization read request`와 내부 오류가 반복됨. 인라인 표시가 복구됐다고 확인할 수 없었음 |
| 24 | 현황판 초안을 다시 이미지로 생성 | 정적 이미지 초안을 생성. 이미지의 숫자는 실제 운영 데이터로 간주하지 않음 |
| 25 | Harness 개발에 적합한 현황판 데이터 논의 | 작업·완료 증거·실제 worker·사용량·승인 요청·실패 원인·검증 결과·최신성을 중심으로 구현 방향 정리 |
| 26 | “좋다. 진행해보자” | 실제 상태 수집기, 로컬 조회 서버, HTML/CSS/JS 화면, CLI와 회귀 검사를 구현 |
| 27 | 지금까지 수정 내용과 대화를 이전처럼 문서화 | 이 후속 기록을 추가하고 인계·다음 세션 프롬프트·문서 진입 링크를 갱신. 이번 요청에서는 실행 코드를 추가 변경하지 않음 |

게시판 코드는 이전에 제거했고 이 폴더는 Harness 개선 전용입니다. 챗봇은 비용 설명용 예시였으며 현재 구현 대상 제품이 아닙니다. 초기 비용·구독 수치는 당시 논의의 가정으로만 보존하고 이번에 재조회하거나 실측하지 않았습니다.

## 현황판에서 확정한 데이터 의미

| 화면 정보 | 구현 기준 |
| --- | --- |
| 완료 / 등록 작업 | 보존된 assignment 큐의 고유 작업 수와 현재 증거를 확인한 완료 수. 미배정 계획 전체나 예상 잔여 시간은 포함하지 않음 |
| 가동 worker | 현재 OS의 host/PID/시작 식별자와 기록을 대조. in_progress 파일 수를 에이전트 가동 수로 사용하지 않음 |
| 토큰 사용량 | 기록된 호출의 known 사용량 합계. unknown과 reserved를 별도로 표시. 미확정 값을 0으로 만들지 않음 |
| 호출 내역 | 재시도 포함, provider·작업·호출 ID·토큰·시각. 화면에는 최근 100건, 총계는 전체 보존 기록 |
| 확인할 항목 | 실패·미검증 완료·불명확한 worker·미확정 사용량·승인 요청 등과 확인할 조치 |
| 검증 | 마지막 완료 사이클. 현재 실행 단계 이벤트가 없으므로 실시간 단계 진행처럼 표시하지 않음 |
| 최신성 | 마지막 수집 시각, 부분 수집, 실패, 연결 끊김, 갱신 일시 중지. 실패 시 이전 화면 유지 |
| 비용·구독 | 실제 청구액이나 구독 잔여량은 조회·추정하지 않음. 기존 토큰/시간 정책은 다음 실행 시작 제한이며 실행 중 강제 종료가 아님 |

## 이번에 수정한 파일과 목적

| 파일·영역 | 변경 내용 |
| --- | --- |
| `dashboard/index.html`, `style.css`, `app.js`, `PRODUCT.md` | 조회 화면, 작업 상세/필터, 호출 표, 자동 갱신, 모바일 배치, 제품 범위 기록 |
| `scripts/get_harness_dashboard.ps1` | 기존 상태 파일과 완료 증거를 읽어 JSON snapshot 생성. 원본 prompt·provider 로그·실행 인수는 응답에서 제외 |
| `scripts/harness_dashboard_server.py` | Python 표준 라이브러리 기반 loopback 서버, 고정 정적 파일/API, 최신 snapshot 캐시와 오류 보존 |
| `scripts/start_harness_dashboard.ps1` | Python과 PowerShell 실행 경로를 개별 인수로 전달하고 URL을 출력하는 실행기 |
| `scripts/harness.ps1`, `harness_cli.ps1` | `dashboard`, `-Snapshot -Json`, `-Preview`, 포트·수집 간격·Python 경로 옵션 연결 |
| `scripts/assignment_evidence.ps1` | `-ReadOnly` 완료 증거 검사. index를 비교하고 새 Git 객체를 만들지 않으며 Git fsmonitor/untracked cache 비활성화 |
| `scripts/assignment_state.ps1`, `run_assignment_worker.ps1` | Linux의 boot ID/PID/커널 시작 tick을 선택 필드로 기록. 시계 보정에 독립적으로 새 worker 식별 |
| `scripts/test_harness_dashboard.ps1`, `test_harness_dashboard_server.py`, `test_harness_dashboard_browser.js` | 수집·CLI·증거·경로/HTTP 보안·브라우저 회귀 추가 |
| `scripts/test_harness.ps1`, `.github/workflows/harness-self-test.yml`, `.gitignore` | 자체 검사/CI 정의 연결, 로컬 브라우저 산출물과 Python 캐시 제외 |
| README·사용 명령·계약·기능 목록·진행표·인계 문서 | 사용자 실행 방법, 측정 범위, 검증 근거와 남은 일을 연결 |

세부 명령과 경계는 [현황판 사용법](dashboard.md), 전체 구현 파일 매핑은 [기능 목록](feature_inventory.md)의 29번을 참조합니다.

## 발견한 문제와 처리

- 인라인 시각화 플랫폼의 읽기 오류 해결을 확인하지 못했습니다. 최종 구현은 로컬 HTTP 서버의 실제 웹 화면이며 이전 인라인 렌더러의 복구 결과가 아닙니다.
- PS7 JSON의 DateTime 처리와 PS5 문자열 처리를 분리하여 UTC 손실을 수정했습니다. 새 PowerShell 한글 파일은 PS5 호환 UTF-8 BOM을 확인했습니다.
- 실제 완료 파일 이름, 보고서 섹션의 key, 비어 있는 프로필, 검증 종료 시각 필드를 기존 계약에 맞췄습니다.
- 모바일 호출 표는 표 내부에서만 가로 스크롤하도록 보완했습니다. 브라우저 테스트의 기존 펼침 상태 의존성도 제거했습니다.
- WSL의 시작 시각 대조가 반복 검사에서 실패하여 Linux 새 worker에 커널 식별자를 추가했습니다. 구형 기록은 기존 시각 비교가 맞지 않으면 확인 불가로 남습니다.
- sandbox의 프로세스·junction·소켓 제한과 코드 결함을 구분했습니다. 실제 OS에서 재검증한 결과를 별도로 기록했습니다.

## 최종 검증 요약

| 검사 | 결과 |
| --- | --- |
| 현황판 회귀 | Windows PS5.1·PS7·WSL/Linux 각각 28/28 |
| HTTP 단위·통합·보안 | Windows·Linux 각각 8/8 |
| 실제 Edge 브라우저 | 11개 시나리오 통과 |
| 기존 CLI / 완료 증거 | 25/25, 28/28 |
| 기존 worker 실행·복구 | Windows PS7·Linux 각각 16/16 |
| 구문 | PowerShell 86개·설정 JSON, JavaScript 2개 통과 |

결과 파일 경로와 초기 실패는 [현황판 검증 기록](verification_dashboard_2026-10-15.md)에 있습니다. 브라우저는 실제 빈 화면과 명시적인 테스트 응답을 구분하여 검사했고 마지막에 실제 서버로 복구했습니다. 전체 기존 엔진 검사를 최종 코드에서 한 번에 모두 재실행한 결과로 합산하지 않습니다. 원격 CI, 유료 AI, 다른 Linux 배포판/물리 서버는 검증하지 않았습니다. 이번 문서화 요청으로 위 실행 검사를 다시 수행하지는 않았습니다.

## 다음 세션이 이어받을 상태

- 작업 경로: `C:\Users\mnshell\Desktop\Jungle\Harness_Improvement`.
- 활성 대상 프로필과 첫 Git commit baseline이 없습니다. 소스 전체의 untracked 상태를 삭제 대상으로 오해하지 않습니다.
- 이전 구현 종료 시점(2026-10-15 06:46 KST)의 로컬 서버 URL은 `http://127.0.0.1:8768/`였습니다. 세션/앱 재시작 뒤 서버 생존을 보장하지 않습니다. 새 세션에서 실행 여부를 확인하고 필요하면 재시작합니다.
- 실제 화면의 프로필 미설정·0개 작업은 현재 개발 checkout에서 정상입니다. 모의 데이터를 실제 기록처럼 채우지 않습니다.
- 재시작은 저장소 루트에서 `pwsh -NoProfile -File scripts/harness.ps1 dashboard -NoOpen -Port 8768`. Python 탐색이 실패하면 `-PythonExecutable <경로>`를 지정합니다. 중지하려면 실행 터미널에서 Ctrl+C를 사용합니다.
- 먼저 사용자의 현황판 피드백을 반영합니다. 계획/실행별 범위, 미배정 작업 분모, 실시간 단계 이벤트, 대규모 증분 수집은 후보 과제이며 아직 구현되지 않았습니다.
- schema/DAG·프로젝트별 검증 어댑터 등 핵심 후속 작업은 사용자가 보류한 범위입니다. 문서화 요청을 해당 기능들의 자동 구현 재개로 해석하지 않습니다.
- 실제 유료 호출, 대상 프로젝트 이식, 승인/병합, 원격 배포는 이번 현황판 구현·문서화에서 수행하지 않았습니다.

새 세션에는 [다음 세션 시작 프롬프트](next_session_prompt.md)를 전달하면 됩니다.
