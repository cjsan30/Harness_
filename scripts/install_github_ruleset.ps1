param(
    [string]$MainBranch,
    [string]$RulesetName = "Harness Main Protection",
    [string]$RequiredCheckName = "Harness CI",
    [int]$RequiredApprovals = 1,
    [switch]$RequireCodeOwnerReview,
    [switch]$RequireMergeQueue,
    [string]$RepositoryRoot
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "harness_common.ps1")
. (Join-Path $PSScriptRoot "git_workflow_common.ps1")
. (Join-Path $PSScriptRoot "github_pr_common.ps1")
. (Join-Path $PSScriptRoot "github_policy_common.ps1")

$rootDir = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    Get-HarnessRoot -ScriptDirectory $PSScriptRoot
} else {
    [System.IO.Path]::GetFullPath($RepositoryRoot)
}

$config = Get-GitWorkflowConfig -RootDir $rootDir
if ([string]::IsNullOrWhiteSpace($MainBranch)) {
    $MainBranch = $config.MainBranch
}

Assert-GitHubCliAuthenticated -RootDir $rootDir
$repo = Get-GitHubRepositoryInfo -RootDir $rootDir
$payload = New-HarnessGitHubRulesetPayload -MainBranch $MainBranch -RulesetName $RulesetName -RequiredCheckName $RequiredCheckName -RequiredApprovals $RequiredApprovals -RequireCodeOwnerReview:$RequireCodeOwnerReview -RequireMergeQueue:$RequireMergeQueue

$reportsDir = Get-GitWorkflowResolvedPath -RootDir $rootDir -Name "reports_dir"
Ensure-HarnessDirectory -Path $reportsDir
$safeName = ($RulesetName -replace "[^A-Za-z0-9_-]", "_")
$payloadPath = Join-Path $reportsDir ("github_ruleset_" + $safeName + ".json")
Write-Utf8File -Path $payloadPath -Content ($payload | ConvertTo-Json -Depth 20)

$existing = $null
foreach ($ruleset in (ConvertTo-HarnessObjectArray -Value (Get-GitHubRepositoryRulesetSummaries -RootDir $rootDir))) {
    if ([string]$ruleset.name -eq $RulesetName) {
        $existing = $ruleset
        break
    }
}

if ($null -eq $existing) {
    $method = "POST"
    $endpoint = "repos/{owner}/{repo}/rulesets"
    $action = "created"
} else {
    $method = "PUT"
    $endpoint = "repos/{owner}/{repo}/rulesets/$($existing.id)"
    $action = "updated"
}

$result = Invoke-GitHubApi -RootDir $rootDir -Endpoint $endpoint -Method $method -InputFile $payloadPath
$resultObject = Convert-GitHubJson -JsonText $result.Output -Label "github ruleset install"
$audit = Get-GitHubPolicyAudit -RootDir $rootDir -MainBranch $MainBranch -RequiredCheckName $RequiredCheckName -RequiredApprovals $RequiredApprovals -RequireCodeOwnerReview:$RequireCodeOwnerReview -RequireMergeQueue:$RequireMergeQueue

$reportContent = @"
# GitHub Ruleset Install

## Summary

- status: $($audit.Status)
- action: $action
- repository: $($repo.NameWithOwner)
- repository_url: $($repo.Url)
- ruleset_name: $RulesetName
- ruleset_id: $($resultObject.id)
- main_branch: $MainBranch
- required_check: $RequiredCheckName
- required_approvals: $RequiredApprovals
- require_code_owner_review: $([bool]$RequireCodeOwnerReview)
- require_merge_queue: $([bool]$RequireMergeQueue)
- payload: $(Get-RelativeProjectPath -RootDir $rootDir -AbsolutePath $payloadPath)
- audit_issues: $($audit.Issues.Count)
- audit_warnings: $($audit.Warnings.Count)

## Audit Issues

$(Format-GitHubPolicyList -Items $audit.Issues)

## Audit Warnings

$(Format-GitHubPolicyList -Items $audit.Warnings)
"@
$reportPath = Write-GitWorkflowReport -RootDir $rootDir -Prefix "github_ruleset_install" -Content $reportContent

Write-Output "status: $($audit.Status)"
Write-Output "action: $action"
Write-Output "repository: $($repo.NameWithOwner)"
Write-Output "ruleset_id: $($resultObject.id)"
Write-Output "main_branch: $MainBranch"
Write-Output "required_check: $RequiredCheckName"
Write-Output "report: $reportPath"

if ($audit.Status -ne "pass") {
    exit 1
}
