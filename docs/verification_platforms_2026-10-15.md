# WSL·Linux·PowerShell·CMD·Bash 검증

2026-10-15 KST. 단순 실행기 탐색이 아니라 격리 프로젝트의 실제 Node CLI를 각 진입점으로 실행했습니다. 유료 AI·원격 서비스·원본 제품 저장소는 사용하지 않았습니다.

## 실제 환경

| 환경 | 확인한 실행기 |
| --- | --- |
| Windows PowerShell | 5.1.26100.9444 |
| Windows PowerShell 7 | 7.6.5 |
| Windows CMD | 시스템 cmd.exe, 각 PowerShell 실행기를 직접 호출 |
| Windows Git Bash | GNU Bash 5.2.37, x86_64-pc-msys |
| WSL | 설치된 Ubuntu 배포판, WSL2, WSL 3.0.1.0 |
| Linux 사용자 공간 | Ubuntu 24.04.4 LTS, kernel 6.18.40.1-microsoft-standard-WSL2 |
| Linux 실행기 | native PowerShell 7.6.2, Bash 5.2.21, /usr/bin/sh, Node 18.19.1, Git 2.43.0 |

Linux 검사는 WSL2의 실제 Linux 커널/실행 파일로 수행했습니다. Linux 파일시스템의 `/tmp`에 소스를 복사한 경우와 Windows 공유 파일시스템 `/mnt/c`에서 실행한 경우를 구분합니다. 별도 물리 Linux 서버·다른 배포판·독립 VM·원격 CI까지 검증한 것으로 해석하지 않습니다. Docker 클라이언트는 있었지만 daemon은 실행 중이 아니었고 Docker 검증 결과로 표시하지 않습니다. 배포판이나 런타임을 새로 설치하지 않았습니다.

## 새 진입점 회귀

`scripts/test_harness_entrypoints.ps1`을 추가했습니다. 전체 `test_harness.ps1`은 기존 shell fixture를 재사용해 연결하고, 새 스크립트를 단독 호출하면 격리 fixture를 먼저 생성합니다. production profile을 넘기는 용도가 아닙니다.

두 배치 × 호출 경로별로 다음 5개를 검사합니다.

1. 실제 CLI 실행의 cwd와 공백·한글·&·| 인자 보존
2. preview의 JSON 대상 경로와 도구 미실행
3. 실제 자식 도구의 exit 37 전달
4. 공개 CLI의 알 수 없는 옵션을 exit 2와 JSON 오류로 거부
5. 전체 사이클 순서와 unit 실패 후 중단, cycle exit 1

Windows는 PowerShell 직접 호출·CMD·Git Bash의 3경로(30개), Linux는 native PowerShell·native Bash의 2경로(20개)입니다. CMD는 PowerShell 내부 프로젝트 명령으로만 간접 사용한 것이 아니라 CMD를 바깥 호출자로 실행했습니다. Bash는 `--noprofile --norc`로 실행해 개인 시작 설정에 의존하지 않습니다.

## Windows 결과

| 실행 | 결과 | results.json 디렉터리 |
| --- | --- | --- |
| PS5.1 + PowerShell/CMD/Git Bash | 30/30 | `.test-output/d9bd8843eb37498799583452d2074c80/` |
| PS7 + PowerShell/CMD/Git Bash | 30/30 | `.test-output/9b90e3e8254e4785b903ead7c99d0c14/` |

각 실행은 통합 24개·보안 회귀 6개입니다. 이전 Windows 전체 221/221은 [직전 검증](verification_shell_2026-10-15.md)의 결과이며 이번에 251개를 한 번에 재실행했다고 합산하지 않습니다. 엔진 실행 코드는 이번 검증에서 변경하지 않았습니다. 최종 PS83 구문·설정 JSON은 두 Windows 런타임에서 다시 검사했습니다.

## Linux·WSL 결과

Linux `/tmp`에서는 기존 안전성 23·복구 16·사용량 18·실행 증거 28·경로 15·CLI 25·provider 22·Claude 38, 합계 **185/185**가 통과했습니다. 보강된 shell **36/36**, native PowerShell/Bash 진입점 **20/20**도 별도 실행에서 통과했습니다. 따라서 241개 사례가 검증됐지만 새 전체 runner로 241개를 한 번에 실행한 결과는 아닙니다.

| 실행 | 결과 | 원래 결과 디렉터리 |
| --- | --- | --- |
| Linux 기존 8 suites | 185/185 | `/tmp/harness-platform-Oev9lEtp/source/.test-output/` |
| Linux 보강 shell | 36/36 | `/tmp/harness-entry-8TiUlk3M/source/.test-output/098256e359024a75b5b13338169aaaad/` |
| Linux PowerShell/Bash 진입점 | 20/20 | `/tmp/harness-entry-8TiUlk3M/source/.test-output/f373c7c65fa249adaaf28e26f2f99e48/` |

Linux `/tmp` 결과와 Windows 결과를 `.test-output/platform-evidence/`에 복사하고 각 results.json의 passed 개수와 출력 요약의 일치를 확인했습니다. `summary.json`에는 원래 경로와 보존 경로가 함께 있습니다. 로그는 `.test-output/full-platform-linux.log`, `entry-platform-linux.log`, `entry-platform-ps5.log`, `entry-platform-ps7.log`입니다. PS83 구문/설정 JSON과 sh·bash 각각 shell20 구문도 Linux에서 통과했습니다.

WSL `/mnt/c` 최종 재실행은 **shell 36/36 + 진입점 20/20, 프로세스 exit 0**입니다. standalone/nested 두 배치의 이동과 실제 전체 사이클도 포함합니다.

