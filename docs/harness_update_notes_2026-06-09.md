# Harness Update Notes - 2026-06-09

## 최초 상태

처음 로컬 폴더의 harness는 portable harness의 뼈대는 있었지만, 실제 새 프로젝트에 붙여 운영하기에는 다음 부분이 부족했다.

- Windows/macOS/Linux에서 같은 흐름으로 시작하는 portable runtime 보장이 약했다.
- PowerShell 실행 경로가 플랫폼마다 달라 native `pwsh` 기준이 명확하지 않았다.
- 사용자가 요구사항을 어디에 넣고, harness가 언제 읽어 개발을 시작하는지 흐름이 정리되지 않았다.
- live worker handoff, retry, resume, 상태판, 사용자 알림이 부분적으로만 있었다.
- Git hook은 있었지만 첫 커밋, branch gate, PR, GitHub Actions, ruleset까지 이어지는 운영 흐름이 덜 닫혀 있었다.
- 프로젝트별 stack, dev environment, service dependency, security baseline, release provenance를 자동 생성하거나 감사하는 기능이 부족했다.
- 실제 프로젝트에 붙였을 때 generated report/state, WSL path, bootstrap commit, GitHub 인증 분리 같은 포팅 마찰이 드러날 가능성이 컸다.

## 순서별 변경 기록

### 1. Portable platform baseline 정리

macOS, Windows, Linux/WSL을 모두 고려하되 실행 기준은 Linux/WSL에서 안전하게 동작하는 native `pwsh`로 맞췄다.

추가 또는 정리된 기능:

- `scripts/resolve_powershell.sh`
- `scripts/setup_portable_runtime.sh`
- `scripts/run_portable_smoke.sh`
- Linux/macOS shell setup path
- Windows PowerShell fallback 조건 분리
- WSL에서는 `powershell.exe` fallback을 막고 native `pwsh`를 요구

검증 목적:

- target repo에 `harness/`를 붙인 뒤 hook 설치와 preflight가 같은 방식으로 동작하는지 확인한다.

### 2. Intake 기반 시작 흐름 추가

사용자가 Codex에게 매번 질문받으며 입력하는 대신, 먼저 프로젝트 요구사항을 문서에 적고 harness가 읽어서 시작하는 흐름을 만들었다.

추가 또는 정리된 기능:

- `docs/project_intake.template.md`
- `scripts/start_from_intake.ps1`
- `scripts/review_project_intake.ps1`
- `scripts/generate_env_manifest.ps1`
- `docs/project_intake_questions.md` 생성 흐름
- `harness/reports/intake_review_report.md`
- `harness/reports/sensitive_followups.md`

핵심 동작:

- 요구사항이 모호하면 개발 시작 전 질문 목록을 만든다.
- 사용자가 `-AllowDeferredClarifications`를 주면 일단 시작하고 나중에 질문할 수 있다.
- 민감한 토큰/비밀번호 값은 저장하지 않고 필요한 변수명과 후속 조치만 기록한다.

### 3. Status snapshot과 Telegram 알림 추가

중간에 harness가 멈추거나 사용자 확인이 필요할 때 상태를 볼 수 있도록 상태판과 알림 흐름을 정리했다.

추가 또는 정리된 기능:

- `scripts/get_harness_status.ps1`
- `scripts/send_harness_notification.ps1`
- `configs/notification.template.json`
- `harness/reports/status.md`
- `harness/reports/status.json`
- `harness/state/notifications/`

핵심 동작:

- 상태판은 daemon이 아니라 snapshot 명령이다.
- Telegram 환경변수가 설정되어 있으면 attention 상태를 알림으로 보낸다.
- 중복 알림 signature는 억제한다.

### 4. Retry, seed handoff, live worker resume 강화

단일 실패를 재시도하고, manager seed plan을 실제 worker assignment로 나눠 실행하는 흐름을 보강했다.

추가 또는 정리된 기능:

- `scripts/run_retry_handoff.ps1`
- `scripts/dispatch_retry_prompt.ps1`
- `scripts/generate_retry_prompt.ps1`
- `scripts/run_seed_handoff.ps1`
- `scripts/dispatch_seed_plan.ps1`
- `scripts/get_seed_handoff_resume.ps1`
- `scripts/invoke_assignment_codex.ps1`
- `scripts/invoke_pending_assignment_codex.ps1`
- assignment lock과 stale/recoverable 상태 처리

핵심 동작:

- 실패한 worker 결과를 다음 retry packet에 포함한다.
- 이미 실행 중인 assignment는 중복 실행하지 않는다.
- `-Resume`은 pass 항목을 건너뛰고 failed/pending 항목만 재처리한다.

### 5. Git workflow gate와 hook 강화

검증 없는 commit/push/merge를 막기 위해 branch stage별 gate와 hook을 정리했다.

추가 또는 정리된 기능:

- `scripts/run_git_gate.ps1`
- `scripts/assert_git_action_allowed.ps1`
- `scripts/install_git_hooks.ps1`
- `scripts/audit_git_workflow.ps1`
- `scripts/authorize_branch_promotion.ps1`
- `scripts/merge_authorized_branch.ps1`
- `scripts/request_main_merge_approval.ps1`
- `scripts/set_main_merge_approval.ps1`
- `githooks/pre-commit`
- `githooks/pre-push`
- `githooks/pre-merge-commit`
- `githooks/pre-rebase`

핵심 정책:

- `main`, `dev`, `codex/<owner>/<task>`, `codex/test/<candidate>` 역할을 분리한다.
- commit은 현재 staged tree가 gate를 통과해야 가능하다.
- push는 실제 ref update를 검사한다.
- `main` merge는 final gate와 approval record가 필요하다.

### 6. Hybrid PR control 추가

로컬 harness approval과 GitHub Actions required check를 함께 쓰는 hybrid PR 경로를 추가했다.

추가 또는 정리된 기능:

- `scripts/github_pr_common.ps1`
- `scripts/open_pr_candidate.ps1`
- `scripts/check_pr_status.ps1`
- `scripts/merge_pr_if_allowed.ps1`
- `scripts/install_github_actions_workflow.ps1`
- `scripts/run_pr_control_smoke.sh`

핵심 동작:

- PR source head가 로컬 승인된 `codex/test/*` head와 같은지 확인한다.
- required PR checks가 통과해야 merge wrapper가 `gh pr merge --match-head-commit`을 실행한다.
- fake `gh` 기반 smoke로 GitHub 네트워크 없이 제어 흐름을 검증한다.

### 7. GitHub server policy ruleset 추가

로컬 hook만으로 막을 수 없는 server-side branch protection을 GitHub ruleset으로 설치/감사하는 기능을 추가했다.

추가 또는 정리된 기능:

- `scripts/github_policy_common.ps1`
- `scripts/install_github_ruleset.ps1`
- `scripts/audit_github_policy.ps1`
- `scripts/run_github_policy_smoke.sh`

기본 ruleset:

- `main` 보호
- delete 차단
- force-push 차단
- PR 필수
- review thread resolution 필수
- `Harness CI` required check
- strict latest-base check

### 8. Platform engineering 기능 추가

여러 stack 프로젝트에 붙일 때 필요한 개발환경, 서비스 의존성, CI, release provenance 생성을 추가했다.

추가 또는 정리된 기능:

- `scripts/platform_engineering_common.ps1`
- `scripts/install_dev_environment.ps1`
- `scripts/audit_dev_environment.ps1`
- `scripts/install_service_contract.ps1`
- `scripts/audit_service_contract.ps1`
- `scripts/run_service_contract.ps1`
- `scripts/audit_ci_matrix.ps1`
- `scripts/install_release_provenance_workflow.ps1`
- `scripts/audit_release_provenance.ps1`
- `scripts/run_platform_engineering_smoke.sh`

핵심 동작:

- profile 기반 devcontainer/toolchain manifest 생성
- disposable service contract와 optional compose file 생성
- stack별 CI matrix/cache 구성
- release artifact upload와 GitHub attestation workflow 생성

### 9. Security and quality baseline 추가

반복 PR 작업 전에 최소 security/quality baseline을 자동으로 생성하고 감사할 수 있게 했다.

