$ErrorActionPreference = "Stop"
$script:HarnessProjectProfileCache = @{}
$script:HarnessUtf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:HarnessScratchDirectory = $null
$script:HarnessPowerShellExecutable = ""

function Test-HarnessIsWindows {
    return ([System.IO.Path]::DirectorySeparatorChar -eq '\')
}

function Get-HarnessPathTrimChars {
    return [char[]]@('\', '/')
}

function Get-HarnessPathComparison {
    if (Test-HarnessIsWindows) {
        return [System.StringComparison]::OrdinalIgnoreCase
    }

    return [System.StringComparison]::Ordinal
}

function ConvertTo-HarnessNativeRelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $Path
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    $parts = @($Path -split '[\\/]' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($parts.Count -eq 0) {
        return "."
    }

    $result = $parts[0]
    for ($i = 1; $i -lt $parts.Count; $i++) {
        $result = Join-Path $result $parts[$i]
    }

    return $result
}

function Join-HarnessPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    return Join-Path $BasePath (ConvertTo-HarnessNativeRelativePath -Path $RelativePath)
}

function Get-HarnessPowerShellExecutable {
    if (-not [string]::IsNullOrWhiteSpace($script:HarnessPowerShellExecutable)) {
        return $script:HarnessPowerShellExecutable
    }

    try {
        $currentProcess = Get-Process -Id $PID -ErrorAction Stop
        if (-not [string]::IsNullOrWhiteSpace($currentProcess.Path) -and (Test-Path -LiteralPath $currentProcess.Path)) {
            $script:HarnessPowerShellExecutable = $currentProcess.Path
            return $script:HarnessPowerShellExecutable
        }
    } catch {
        # Fall back to PATH lookup below.
    }

    foreach ($candidate in @("pwsh", "powershell", "powershell.exe")) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($null -ne $command) {
            $script:HarnessPowerShellExecutable = $command.Source
            return $script:HarnessPowerShellExecutable
        }
    }

    throw "no PowerShell executable found; install PowerShell 7+ (`pwsh`) or Windows PowerShell"
}

function Invoke-HarnessProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,
        [object[]]$Arguments = @(),
        [string]$WorkingDirectory = "",
        [AllowNull()]
        [string]$InputText = $null,
        [switch]$AllowFailure
    )

    $previousPreference = $ErrorActionPreference
    $previousLocation = $null
    try {
        if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
            $previousLocation = Get-Location
            Push-Location $WorkingDirectory
        }

        $ErrorActionPreference = "Continue"
        if ($null -ne $InputText) {
            $output = $InputText | & $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() }
        } else {
            $output = & $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() }
        }
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
        if ($null -ne $previousLocation) {
            Pop-Location
        }
    }

    $text = (($output | Out-String).TrimEnd())
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "command failed: $Executable $($Arguments -join ' ')`n$text"
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Success = ($exitCode -eq 0)
        Output = $text
    }
}

function Invoke-HarnessPowerShellFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [object[]]$Arguments = @(),
        [switch]$AllowFailure
    )

    $powerShell = Get-HarnessPowerShellExecutable
    $invokeArgs = @("-NoProfile")
    if (Test-HarnessIsWindows) {
        $invokeArgs += @("-ExecutionPolicy", "Bypass")
    }
    $invokeArgs += @("-File", $FilePath) + @($Arguments)
    return Invoke-HarnessProcess -Executable $powerShell -Arguments $invokeArgs -AllowFailure:$AllowFailure
}

function Invoke-HarnessPowerShellCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandText,
        [switch]$AllowFailure
    )

    $powerShell = Get-HarnessPowerShellExecutable
    $invokeArgs = @("-NoProfile")
    if (Test-HarnessIsWindows) {
        $invokeArgs += @("-ExecutionPolicy", "Bypass")
    }
    $invokeArgs += @("-Command", $CommandText)
    return Invoke-HarnessProcess -Executable $powerShell -Arguments $invokeArgs -AllowFailure:$AllowFailure
}

