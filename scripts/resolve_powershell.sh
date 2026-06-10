#!/usr/bin/env sh
set -eu

if [ -n "${CODEX_HARNESS_PWSH:-}" ]; then
    if [ -x "$CODEX_HARNESS_PWSH" ]; then
        printf '%s\n' "$CODEX_HARNESS_PWSH"
        exit 0
    fi
    printf '%s\n' "CODEX_HARNESS_PWSH is set but not executable: $CODEX_HARNESS_PWSH" >&2
    exit 1
fi

if command -v pwsh >/dev/null 2>&1; then
    printf '%s\n' pwsh
    exit 0
fi

for candidate in "${HOME:-}/.local/bin/pwsh" "${HOME:-}/.local/powershell/7/pwsh" "${HOME:-}"/.local/powershell/*/pwsh; do
    if [ -x "$candidate" ]; then
        printf '%s\n' "$candidate"
        exit 0
    fi
done

if command -v powershell >/dev/null 2>&1; then
    printf '%s\n' powershell
    exit 0
fi

if [ -n "${WSL_DISTRO_NAME:-}" ] || { [ -r /proc/sys/kernel/osrelease ] && grep -qi microsoft /proc/sys/kernel/osrelease; }; then
    printf '%s\n' "native pwsh is required inside WSL/Linux; powershell.exe fallback is intentionally disabled here" >&2
    exit 1
fi

if command -v powershell.exe >/dev/null 2>&1; then
    printf '%s\n' powershell.exe
    exit 0
fi

printf '%s\n' "no PowerShell executable found; install PowerShell 7+ (pwsh)" >&2
exit 1
