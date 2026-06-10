# Portable Harness

This directory contains the reusable harness and subagent operations layer.

Use it by copying `harness/` into another repository root, then retargeting `harness/project/configs/project_profile.json` with `harness/scripts/init_project_adapter.ps1`.

Start with:

- `harness/docs/PORTING.md`
- `harness/docs/subagent_plan.template.md`
- `harness/docs/subagent_first_prompts.template.md`
- `harness/scripts/README.md`

The portable pieces are inside this folder, including hook templates under `harness/githooks/`. Running `harness/scripts/install_git_hooks.ps1` installs those templates into the target repository's configured hook directory.

## AI Troubleshooting Board MVP

This repository now also contains the first implementation pass for the AI troubleshooting board described in:

- [Requirements](docs/01_REQUIREMENTS.md)
- [UX Guide](docs/02_UX_GUIDE.md)
- [Implementation Tasks](docs/03_IMPLEMENTATION_TASKS.md)

Implemented entry points:

- `frontend/`: dependency-free browser MVP for the board list, write flow, detail view, AI analysis panel, comments, and solution registration.
- `backend/`: Spring Boot backend baseline with domain enums, PostgreSQL/pgvector schema, and OpenAPI contract.
- [MVP implementation status](docs/mvp_implementation_status_2026-06-09.md)
- [Shared status values](docs/status_values.md)

Run the frontend mock:

```bash
cd frontend
npm run validate
npm run dev
```

Run backend and frontend together from the repository root:

```bash
npm run dev
```

On PowerShell, run the same command from the repository root:

```powershell
npm run dev
```

Then open:

```text
http://127.0.0.1:4173
```

Optional port overrides:

```bash
BACKEND_PORT=8081 FRONTEND_PORT=4175 npm run dev
```

PowerShell port overrides:

```powershell
$env:BACKEND_PORT="8081"; $env:FRONTEND_PORT="4175"; npm run dev
```

Press `Ctrl+C` in the same terminal to stop both servers.

Run the Spring Boot backend:

```bash
cd backend
GRADLE_USER_HOME=/tmp/codex-gradle-home ./gradlew --no-daemon bootRun
```

Run browser E2E:

```bash
cd frontend
npm install
npm run e2e:install
npm run e2e
```
