package com.example.troubleshooting.domain;

public enum AgentRunStatus {
    CREATED,
    PLANNING,
    TOOL_CALLING,
    REASONING,
    COMPLETED,
    FAILED,
    PARTIAL_COMPLETED
}
