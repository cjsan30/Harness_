package com.example.troubleshooting.domain;

public enum RagSearchStatus {
    NOT_INDEXED,
    INDEXING,
    INDEXED,
    SEARCHING,
    FOUND,
    NO_RESULT,
    SEARCH_FAILED
}
