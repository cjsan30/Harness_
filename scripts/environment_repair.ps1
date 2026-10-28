# Environment readiness and operator-declared repairs. Harness, not the worker, runs
# these commands, and only the argv arrays written in the profile's environment
# section. Nothing is installed or started that the operator did not declare.
$script:HarnessRepairMaxWaitSeconds = 1800
$script:HarnessEnvironmentCheckTimeoutSeconds = 60

function Assert-HarnessCommandArray($Value, [string]$Label) {
    # A single string would be split by a shell later; only an argv array is accepted.
    if ($Value -isnot [array]) { throw "$Label must be a JSON array of strings" }
    $items = @($Value)
    if ($items.Count -eq 0 -or @($items | Where-Object { $_ -isnot [string] -or [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) { throw "$Label must be a non-empty array of strings" }
    return [string[]]$items
}

function Get-HarnessEnvironmentConfig([string]$RootDir) {
    $profile = [IO.File]::ReadAllText((Get-ProjectProfilePath $RootDir)) | ConvertFrom-Json
    $section = Get-ProjectObjectProperty $profile 'environment'
    $config = [pscustomobject]@{ declared = ($null -ne $section); requirements = @(); repairs = @{} }
    if ($null -eq $section) { return $config }
    if ($section.version -ne 1) { throw 'environment section must have version 1' }
    foreach ($field in $section.PSObject.Properties.Name) { if ($field -cnotin @('version','requirements','repairs')) { throw "unknown environment field: $field" } }
    $repairs = @{}
    if ($null -ne $section.repairs) {
        foreach ($property in $section.repairs.PSObject.Properties) {
            $id = $property.Name; $repair = $property.Value
            if ($id -cnotmatch '^[a-z0-9][a-z0-9-]{1,63}$') { throw "invalid repair id: $id" }
            foreach ($field in $repair.PSObject.Properties.Name) { if ($field -cnotin @('description','start','run','check','wait_seconds')) { throw "unknown field '$field' in repair $id" } }
            if ([string]::IsNullOrWhiteSpace($repair.description)) { throw "repair $id needs a description" }
            if ($null -eq $repair.start -and $null -eq $repair.run) { throw "repair $id needs start or run" }
            $wait = $repair.wait_seconds
            if (-not (Test-HarnessUsageInteger $wait) -or $wait -lt 1 -or $wait -gt $script:HarnessRepairMaxWaitSeconds) { throw "repair $id wait_seconds must be 1..$($script:HarnessRepairMaxWaitSeconds)" }
            $repairs[$id] = [pscustomobject]@{
                id = $id; description = [string]$repair.description; wait_seconds = [int]$wait
                start = $(if ($null -ne $repair.start) { Assert-HarnessCommandArray $repair.start "repair $id start" } else { $null })
                run = $(if ($null -ne $repair.run) { Assert-HarnessCommandArray $repair.run "repair $id run" } else { $null })
                check = (Assert-HarnessCommandArray $repair.check "repair $id check")
            }
        }
    }
    $requirements = New-Object 'System.Collections.Generic.List[object]'
    foreach ($requirement in @($section.requirements)) {
        if ($null -eq $requirement) { continue }
        foreach ($field in $requirement.PSObject.Properties.Name) { if ($field -cnotin @('id','description','check','repair')) { throw "unknown field '$field' in environment requirement" } }
        if ($requirement.id -isnot [string] -or $requirement.id -cnotmatch '^[a-z0-9][a-z0-9-]{1,63}$') { throw 'invalid environment requirement id' }
        if ($null -ne $requirement.repair -and -not $repairs.ContainsKey([string]$requirement.repair)) { throw "requirement $($requirement.id) refers to an undeclared repair: $($requirement.repair)" }
        $requirements.Add([pscustomobject]@{
            id = $requirement.id; description = [string]$requirement.description
            check = (Assert-HarnessCommandArray $requirement.check "requirement $($requirement.id) check")
            repair = $(if ($null -ne $requirement.repair) { [string]$requirement.repair } else { $null })
        }) | Out-Null
    }
    $config.requirements = $requirements.ToArray(); $config.repairs = $repairs
    return $config
}

function Start-HarnessArgvProcess([string[]]$Command, [string]$WorkingDirectory, [switch]$Detached) {
    $resolved = Get-Command $Command[0] -ErrorAction SilentlyContinue
    if ($null -eq $resolved) { return $null }
    $path = if ($resolved.CommandType -in @('Application','ExternalScript')) { $resolved.Source } else { $Command[0] }
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $arguments = @($Command | Select-Object -Skip 1)
    if ($path -like '*.ps1') {
        $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $path) + $arguments
        $path = Get-HarnessPowerShellExecutable
    }
    $startInfo.FileName = $path
    $startInfo.Arguments = ($arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join ' '
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    if (-not $Detached) {
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
    }
    $process = [Diagnostics.Process]::Start($startInfo)
    if (-not $Detached) { $process.StandardInput.Close() }
    return $process
}

function Invoke-HarnessArgvCommand([string[]]$Command, [string]$WorkingDirectory, [int]$TimeoutSeconds) {
    $process = Start-HarnessArgvProcess $Command $WorkingDirectory
    if ($null -eq $process) { return [pscustomobject]@{ Success = $false; Output = "command not found: $($Command[0])"; TimedOut = $false } }
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
        try { $process.Kill() } catch {}
        return [pscustomobject]@{ Success = $false; Output = "timed out after $TimeoutSeconds seconds"; TimedOut = $true }
    }
    $process.WaitForExit()
    $output = Protect-HarnessSecretText (($stdout.Result + $stderr.Result).Trim())
    if ($output.Length -gt 1000) { $output = $output.Substring($output.Length - 1000) }
    return [pscustomobject]@{ Success = ($process.ExitCode -eq 0); Output = $output; TimedOut = $false }
}

function Test-HarnessEnvironmentCheck([string]$RootDir, [string[]]$Check) {
    return Invoke-HarnessArgvCommand $Check ([IO.Path]::GetFullPath($RootDir)) $script:HarnessEnvironmentCheckTimeoutSeconds
}

function Invoke-HarnessEnvironmentRepair([string]$RootDir, [string]$RepairId) {
    $config = Get-HarnessEnvironmentConfig $RootDir
    if (-not $config.repairs.ContainsKey($RepairId)) {
        return [pscustomobject]@{ Success = $false; RepairId = $RepairId; Message = "repair '$RepairId' is not declared in the profile environment section" }
    }
    $repair = $config.repairs[$RepairId]
    $root = [IO.Path]::GetFullPath($RootDir)
    if ((Test-HarnessEnvironmentCheck $root $repair.check).Success) {
        return [pscustomobject]@{ Success = $true; RepairId = $RepairId; Message = "$RepairId check already passes" }
    }
    $deadline = [DateTime]::UtcNow.AddSeconds($repair.wait_seconds)
    if ($null -ne $repair.run) {
        $result = Invoke-HarnessArgvCommand $repair.run $root $repair.wait_seconds
        if (-not $result.Success) { return [pscustomobject]@{ Success = $false; RepairId = $RepairId; Message = "repair $RepairId command failed: $($result.Output)" } }
    }
    if ($null -ne $repair.start) {
        $started = Start-HarnessArgvProcess $repair.start $root -Detached
        if ($null -eq $started) { return [pscustomobject]@{ Success = $false; RepairId = $RepairId; Message = "repair $RepairId start command not found: $($repair.start[0])" } }
    }
    $last = $null
    while ($true) {
        $last = Test-HarnessEnvironmentCheck $root $repair.check
        if ($last.Success) { return [pscustomobject]@{ Success = $true; RepairId = $RepairId; Message = "$RepairId repaired: $($repair.description)" } }
        if ([DateTime]::UtcNow -ge $deadline) { break }
        Start-Sleep -Seconds 2
    }
    return [pscustomobject]@{ Success = $false; RepairId = $RepairId; Message = "repair $RepairId did not make its check pass within $($repair.wait_seconds) seconds: $($last.Output)" }
}

function Get-HarnessEnvironmentReadiness([string]$RootDir, [switch]$Repair) {
    $config = Get-HarnessEnvironmentConfig $RootDir
    $items = New-Object 'System.Collections.Generic.List[object]'
    foreach ($requirement in $config.requirements) {
        $check = Test-HarnessEnvironmentCheck $RootDir $requirement.check
        $state = if ($check.Success) { 'ok' } elseif ($null -ne $requirement.repair) { 'repairable' } else { 'needs_decision' }
        $message = if ($check.Success) { 'check passed' } else { $check.Output }
        if ($state -eq 'repairable' -and $Repair) {
            $repaired = Invoke-HarnessEnvironmentRepair $RootDir $requirement.repair
            $state = if ($repaired.Success) { 'repaired' } else { 'repair_failed' }
            $message = $repaired.Message
        }
        $items.Add([pscustomobject]@{ id = $requirement.id; description = $requirement.description; state = $state; repair = $requirement.repair; message = $message }) | Out-Null
    }
    # Known errors that name a repair the profile does not declare would stop a run
    # instead of repairing it; surface them at planning time.
    $undeclared = @(Get-HarnessKnownErrorCatalog $RootDir | Where-Object { $null -ne $_.repair -and -not $config.repairs.ContainsKey($_.repair) } | ForEach-Object { $_.repair } | Select-Object -Unique)
    $blocking = @($items | Where-Object { $_.state -in @('needs_decision','repair_failed','repairable') })
    $status = if (-not $config.declared -or @($config.requirements).Count -eq 0) { 'undeclared' } elseif ($blocking.Count -gt 0) { 'blocked' } else { 'ready' }
    return [pscustomobject]@{ status = $status; declared = $config.declared; requirements = $items.ToArray(); undeclared_repairs = $undeclared }
}