추가 또는 정리된 기능:

- `scripts/security_quality_common.ps1`
- `scripts/install_security_baseline.ps1`
- `scripts/audit_security_baseline.ps1`
- `scripts/install_precommit_baseline.ps1`
- `scripts/audit_precommit_baseline.ps1`
- `scripts/run_security_quality_smoke.sh`

생성 항목:

- Dependabot
- CodeQL when supported
- OpenSSF Scorecard
- `.pre-commit-config.yaml`
- GitHub security settings optional audit

### 10. PowerShell runtime cache 안정화

실제 테스트 중 PowerShell이 홈 디렉터리에 cache/data/config를 쓰지 못하는 문제가 드러났다. 처음에는 harness 내부 `state/xdg`를 고려했지만 Git tree를 오염시킬 수 있어 repository 밖 temp 경로로 분리했다.

추가 또는 정리된 기능:

- `scripts/powershell_env.sh`
- shell smoke와 `setup_portable_runtime.sh`에서 PowerShell XDG 환경 준비
- Git hook에서 PowerShell 실행 전 XDG 환경 준비

현재 정책:

- 기본 경로: `${TMPDIR:-/tmp}/codex-harness-xdg/<harness-key>/`
- override: `CODEX_HARNESS_XDG_ROOT`
- Windows Git Bash/MSYS 계열은 no-op 처리

### 11. Todo Classifier 실전 포팅 테스트에서 확인한 문제

`C:\Users\mnshell\Desktop\Jungle\HarnessTest_0609\harness_todo` 프로젝트에 harness를 붙이며 다음 문제가 드러났다.

- Codex 세션의 writable root가 기존 harness 폴더라 외부 target repo 수정마다 승인이 필요했다.
- target repo에서 harness 파일이 `harness/` 아래가 아니라 root에 풀려 있으면 포팅 전제가 깨진다.
- generated report/state가 Git gate 후보 tree를 오염시킬 수 있다.
- WSL path인 `/mnt/c/...`에 `wslpath -u`를 다시 적용하면 `/mnt/c/mnt/c/...`가 된다.
- 첫 commit bootstrap flow가 손으로 수행하기에는 길고 실수 지점이 많다.
- `git push` 인증과 `gh auth status` 인증은 서로 다른 경로로 성공/실패할 수 있다.
- 요구사항의 target stack과 harness 검증용 MVP stack을 분리해 기록할 필요가 있다.

이 내용은 `quest.md`에 개선 과제로 정리했다.

### 12. Quest.md 기반 P0/P1 보강

`quest.md` 검토 후 실제 harness 기능으로 흡수한 항목이다.

추가 또는 정리된 기능:

- `scripts/path_common.sh`
- `scripts/audit_generated_artifacts.ps1`
- `scripts/audit_porting_layout.ps1`
- `scripts/audit_git_remote_auth.ps1`
- `scripts/bootstrap_initial_commit.ps1`

반영 내용:

- hook path 변환 로직을 `path_common.sh`로 공통화했다.
- Windows path일 때만 `cygpath`/`wslpath` 변환을 수행한다.
- `/mnt/c/...` 같은 POSIX/WSL path는 `wslpath -u`에 다시 넣지 않는다.
- generated harness report/state/assignment queue가 staged 되었는지 감사한다.
- target repo에 harness가 `harness/` 아래로 제대로 들어갔는지 감사한다.
- Git remote reachable 상태, `gh auth status`, `gh api` 상태를 분리 감사한다.
- 첫 protected baseline commit을 `bootstrap_initial_commit.ps1 -DryRun`으로 먼저 계획할 수 있게 했다.
- preflight가 porting layout과 generated artifact audit를 로컬 검사로 실행한다.
- remote auth audit는 네트워크/인증 의존성이 있으므로 기본 preflight에서는 실행하지 않고 별도 명령으로 둔다.

## 현재 개발 상태

이 문서는 재사용 가능한 Harness 기능의 변경 이력만 유지합니다.
현재 범위와 개선 과제는 [current_state.md](current_state.md), 구현 전체 목록은 [feature_inventory.md](feature_inventory.md)를 참고하세요.