function Invoke-HarnessShellCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$CommandText,
        [switch]$AllowFailure
    )

    $resolvedCommandText = $CommandText.Trim()
    foreach ($powerShellName in @("powershell.exe", "powershell", "pwsh")) {
        if ($resolvedCommandText -match ("^" + [Regex]::Escape($powerShellName) + "(?=\s|$)")) {
            $powerShell = Get-HarnessPowerShellExecutable
            $quotedPowerShell = if (Test-HarnessIsWindows) {
                '"' + $powerShell.Replace('"', '\"') + '"'
            } else {
                "'" + $powerShell.Replace("'", "'\''") + "'"
            }
            $resolvedCommandText = $quotedPowerShell + $resolvedCommandText.Substring($powerShellName.Length)
            if (-not (Test-HarnessIsWindows)) {
                $resolvedCommandText = [System.Text.RegularExpressions.Regex]::Replace($resolvedCommandText, "\s+-ExecutionPolicy\s+\S+", "", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            }
            break
        }
    }

    if (Test-HarnessIsWindows) {
        return Invoke-HarnessProcess -Executable "cmd.exe" -Arguments @("/d", "/s", "/c", $resolvedCommandText) -WorkingDirectory $RootDir -AllowFailure:$AllowFailure
    }

    if ($null -ne (Get-Command bash -ErrorAction SilentlyContinue)) {
        return Invoke-HarnessProcess -Executable "bash" -Arguments @("-e", "-o", "pipefail", "-c", $resolvedCommandText) -WorkingDirectory $RootDir -AllowFailure:$AllowFailure
    }

    return Invoke-HarnessProcess -Executable "sh" -Arguments @("-e", "-c", $resolvedCommandText) -WorkingDirectory $RootDir -AllowFailure:$AllowFailure
}

function Get-HarnessValidationCommandIssues {
    param(
        [AllowNull()]
        [string]$CommandText
    )

    $issues = New-Object System.Collections.Generic.List[string]
    if ([string]::IsNullOrWhiteSpace($CommandText)) {
        $issues.Add("validation command is empty") | Out-Null
        return @($issues)
    }

    $normalized = [System.Text.RegularExpressions.Regex]::Replace($CommandText.Trim(), "\s+", " ").ToLowerInvariant()
    if ($normalized -match "^(true|:|exit 0|echo(\s+.*)?|printf(\s+.*)?|write-output(\s+.*)?|write-host(\s+.*)?)$") {
        $issues.Add("validation command is a no-op and cannot prove tests passed") | Out-Null
    }

    if ($normalized -match "\|\|\s*(true|:|exit\s+0)\b") {
        $issues.Add("validation command masks failures with '|| true' or equivalent") | Out-Null
    }

    if ($normalized -match ";\s*(true|:|exit\s+0)\s*$") {
        $issues.Add("validation command ends with a success no-op that can hide the meaningful command result") | Out-Null
    }

    return @($issues)
}

function Get-HarnessRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptDirectory
    )

    $overrideRoot = [Environment]::GetEnvironmentVariable("CODEX_HARNESS_ROOT")
    if (-not [string]::IsNullOrWhiteSpace($overrideRoot)) {
        return [System.IO.Path]::GetFullPath($overrideRoot)
    }

    $harnessDirectory = Split-Path -Parent $ScriptDirectory
    if (Test-Path -LiteralPath (Join-Path $harnessDirectory ".git")) {
        return [System.IO.Path]::GetFullPath($harnessDirectory)
    }

    return [System.IO.Path]::GetFullPath((Split-Path -Parent $harnessDirectory))
}

function Ensure-HarnessDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Test-HarnessFileExecutable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    if (Test-HarnessIsWindows) {
        return $true
    }

    try {
        $mode = [System.IO.File]::GetUnixFileMode($Path)
        $executeMask = [System.IO.UnixFileMode]::UserExecute -bor [System.IO.UnixFileMode]::GroupExecute -bor [System.IO.UnixFileMode]::OtherExecute
        return (($mode -band $executeMask) -ne 0)
    } catch {
        if ($null -ne (Get-Command sh -ErrorAction SilentlyContinue)) {
            $escapedPath = "'" + $Path.Replace("'", "'\''") + "'"
            $result = Invoke-HarnessProcess -Executable "sh" -Arguments @("-c", "test -x $escapedPath") -AllowFailure
            return $result.Success
        }
    }

    return $false
}

