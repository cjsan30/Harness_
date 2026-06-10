package com.example.troubleshooting.domain;

public enum AiAnalysisStatus {
    NOT_REQUESTED,
    PENDING,
    RUNNING,
    SUCCEEDED,
    FAILED,
    RETRY_REQUIRED,
    CANCELLED
}
