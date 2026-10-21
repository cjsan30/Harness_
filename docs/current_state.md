# Harness 현재 상태와 다음 작업

이 문서는 **유일한 인계 문서**입니다. 세션을 시작할 때 이 문서만 먼저 읽고, 세션을 마칠 때 이 문서의 "최근 변경"과 "다음 작업"을 갱신하세요.
새 인계 문서(SESSION_HANDOFF, next_session_prompt, conversation_history 등)를 만들지 않습니다. 과거 기록은 [archive/](archive/)에 있습니다.

- 최종 갱신: 2026-10-21 (Claude Code P0 정리 세션)
- 작업 루트: `C:\Users\lAte\develop\Harness_`
- 원격: `https://github.com/cjsan30/Harness_.git` (기본 `main`, 작업 브랜치 `dev`)

## 1. 저장소 범위

- 재사용 가능한 Harness 엔진(AI 코딩 worker 배정·검증·재시도·Git 승격 통제)만 개발합니다.
- 초기에 검토했던 AI 트러블슈팅 게시판 제품 코드는 제거했고 다시 만들지 않습니다. 챗봇은 비용 설명용 예시였을 뿐입니다.
- 활성 대상 프로필 `project/configs/project_profile.json`은 **없습니다.** 운영 preflight·cycle·live dispatch는 준비 완료 상태가 아니며, 현황판의 빈 화면도 정상입니다.
- `AGENT.md`와 `harness/...` 경로 표기는 **대상 저장소에 이식될 엔진 문서/배치** 기준입니다. 이 저장소에서는 루트 기준으로 읽습니다.

## 2. 구현 상태 요약

18개 개선 과제의 상세 상태와 완료 기준은 [improvement_backlog.md](improvement_backlog.md), 기능별 구현 파일은 [feature_inventory.md](feature_inventory.md)를 기준으로 합니다.

| 영역 | 상태 |
| --- | --- |
| 승인 범위 바인딩 (root/branch/head/target/stage) | 구현 |
| 민감정보 | intake 복사 차단, worker·gate·cycle·검증 증거 로그 비밀값 마스킹(2026-10-21). retry prompt·보고서 경로는 미조사 |
| OS lease 잠금, durable worker intent, 별도 worker host | 구현. 실행 1회 시간 초과 시 provider 트리 종료 구현(2026-10-21). host 비정상 종료 후 자동 종료·네트워크 FS 검증 미완 |
| 원자적 저장, workflow 충돌 거부, 큐 전환 journal/복구 | 구현. 최초 assignment/packet 생성·외부 side effect 복구 미완 |
| 독립/이식 경로 통일, shell 명령 계약 | 핵심 경로 구현 ([shell_commands.md](shell_commands.md), [layout_support.md](layout_support.md)) |
| 실행 증거 기반 성공 판정 | 구현 ([assignment_evidence.md](assignment_evidence.md)) |
| 실행별 사용량 기록, 다음 실행 제한 | 구현. 실행 1회 시간 상한 `max_invocation_seconds` 추가(2026-10-21). 금액 예산·실행 중 토큰 상한 미구현 ([execution_usage.md](execution_usage.md)) |
| 단일 CLI `scripts/harness.ps1` | 구현 ([cli.md](cli.md)) |
| Provider 계약 v1, Codex·Claude adapter | fixture로만 검증. 실제 유료 호출 미검증 ([provider_contract.md](provider_contract.md), [claude_adapter.md](claude_adapter.md)) |
| 로컬 조회 현황판 | 구현 ([dashboard.md](dashboard.md)) |
| 작업 schema/DAG, 문맥 최소화, 형식 통일, 검증 어댑터 (13~16) | **보류** — 사용자의 명시적 재개 요청 전까지 시작하지 않음 |

## 3. 마지막 검증 기록

모든 수치는 실행 당시 기록이며, 서로 다른 실행을 한 번의 전체 실행으로 합산하지 않습니다.

