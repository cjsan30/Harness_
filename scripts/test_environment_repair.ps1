param([string]$OutputDirectory='')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'harness_common.ps1')
$source=Split-Path -Parent $PSScriptRoot
if(-not $OutputDirectory){$OutputDirectory=Join-Path $source '.test-output'}
$testRoot=Join-Path $OutputDirectory ([Guid]::NewGuid().ToString('N'));Ensure-HarnessDirectory $testRoot
$results=New-Object 'System.Collections.Generic.List[object]'
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Reject([scriptblock]$Body){$blocked=$false;try{& $Body|Out-Null}catch{$blocked=$true};Assert-True $blocked 'expected rejection'}
function Case([string]$Kind,[string]$Name,[scriptblock]$Body){try{& $Body;$results.Add(@{kind=$Kind;name=$Name;passed=$true});Write-Output "PASS [$Kind] $Name"}catch{$results.Add(@{kind=$Kind;name=$Name;passed=$false;error=$_.Exception.Message});Write-Output "FAIL [$Kind] $Name : $($_.Exception.Message)"}}
# Fake tools are small scripts in a path with spaces and brackets; a marker file stands for "the service is up".
function Fixture($Environment=$null){
    $root=Join-Path $testRoot ('env [safe] '+[Guid]::NewGuid().ToString('N'))
    $profile=@{execution_policy=@{}}
    if($null -ne $Environment){$profile.environment=$Environment}
    Write-Utf8File (Join-Path $root 'harness/project/configs/project_profile.json') ($profile|ConvertTo-Json -Depth 10)
    Ensure-HarnessDirectory (Join-Path $root 'harness/configs')
    Copy-Item -LiteralPath (Join-Path $source 'configs/known_errors.json') -Destination (Join-Path $root 'harness/configs/known_errors.json')
    return $root
}
function Tool([string]$Name,[string]$Body){$path=Join-Path $testRoot ("tools [x]/"+[Guid]::NewGuid().ToString('N')+"-$Name.ps1");Write-Utf8File $path $Body;return $path}
$marker=Join-Path $testRoot 'service up.marker'
$check=Tool 'check' ("if(Test-Path -LiteralPath '"+$marker.Replace("'","''")+"'){exit 0};Write-Output 'service is down';exit 1")
$start=Tool 'start' ("Start-Sleep -Seconds 2;Set-Content -LiteralPath '"+$marker.Replace("'","''")+"' -Value up")
$fails=Tool 'fails' "Write-Output 'install failed';exit 3"
$hangs=Tool 'hangs' 'Start-Sleep -Seconds 30'
function Env($Repairs=@{},$Requirements=@()){return @{version=1;requirements=@($Requirements);repairs=$Repairs}}