function Get-HarnessScratchDirectory {
    if ([string]::IsNullOrWhiteSpace($script:HarnessScratchDirectory)) {
        $baseTemp = [System.IO.Path]::GetTempPath()
        $scratchDir = Join-Path $baseTemp "codex_harness_tmp"
        Ensure-HarnessDirectory -Path $scratchDir
        $script:HarnessScratchDirectory = $scratchDir
    }

    return $script:HarnessScratchDirectory
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [AllowNull()]
        [string]$Content = ""
    )

    $targetPath = [System.IO.Path]::GetFullPath($Path)
    $targetDir = Split-Path -Parent $targetPath
    if (-not [string]::IsNullOrWhiteSpace($targetDir)) {
        Ensure-HarnessDirectory -Path $targetDir
    }

    $scratchDir = Get-HarnessScratchDirectory
    $tempFileName = ([System.IO.Path]::GetFileName($targetPath) + ".tmp." + [Guid]::NewGuid().ToString("N"))
    $tempPath = Join-Path $scratchDir $tempFileName
    $backupPath = Join-Path $scratchDir ([System.IO.Path]::GetFileName($targetPath) + ".bak." + [Guid]::NewGuid().ToString("N"))

    try {
        [System.IO.File]::WriteAllText($tempPath, $Content, $script:HarnessUtf8NoBom)
        if (Test-Path -LiteralPath $targetPath) {
            $replaceSucceeded = $false
            $replaceException = $null
            foreach ($attempt in 1..3) {
                try {
                    [System.IO.File]::Replace($tempPath, $targetPath, $backupPath, $false)
                    $replaceSucceeded = $true
                    break
                } catch {
                    $replaceException = $_.Exception
                    Start-Sleep -Milliseconds (75 * $attempt)
                }
            }

            if (-not $replaceSucceeded) {
                try {
                    [System.IO.File]::WriteAllText($targetPath, $Content, $script:HarnessUtf8NoBom)
                } catch {
                    if ($null -ne $replaceException) {
                        throw $replaceException
                    }
                    throw
                }
            }

            if (Test-Path -LiteralPath $backupPath) {
                Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
            }
        } else {
            try {
                [System.IO.File]::Move($tempPath, $targetPath)
            } catch {
                Copy-Item -LiteralPath $tempPath -Destination $targetPath -Force
                Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
            }
        }
    } finally {
        if (Test-Path -LiteralPath $tempPath) {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $backupPath) {
            Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Append-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [AllowNull()]
        [string]$Content = ""
    )

    $targetPath = [System.IO.Path]::GetFullPath($Path)
    $targetDir = Split-Path -Parent $targetPath
    if (-not [string]::IsNullOrWhiteSpace($targetDir)) {
        Ensure-HarnessDirectory -Path $targetDir
    }

    $appendContent = [string]$Content
    if (Test-Path -LiteralPath $targetPath) {
        $fileInfo = Get-Item -LiteralPath $targetPath
        if ($fileInfo.Length -gt 0) {
            $existingContent = [System.IO.File]::ReadAllText($targetPath)
            if (-not $existingContent.EndsWith("`n") -and -not $appendContent.StartsWith("`n") -and -not $appendContent.StartsWith("`r")) {
                $appendContent = [Environment]::NewLine + $appendContent
            }
        }
    }

    if (-not $appendContent.EndsWith("`n")) {
        $appendContent += [Environment]::NewLine
    }

    [System.IO.File]::AppendAllText($targetPath, $appendContent, $script:HarnessUtf8NoBom)
}

