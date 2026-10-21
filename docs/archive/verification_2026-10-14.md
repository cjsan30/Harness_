# 2026-10-14 검증 기록

## 검증 결과와 증거

첫 안전성 구현 후 Windows PowerShell 5.1과 PowerShell 7에서 각각 23개 회귀 테스트가 모두 통과했습니다. 같은 실행에서 PowerShell 59개 파일 구문 및 설정 JSON 파싱도 통과했습니다. 인계 문서 작성 시 아래 두 결과 JSON의 23개 `passed: true`를 다시 확인했습니다. 문서 작성 때문에 엔진 테스트를 추가 재실행한 것은 아닙니다.

| 실행 환경 | 결과 파일 (저장소 상대 경로) | 결과 |
| --- | --- | --- |
| Windows PowerShell 5.1 | `.test-output/f92f6bde078a49c3b6d6529283f082b4/results.json` | 23/23 |
| Windows PowerShell 7 | `.test-output/0a10351680c644a98bc20b7b1d5eeac5/results.json` | 23/23 |

이 JSON은 환경 버전·코드 commit을 내장한 attestation이 아니라 테스트 이름과 성공 여부를 기록한 로컬 결과입니다. 런타임 구분은 실행 기록을 근거로 합니다. `.test-output/`은 Git 무시 대상이며 다른 컴퓨터로 전달되지 않을 수 있으므로 아래에 항목을 보존합니다. 아직 첫 커밋이 없어 commit SHA로 결과를 고정할 수 없습니다.

## 23개 회귀 항목

| 번호 | 검증 내용 | 두 런타임 |
| --- | --- | --- |
| 1 | 범위가 일치하는 승인은 승격 허용 | 통과 |
| 2 | 다른 source branch 승인 거부 | 통과 |
| 3 | 다른 source head 승인 거부 | 통과 |
| 4 | 다른 target branch 승인 거부 | 통과 |
| 5 | 다른 repository root 승인 거부 | 통과 |
| 6 | 다른 stage 승인 거부 | 통과 |
| 7 | 범위가 없는 legacy 승인 거부 | 통과 |
| 8 | 상태 동시 갱신 충돌에서 승인 유실 방지 | 통과 |
| 9 | 승인 요청·결정이 저장소 범위 유지 | 통과 |
| 10 | 다른 commit에 대한 요청의 승인 결정 거부 | 통과 |
| 11 | 다른 범위 승인은 PR merge 호출 전에 거부 | 통과 |
| 12 | 정상 PR merge 호출에서 remote head 고정 | 통과 |
| 13 | hook이 없어도 로컬 merge 권한 검사 | 통과 |
| 14 | manifest에 secrets 구역의 값이 복사되지 않음 | 통과 |
| 15 | 다른 구역의 credential을 값 출력 없이 차단 | 통과 |
| 16 | requirements/profile 생성에도 secrets 값이 복사되지 않음 | 통과 |
| 17 | 살아 있는 잠금을 경과 시간으로 탈취하지 못함 | 통과 |
| 18 | 다른 프로세스가 소유자 잠금을 해제하지 못함 | 통과 |
| 19 | 확인 불가능한 legacy 잠금을 나이로 삭제하지 않음 | 통과 |
| 20 | 같은 프로세스의 이전 lease가 새 lease를 해제하지 못함 | 통과 |
| 21 | 소유 프로세스 강제 종료 후 잠금 재획득 | 통과 |
| 22 | 4개 프로세스 동시 경쟁에서 소유자는 하나 | 통과 |
| 23 | 원자적 덮어쓰기의 Unicode 보존 및 임시 파일 정리 | 통과 |

초기 회귀 10개에서는 1개 통과/9개 실패로 기존 결함을 재현했습니다. 이후 범위를 확장하고 수정한 최종 결과가 위 23개입니다. 초기 실패율을 현재 상태의 실패율로 인용하지 않습니다.

## 재실행 방법

저장소 루트에서:

```powershell
pwsh -NoProfile -File scripts/test_harness.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1
```

현재 컴퓨터에서 확인한 PowerShell 7 실행 파일은 `C:\Users\mnshell\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe`입니다. PATH에 `pwsh`가 없으면 이 경로의 존재를 확인하고 사용합니다. Windows PowerShell은 `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`입니다. 5.1의 Bypass는 실행 프로세스에만 적용했으며 시스템 실행 정책을 영구 변경하지 않았습니다.

`-SyntaxOnly`는 구문 검사용입니다. 회귀 테스트 자체는 `scripts/test_harness_safety.ps1`로도 실행할 수 있고 `-OutputDirectory`를 받습니다. 테스트는 실제 로컬 Git fixture와 `HARNESS_GH_PATH`로 지정한 fake GitHub CLI를 사용합니다. 실제 API 호출은 하지 않습니다. 임시 fixture와 가짜 credential 문자열은 진단을 위해 남습니다.

## 검증 범위의 한계

- 실제 Codex/Claude 작업, 토큰 사용량·구독 소모·개발 생산성은 측정하지 않았습니다.
- 실제 GitHub 인증, 서버 보호 규칙, PR 생성/병합은 검증하지 않았습니다. fake CLI 통과가 서버 동작의 증거는 아닙니다.
- Docker, Telegram 발송, WSL 및 Linux 실행은 최종 로컬 검증 범위에 없습니다.
- CI는 Windows pwsh/powershell, Ubuntu pwsh matrix로 정의했으며 원격 실행은 아직 없습니다. 결과 JSON만 artifact로 수집하도록 구성했습니다.
- 부모 종료 후 살아 있는 AI 자식 프로세스, 큐 전환 crash 복구, 네트워크 파일시스템, 장시간 운영은 남은 과제입니다.
- 자체 테스트 통과는 대상 제품의 build/unit/integration/benchmark 전체 cycle 통과와 다릅니다.

## 이전 단계의 제한된 검증

엔진 분리 전후 초기 감사에서는 55개 PowerShell 구문 검사, 임시 대상 init/preflight, dev/service/CI/release/security/precommit 생성·감사, queue claim/fail/resume를 확인했습니다. 일부 감사는 파일의 필수 문자열 검사입니다. 분리 후 `core-only-porting/harness` fixture의 TypeScript/Next 초기화 및 preflight는 통과했으나 제품 소스 부재 경고가 있었고 실제 제품 테스트를 수행하지 않았습니다. 알림은 `HARNESS_NOTIFY_DISABLED=1`로 비활성화했습니다.

## 인계 문서 확인 (2026-10-15 KST)

새 문서 5개와 README/AGENT/current_state/improvement_backlog의 연결을 정리했습니다. Markdown 링크가 들어 있는 수정 문서 8개에서 로컬 링크 대상 존재와 UTF-8 replacement character 부재를 확인했습니다. 스크립트 개수 59+18과 위 결과 JSON 각각 23/23을 재확인했습니다. 엔진 코드는 이번 문서화에서 수정하지 않았습니다. Git 파일이 전부 untracked이므로 `git diff --check`만으로 이 문서들의 내용을 검증했다고 보지 않습니다.
