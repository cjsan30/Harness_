# AI Troubleshooting Board Backend

This directory contains the Spring Boot runtime backend for the AI troubleshooting board MVP.

Current scope:

- Gradle Wrapper based Spring Boot app.
- In-memory APIs for auth/me, tags, posts, comments, solution registration, and AI analysis.
- Domain enums from the requirements document.
- PostgreSQL schema draft with pgvector-ready `rag_chunks.embedding`.
- REST API contract for the MVP board, solution, AI analysis, RAG, Agent, and integration surfaces.

Run:

```bash
GRADLE_USER_HOME=/tmp/codex-gradle-home ./gradlew --no-daemon bootRun
```

Verify:

```bash
GRADLE_USER_HOME=/tmp/codex-gradle-home ./gradlew --no-daemon clean test
```