function Resolve-ProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,
        [string]$Label = "path",
        [switch]$AllowProjectRoot
    )

    if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
        throw "$Label is empty"
    }

    $trimChars = Get-HarnessPathTrimChars
    $comparison = Get-HarnessPathComparison
    $normalizedRoot = [System.IO.Path]::GetFullPath($RootDir).TrimEnd($trimChars)
    $candidate = $ProjectPath
    if ([System.IO.Path]::IsPathRooted($candidate)) {
        $resolved = [System.IO.Path]::GetFullPath($candidate)
    } else {
        $resolved = [System.IO.Path]::GetFullPath((Join-Path $normalizedRoot (ConvertTo-HarnessNativeRelativePath -Path $candidate)))
    }
    $resolved = $resolved.TrimEnd($trimChars)

    if ([string]::Equals($resolved, $normalizedRoot, $comparison) -and $AllowProjectRoot) {
        return $resolved
    }

    if ($resolved.StartsWith($normalizedRoot + [System.IO.Path]::DirectorySeparatorChar, $comparison)) {
        return $resolved
    }

    throw "$Label escapes repository root: $ProjectPath"
}

function Assert-SafePathToken {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Token,
        [string]$Label = "value"
    )

    if ([string]::IsNullOrWhiteSpace($Token)) {
        throw "$Label is empty"
    }

    if ($Token.Contains("\") -or $Token.Contains("/") -or $Token.Contains("..")) {
        throw "$Label contains an unsafe path token: $Token"
    }

    return $Token
}

function Move-FileWithUpdatedContent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath,
        [Parameter(Mandatory = $true)]
        [string]$UpdatedContent
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        throw "source file not found: $SourcePath"
    }

    if (Test-Path -LiteralPath $TargetPath) {
        throw "target file already exists: $TargetPath"
    }

    Write-Utf8File -Path $TargetPath -Content $UpdatedContent

    try {
        Remove-Item -LiteralPath $SourcePath -Force -ErrorAction Stop
    } catch {
        Remove-Item -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue
        throw
    }
}

function Get-ProjectObjectProperty {
    param(
        [AllowNull()]
        $Object,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Get-ProjectProfilePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    $standaloneHarnessMarker = Join-HarnessPath -BasePath $RootDir -RelativePath "scripts/harness_common.ps1"
    $relativeCandidates = if (Test-Path -LiteralPath $standaloneHarnessMarker) {
        @("project/configs/project_profile.json", "harness/project/configs/project_profile.json")
    } else {
        @("harness/project/configs/project_profile.json", "project/configs/project_profile.json")
    }

    foreach ($relativeCandidate in $relativeCandidates) {
        $profilePath = Join-HarnessPath -BasePath $RootDir -RelativePath $relativeCandidate
        if (Test-Path -LiteralPath $profilePath) {
            return $profilePath
        }
    }

    return $null
}

function Get-ProjectProfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    $profilePath = Get-ProjectProfilePath -RootDir $RootDir
    if ([string]::IsNullOrWhiteSpace($profilePath)) {
        return $null
    }

    if ($script:HarnessProjectProfileCache.ContainsKey($profilePath)) {
        return $script:HarnessProjectProfileCache[$profilePath]
    }

    $profile = Get-Content -Raw -LiteralPath $profilePath | ConvertFrom-Json
    $script:HarnessProjectProfileCache[$profilePath] = $profile
    return $profile
}

function Clear-ProjectProfileCache {
    param(
        [string]$RootDir = ""
    )

    if ([string]::IsNullOrWhiteSpace($RootDir)) {
        $script:HarnessProjectProfileCache.Clear()
        return
    }

    $profilePath = Get-ProjectProfilePath -RootDir $RootDir
    if (-not [string]::IsNullOrWhiteSpace($profilePath) -and $script:HarnessProjectProfileCache.ContainsKey($profilePath)) {
        $script:HarnessProjectProfileCache.Remove($profilePath)
    }
}

function Get-HarnessConfiguredPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$FallbackRelativePath
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $harnessConfig = Get-ProjectObjectProperty -Object $profile -Name "harness"
    $relativePath = Get-ProjectObjectProperty -Object $harnessConfig -Name $Name
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = $FallbackRelativePath
    }

    return Resolve-ProjectPath -RootDir $RootDir -ProjectPath $relativePath -Label ("harness." + $Name)
}

