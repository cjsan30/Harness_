# Todo Classifier

A small harness target application that classifies Korean natural-language todo text into structured JSON, evaluates the result, and records test logs.

## Run

```sh
npm start
```

Open `http://127.0.0.1:4173`.

## Validate

```sh
make build
make unit
make integration
make benchmark-smoke
```

Harness validation:

```sh
pwsh -NoProfile -File harness/scripts/run_harness_cycle.ps1 -SkipRetryPrompt
```

## Notes

The default classifier is deterministic and local. It is shaped like an AI response so the harness can test schema, category, priority, due parsing, task splitting, confidence, and logs without requiring an external LLM token.

## Runtime Modes

The verified harness path uses local deterministic classification and JSONL log storage:

```sh
TODO_CLASSIFIER_PROVIDER=deterministic
LOG_STORE=jsonl
```

Optional OpenAI classification is available through the Responses API structured-output path:

```sh
TODO_CLASSIFIER_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5
```

Optional PostgreSQL log storage is available when `pg` dependencies are installed and a database URL is configured:

```sh
LOG_STORE=postgres
DATABASE_URL=postgres://todo:todo@127.0.0.1:5432/todo_classifier
```

The PostgreSQL table definition is in `db/schema.sql`.
