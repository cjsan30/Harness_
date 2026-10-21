> 보관본 (2026-10-20): 더 이상 갱신하지 않습니다. 현재 상태와 다음 작업은 [current_state.md](../current_state.md)를 보세요.

# 다음 세션 시작 프롬프트

최신 범위는 로컬 조회 현황판 구현과 대화·수정 이력의 문서화입니다.
[세션 인계](session_handoff_2026-10-15.md), [후속 대화·수정 기록](conversation_history_2026-10-15.md),
[현황판 검증](verification_dashboard_2026-10-15.md)의 최신 상태를 우선합니다.
사용자는 핵심 개선을 보류하고 현황판 구현을 승인했습니다. 다음에는 현황판 피드백을 먼저 반영합니다.

2026-10-15 현황판 구현·검증과 후속 문서화까지 반영했습니다. 아래 과거 검증 수치는 각 실행 당시 이력입니다.

```text
C:\Users\mnshell\Desktop\Jungle\Harness_Improvement에서 Harness 현황판 작업을 이어가자.
내 승인이나 의견이 필요한 게 아니면 구현·검증·문서 갱신을 진행해줘.

AGENT.md, docs/SESSION_HANDOFF.md, docs/improvement_backlog.md,
docs/current_state.md, docs/feature_inventory.md, docs/conversation_history_2026-10-15.md,
docs/dashboard.md, docs/verification_dashboard_2026-10-15.md,
docs/verification_platforms_2026-10-15.md, docs/verification_shell_2026-10-15.md, docs/shell_commands.md,
docs/claude_adapter.md, docs/provider_contract.md, docs/cli.md,
docs/assignment_evidence.md, docs/execution_usage.md,
docs/layout_support.md, docs/recovery_design.md를 읽고 현재 상태를 확인해줘.

이 저장소는 Harness 개선 전용이다. 게시판 코드는 제거했고 챗봇은 비용 예시였다.
과거 대화와 평가는 docs/conversation_history_2026-10-14.md에 있다.
이후 구현 요청, 현황판 논의와 오류 수정, 남은 일은 docs/conversation_history_2026-10-15.md에 있다.
승인 범위, intake 필터, OS lease, 원자 저장과 상태 충돌 검사를 구현했다.
worker intent/별도 host/lease, 큐 journal/복구, 독립·이식 핵심 경로,
worktree hook, JSONL 토큰·실행 시간·시도 기록과 다음 실행 제한도 추가했다.
실제 validation 실행과 code/Git/log/assignment/worker 연결도 구현했다.
완료/복구/seed 승격은 증거를 재검사하며 기존 pass는 증거가 없으면 미검증이다.
명시적 -Revalidate는 성공 종료가 확인된 기존 pass의 검증을 다시 실행한다.
단일 CLI scripts/harness.ps1도 구현했다. init/doctor/run/status/resume/usage/test,
무변경 -Preview, JSON v1, exit code 정규화를 제공한다.
resume는 조회가 기본이고 -Execute로 실행하며 run은 기본 live다.
이전 100개 결과를 확인했고 신규 CLI 유닛 12/통합 8/보안 5는 PS5/7 모두 통과했다.
이후 provider 실행/응답/usage를 Codex adapter와 공통 v1 계약으로 분리했다.
worker/ledger에 계약·결과를 연결하고 exit 0인 provider 실패도 증거/복구에서 거부한다.
이후 Claude adapter도 구현했다. 프로필로 선택하며 캐시 생성/읽기를 입력에 합산한다.
acceptEdits/permission-prompts none을 유지하고 필요한 검증·완료 명령은 대상의 허용 규칙을 사용한다.
Claude final result 누락·실패·권한 거부는 성공으로 처리하지 않는다. worker native stdin/stdout은 UTF-8이다.
실제 유료 호출 없이 테스트했으며 최신 실행별 근거와 범위는 검증 문서를 확인해줘.
PS5/7 모두 기존 147개와 최종 Claude 38개(유닛 10·통합 9·보안 19)를 통과했다.
PS5는 전체 183개 후 최종 Claude 재검증, PS7은 전체 185개이며 구문 79개·JSON도 통과했다.
미확인 worker/usage 예약을 자동 삭제·환불·재실행하지 말아줘.
이후 여덟 번째 묶음에서 개별 검증·cycle·retry shell을 공통화했다.
기본 make fallback·추가 인자 무시를 제거하고 설치 루트/상속 환경 검사,
preview·원래 종료 코드 전달·재귀 차단을 구현했다.
다른 격리 프로젝트에 실제 Node CLI를 만들어 변경 전 0/12를 재현했고
변경 후 PS5/7 각각 신규 36/36과 최종 코드 전체 221/221이 통과했다.
구문 PS82·shell20·JSON, 별도 실제 make 2/2도 통과했다. 실행별 근거는 최신 검증 기록을 읽어줘.
이후 PowerShell/CMD/Bash 비교 테스트를 추가했다. 당시 PS83 + shell20 = 103개였다.
Windows PS5/7 각각 새 진입점 30/30, Linux /tmp의 기존 185/185와 보강 shell36/36·진입점20/20을 확인했다.
Windows→WSL→Windows hook 재설치·보호 commit 거부·실제 도구 실행은 3단계 모두 통과했다.
WSL 런타임 오류 문구와 DrvFS의 Git 읽기 전용 객체 복사에 대한 테스트를 보완했다.
/mnt/c 초기 실패와 재실행 결과는 최신 검증 기록을 읽고, 분리 실행을 전체 단일 run으로 합산하지 말아줘.
최종 /mnt/c 재검사는 shell36/36·진입점20/20과 exit 0을 확인했다.
Linux /tmp 원본 일부가 사라져 작업 중 복사·대조한 .test-output/platform-evidence를 보존 근거로 사용한다.
그 플랫폼 검증 작업에서는 엔진 실행 코드를 변경하지 않았으며 명령은 여전히 OS shell 문자열이다.
금액·구독 잔여 한도·실행 중 강제 timeout은 구현하지 않았다.
실제 AI, 원격 CI/GitHub merge, 다른 Linux 배포판/물리 서버는 미검증이다.

첫 커밋이 없어 소스 전체가 untracked이며 활성 대상 프로필도 없다.
기존 파일을 정리 대상으로 오해하거나 원본으로 덮어쓰지 말아줘.
이후 사용자가 핵심 개선을 보류하고 조회 현황판 구현을 승인했다.
현재 PS86 + shell20, Python2, 브라우저 회귀 JS1이다.
dashboard는 로컬 서버와 읽기 전용 snapshot으로 작업·증거·worker·사용량·승인을 표시한다.
Linux 새 worker는 boot ID/PID/start tick을 기록하며 기존 worker 상태 전이 정책은 유지한다.
현재 checkout의 빈 화면은 프로필 미설정에 따른 정상 상태다.
이전 작업 종료 시 서버는 http://127.0.0.1:8768/ 에서 실행했지만 새 세션에서도 켜져 있다고 가정하지 말아줘.
필요하면 저장소 루트에서 pwsh -NoProfile -File scripts/harness.ps1 dashboard로 다시 실행해줘.
최종 현황판은 PS5/PS7/WSL 각 28/28, HTTP Windows/Linux 각 8/8, 브라우저 11개를 통과했다.
관련 CLI 25/25, 완료 증거 28/28, worker 복구 Windows/Linux 각 16/16도 통과했다.
전체 기존 엔진을 최종 코드로 한 번에 모두 재실행한 것으로 합산하지 말아줘.
최신 검증 문서와 현황판 피드백을 확인하고, 사용자가 요청한 다음 UI 작업부터 진행해줘.
전체 작업 schema/DAG와 프로젝트별 검증 어댑터는 별도 재개 요청 전까지 보류해줘.
실제 유료 호출 없이 fixture부터 검증하고 shell 명령 회귀도 유지해줘.
실행 증거가 제품 의미상 정확성 전체를 보장한다고 주장하지 말아줘.
새 지시가 있으면 우선 반영해줘.

Windows에서는 명시적 PowerShell, NoProfile, UTF-8, LiteralPath를 사용하고
수동 편집은 apply_patch를 우선해줘. Orca 사용·제안은 금지.
GitHub 인증 경로는 독립적이며 sandbox 오류만으로 재로그인을 요구하지 말고
토큰·credential·쿠키는 읽거나 출력하지 말아줘.
최종 답변 마지막 줄은 '최종 답변 시각: YYYY-MM-DD HH:mm (KST)'로 적어줘.
```