function Get-HarnessConfiguredInteger {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [int]$Fallback
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $harnessConfig = Get-ProjectObjectProperty -Object $profile -Name "harness"
    $rawValue = Get-ProjectObjectProperty -Object $harnessConfig -Name $Name
    if ($null -eq $rawValue) {
        return $Fallback
    }

    $parsedValue = 0
    if ([int]::TryParse([string]$rawValue, [ref]$parsedValue)) {
        return $parsedValue
    }

    return $Fallback
}

function Get-HarnessLockRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    return Resolve-ProjectPath -RootDir $RootDir -ProjectPath "harness/state/locks" -Label "harness.state_locks"
}

function Get-RelativeProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$AbsolutePath
    )

    $trimChars = Get-HarnessPathTrimChars
    $comparison = Get-HarnessPathComparison
    $normalizedRoot = [System.IO.Path]::GetFullPath($RootDir).TrimEnd($trimChars)
    $normalizedTarget = [System.IO.Path]::GetFullPath($AbsolutePath).TrimEnd($trimChars)
    if ([string]::Equals($normalizedTarget, $normalizedRoot, $comparison)) {
        return "."
    }

    if ($normalizedTarget.StartsWith($normalizedRoot + [System.IO.Path]::DirectorySeparatorChar, $comparison)) {
        $relative = $normalizedTarget.Substring($normalizedRoot.Length).TrimStart($trimChars)
        return ($relative -replace "\\", "/")
    }

    return $AbsolutePath
}

function Write-TestResultRecord {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Suite,
        [Parameter(Mandatory = $true)]
        [string]$Status,
        [Parameter(Mandatory = $true)]
        [string]$Summary,
        [hashtable]$Metadata = @{},
        [string[]]$Artifacts = @()
    )

    $resultsDir = Get-HarnessConfiguredPath -RootDir $RootDir -Name "test_results" -FallbackRelativePath "harness/reports/test_results"
    Ensure-HarnessDirectory -Path $resultsDir

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
    $safeSuite = ($Suite -replace "[^A-Za-z0-9_-]", "_")
    $outputPath = Join-Path $resultsDir ($timestamp + "_" + $safeSuite + ".md")

    $metadataLines = @()
    if ($null -ne $Metadata) {
        foreach ($entry in ($Metadata.GetEnumerator() | Sort-Object Name)) {
            $metadataLines += "- $($entry.Key): $($entry.Value)"
        }
    }
    if ($metadataLines.Count -eq 0) {
        $metadataLines = @("- none")
    }

    $artifactLines = @()
    foreach ($artifact in $Artifacts) {
        if (-not [string]::IsNullOrWhiteSpace($artifact)) {
            $artifactLines += "- $(Get-RelativeProjectPath -RootDir $RootDir -AbsolutePath $artifact)"
        }
    }
    if ($artifactLines.Count -eq 0) {
        $artifactLines = @("- none")
    }

    $content = @"
# Test Result

## Meta

- suite: $Suite
- status: $Status
- recorded_at: $((Get-Date).ToString("o"))

## Summary

$Summary

## Metadata

$($metadataLines -join [Environment]::NewLine)

## Artifacts

$($artifactLines -join [Environment]::NewLine)
"@

    Write-Utf8File -Path $outputPath -Content $content
    return $outputPath
}

function Get-ProjectCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string]$Fallback = ""
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $commands = Get-ProjectObjectProperty -Object $profile -Name "commands"
    $value = Get-ProjectObjectProperty -Object $commands -Name $Name
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Fallback
    }

    return [string]$value
}

function Get-DispatchConfigValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string]$Fallback = ""
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $dispatch = Get-ProjectObjectProperty -Object $profile -Name "dispatch"
    $value = Get-ProjectObjectProperty -Object $dispatch -Name $Name
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Fallback
    }

    return [string]$value
}

function Get-OwnerValidationCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [string]$Fallback = ""
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $owners = Get-ProjectObjectProperty -Object $profile -Name "owners"
    $ownerConfig = Get-ProjectObjectProperty -Object $owners -Name $Owner
    $value = Get-ProjectObjectProperty -Object $ownerConfig -Name "validation"
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Fallback
    }

    return [string]$value
}

function Get-ProfileStringArray {
    param(
        [AllowNull()]
        $Value
    )

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value | ForEach-Object { [string]$_ })
    }

    return @([string]$Value)
}

