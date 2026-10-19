# 로컬 조회 현황판 검증 — 2026-10-15

## 범위

실제 보존 큐·worker·완료 증거·usage ledger·승인 요청·latest_report를 조회하는 현황판을 구현했습니다. 개발 checkout은 활성 대상 프로필과 baseline commit이 없어 실제 화면에 미설정·빈 상태를 표시합니다. 제품 개발의 완료율이나 유료 provider 응답을 검증한 결과가 아닙니다.

변경 파일은 `dashboard/`, 수집기 `get_harness_dashboard.ps1`, Python 로컬 서버와 실행기, 통합 CLI와 새 회귀 검사입니다. 기존 완료 증거 검사는 `-ReadOnly`로 index를 비교하여 Git 객체 생성을 피합니다. snapshot Git 명령은 fsmonitor와 untracked cache를 끕니다. Linux worker에는 선택적인 커널 프로세스 식별자를 추가했습니다. 기존 승인·복구·실행 권한은 변경하지 않았습니다.

## 최종 검증 결과

| 검사 | 결과 | 증거 / 범위 |
| --- | --- | --- |
| PowerShell·JSON 구문 | 86개 PS 스크립트 통과 | `test_harness.ps1 -SyntaxOnly` |
| JavaScript 구문 | 2개 통과 | 화면 app.js 및 브라우저 검사 스크립트 |
| 현황판 Windows PS5.1 | 28/28 통과 | `.test-output/a6eb0989b0e242f5b292ca9990166b3f/results.json` |
| 현황판 Windows PS7 | 28/28 통과 | `.test-output/ba6a84d3212b4c9398bed905c02521cb/results.json` |
| 현황판 WSL/Linux native pwsh | 28/28 통과 | `.test-output/linux-dashboard-native/e9a4d2a3fada491ea155207b2821585b/results.json` |
| 기존 CLI 회귀 | 25/25 통과 | `.test-output/802ea2d1ea5a4c39b3edc844e6b190aa/results.json` |
| 기존 완료 증거 회귀 | 28/28 통과 | `.test-output/aec0bb59636d47d0b488c5b5040ec5ed/results.json` |
| 기존 worker 실행·복구 회귀 | Windows PS7·Linux 각각 16/16 통과 | Windows `.test-output/7ad074f251144196be69e235c8e3b344/results.json`, Linux `.test-output/linux-dashboard-native/09ce62caac8845bf98eae4f9d307f015/results.json` |
| Python HTTP 단위·통합·보안 | Windows·Linux 각각 8/8 통과 | Windows `.test-output/dashboard-http-windows.log`, Linux 동일 최종 실행의 unittest 결과 |
| Edge 브라우저 | 11개 시나리오 통과 | 아래 브라우저 검증 범위 |

전체 기존 엔진 회귀를 이번 작업에서 모두 다시 실행한 것은 아닙니다. 변경과 관련된 CLI·완료 증거·worker 실행/복구 및 새 현황판 회귀를 실행했습니다. GitHub Actions에 새 PowerShell suite와 Python HTTP 검사를 연결했으나 원격 CI는 실행하지 않았습니다. 물리 Linux·다른 배포판·실제 유료 AI 호출은 검증 범위가 아닙니다.

## 단위·통합·보안 확인

- 실제 Git fixture에서 source/index 변경이 기존 완료 증거를 무효화하는지 확인했습니다. 조회 전후 파일 및 Git 객체 fingerprint가 동일한지 검사했습니다.
- inbox/in_progress/done, 실패·legacy pass·중복/미확정 큐 전환을 구분합니다. 실행 기록의 host/PID/시작 식별자와 OS 프로세스를 대조합니다.
- known/unknown/reserved 사용량과 손상 ledger를 구분합니다. 손상 데이터를 0으로 대체하지 않습니다.
- 공백·대괄호·`&` 경로, 잘못된 CLI 옵션, 경계 밖 설정 경로와 symlink/junction 거부를 검사했습니다.
- 서버는 127.0.0.1에 바인딩합니다. Host·Origin·Fetch Metadata, CORS 부재, CSP, 변경 HTTP 메서드 거부, 임의 파일 경로·query 명령 거부를 검사했습니다.
- raw prompt/provider 로그와 stderr를 API로 보내지 않습니다. UI는 HTML 문자열을 textContent로 표시합니다.
- 실패/timeout/잘못된 JSON은 빈 성공으로 바꾸지 않고 이전 snapshot과 오래된 상태를 유지합니다.