- 소스 규모: PowerShell 89개 + shell 19개, Python 2개, 브라우저 회귀 JS 1개 (2026-10-21, `run_self_gate.ps1`·`approve_branch_deletion.ps1`·`test_git_workflow_policy.ps1` 추가 후)
- **2026-10-21 integration gate (커밋 `2e5be71`, `run_self_gate.ps1 -Stage integration`):** Windows PowerShell 5.1 **290/290**, PowerShell 7.6.7 **290/290**, FAIL 0. 정책 suite 11건 포함. feature gate(두 런타임 구문 검사)도 통과
- 2026-10-21 전체 회귀 (Git 정책 개편 후, 삭제 승인 추가 전): Windows PowerShell 5.1 **289/289**, PowerShell 7.6.7 **289/289**, FAIL 0. 이전 279건 + 정책 테스트 10건(`test_git_workflow_policy.ps1`)
- 2026-10-21 전체 회귀 (Windows PowerShell 5.1, P0 정리 직후·정책 개편 전): 279/279 통과, FAIL 0. 구성: 구문 86개 스크립트·JSON 통과, safety 23, recovery 16, usage 18, evidence 28, layout 15, CLI 25, provider 22, Claude 38, shell 36, 진입점 30, 현황판 28. 같은 날 현황판 HTTP(Windows Python) 8/8
- 2026-10-21 전체 회귀 (PowerShell 7.6.7, P0 정리 직후·정책 개편 전): 279/279 통과, FAIL 0. 구성은 PS5.1과 동일. PS7은 이 날 winget으로 설치(MSIX, `%LOCALAPPDATA%\Microsoft\WindowsApps\pwsh.exe` 실행 별칭)
- 이전 기록: Windows PowerShell 5.1/7 각각 221/221 (Shell 묶음 시점)
- 플랫폼(2026-10-15): Windows PS5/7 진입점 각 30/30, WSL2 Ubuntu `/tmp` 185/185·shell 36/36·진입점 20/20, `/mnt/c` shell 36/36·진입점 20/20
- 현황판(2026-10-15): PS5/PS7/WSL 각 28/28, HTTP Windows/Linux 각 8/8, 브라우저 11개 시나리오
- 문서 링크(2026-10-21): 저장소 전체 로컬 Markdown 링크 343개, 깨진 링크 0건
- **원격 CI (2026-10-21, `dev` `60df7c5`, run 39595958149):** 처음으로 정상 실행. self-test Windows PS7 성공(10분 56초), Windows PS5.1 성공(10분 36초), Ubuntu PS7 성공(7분 52초), `Harness CI` 성공. 경고: `actions/checkout@v4`·`actions/upload-artifact@v4`의 Node.js 20 지원 종료 예고
- **미검증:** `run_git_hook_smoke.sh`·`run_pr_control_smoke.sh` 갱신본 실행(Linux/macOS용), 실제 유료 Codex/Claude 호출, 실제 GitHub merge, 다른 Linux 배포판, 2026-10-21 시점 WSL
- 상세 근거: [archive/](archive/)의 `verification_*_2026-10-15.md`

## 4. 알려진 문제 (2026-10-19 분석, 2026-10-21 갱신)