Case security 'environment configuration is validated strictly' {
    foreach($bad in @(
        @{version=2;requirements=@();repairs=@{}},
        @{version=1;requirements=@();repairs=@{};extra=1},
        (Env @{'start-it'=@{description='d';check=@($check);wait_seconds=5}}),
        (Env @{'start-it'=@{description='d';start=@($start);check=@($check);wait_seconds=0}}),
        (Env @{'start-it'=@{description='d';start=@($start);check=@($check);wait_seconds=5;shell='rm -rf /'}}),
        (Env @{'start-it'=@{description='d';start='Docker Desktop.exe --flag';check=@($check);wait_seconds=5}}),
        (Env @{} @(@{id='docker';check=@($check);repair='missing-repair'})),
        (Env @{} @(@{id='Bad Id';check=@($check)})))){
        $root=Fixture $bad
        Reject {Get-HarnessEnvironmentConfig $root}
    }
}
Case integration 'a declared start repair runs once and waits for its check' {
    if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker}
    $root=Fixture (Env @{'service-start'=@{description='start the fake service';start=@($start);check=@($check);wait_seconds=30}})
    $r=Invoke-HarnessEnvironmentRepair $root 'service-start'
    Assert-True ($r.Success -and (Test-Path -LiteralPath $marker)) "repair failed: $($r.Message)"
    $again=Invoke-HarnessEnvironmentRepair $root 'service-start'
    Assert-True ($again.Success -and $again.Message.Contains('already passes')) 'a passing check ran the repair again'
}
Case integration 'failed, missing, hanging or undeclared repairs report failure' {
    if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker}
    $root=Fixture (Env @{
        'install-fails'=@{description='install';run=@($fails);check=@($check);wait_seconds=10}
        'not-installed'=@{description='start';start=@((Join-Path $testRoot 'missing tool.exe'));check=@($check);wait_seconds=5}
        'never-up'=@{description='wait';run=@($hangs);check=@($check);wait_seconds=2}})
    $failed=Invoke-HarnessEnvironmentRepair $root 'install-fails'
    Assert-True (-not $failed.Success -and $failed.Message.Contains('install failed')) "wrong: $($failed.Message)"
    Assert-True (-not (Invoke-HarnessEnvironmentRepair $root 'not-installed').Success) 'missing start command passed'
    $timer=[Diagnostics.Stopwatch]::StartNew();$hung=Invoke-HarnessEnvironmentRepair $root 'never-up';$timer.Stop()
    Assert-True (-not $hung.Success -and $timer.Elapsed.TotalSeconds -lt 20) 'a hanging repair was not bounded'
    Assert-True (-not (Invoke-HarnessEnvironmentRepair $root 'docker-start').Success) 'an undeclared repair ran'
}
Case integration 'readiness separates ok, repairable, repaired and needs-decision requirements' {
    if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker}
    $ok=Tool 'ok' 'exit 0'
    $root=Fixture (Env @{'service-start'=@{description='start';start=@($start);check=@($check);wait_seconds=30}} @(
        @{id='jdk';check=@($ok)},
        @{id='service';check=@($check);repair='service-start'},
        @{id='redis';check=@($fails)}))
    $plain=Get-HarnessEnvironmentReadiness $root
    $state=@{};foreach($i in $plain.requirements){$state[$i.id]=$i.state}
    Assert-True ($plain.status -eq 'blocked' -and $state.jdk -eq 'ok' -and $state.service -eq 'repairable' -and $state.redis -eq 'needs_decision') "wrong: $($plain|ConvertTo-Json -Depth 5 -Compress)"
    Assert-True (-not (Test-Path -LiteralPath $marker)) 'a check without -Repair started the service'
    Assert-True (@($plain.undeclared_repairs) -contains 'docker-start') 'undeclared known-error repair not reported'
    $repaired=Get-HarnessEnvironmentReadiness $root -Repair
    $state=@{};foreach($i in $repaired.requirements){$state[$i.id]=$i.state}
    Assert-True ($state.service -eq 'repaired' -and $repaired.status -eq 'blocked') 'repair or blocking decision wrong'
    $root=Fixture (Env @{} @(@{id='jdk';check=@($ok)}))
    Assert-True ((Get-HarnessEnvironmentReadiness $root).status -eq 'ready') 'ready profile blocked'
    Assert-True ((Get-HarnessEnvironmentReadiness (Fixture)).status -eq 'undeclared' -and (Get-HarnessEnvironmentReadiness (Fixture (Env))).status -eq 'undeclared') 'missing requirements not reported as undeclared'
}
Case unit 'environment failures with a declared repair are repaired, others stop' {
    $withRepair=New-HarnessFailureClassification 'environment' 'docker-unavailable' 'docker down' ([pscustomobject]@{id='docker-unavailable';repair='docker-start'})
    $decision=Get-HarnessFailureDecision $withRepair ([pscustomobject]@{attempts=@()})
    Assert-True ($decision.action -eq 'repair' -and $decision.repair -eq 'docker-start') 'repair not chosen'
    $without=New-HarnessFailureClassification 'environment' 'command-not-found' 'missing tool' ([pscustomobject]@{id='command-not-found';repair=$null})
    Assert-True ((Get-HarnessFailureDecision $without ([pscustomobject]@{attempts=@()})).action -eq 'stop_needs_operator') 'unrepairable environment failure was retried'
}

