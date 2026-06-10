# User Actions And Commands

This file is the user-facing index for what a user must do, what the harness does, and which commands are available.

Maintenance rule: whenever a user action, workflow step, script, or command changes, update this file in the same change. Also update `configs/commands.md` when the command list changes.

## User Responsibilities

### New Project Intake

The user fills `docs/project_intake.md` with:

- project summary and target stack
- requirements and success criteria
- constraints and assumptions
- prepared data and external dependencies
- secret or environment variable names only, never real secret values
- seed assignments when initial work should be dispatched

If the harness reports missing or ambiguous information, the user edits `docs/project_intake.md` using `docs/project_intake_questions.md`, then reruns intake start or intake review.

### Before Live Worker Dispatch

The user must make sure these are ready before live Codex workers run:

- intake review is `pass` or intentionally `deferred`
- preflight passes
- seed dry-run passes when using seed assignments
- Git has a committed baseline `HEAD`
- required non-secret setup and mock/local strategy are documented
- reproducible development environment and service contract are generated when the project has external runtime dependencies
- security baseline and pre-commit baseline are generated before shared development
- real secrets are available outside Git when live integrations require them

Seed dry-run can run before the first commit. Live worker dispatch cannot.

### During Development

The user normally does not approve each worker step. The harness continues through assignment dispatch, failure classification, retry, and resume when the failure is retryable.

The user is needed when status reports:

- unclear requirements or product decisions
- missing secret/env values that cannot be mocked
- local toolchain, permission, network, or Git setup problems
- baseline commit missing before live worker dispatch
- final `main` merge approval
- GitHub PR check failures or missing GitHub CLI authentication when using hybrid PR control
- missing GitHub repository administration permission when installing server rulesets

Active worker duplicate execution is not a user approval flow. The harness uses invoke locks to block a second live worker for the same assignment while one is active.

### Telegram Notifications

Use this when the user wants Telegram messages when the harness stops, fails, or needs user action.

1. Create a Telegram bot with `@BotFather`.
2. Send `/start` or any test message to the bot.
3. Get the `chat_id` from Telegram `getUpdates`.
4. Set these PowerShell environment variables outside Git:

```powershell
$env:HARNESS_NOTIFY_PROVIDER="telegram"
$env:HARNESS_NOTIFY_LEVEL="attention"
$env:HARNESS_TELEGRAM_BOT_TOKEN="<bot-token>"
$env:HARNESS_TELEGRAM_CHAT_ID="<chat-id>"
```

5. Send a test notification:

```powershell
pwsh -NoProfile -File harness/scripts/send_harness_notification.ps1 -Force -Message "Harness notification test" -Provider telegram
```

6. Run status normally:

```powershell
pwsh -NoProfile -File harness/scripts/get_harness_status.ps1
```

After the environment variables are set, `get_harness_status.ps1` automatically calls Telegram notification delivery after each status snapshot. Duplicate notification signatures are suppressed, so the same unresolved state is not repeatedly sent.

Notification levels:

- `attention`: default; sends when the harness likely needs attention
- `action_required`: sends only when user action is explicitly required
- `failure`: sends only on failed or blocked statuses
- `all`: sends every status snapshot

To temporarily disable notifications:

```powershell
$env:HARNESS_NOTIFY_DISABLED="true"
```

Do not write the bot token into `docs/project_intake.md`, `.env.example`, committed config, screenshots, or reports.

### Status And Resume

Status commands are snapshots. They update reports when run, but they are not a live dashboard or daemon.

Use status and resume reports to decide the next command:

- `harness/reports/status.md`
- `harness/reports/status.json`
- `harness/reports/seed_plans/<plan-id>__resume.md`
- `harness/reports/seed_plans/<plan-id>__resume.json`

## Primary Flow

1. Create intake template.
2. Fill `docs/project_intake.md`.
3. Run intake start with preflight and seed dry-run.
4. Answer any questions written by intake review.
5. Create the first Git baseline commit before live workers.
6. Run live seed handoff when ready.
7. Use status or resume reports if execution stops.
8. Approve final `main` merge only after final gate and approval request.
9. If using hybrid PR control, open the PR, wait for required GitHub checks, then merge through the harness PR wrapper.
10. If using GitHub server enforcement, install and audit the GitHub ruleset after the repository is connected.
11. Generate dev environment, service contract, CI matrix/cache, and release provenance workflows when the project is ready for shared development or release.
12. Generate security baseline and pre-commit baseline before opening the repository to repeated PR work.

