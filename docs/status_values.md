# Status Values

This file is the shared status reference for frontend labels, backend enums, database enum values, and API responses.

## PostStatus

| Value | UI label | Meaning |
|---|---|---|
| `OPEN` | 미해결 | A troubleshooting post still needs a solution. |
| `ANALYZING` | 분석 중 | AI analysis or similar case search is running. |
| `NEEDS_MORE_CONTEXT` | 정보 필요 | Additional logs, code, config, or environment details are needed. |
| `SOLVED` | 해결됨 | The author registered a final solution. |
| `ARCHIVED` | 보관됨 | The post is no longer actively handled. |
| `DELETED` | 삭제됨 | The post was soft deleted and is hidden from normal search/RAG. |

## AiAnalysisStatus

| Value | Meaning |
|---|---|
| `NOT_REQUESTED` | AI analysis has not been requested. |
| `PENDING` | A request exists but has not started. |
| `RUNNING` | Analysis is currently running. |
| `SUCCEEDED` | Analysis completed and has renderable output. |
| `FAILED` | Analysis failed and should show a retry path. |
| `RETRY_REQUIRED` | A transient failure requires user retry. |
| `CANCELLED` | Analysis was cancelled by user or system. |

## RagSearchStatus

| Value | Meaning |
|---|---|
| `NOT_INDEXED` | Text has not been chunked or embedded. |
| `INDEXING` | Chunking or embedding is running. |
| `INDEXED` | Content can be used for vector search. |
| `SEARCHING` | Similar case search is running. |
| `FOUND` | Similar cases were found. |
| `NO_RESULT` | No result met the similarity threshold. |
| `SEARCH_FAILED` | Search failed but board features remain available. |

## AgentRunStatus

| Value | Meaning |
|---|---|
| `CREATED` | Agent run was created. |
| `PLANNING` | Agent is planning explicit steps. |
| `TOOL_CALLING` | Agent is calling read-only tools. |
| `REASONING` | Agent is synthesizing candidates and checklist. |
| `COMPLETED` | Run completed successfully. |
| `FAILED` | Run failed. |
| `PARTIAL_COMPLETED` | Some steps failed but a partial result exists. |

## SolutionStatus

| Value | Meaning |
|---|---|
| `DRAFT` | Solution is being drafted. |
| `SUBMITTED` | Author submitted the solution. |
| `VERIFIED` | Author or admin verified the solution. |
| `REJECTED` | Solution was rejected as incorrect or irrelevant. |
| `UPDATED` | Existing solution was revised. |

## McpConnectionStatus

| Value | Meaning |
|---|---|
| `NOT_CONNECTED` | External tool is not connected. |
| `CONNECTED` | External tool is connected. |
| `AUTH_EXPIRED` | OAuth or token auth expired. |
| `PERMISSION_DENIED` | Required resource permission is missing. |
| `SYNCING` | External data sync is running. |
| `SYNCED` | External data sync completed. |
| `SYNC_FAILED` | External sync failed. |
