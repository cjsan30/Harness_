param([string]$OutputDirectory = "")

# Git workflow policy regressions: branch naming defaults, engine self workflow
# scoping, gate commands without fallback, local commit rule and merged-branch
# deletion. Isolated Git fixtures only; no remote service, installed hook or AI.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'harness_common.ps1')
. (Join-Path $PSScriptRoot 'git_workflow_common.ps1')
$engineRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $engineRoot '.test-output' }
$testRoot = Join-Path ([IO.Path]::GetFullPath($OutputDirectory)) ([Guid]::NewGuid().ToString('N'))
Ensure-HarnessDirectory $testRoot
$results = New-Object 'System.Collections.Generic.List[object]'
function Assert-True($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function Test-Case([string]$Name, [scriptblock]$Body) {
    try { & $Body; $results.Add(@{name=$Name; passed=$true}); Write-Output "PASS $Name" }
    catch { $results.Add(@{name=$Name; passed=$false; error=$_.Exception.Message}); Write-Output "FAIL $Name : $($_.Exception.Message)" }
}
function Invoke-FixtureGit([string]$Root, [string[]]$Arguments) {
    $result = Invoke-HarnessProcess git (@('-C', $Root, '-c', 'core.hooksPath=', '-c', 'user.name=Policy Test', '-c', 'user.email=policy@example.invalid') + $Arguments)
    return $result.Output.Trim()
}
function New-PolicyFixture([string]$Name, [switch]$Nested, [switch]$WithSelf, [switch]$WithProfile) {
    $root = Join-Path $testRoot $Name
    $engine = if ($Nested) { Join-Path $root 'harness' } else { $root }
    Ensure-HarnessDirectory $engine
    Copy-Item -LiteralPath (Join-Path $engineRoot 'scripts') -Destination (Join-Path $engine 'scripts') -Recurse
    if ($WithSelf) {
        Ensure-HarnessDirectory (Join-Path $engine '.harness')
        Copy-Item -LiteralPath (Join-Path $engineRoot '.harness/self_workflow.json') -Destination (Join-Path $engine '.harness/self_workflow.json')
    }
    if ($WithProfile) {
        Ensure-HarnessDirectory (Join-Path $engine 'project/configs')
        Copy-Item -LiteralPath (Join-Path $engineRoot 'configs/project_profile.template.json') -Destination (Join-Path $engine 'project/configs/project_profile.json')
    }
    Invoke-HarnessProcess git @('init', '-b', 'main', $root) | Out-Null
    Write-Utf8File (Join-Path $root '.git/info/exclude') "*`n"
    Write-Utf8File (Join-Path $root 'sample.txt') 'baseline'
    Invoke-FixtureGit $root @('add', '-f', 'sample.txt') | Out-Null
    Invoke-FixtureGit $root @('commit', '-m', 'baseline') | Out-Null
    Invoke-FixtureGit $root @('branch', 'dev') | Out-Null
    return $root
}
function Invoke-HookGuard([string]$Root, [string[]]$Arguments) {
    $previous = $env:CODEX_HARNESS_ROOT
    try {
        $env:CODEX_HARNESS_ROOT = $Root
        return Invoke-HarnessPowerShellFile -FilePath (Join-Path $Root 'scripts/assert_git_action_allowed.ps1') -Arguments (@('-RepositoryRoot', $Root) + $Arguments) -AllowFailure
    } finally {
        $env:CODEX_HARNESS_ROOT = $previous
    }
}

function Invoke-DeletePush([string]$Root, [string]$RemoteRef, [string]$RemoteSha) {
    $updateFile = Join-Path $testRoot ('push-' + [Guid]::NewGuid().ToString('N') + '.txt')
    Write-Utf8File $updateFile "(delete) 0000000000000000000000000000000000000000 $RemoteRef $RemoteSha`n"
    return Invoke-HookGuard $Root @('-Action', 'push', '-RemoteName', 'origin', '-RemoteUrl', 'fixture', '-RefUpdateFile', $updateFile)
}

$previousRoot = $env:CODEX_HARNESS_ROOT
$previousWorkspace = $env:CODEX_GIT_WORKSPACE_ROOT
$env:CODEX_HARNESS_ROOT = $null
$env:CODEX_GIT_WORKSPACE_ROOT = $null
try {
    $self = New-PolicyFixture 'self engine [safe]' -WithSelf
    $nested = New-PolicyFixture 'nested port [safe]' -Nested -WithSelf
    $bare = New-PolicyFixture 'no policy [safe]'
    $profiled = New-PolicyFixture 'profile wins [safe]' -WithSelf -WithProfile

    Test-Case 'default branch names carry no AI prefix' {
        $config = Get-GitWorkflowConfig -RootDir $bare
        Assert-True ($config.FeatureBranchPrefix -eq '') "feature prefix: $($config.FeatureBranchPrefix)"
        Assert-True ($config.TestBranchPrefix -eq 'test/') "test prefix: $($config.TestBranchPrefix)"
        Assert-True ((Get-GitBranchDescriptor -RootDir $bare -BranchName 'test/candidate').Kind -eq 'test') 'test/ branch not recognized'
    }
    Test-Case 'engine self workflow supplies owners at the repository root' {
        $info = Get-GitBranchDescriptor -RootDir $self -BranchName 'manager-harness/cleanup'
        Assert-True ($info.Kind -eq 'feature' -and $info.Owner -eq 'manager-harness') "kind=$($info.Kind) owner=$($info.Owner)"
        Assert-True ((Get-GitBranchDescriptor -RootDir $self -BranchName 'stranger/cleanup').Kind -eq 'unknown') 'unlisted owner accepted'
        Assert-True ((Get-GitBranchDescriptor -RootDir $self -BranchName 'manager-harness').Kind -eq 'unknown') 'owner without task accepted'
    }
    Test-Case 'engine self workflow is ignored in a ported nested layout' {
        Assert-True ($null -eq (Get-HarnessSelfWorkflow -RootDir $nested)) 'nested port loaded the self workflow'
        Assert-True ((Get-GitBranchDescriptor -RootDir $nested -BranchName 'manager-harness/cleanup').Kind -eq 'unknown') 'nested port gained engine owners'
    }
    Test-Case 'project profile takes precedence over the self workflow' {
        Assert-True ($null -eq (Get-HarnessSelfWorkflow -RootDir $profiled)) 'self workflow used despite a profile'
        Assert-True ((Get-GitGateCommand -RootDir $profiled -Stage 'final').Contains('run_harness_cycle.ps1')) 'profile full_cycle not used'
    }
    Test-Case 'gate commands fail closed without make or pwsh fallback' {
        foreach ($stage in @('integration', 'final', 'bootstrap')) {
            $message = ''
            try { Get-GitGateCommand -RootDir $bare -Stage $stage | Out-Null } catch { $message = $_.Exception.Message }
            Assert-True ($message -like '*no command is configured*') "$stage did not fail closed: $message"
            Assert-True (-not $message.Contains('make')) "$stage mentions make fallback"
        }
        $message = ''
        try { Get-GitGateCommand -RootDir $bare -Stage 'feature' -Owner 'manager-harness' | Out-Null } catch { $message = $_.Exception.Message }
        Assert-True ($message -like '*owners.manager-harness.validation*') "feature gate message: $message"
    }
    Test-Case 'self workflow gate commands use the self gate script' {
        Assert-True ((Get-GitGateCommand -RootDir $self -Stage 'feature' -Owner 'agent-tests').Contains('run_self_gate.ps1 -Stage feature')) 'feature command'
        Assert-True ((Get-GitGateCommand -RootDir $self -Stage 'integration').Contains('run_self_gate.ps1 -Stage integration')) 'integration command'
        Assert-True ((Get-GitGateCommand -RootDir $self -Stage 'final').Contains('run_self_gate.ps1 -Stage final')) 'final command'
    }
    Test-Case 'commits are free on working branches and blocked on protected ones' {
        foreach ($branch in @('scratch-notes', 'manager-harness/cleanup')) {
            Invoke-FixtureGit $self @('checkout', '-q', '-B', $branch, 'main') | Out-Null
            $r = Invoke-HookGuard $self @('-Action', 'commit')
            Assert-True $r.Success "commit blocked on ${branch}: $($r.Output)"
        }
        foreach ($branch in @('dev', 'test/candidate')) {
            Invoke-FixtureGit $self @('checkout', '-q', '-B', $branch, 'main') | Out-Null
            $r = Invoke-HookGuard $self @('-Action', 'commit')
            Assert-True (-not $r.Success) "commit allowed on $branch"
            Assert-True ($r.Output.Contains('direct commits are blocked')) "unexpected reason on ${branch}: $($r.Output)"
        }
        Invoke-FixtureGit $self @('checkout', '-q', 'main') | Out-Null
    }
    Test-Case 'merged working branches may be deleted remotely, others may not' {
        Invoke-FixtureGit $self @('checkout', '-q', '-B', 'manager-harness/merged', 'dev') | Out-Null
        Write-Utf8File (Join-Path $self 'merged.txt') 'merged'
        Invoke-FixtureGit $self @('add', '-f', 'merged.txt') | Out-Null
        Invoke-FixtureGit $self @('commit', '-m', 'merged work') | Out-Null
        $mergedSha = Invoke-FixtureGit $self @('rev-parse', 'HEAD')
        Invoke-FixtureGit $self @('checkout', '-q', 'dev') | Out-Null
        Invoke-FixtureGit $self @('merge', '--no-ff', '-q', '-m', 'merge fixture', 'manager-harness/merged') | Out-Null
        Invoke-FixtureGit $self @('checkout', '-q', '-B', 'manager-harness/open', 'main') | Out-Null
        Write-Utf8File (Join-Path $self 'open.txt') 'open'
        Invoke-FixtureGit $self @('add', '-f', 'open.txt') | Out-Null
        Invoke-FixtureGit $self @('commit', '-m', 'open work') | Out-Null
        $openSha = Invoke-FixtureGit $self @('rev-parse', 'HEAD')
        $devSha = Invoke-FixtureGit $self @('rev-parse', 'dev')
        $cases = @(
            @{ ref = 'refs/heads/manager-harness/merged'; sha = $mergedSha; allowed = $true },
            @{ ref = 'refs/heads/manager-harness/open'; sha = $openSha; allowed = $false },
            @{ ref = 'refs/heads/dev'; sha = $devSha; allowed = $false },
            @{ ref = 'refs/heads/scratch-notes'; sha = $mergedSha; allowed = $false }
        )
        foreach ($case in $cases) {
            $r = Invoke-DeletePush $self $case.ref $case.sha
            Assert-True ($r.Success -eq $case.allowed) "delete $($case.ref): expected allowed=$($case.allowed), output: $($r.Output)"
        }
        $r = Invoke-DeletePush $self 'refs/heads/manager-harness/open' $openSha
        Assert-True ($r.Output.Contains('approve_branch_deletion.ps1')) 'unmerged deletion does not explain the approval path'
        Invoke-FixtureGit $self @('checkout', '-q', 'main') | Out-Null
        $script:openSha = $openSha
        $script:devSha = $devSha
    }
    Test-Case 'user-approved deletion opens exactly one unmerged branch head' {
        $approve = Join-Path $self 'scripts/approve_branch_deletion.ps1'
        $r = Invoke-HarnessPowerShellFile -FilePath $approve -Arguments @('-RepositoryRoot', $self, '-Branch', 'dev', '-Approver', 'fixture', '-Head', $script:devSha) -AllowFailure
        Assert-True (-not $r.Success) 'dev deletion approval was recorded'
        $r = Invoke-HarnessPowerShellFile -FilePath $approve -Arguments @('-RepositoryRoot', $self, '-Branch', 'manager-harness/open', '-Approver', 'fixture', '-Head', $script:openSha, '-Reason', 'abandoned task') -AllowFailure
        Assert-True $r.Success $r.Output
        $r = Invoke-DeletePush $self 'refs/heads/manager-harness/open' $script:openSha
        Assert-True $r.Success "approved deletion still blocked: $($r.Output)"
        Invoke-FixtureGit $self @('checkout', '-q', '-B', 'manager-harness/other', 'main') | Out-Null
        Write-Utf8File (Join-Path $self 'other.txt') 'other'
        Invoke-FixtureGit $self @('add', '-f', 'other.txt') | Out-Null
        Invoke-FixtureGit $self @('commit', '-m', 'other unmerged work') | Out-Null
        $otherSha = Invoke-FixtureGit $self @('rev-parse', 'HEAD')
        Invoke-FixtureGit $self @('checkout', '-q', 'main') | Out-Null
        $r = Invoke-DeletePush $self 'refs/heads/manager-harness/open' $otherSha
        Assert-True (-not $r.Success) 'approval accepted for a different remote head'
        $r = Invoke-DeletePush $self 'refs/heads/manager-harness/other' $script:openSha
        Assert-True (-not $r.Success) 'approval accepted for a different branch'
        $r = Invoke-DeletePush $self 'refs/heads/dev' $script:devSha
        Assert-True (-not $r.Success) 'dev deletion allowed after an approval'
    }
    Test-Case 'preflight rejects owners that collide with reserved branch names' {
        $profilePath = Join-Path $profiled 'project/configs/project_profile.json'
        $profile = Get-Content -Raw -Encoding UTF8 -LiteralPath $profilePath | ConvertFrom-Json
        $profile.owners | Add-Member -NotePropertyName 'test' -NotePropertyValue ([pscustomobject]@{ validation = 'fixture-validation'; work_area = 'src' })
        Write-Utf8File $profilePath ($profile | ConvertTo-Json -Depth 20)
        $r = Invoke-HarnessPowerShellFile -FilePath (Join-Path $profiled 'scripts/run_harness_preflight.ps1') -AllowFailure
        $text = $r.Output
        $reportMatch = [regex]::Match($text, 'preflight report: ([^\r\n]+)')
        if ($reportMatch.Success -and (Test-Path -LiteralPath $reportMatch.Groups[1].Value.Trim())) { $text += [IO.File]::ReadAllText($reportMatch.Groups[1].Value.Trim()) }
        Assert-True ($text.Contains("owners.test collides with reserved branch name 'test'")) "collision not reported: $text"
    }
    Test-Case 'self gate feature stage checks syntax on every required runtime' {
        $r = Invoke-HarnessPowerShellFile -FilePath (Join-Path $PSScriptRoot 'run_self_gate.ps1') -Arguments @('-Stage', 'feature') -AllowFailure
        Assert-True $r.Success $r.Output
        Assert-True ($r.Output.Contains('PASS feature self gate')) 'self gate summary missing'
        if (Test-HarnessIsWindows) {
            Assert-True ($r.Output.Contains('Windows PowerShell 5.1') -and $r.Output.Contains('PowerShell 7')) 'a Windows runtime was skipped'
        }
    }
} finally {
    $env:CODEX_HARNESS_ROOT = $previousRoot
    $env:CODEX_GIT_WORKSPACE_ROOT = $previousWorkspace
}

Write-Utf8File (Join-Path $testRoot 'results.json') ($results.ToArray() | ConvertTo-Json -Depth 5)
$failed = @($results | Where-Object { -not $_.passed }).Count
Write-Output "Policy results: $($results.Count - $failed)/$($results.Count) passed; artifacts: $testRoot"
if ($failed -gt 0) { exit 1 }
exit 0
