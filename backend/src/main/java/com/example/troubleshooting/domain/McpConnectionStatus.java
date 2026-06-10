package com.example.troubleshooting.domain;

public enum McpConnectionStatus {
    NOT_CONNECTED,
    CONNECTED,
    AUTH_EXPIRED,
    PERMISSION_DENIED,
    SYNCING,
    SYNCED,
    SYNC_FAILED
}