function Get-FailurePatternList {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string[]]$Fallback = @()
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $patterns = Get-ProjectObjectProperty -Object $profile -Name "failure_patterns"
    $value = Get-ProjectObjectProperty -Object $patterns -Name $Name
    $list = Get-ProfileStringArray -Value $value
    if ($list.Count -eq 0) {
        return $Fallback
    }

    return $list
}

function Get-MarkdownValue {
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Content,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if ($null -eq $Content) {
        return ""
    }

    $line = $Content | Where-Object { $_ -match "^- $([Regex]::Escape($Key)): " } | Select-Object -First 1
    if ($null -eq $line) {
        return ""
    }

    return ($line -replace "^- $([Regex]::Escape($Key)): *", "").Trim()
}

function Get-FailureSignature {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FailureType,
        [Parameter(Mandatory = $true)]
        [string]$FailureModule,
        [Parameter(Mandatory = $true)]
        [string]$Task
    )

    return (($FailureType + "|" + $FailureModule + "|" + $Task).ToLowerInvariant()).Trim()
}

function Acquire-HarnessLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockRoot,
        [Parameter(Mandatory = $true)]
        [string]$LockName,
        [int]$MaxAgeSeconds = 900
    )

    Ensure-HarnessDirectory -Path $LockRoot
    $lockPath = Join-Path $LockRoot $LockName
    $metaPath = Join-Path $lockPath "lock.meta"

    Test-HarnessLockActive -LockPath $lockPath -MaxAgeSeconds $MaxAgeSeconds -CleanStale | Out-Null

    try {
        New-Item -ItemType Directory -Path $lockPath -ErrorAction Stop | Out-Null
        Write-Utf8File -Path $metaPath -Content ("created_at: " + (Get-Date).ToUniversalTime().ToString("o"))
        return $lockPath
    } catch {
        return $null
    }
}

function Release-HarnessLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath
    )

    if (Test-Path -LiteralPath $LockPath) {
        Remove-Item -LiteralPath $LockPath -Force -Recurse -ErrorAction SilentlyContinue
    }
}

function Get-HarnessLockAgeSeconds {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath
    )

    if (-not (Test-Path -LiteralPath $LockPath)) {
        return $null
    }

    $metaPath = Join-Path $LockPath "lock.meta"
    if (Test-Path -LiteralPath $metaPath) {
        $timestamp = (Get-Item -LiteralPath $metaPath).LastWriteTimeUtc
    } else {
        $timestamp = (Get-Item -LiteralPath $LockPath).LastWriteTimeUtc
    }

    return ((Get-Date).ToUniversalTime() - $timestamp).TotalSeconds
}

function Test-HarnessLockActive {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath,
        [int]$MaxAgeSeconds = 900,
        [switch]$CleanStale
    )

    if (-not (Test-Path -LiteralPath $LockPath)) {
        return $false
    }

    $ageSeconds = Get-HarnessLockAgeSeconds -LockPath $LockPath
    if ($null -eq $ageSeconds) {
        return $false
    }

    if ($ageSeconds -gt $MaxAgeSeconds) {
        if ($CleanStale) {
            Remove-Item -LiteralPath $LockPath -Force -Recurse -ErrorAction SilentlyContinue
        }
        return $false
    }

    return $true
}

function Get-AssignmentDirectories {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Owner
    )

    $assignmentsRoot = Get-HarnessConfiguredPath -RootDir $RootDir -Name "assignments_root" -FallbackRelativePath "harness/assignments"
    $safeOwner = Assert-SafePathToken -Token $Owner -Label "owner"
    $ownerRoot = Join-Path $assignmentsRoot $safeOwner
    $dirs = @{
        Root = $ownerRoot
        Inbox = Join-Path $ownerRoot "inbox"
        InProgress = Join-Path $ownerRoot "in_progress"
        Done = Join-Path $ownerRoot "done"
    }

    Ensure-HarnessDirectory -Path $dirs.Root
    Ensure-HarnessDirectory -Path $dirs.Inbox
    Ensure-HarnessDirectory -Path $dirs.InProgress
    Ensure-HarnessDirectory -Path $dirs.Done
    return $dirs
}