# Dispatcher: a repaired environment retries without using a worker attempt; a failed repair stops.
$dispatchAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'dispatch_seed_plan.ps1'),[ref]$null,[ref]$null)
foreach($name in @('Get-LatestAttemptFailure','New-WorkerOutcome','Invoke-AssignmentWorkerWithRetry')){
    $definition=$dispatchAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
    . ([scriptblock]::Create($definition.Extent.Text))
}
$DryRun=$false;$PreflightOnly=$false;$ProviderRetryDelaySeconds=0;$providerRetryLimit=2;$environmentRepairLimit=2
function Get-AssignmentLifecycleRecord($Owner,$AssignmentId){return [pscustomobject]@{State='done';Result=$script:lastResult}}
function Requeue-FailedAssignment($Owner,$AssignmentId,$NextAttempt,$FailureContext){$script:requeues++}
function Invoke-HarnessEnvironmentRepair($RootDir,$RepairId){$script:repairCalls++;return [pscustomobject]@{Success=$script:repairWorks;Message="fake $RepairId"}}
function Invoke-AssignmentWorker($Owner,$CurrentAssignmentId){
    $step=$script:scenario[$script:launches];$script:launches++
    if($step -eq 'pass'){$script:lastResult='pass';return [pscustomobject]@{Success=$true;ExitCode=0;Output='ok'}}
    $worker=[pscustomobject]@{version=1;invocation_id=[Guid]::NewGuid().ToString('N');assignment_id=$CurrentAssignmentId;owner='tester';root=[IO.Path]::GetFullPath($rootDir);status='settled'}
    Write-Utf8File (Get-AssignmentWorkerPaths $rootDir $CurrentAssignmentId).Record ($worker|ConvertTo-Json)
    $null=Save-HarnessAttemptClassification $rootDir $worker (New-HarnessFailureClassification 'environment' 'docker-unavailable' 'docker down' ([pscustomobject]@{id='docker-unavailable';repair='docker-start'}))
    $script:lastResult='fail'
    return [pscustomobject]@{Success=$false;ExitCode=1;Output='worker failed'}
}
function Run-Scenario([string[]]$Steps,[bool]$RepairWorks,[int]$MaxAttempts=1){
    $script:rootDir=Fixture;$script:scenario=$Steps;$script:launches=0;$script:requeues=0;$script:repairCalls=0;$script:repairWorks=$RepairWorks;$script:MaxWorkerAttempts=$MaxAttempts
    return Invoke-AssignmentWorkerWithRetry -Owner 'tester' -AssignmentId 'task'
}
Case integration 'a repaired environment retries without using a worker attempt' {
    $o=Run-Scenario @('docker','pass') $true 1
    Assert-True ($o.Success -and $script:repairCalls -eq 1 -and $script:launches -eq 2) "wrong: $($o|ConvertTo-Json -Compress)"
}
Case integration 'a failed repair stops and repeated repairs are bounded' {
    $o=Run-Scenario @('docker','pass') $false
    Assert-True ($o.StopKind -eq 'needs_operator' -and $o.StopReason.Contains('repair failed') -and $script:launches -eq 1) "wrong: $($o|ConvertTo-Json -Compress)"
    $o=Run-Scenario @('docker','docker','docker','pass') $true
    Assert-True ($o.StopKind -eq 'needs_operator' -and $script:repairCalls -eq 2 -and $script:launches -eq 3) "repairs unbounded: $($o|ConvertTo-Json -Compress)"
}

Write-Utf8File (Join-Path $testRoot 'results.json') ($results.ToArray()|ConvertTo-Json -Depth 8)
$failed=@($results|Where-Object{-not $_.passed}).Count
Write-Output "Environment results: $($results.Count-$failed)/$($results.Count) passed; artifacts: $testRoot"
if($failed){exit 1}