## Common Commands

### Intake

```powershell
pwsh -NoProfile -File harness/scripts/start_from_intake.ps1 -CreateTemplate
pwsh -NoProfile -File harness/scripts/review_project_intake.ps1 -IntakeFile docs/project_intake.md -RequireSeedPlan
pwsh -NoProfile -File harness/scripts/start_from_intake.ps1 -IntakeFile docs/project_intake.md -Force -RunPreflight -RunSeedDryRun
pwsh -NoProfile -File harness/scripts/start_from_intake.ps1 -IntakeFile docs/project_intake.md -Force -RunPreflight -RunSeedDryRun -AllowDeferredClarifications
```

### Environment Manifest

```powershell
pwsh -NoProfile -File harness/scripts/generate_env_manifest.ps1 -IntakeFile docs/project_intake.md
```

### Status

```powershell
pwsh -NoProfile -File harness/scripts/get_harness_status.ps1
pwsh -NoProfile -File harness/scripts/get_seed_handoff_resume.ps1 -PlanFile harness/reports/seed_plans/<plan-file>.md
pwsh -NoProfile -File harness/scripts/get_seed_handoff_resume.ps1 -PlanFile harness/reports/seed_plans/<plan-file>.md -RecoverStale
```

### Notifications

```powershell
$env:HARNESS_NOTIFY_PROVIDER="telegram"
$env:HARNESS_NOTIFY_LEVEL="attention"
$env:HARNESS_TELEGRAM_BOT_TOKEN="<bot-token>"
$env:HARNESS_TELEGRAM_CHAT_ID="<chat-id>"

pwsh -NoProfile -File harness/scripts/send_harness_notification.ps1 -DryRun -Force -Message "Harness notification test" -Provider telegram
pwsh -NoProfile -File harness/scripts/send_harness_notification.ps1 -Force -Message "Harness notification test" -Provider telegram
pwsh -NoProfile -File harness/scripts/send_harness_notification.ps1 -StatusFile harness/reports/status.json -Provider telegram
pwsh -NoProfile -File harness/scripts/get_harness_status.ps1
```

The dry-run command previews the message without sending it. The force command sends a custom test message. The status command sends automatically only when the status matches the configured notification level.

### Validation

```powershell
pwsh -NoProfile -File harness/scripts/run_harness_preflight.ps1
pwsh -NoProfile -File harness/scripts/run_harness_cycle.ps1
pwsh -NoProfile -File harness/scripts/generate_profile_docs.ps1
pwsh -NoProfile -File harness/scripts/audit_generated_artifacts.ps1
pwsh -NoProfile -File harness/scripts/audit_porting_layout.ps1
pwsh -NoProfile -File harness/scripts/audit_git_remote_auth.ps1 -CheckGitHubApi
pwsh -NoProfile -File harness/scripts/bootstrap_initial_commit.ps1 -DryRun
```

### Platform Engineering

```powershell
pwsh -NoProfile -File harness/scripts/install_dev_environment.ps1 -Force
pwsh -NoProfile -File harness/scripts/audit_dev_environment.ps1
pwsh -NoProfile -File harness/scripts/install_service_contract.ps1 -Preset postgres-redis -Force
pwsh -NoProfile -File harness/scripts/audit_service_contract.ps1
pwsh -NoProfile -File harness/scripts/run_service_contract.ps1 -Action up
pwsh -NoProfile -File harness/scripts/run_service_contract.ps1 -Action down
pwsh -NoProfile -File harness/scripts/install_github_actions_workflow.ps1 -Force
pwsh -NoProfile -File harness/scripts/audit_ci_matrix.ps1
pwsh -NoProfile -File harness/scripts/install_release_provenance_workflow.ps1 -Force
pwsh -NoProfile -File harness/scripts/audit_release_provenance.ps1
```

`install_dev_environment.ps1` writes `.devcontainer/devcontainer.json` and `harness/project/configs/toolchain_manifest.json` from the active profile. `install_service_contract.ps1` writes a disposable local/CI service contract and optional `docker-compose.harness.yml`; never put production credentials there. The CI workflow keeps `Harness CI` as the required-check aggregator while matrix jobs run stack-specific cache and setup steps. The release provenance workflow uploads release artifacts and uses GitHub artifact attestations.