function Get-AssignmentInvokeLockPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$AssignmentId
    )

    $lockRoot = Get-HarnessLockRoot -RootDir $RootDir
    return Join-Path $lockRoot ("invoke_" + $AssignmentId)
}

function Restore-StaleInProgressAssignments {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [int]$StaleAfterSeconds = 7200
    )

    $ownerDirs = Get-AssignmentDirectories -RootDir $RootDir -Owner $Owner
    $assignmentLog = Get-HarnessConfiguredPath -RootDir $RootDir -Name "assignment_log" -FallbackRelativePath "harness/reports/assignment_log.md"
    $now = Get-Date
    $recovered = New-Object System.Collections.Generic.List[string]

    foreach ($item in (Get-ChildItem -LiteralPath $ownerDirs.InProgress -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime)) {
        $ageSeconds = ($now - $item.LastWriteTime).TotalSeconds
        if ($ageSeconds -lt $StaleAfterSeconds) {
            continue
        }

        $content = Get-Content -LiteralPath $item.FullName
        $assignmentId = Get-MarkdownValue -Content $content -Key "assignment_id"
        if ([string]::IsNullOrWhiteSpace($assignmentId)) {
            $assignmentId = $item.BaseName
        }

        $invokeLockPath = Get-AssignmentInvokeLockPath -RootDir $RootDir -AssignmentId $assignmentId
        if (Test-HarnessLockActive -LockPath $invokeLockPath -MaxAgeSeconds $StaleAfterSeconds -CleanStale) {
            continue
        }

        $updatedContent = Get-Content -Raw -LiteralPath $item.FullName
        $updatedContent = $updatedContent -replace "- status: in_progress", "- status: inbox"
        $recoveryNote = @"

## Recovery

- recovered_at: $($now.ToString("o"))
- recovered_by: harness stale assignment recovery
- reason: in_progress assignment exceeded $StaleAfterSeconds seconds without an active invoke lock
"@
        $updatedContent += $recoveryNote
        $targetPath = Join-Path $ownerDirs.Inbox $item.Name
        Move-FileWithUpdatedContent -SourcePath $item.FullName -TargetPath $targetPath -UpdatedContent $updatedContent

        $entry = @"
- time: $($now.ToString("yyyy-MM-dd HH:mm:ss"))
  - action: recover
  - owner: $Owner
  - assignment_id: $assignmentId
  - assignment: $($item.Name)
  - reason: stale in_progress without invoke lock
"@
        Append-Utf8File -Path $assignmentLog -Content $entry
        $recovered.Add($targetPath) | Out-Null
    }

    return @($recovered)
}

function Get-RetryAttemptInfo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RetryDir,
        [Parameter(Mandatory = $true)]
        [string]$FailureSignature,
        [Parameter(Mandatory = $true)]
        [string]$SourceCycle
    )

    Ensure-HarnessDirectory -Path $RetryDir

    $existingPrompts = Get-ChildItem -LiteralPath $RetryDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne ".gitkeep" }

    $sameCycle = $null
    $maxAttempt = 0

    foreach ($prompt in $existingPrompts) {
        $content = Get-Content -LiteralPath $prompt.FullName
        $signature = Get-MarkdownValue -Content $content -Key "failure_signature"
        if ($signature -ne $FailureSignature) {
            continue
        }

        $attempt = Get-MarkdownValue -Content $content -Key "attempt"
        $attemptValue = 0
        if ([int]::TryParse($attempt, [ref]$attemptValue)) {
            if ($attemptValue -gt $maxAttempt) {
                $maxAttempt = $attemptValue
            }
        }

        $cycle = Get-MarkdownValue -Content $content -Key "source_cycle"
        if ($cycle -eq $SourceCycle -and $null -eq $sameCycle) {
            $sameCycle = $prompt.FullName
        }
    }

    return @{
        ExistingPrompt = $sameCycle
        NextAttempt = ($maxAttempt + 1)
    }
}