| 공유경로 최종 실행 | 결과 | results.json 디렉터리 |
| --- | --- | --- |
| 보강 shell | 36/36 | `.test-output/wsl-shared/3758fb80b9c94966a41a145f55fa04ec/` |
| native PowerShell/Bash 진입점 | 20/20 | `.test-output/wsl-shared/118cef0e0abb4008a6d2fa828e4c04fe/` |

로그는 `.test-output/entry-platform-wsl-shared-final.log`, 종료 코드는 같은 접두어의 `.exit`입니다. 초기 33/36은 별도 로그 `entry-platform-wsl-shared.log`와 보존본에 남겼습니다. 최종 집계에서 각 범주의 JSON 통과 수와 완료 코드를 대조했습니다.

최종 집계 시 일부 Linux `/tmp` 원본 결과가 더 이상 존재하지 않았습니다. 해당 항목은 검사 중 이미 복사하고 대조한 platform-evidence 보존본을 사용했습니다. summary.json의 `read_from=previously_verified_archive`로 구분하며, 원본이 현재도 남아 있다고 가정하지 마세요. 원본 소실의 원인은 이 검증에서 확정하지 않았습니다.

## 같은 프로젝트의 환경 전환

격리된 동일 중첩 배치에 Windows→WSL→Windows 순으로 `install_git_hooks.ps1`을 실행했습니다. 매번 core.hooksPath가 해당 OS의 프로젝트 경로와 맞는지 확인하고, main의 `git commit --allow-empty`가 실제 정책 hook에 의해 거부되는지, 실제 unit 도구의 cwd가 맞는지 검사했습니다. **3단계 모두 통과**했고 마지막은 Windows 경로로 복원했습니다.

결과는 `.test-output/platform-evidence/transition-windows-before.json`, `transition-wsl.json`, `transition-windows-after.json`에 있습니다. hook을 재설치하지 않아도 자동 전환된다는 보장은 아닙니다. 실제 사용자 저장소의 hook 설정은 바꾸지 않았습니다.

## 확인한 테스트 문제

기존 shell 테스트는 모든 OS에서 존재하지 않는 실행기 이름을 `missing.exe`로 만들고 `not executable` 오류를 기대했습니다. WSL 실행기는 `.exe`를 보고 먼저 `Windows runtime refused`로 차단하므로, 실행 차단은 맞지만 오류 분류에 대한 테스트 기대가 틀렸습니다.

Linux에서는 `missing-runtime`, Windows에서는 `missing.exe`로 런타임 누락을 검사하도록 수정했습니다. WSL에서는 Windows `.exe` 지정 거부를 추가로 검사하고 두 경우 모두 도구 로그가 늘지 않았는지 확인합니다. 거부를 해제하거나 Windows 실행기로 fallback하도록 엔진을 바꾸지 않았습니다.

수정 전 복사본으로 시작한 Linux 전체 실행은 **220/221, 프로세스 exit 1**입니다. 실패 1건이 위 오류 문구 기대값이며 해당 shell 결과는 `/tmp/harness-platform-Oev9lEtp/source/.test-output/49dafb75facd430d9a457b411c4bf456/results.json`입니다. 이 실행을 전체 통과로 표시하지 않았고, 보정 후 shell 36/36 및 별도 진입점 20/20과 구분했습니다. 시작 시 복사본과 최종 소스를 해시 비교해 변경 파일이 test_harness.ps1/test_harness_shell.ps1/test_harness_entrypoints.ps1 세 테스트 파일뿐임도 확인했습니다.

WSL `/mnt/c` 최초 실행은 **33/36**이었습니다. 위 기대값 문제 1개와 이동 fixture의 Git 객체 복사 실패 2개입니다. `Copy-Item -Recurse`로 `.git/objects`의 읽기 전용 메타데이터까지 복사할 때 DrvFS에서 Access denied가 났습니다. 실제 4단계 명령과 cycle은 통과했고, 실패한 작업은 테스트용 저장소 복사입니다.

Git 데이터베이스는 로컬 `git clone --no-hardlinks --no-checkout`으로 복제하고 `.git`을 제외한 프로젝트 파일을 복사하도록 바꿨습니다. 이동 후 실제 CLI의 cwd를 검사하는 목적은 유지합니다. 변경한 두 사례만 `-CasePattern '*relocated*'`로 실행해 PS5·PS7·Linux `/tmp`에서 각각 **2/2** 통과했습니다. 결과는 `relocation-ps5.log`, `relocation-ps7.log`, `relocation-linux.log`와 platform-evidence에 보존했습니다. 필터 실행의 2/2는 전체 36개 통과와 구분하며, 일치하는 사례가 없으면 실패합니다.

## 재현

```powershell
pwsh -NoProfile -File scripts/test_harness_entrypoints.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness_entrypoints.ps1
pwsh -NoProfile -File scripts/test_harness.ps1
```

Linux에서도 native pwsh로 같은 명령을 실행합니다. 이 환경에서는 `~/.local/bin/pwsh`가 설치되어 있었으며 하위 실행기가 찾을 수 있도록 해당 디렉터리를 테스트 프로세스 PATH에 넣었습니다. Windows는 Git Bash, Linux는 bash/sh·Node·Git이 필요합니다.

전체 runner의 구성은 기존 221개에 Windows 진입점 30개, Linux 진입점 20개를 더합니다. 이 구성상 개수와 실제 실행별 결과를 혼동하지 마세요. 개인 shell 초기화 파일, 모든 임의 인용 문법, Windows와 Linux가 같은 상태 파일을 동시에 수정하는 상황은 이번 검증 범위가 아닙니다.

추가 프로세스 통합 검사를 수용하도록 자체 CI job의 timeout을 10분에서 30분으로 늘렸습니다. 원격 CI는 실행하지 않았으므로 이 설정 변경을 CI 통과 근거로 삼지 않습니다.