### Security And Pre-commit

```powershell
pwsh -NoProfile -File harness/scripts/install_security_baseline.ps1 -Force
pwsh -NoProfile -File harness/scripts/audit_security_baseline.ps1
pwsh -NoProfile -File harness/scripts/audit_security_baseline.ps1 -CheckGitHubSecuritySettings
pwsh -NoProfile -File harness/scripts/install_precommit_baseline.ps1 -Force
pwsh -NoProfile -File harness/scripts/audit_precommit_baseline.ps1
```

`install_security_baseline.ps1` writes Dependabot, CodeQL when the active stack is supported, OpenSSF Scorecard, and `harness/project/configs/security_baseline.json`. Secret scanning and push protection are GitHub repository settings, so `audit_security_baseline.ps1 -CheckGitHubSecuritySettings` checks them through `gh` when repository access is available. `install_precommit_baseline.ps1` writes `.pre-commit-config.yaml` for lightweight formatting, file size, YAML/JSON, private-key, line-ending, and stack-specific quick checks. Harness Git hooks still own branch/gate/push/merge governance.

### Live And Resume Handoff

```powershell
pwsh -NoProfile -File harness/scripts/run_seed_handoff.ps1 -PlanFile harness/reports/seed_plans/<plan-file>.md
pwsh -NoProfile -File harness/scripts/run_seed_handoff.ps1 -Resume -PlanFile harness/reports/seed_plans/<plan-file>.md
pwsh -NoProfile -File harness/scripts/run_retry_handoff.ps1
```

Preview without launching live Codex:

```powershell
pwsh -NoProfile -File harness/scripts/run_seed_handoff.ps1 -DryRun -PlanFile harness/reports/seed_plans/<plan-file>.md
pwsh -NoProfile -File harness/scripts/run_retry_handoff.ps1 -DryRun
```

### Assignment Utilities

```powershell
pwsh -NoProfile -File harness/scripts/claim_assignment.ps1 -Agent <owner> -AssignmentId <assignment-id>
pwsh -NoProfile -File harness/scripts/complete_assignment.ps1 -Agent <owner> -AssignmentId <assignment-id> -Result pass
pwsh -NoProfile -File harness/scripts/complete_assignment.ps1 -Agent <owner> -AssignmentId <assignment-id> -Result fail
pwsh -NoProfile -File harness/scripts/invoke_assignment_codex.ps1 -Agent <owner> -AssignmentId <assignment-id>
pwsh -NoProfile -File harness/scripts/invoke_pending_assignment_codex.ps1 -Agent <owner>
```

### Git Workflow

```powershell
pwsh -NoProfile -File harness/scripts/install_git_hooks.ps1
pwsh -NoProfile -File harness/scripts/run_git_gate.ps1 -Stage bootstrap
pwsh -NoProfile -File harness/scripts/run_git_gate.ps1 -Stage feature
pwsh -NoProfile -File harness/scripts/run_git_gate.ps1 -Stage integration
pwsh -NoProfile -File harness/scripts/run_git_gate.ps1 -Stage final
pwsh -NoProfile -File harness/scripts/audit_git_workflow.ps1
pwsh -NoProfile -File harness/scripts/request_main_merge_approval.ps1 -SourceBranch <test-branch>
pwsh -NoProfile -File harness/scripts/set_main_merge_approval.ps1 -ApprovalId <approval-id> -Status approved -Approver <name>
pwsh -NoProfile -File harness/scripts/authorize_branch_promotion.ps1 -SourceBranch <feature-branch> -TargetBranch dev
pwsh -NoProfile -File harness/scripts/merge_authorized_branch.ps1 -SourceBranch <feature-branch> -TargetBranch dev
pwsh -NoProfile -File harness/scripts/authorize_branch_promotion.ps1 -SourceBranch <test-branch> -TargetBranch main -ApprovalId <approval-id>
pwsh -NoProfile -File harness/scripts/merge_authorized_branch.ps1 -SourceBranch <test-branch> -TargetBranch main
pwsh -NoProfile -File harness/scripts/install_github_actions_workflow.ps1
pwsh -NoProfile -File harness/scripts/audit_github_policy.ps1
pwsh -NoProfile -File harness/scripts/install_github_ruleset.ps1
pwsh -NoProfile -File harness/scripts/open_pr_candidate.ps1 -SourceBranch <test-branch>
pwsh -NoProfile -File harness/scripts/check_pr_status.ps1 -PullRequest <pr-number-or-branch>
pwsh -NoProfile -File harness/scripts/merge_pr_if_allowed.ps1 -PullRequest <pr-number-or-branch> -ApprovalId <approval-id>
```