1. ~~`.githooks/` 추적 사본·CRLF~~ → 2026-10-21 해결: 추적 해제하고 `.gitignore`에 추가. 테스트·CI는 `githooks/` 템플릿만 사용하며 추적 사본에 의존하지 않음. 작업 트리의 `.githooks/` 파일은 남아 있음(무시됨)
2. ~~hook 미설치·프로필 없으면 전 브랜치 커밋 차단~~ → 2026-10-21 해결: 커밋 규칙을 보호 브랜치(`main`·`dev`·`test/*`)만 막도록 완화, 엔진 전용 정책 `.harness/self_workflow.json` 추가, hook 설치(`core.hooksPath` = 저장소 `.githooks`). 로컬 `dev`는 승인된 merge `60df7c5`로 갱신되어 `dev` push가 hook을 통과함(pre-push 직접 실행으로 확인, 실제 push는 미실행)
3. ~~Orca locked worktree 2개~~ → 2026-10-21 해결: 사용자 승인으로 `git worktree unlock` → `git worktree remove --force` → `prune`. `.git/worktrees/` 없음
4. 담당자 이름(agent-runtime/query/storage/index/tests, manager-main/harness)은 2026-10-21 사용자 결정으로 `harness_board` 브랜치 이름을 그대로 유지합니다(정리 대상 아님). 엔진 저장소 owner도 같은 7개
5. `scripts/provider_claude.ps1`이 쓰는 `--permission-prompts none` 플래그가 실제 Claude CLI에 존재하는지 확인되지 않았습니다(fixture로만 검증).
6. `AGENT.md`는 Codex가 자동으로 읽는 `AGENTS.md`와 이름이 다릅니다. 단, 프로필 템플릿과 `harness_common.ps1`이 `AGENT.md`를 참조하므로 이름 변경은 엔진 변경으로 다뤄야 합니다.
7. `harness_common.ps1`(약 1,200줄), `dispatch_seed_plan.ps1`, `git_workflow_common.ps1`은 한 줄 압축 스타일이 많아 리뷰가 어렵습니다.
8. ~~이 PC에 PowerShell 7 없음~~ → 2026-10-21 해결: winget으로 7.6.7 설치. 이미 열려 있던 셸은 PATH가 갱신되지 않으므로 새 터미널에서 `pwsh` 사용
9. ~~GitHub 서버 보호 없음~~ → 2026-10-21 사용자가 `install_github_ruleset.ps1 -RequiredApprovals 0 -RequiredCheckName "Harness CI"` 직접 실행. ruleset `Harness Main Protection`(id 25530828, active): `main` 삭제·강제 push 금지, PR 필수(승인 0명, 코멘트 해결), `Harness CI` 필수(strict), 우회 없음. `Harness CI` check는 2026-10-21 `dev` push부터 보고됨. 같은 날 `install_github_ruleset.ps1 -Branch dev -ProtectionOnly`로 `Harness dev Protection`(id 25547041, active) 추가: `dev` 삭제·강제 push 금지만, PR·필수 check 없음(로컬 승인 merge 후 push 흐름 유지), 우회 없음. `audit_github_policy.ps1 -Branch dev -ProtectionOnly` pass
10. `.githooks/` 추적 해제 커밋(`2e5be71`)을 처음 받는 checkout(merge·pull·checkout)에서는 Git이 작업 트리의 `.githooks/`를 삭제합니다. `core.hooksPath`가 빈 경로를 가리켜 hook이 **조용히 꺼지므로**, 그 직후 `scripts/install_git_hooks.ps1`을 다시 실행해야 합니다(2026-10-21 이 checkout에서 실제 발생, 재설치함)

## 5. 최근 변경

- 2026-10-21: 실제 유료 실행 전 안전장치. (1) `execution_policy.max_invocation_seconds`: 실행 1회 시간 상한, worker host가 띄운 `worker_timeout_watchdog.ps1`이 초과 시 provider 프로세스 트리만 종료하고 host는 `timed_out`·exit 124·사용량 unknown으로 종료 확정. (2) `secret_redaction.ps1`: worker·gate·cycle·검증 증거 로그를 쓰기 전 비밀값 마스킹(사용량 수치 유지). 회귀: provider suite +2(실제 host로 60초 hang child를 3초에 종료, 정책 값 검증), safety suite +2(마스킹 패턴·환경 변수 값, gate 로그)
- 2026-10-21: `install_github_ruleset.ps1`·`audit_github_policy.ps1`에 `-Branch`·`-ProtectionOnly` 추가(삭제·강제 push 금지만; main에는 거부; 같은 이름의 다른 브랜치 ruleset 덮어쓰기 거부). fake gh 회귀 4건 추가(정책 suite 15건). 실제 저장소에 dev ruleset 적용
- 2026-10-21: 위 변경을 `manager-harness/p0-cleanup-git-policy`에서 커밋(`2e5be71`) → feature gate → integration gate(두 런타임 290/290) → 승격(`promotion_20261021_170902_738_ac3ce25c`) → 승인된 merge로 로컬 `dev` 반영(`60df7c5`). 미병합 원격 브랜치 삭제용 `approve_branch_deletion.ps1` 추가. push 안 함
- 2026-10-21: Git 정책 개편. 브랜치 이름 `<owner>/<task>`·`test/<candidate>`(AI 접두사 제거, 프로필에 `codex/`를 명시한 대상은 그대로 동작). 커밋은 보호 브랜치만 차단하고 feature gate는 push 시점에 요구. 병합된 feature/test 원격 브랜치 삭제 허용, 미병합 브랜치는 사용자 승인(`approve_branch_deletion.ps1`, head 결합) 또는 GitHub 화면에서 직접 삭제(`main`·`dev` 삭제는 차단). gate 명령의 `make integration`·`pwsh` 대체 실행 제거(미설정 시 fail closed). preflight가 빈 feature 접두사 허용, 예약 이름과 겹치는 owner 거부. 엔진 전용 정책 `.harness/self_workflow.json`과 `scripts/run_self_gate.ps1`(feature: 두 런타임 구문, integration: 두 런타임 전체 회귀, final: + 현황판 HTTP) 추가. CI workflow 수정(matrix를 `shell`에 쓰던 오류, `Harness CI` 집계 job 추가). hook 설치. 회귀 PS5.1·PS7 각 289/289
- 2026-10-21: P0 정리. `docs/SESSION_HANDOFF.md`, `docs/next_session_prompt.md` 삭제(archive 사본과 헤더·링크 경로 외 동일 확인). 호출자 없는 `scripts/resolve_make.sh` 삭제, `feature_inventory.md`·`shell_commands.md` 항목 제거. `.githooks/` 추적 해제·`.gitignore` 추가·README 구조 표 갱신. 링크 검사 0건, PS5.1 전체 회귀 279/279. Orca worktree 2개 강제 정리(사용자 승인), PS7 7.6.7 설치 후 PS7 회귀 279/279, 로컬 `master`→`main` 이름 변경(`origin/main` 추적)·전역 `init.defaultBranch=main` 설정, hook 설치는 프로필 부재 시 전 브랜치 커밋 차단 문제로 보류, PS7 회귀는 `pwsh` 부재로 미실행
- 2026-10-20: 인계 문서를 이 파일로 통합. `SESSION_HANDOFF.md`, 이전 `current_state.md`, `next_session_prompt.md`를 `archive/`에 보관본으로 복사. archive 이동 후 깨진 문서 링크 약 50개 수정. `CLAUDE.md` 추가. `.gitattributes`에 `.githooks/*` LF 규칙 추가. (코드 변경 없음, 테스트 미실행)