function Get-ConsecutiveFailureCount {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AssignmentsRoot,
        [Parameter(Mandatory = $true)]
        [string]$FailureSignature
    )

    if (-not (Test-Path -LiteralPath $AssignmentsRoot)) {
        return 0
    }

    $doneFiles = Get-ChildItem -LiteralPath $AssignmentsRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { (Split-Path -Leaf $_.DirectoryName) -eq "done" } |
        Sort-Object LastWriteTime -Descending

    $count = 0
    foreach ($file in $doneFiles) {
        $content = Get-Content -LiteralPath $file.FullName
        $signature = Get-MarkdownValue -Content $content -Key "failure_signature"
        if ($signature -ne $FailureSignature) {
            continue
        }

        $result = Get-MarkdownValue -Content $content -Key "result"
        if ($result -eq "pass") {
            break
        }

        if ($result -eq "fail") {
            $count += 1
        }
    }

    return $count
}

function Get-OwnerHandoffContext {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    $profile = Get-ProjectProfile -RootDir $RootDir
    $owners = Get-ProjectObjectProperty -Object $profile -Name "owners"
    $ownerConfig = Get-ProjectObjectProperty -Object $owners -Name $Owner
    $context = $null
    if ($null -ne $ownerConfig) {
        $read = Get-ProjectObjectProperty -Object $ownerConfig -Name "read"
        $workArea = Get-ProjectObjectProperty -Object $ownerConfig -Name "work_area"
        if ($null -ne $read -and -not [string]::IsNullOrWhiteSpace($workArea)) {
            $context = @{
                Read = Get-ProfileStringArray -Value $read
                WorkArea = [string]$workArea
            }
        }
    }

    if ($null -eq $context) {
        $defaultReadDocs = @(
            "AGENT.md",
            "docs/requirements.md",
            "docs/requirements_raw_links.md",
            "docs/env_manifest.md",
            "docs/subagent_plan.md",
            "docs/subagent_first_prompts.md",
            "harness/AGENT.md"
        )

        switch ($Owner) {
            "agent-runtime" {
                $context = @{
                    Read = $defaultReadDocs + @("src/runtime/AGENT.md")
                    WorkArea = "src/runtime"
                }
                break
            }
            "agent-query" {
                $context = @{
                    Read = $defaultReadDocs + @("src/query/AGENT.md")
                    WorkArea = "src/query"
                }
                break
            }
            "agent-storage" {
                $context = @{
                    Read = $defaultReadDocs + @("src/storage/AGENT.md")
                    WorkArea = "src/storage"
                }
                break
            }
            "agent-index" {
                $context = @{
                    Read = $defaultReadDocs + @("src/index/AGENT.md")
                    WorkArea = "src/index"
                }
                break
            }
            "agent-tests" {
                $context = @{
                    Read = $defaultReadDocs + @("tests/AGENT.md")
                    WorkArea = "tests"
                }
                break
            }
            "manager-harness" {
                $context = @{
                    Read = $defaultReadDocs + @("harness/project/prompts/manager_harness.md", "harness/configs/git_policy.md", "harness/configs/retry_dispatch_policy.md")
                    WorkArea = "harness"
                }
                break
            }
            default {
                $context = @{
                    Read = $defaultReadDocs + @("harness/project/prompts/manager_main.md", "harness/configs/git_policy.md")
                    WorkArea = "project-wide"
                }
                break
            }
        }
    }

    $validatedRead = @()
    foreach ($readItem in (Get-ProfileStringArray -Value $context.Read)) {
        $readPath = Resolve-ProjectPath -RootDir $RootDir -ProjectPath $readItem -Label ("owners." + $Owner + ".read")
        $validatedRead += Get-RelativeProjectPath -RootDir $RootDir -AbsolutePath $readPath
    }

    $validatedWorkArea = [string]$context.WorkArea
    if ($validatedWorkArea -ne "project-wide") {
        $workAreaPath = Resolve-ProjectPath -RootDir $RootDir -ProjectPath $validatedWorkArea -Label ("owners." + $Owner + ".work_area")
        $validatedWorkArea = Get-RelativeProjectPath -RootDir $RootDir -AbsolutePath $workAreaPath
    }

    return @{
        Read = $validatedRead
        WorkArea = $validatedWorkArea
    }
}
