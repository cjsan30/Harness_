param(
    [string]$RepositoryRoot
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "harness_common.ps1")
. (Join-Path $PSScriptRoot "git_workflow_common.ps1")

$rootDir = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    Get-HarnessRoot -ScriptDirectory $PSScriptRoot
} else {
    [System.IO.Path]::GetFullPath($RepositoryRoot)
}

$hooksPath = Get-GitWorkflowResolvedPath -RootDir $rootDir -Name "hooks_path"
$portableHooksPath = Resolve-ProjectPath -RootDir $rootDir -ProjectPath "harness/githooks" -Label "portable hooks path"
Ensure-HarnessDirectory -Path $hooksPath

foreach ($hookName in @("pre-commit", "pre-push", "pre-merge-commit", "pre-rebase")) {
    $hookPath = Join-Path $hooksPath $hookName
    $portableHookPath = Join-Path $portableHooksPath $hookName
    if (-not (Test-Path -LiteralPath $portableHookPath)) {
        throw "required hook template is missing: $portableHookPath"
    }

    $shouldCopy = $true
    if (Test-Path -LiteralPath $hookPath) {
        $currentContent = Get-Content -Raw -LiteralPath $hookPath
        $templateContent = Get-Content -Raw -LiteralPath $portableHookPath
        $shouldCopy = ($currentContent -ne $templateContent)
    }

    if ($shouldCopy) {
        Copy-Item -LiteralPath $portableHookPath -Destination $hookPath -Force
    }

    if (-not (Test-HarnessIsWindows) -and $null -ne (Get-Command chmod -ErrorAction SilentlyContinue)) {
        Invoke-HarnessProcess -Executable "chmod" -Arguments @("+x", $hookPath) -AllowFailure | Out-Null
    }
}

$resolverPath = Resolve-ProjectPath -RootDir $rootDir -ProjectPath "harness/scripts/resolve_powershell.sh" -Label "PowerShell resolver"
if (-not (Test-HarnessIsWindows) -and (Test-Path -LiteralPath $resolverPath) -and $null -ne (Get-Command chmod -ErrorAction SilentlyContinue)) {
    Invoke-HarnessProcess -Executable "chmod" -Arguments @("+x", $resolverPath) -AllowFailure | Out-Null
}

$absoluteHooksPath = [System.IO.Path]::GetFullPath($hooksPath)
Invoke-GitCommand -RootDir $rootDir -Arguments @("config", "--local", "core.hooksPath", $absoluteHooksPath) | Out-Null

Write-Output "hooks_path: $hooksPath"
Write-Output "git_config_core_hooksPath: $absoluteHooksPath"
