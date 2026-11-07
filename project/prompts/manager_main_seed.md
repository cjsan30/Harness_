# Manager Main Seed Plan Format

Use this when `manager-main` is the only live Codex session and needs to seed subagent work without opening separate interactive sessions.

Write a Markdown file under `harness/reports/seed_plans/` using this exact structure.

## Required Shape

```md
# Assignment Seed Plan

## Meta

- plan_id: <short-unique-id>
- summary: <one-line summary>
- dispatch_mode: serial

## Assignment

- owner: agent-runtime
- title: <short task title>
- work_area: <optional override; default comes from profile>
- validation: <optional override; default comes from profile>

### Task

<plain-language task for the subagent>

### Acceptance

- <acceptance item 1>
- <acceptance item 2>

### Notes

<optional notes; write `none` when there is nothing extra>

## Assignment

- owner: agent-query
- title: <next task title>
...
```

## Rules

- one `## Assignment` block per owner task
- keep `owner` aligned with `harness/project/configs/project_profile.json`
- keep `title` short and stable; it becomes part of the assignment id
- keep `dispatch_mode: serial`; the harness currently starts one worker at a time, but each live run uses its own isolated worktree
- `Task` must be concrete enough for a worker to execute without another interactive handoff
- `Acceptance` should state the observable pass condition, not implementation detail

## Recommended Follow-up Command

After the plan file is written, run:

```powershell
pwsh -NoProfile -File harness/scripts/run_seed_handoff.ps1 -PlanFile <plan-file>
```

Use `-DryRun` first when validating the plan shape.

Live behavior:

- retries failed worker assignments up to 3 attempts by default
- continues to the next assignment unless `-StopOnWorkerFailure` is set
- refuses to start when the worktree that has `dev` checked out (often the main checkout) has uncommitted or untracked changes, because automatic promotion merges there; this check runs before any worker spends tokens
- promotes each passing assignment into `dev` as soon as it passes (feature gate, integration gate, authorized merge), so the next assignment, which starts from `dev`, sees earlier work; a failed promotion stops the plan
- removes the merged assignment worktree and local branch after promotion unless `-KeepMergedAssignmentBranches` is set (a dirty worktree or an unmerged branch is kept)
- prepares a final `test/*` branch and requests `main` approval
- does not approve or merge `main`