## 브라우저 확인

별도 Edge 세션에서 실제 로컬 서버의 미설정 화면을 먼저 읽었습니다. 이후 테스트 브라우저의 API 응답만 명시적인 `UI TEST DATA · 브라우저 검증용` fixture로 대체했습니다. 프로젝트 파일이나 서버 상태는 변경하지 않았습니다.

작업 상세, 확인 필요 필터, HTML 문자열 비실행, 호출 내역 펼치기, 768px/320px 레이아웃, 갱신 일시 중지, 강제 연결 실패 시 기존 화면 유지, 실제 서버 재연결, 런타임 pageerror 부재를 확인했습니다. 테스트가 의도적으로 요청을 중단할 때 나타나는 네트워크 console error는 정상적인 실패 시뮬레이션입니다.

- 실제 빈 화면: `.test-output/dashboard-live-wide.png`
- UI fixture: `.test-output/dashboard-fixture-wide.png`
- 좁은 화면: `.test-output/dashboard-fixture-768.png`, `dashboard-fixture-320.png`

320px에서는 호출 표만 가로로 스크롤하고 전체 페이지는 넘치지 않습니다. 이 검증은 실제 provider가 실행 중인 화면을 촬영한 결과가 아닙니다.

## 발견 및 수정 이력

1. 초기 sandbox 검사는 프로세스 조회·junction/로컬 소켓 제한과 실제 코드 실패를 구분했습니다. 허용된 실제 OS 검증으로 재확인했습니다.
2. PS7의 JSON ISO timestamp가 DateTime으로 변환된 뒤 문자열 재파싱되며 UTC가 손실되는 문제를 수정했습니다. PS5의 문자열과 PS7 DateTime을 각각 처리합니다.
3. 완료 파일 이름 `id__pass.md`, 보고서 섹션별 중복 key, 비어 있는 프로필 경로, 증거의 `finished_at` 필드를 기존 계약에 맞췄습니다.
4. 모바일 호출 표의 좁은 열을 표 내부 스크롤로 수정했습니다. 브라우저 테스트는 재실행 전 새로고침하여 기존 펼침 상태에 의존하지 않도록 했습니다.
5. WSL 초기 28/28 이후 반복 검사에서 프로세스가 살아 있어도 시각 비교가 불일치하는 실패(26/28, 27/28)가 재현됐습니다. .NET Linux의 벽시계 기반 시작 시각만으로 가동 상태를 판단하는 의존성을 제거하기 위해 새 Linux worker에 boot ID/PID/커널 start tick을 기록했습니다. 커널 식별자가 같으면 벽시계 변경에도 유지하고, 커널 식별자·host 불일치는 거부하는 검사를 추가했습니다. 구형 기록은 보수적으로 확인 불가가 될 수 있습니다.

## 운영 한계

전체 계획/DAG 진행률, 실시간 단계 이벤트, 비용·구독 잔여량, 실행/승인 제어는 포함하지 않습니다. 보존된 작업 큐의 검증 완료 수와 마지막 완료 사이클을 보여줍니다. 파일별/합계 수집 한도와 비원자적 조회의 한계는 [사용법](dashboard.md)에 명시했습니다. 읽기 전용 화면 자체가 제품 정확성이나 실행 권한을 보증하지 않습니다.
