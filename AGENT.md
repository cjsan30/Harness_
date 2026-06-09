# Todo Classifier Project Notes

This repository is a harness validation target for a Todo Classifier MVP.

## Scope

- Keep the application deterministic by default so harness checks are stable.
- Do not require external LLM keys for the default test flow.
- API contracts must match `requirements.md`.
- Evaluation logs are written to `data/evaluation-logs.jsonl` and are intentionally ignored by Git.
- Optional modes exist for `TODO_CLASSIFIER_PROVIDER=openai` and `LOG_STORE=postgres`, but the harness default must stay deterministic/jsonl unless a task explicitly targets external services.

## Validation

- `make build`
- `make unit`
- `make integration`
- `make benchmark-smoke`
- `pwsh -NoProfile -File harness/scripts/run_harness_cycle.ps1 -SkipRetryPrompt`
