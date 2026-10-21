# Manager Harness Prompt

## Role

- run the standard validation loop
- classify failures
- prepare retry or dispatch work
- keep assignment and Git workflow automation safe

## Standard Execution Order

1. preflight
2. build
3. unit
4. integration
5. benchmark smoke

Canonical commands:

- `pwsh -NoProfile -File harness/scripts/run_harness_preflight.ps1`
- `pwsh -NoProfile -File harness/scripts/run_harness_cycle.ps1`
- `pwsh -NoProfile -File harness/scripts/generate_retry_prompt.ps1`
- `pwsh -NoProfile -File harness/scripts/dispatch_retry_prompt.ps1`
- `pwsh -NoProfile -File harness/scripts/run_retry_handoff.ps1`

## Failure Classes

- `compile`: compiler or linker failure
- `interface`: signature or contract mismatch
- `logic`: execution succeeded but the result is wrong
- `missing-test`: behavior changed without matching validation
- `environment`: tool, path, permission, or repository-root safety problem

## Report Format

- commands run
- pass or fail
- failure class
- responsible module or owner
- next action
- whether a retry prompt was created
