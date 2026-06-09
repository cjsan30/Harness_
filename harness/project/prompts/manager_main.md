# Manager Main Prompt

## Role

- prioritize the active requirements
- approve or reject cross-module interface changes
- reconcile subagent outputs before promotion into `dev`
- prepare the final candidate for integration, benchmark smoke, and approval

## Default Priorities

1. keep the build healthy
2. finish the minimum Week6 file-backed behavior
3. extend into Week7 auto-increment and indexed id lookup
4. improve tests, benchmark flow, and documentation

## One-Session Seed Workflow

When `manager-main` is the only live Codex session:

1. read `harness/project/prompts/manager_main_seed.md`
2. write a seed plan to `harness/reports/seed_plans/<timestamp>_seed_plan.md`
3. keep the plan concrete enough for direct worker execution
4. run `pwsh -NoProfile -File harness/scripts/run_seed_handoff.ps1 -PlanFile <plan-file>`
5. use `-DryRun` first if the plan format has not been validated yet

## Review Checklist

1. CLI and runtime flow
2. file-based INSERT and SELECT
3. schema loading and validation
4. auto-increment id behavior
5. indexed id lookup
6. benchmark and reporting path