Git gate commands must be real validation commands. No-op or failure-masking commands such as `true`, `exit 0`, or `|| true` are rejected.

Hybrid PR control keeps the local harness approval as the human decision point, then lets GitHub Actions provide the remote test gate. `open_pr_candidate.ps1` requires a passing final gate for the exact `codex/test/*` tree. `merge_pr_if_allowed.ps1` requires the approved local main approval, the same source head, required PR checks passing, and then calls `gh pr merge --match-head-commit`.

For server-side enforcement, install and merge `.github/workflows/harness-ci.yml`, then configure that check as required in GitHub branch protection or rulesets.

The harness can install its own repository ruleset after `origin` points at GitHub and `gh auth login` has completed with repository administration permission:

```powershell
pwsh -NoProfile -File harness/scripts/install_github_actions_workflow.ps1
pwsh -NoProfile -File harness/scripts/install_github_ruleset.ps1
pwsh -NoProfile -File harness/scripts/audit_github_policy.ps1
```

The default ruleset protects `main`, blocks delete and force-push, requires PRs, requires one approving review, requires resolved review threads, and requires the `Harness CI` status check with latest-base strictness. For solo repositories, `-RequiredApprovals 0` is available, but that weakens server-side human approval.

Before using hybrid PR control, install and authenticate GitHub CLI:

```powershell
gh auth login
```

Git remote credentials and GitHub CLI credentials are separate. Before relying on push, PR, or ruleset automation, run:

```powershell
pwsh -NoProfile -File harness/scripts/audit_git_remote_auth.ps1 -CheckGitHubApi
```

For a new repository's first protected baseline commit, plan the candidate files first:

```powershell
pwsh -NoProfile -File harness/scripts/bootstrap_initial_commit.ps1 -DryRun
```

Then run the real bootstrap only after the candidate list excludes generated harness reports/state:

```powershell
pwsh -NoProfile -File harness/scripts/bootstrap_initial_commit.ps1 -Commit -RequestApproval
```

If `gh` is installed outside `PATH`, set:

```powershell
$env:HARNESS_GH_PATH="<absolute-path-to-gh>"
```

### Portable Setup And Smoke

From a target repository:

```sh
sh harness/scripts/setup_portable_runtime.sh
```

From this harness checkout:

```sh
sh scripts/run_portable_smoke.sh
sh scripts/run_operational_smoke.sh
sh scripts/run_git_hook_smoke.sh
sh scripts/run_pr_control_smoke.sh
sh scripts/run_github_policy_smoke.sh
sh scripts/run_platform_engineering_smoke.sh
sh scripts/run_security_quality_smoke.sh
```

Linux/macOS shell wrappers and Git hooks automatically put PowerShell runtime cache/data/config files under `${TMPDIR:-/tmp}/codex-harness-xdg/` so Git gate checks do not see those files as repository changes. Set `CODEX_HARNESS_XDG_ROOT` only if you need a different writable location.

## Output Files To Check

- `docs/project_intake_questions.md`
- `docs/env_manifest.md`
- `.env.example`
- `harness/reports/intake_review_report.md`
- `harness/reports/sensitive_followups.md`
- `harness/reports/preflight_report.md`
- `harness/reports/latest_report.md`
- `harness/reports/status.md`
- `harness/reports/status.json`
- `harness/reports/seed_plans/<plan-id>__dispatch_summary.md`
- `harness/reports/seed_plans/<plan-id>__resume.md`
- `harness/reports/agent_runs/`
- `harness/reports/live_dispatch_log.md`
- `harness/reports/notifications_log.md`
- `harness/reports/dev_environment_audit.md`
- `harness/reports/service_contract_audit.md`
- `harness/reports/ci_matrix_audit.md`
- `harness/reports/release_provenance_audit.md`
- `harness/reports/security_baseline_audit.md`
- `harness/reports/precommit_baseline_audit.md`
- `harness/state/notifications/last_notification.json`