## 6. 다음 작업 (우선순위 순)

### P0 — 정리 잔여

1. ~~`dev` push와 CI 확인~~ → 2026-10-21 완료(위 3절)
2. ~~`dev` 서버 보호~~ → 2026-10-21 완료(알려진 문제 9)
3. `main` PR 흐름 1회 실행(정리 완료 후): `test/<후보>` 생성 → final gate → `request_main_merge_approval.ps1`·`set_main_merge_approval.ps1` → `open_pr_candidate.ps1` → `check_pr_status.ps1` → `merge_pr_if_allowed.ps1`. ruleset이 PR·`Harness CI`를 실제로 강제하는지 확인
4. workflow의 `actions/checkout`·`actions/upload-artifact`를 Node.js 24 대응 버전으로 갱신
5. `run_git_hook_smoke.sh`·`run_pr_control_smoke.sh`를 Linux/WSL에서 실행해 새 규칙 확인

### P1 — 검증 공백 메우기

- 원격 CI: `dev` push 후 GitHub Actions `Harness self-test` 결과 확인 (push 승인 필요)
- Claude CLI 플래그 확인: 로컬 `claude --help`로 `provider_claude.ps1` 인자 존재 여부 확인 (유료 호출 없음)
- 담당자 예시 이름 정리(알려진 문제 4) — 템플릿·README·`harness_common.ps1` 기본값을 함께 수정하고 회귀 실행

### P2 — 포트폴리오 준비 (사용자 결정 필요)

- 작은 대상 프로젝트에 이식해 실제 사이클 1회 실행(유료 AI 호출 → 사전 승인 필요)
- README를 1페이지 사례 중심으로 재작성(문제·아키텍처·핵심 설계 결정·결과·현황판 이미지)

### 보류

- 개선 과제 13~16(작업 schema/DAG, 문맥 최소화, 형식 통일, 프로젝트별 검증 어댑터): 사용자가 재개를 요청할 때까지 시작하지 않음
- 현황판 추가 UI 작업: 사용자 피드백을 받은 뒤 진행

## 7. 문서 지도

| 필요할 때 | 문서 |
| --- | --- |
| 남은 과제·완료 기준 | [improvement_backlog.md](improvement_backlog.md) |
| 기능과 구현 파일 | [feature_inventory.md](feature_inventory.md) |
| 사용자 동작·명령 | [user_actions_and_commands.md](user_actions_and_commands.md), [../configs/commands.md](../configs/commands.md) |
| 스크립트 사용법 | [../scripts/README.md](../scripts/README.md) |
| Git 정책 | [../configs/git_policy.md](../configs/git_policy.md) |
| 이식 | [PORTING.md](PORTING.md) |
| 과거 결정·검증 근거 | [archive/](archive/) |
