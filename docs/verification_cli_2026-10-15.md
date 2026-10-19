# CLI 검증과 이전 테스트 범위 확인

2026-10-15 KST. 사용자가 유닛·통합·보안 검증이 이미 통과했다면 다음 개선을 구현하도록 지시했습니다. 이전 최종 결과 JSON 10개를 다시 읽어 두 Windows 런타임 각각 100개, 총 200개에 실패가 없음을 확인했습니다.

| 범주 | 이전 실행 근거 |
| --- | --- |
| 유닛 성격의 검사 | validation/no-op/중복 필드 거부, 사용량 JSON 파싱·합산, 제한 정책 해석 |
| 통합 검사 | 실제 Git/worktree/hook, claim→완료→worker settle, 부모 종료·큐 복구, seed 재개, feature commit 뒤 재검증 |
| 보안 회귀 | 저장소·branch·HEAD가 다른 승인 거부, intake credential 복사·노출 방지, 큐 경로 탈출 거부, 증거/로그 변조와 오래된 pass 거부 |

기존 suite에는 범주가 혼합되어 있어 100개를 서로 배타적인 유닛/통합/보안 숫자로 재분류하지 않았습니다. 단순 구문 검사만 통과한 상태는 아니었습니다. 이는 원격 CodeQL/SAST 실행, 외부 침투 테스트 또는 모든 취약점 부재를 의미하지 않습니다. 원본 run ID는 [이전 실행 증거 검증](verification_evidence_2026-10-15.md)에 있습니다.

## 신규 CLI 결과

단일 CLI를 추가했고 기존 운영 코어의 정책은 변경하지 않았습니다. 새 `test_harness_cli.ps1`은 각 case에 `kind`를 기록합니다.

| 범주 | Windows PowerShell 5.1.26100.9444 | PowerShell 7.6.5 |
| --- | --- | --- |
| 유닛 | 12/12 | 12/12 |
| 통합 | 8/8 | 8/8 |
| 보안 | 5/5 | 5/5 |
| 합계 | 25/25 | 25/25 |
| CLI를 통한 PowerShell 74개 구문·설정 JSON | 통과 | 통과 |

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness_cli.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness_cli.ps1
pwsh -NoProfile -File scripts/harness.ps1 test -SyntaxOnly -Json
```

실제 실행은 각 런타임의 절대 실행 파일 경로로 수행했습니다. CLI 구문 검사도 두 런타임 모두 실행하여 JSON 응답과 CLI/child exit 0을 확인했습니다.

- PS5 결과: `.test-output/4956351a5b6f4196ba05d7237efa65c8/results.json`
- PS7 결과: `.test-output/e3c422c386fa4d58bc19bce10063dee5/results.json`

위 경로는 `C:\Users\mnshell\Desktop\Jungle\Harness_Improvement` 기준입니다. 기존 100개 suite 전체를 이번 변경 후 다시 실행했다고 집계하지 않습니다. 기존 통과 근거를 확인하고 변경된 CLI에 대한 25개씩을 새로 실행했습니다. 전체 테스트 진입점에는 신규 CLI suite도 연결했으므로 향후 전체 실행은 125개를 대상으로 합니다.

## 검증 내용

- 유닛: 프로필 없는 help, 알 수 없는 명령/옵션, 중복·누락 값, 잘못된 제한, 옵션 충돌, exit 2 JSON, run/resume backend 선택.
- 통합: standalone/nested의 한글·공백·대괄호 경로, 실제 init/status/preflight, child 실패 보존, fake handoff를 통한 실행·재개 옵션 전달.
- 보안: 루트 밖 입력 경로 거부, 임의 스크립트 선택 거부, 따옴표·개행·shell 메타문자·한글의 literal 전달, 상속된 workspace override 차단 및 부모 환경 유지, preview가 하위 명령을 실행하지 않는지 검사.
- 실패한 child exit 7을 CLI exit 1로 정규화하면서 원래 코드를 JSON에 보존했습니다. 상태 조회 성공을 제품 검증 성공으로 표시하지 않습니다.

보안의 경로 검사는 lexical root containment입니다. junction/symlink의 OS 차단, 악의적인 대상 엔진, credential 로그 전체 필터링 또는 임의 검증 명령의 안전성까지 보장하지 않습니다. 실제 AI, remote, 알림, 배포는 실행하지 않았습니다.

## 초기 실패와 수정

PS5 테스트 helper가 `ConvertFrom-Json` 배열을 다시 배열로 감싸 중첩 인수로 넘겼습니다. 직접 `-File harness.ps1 help -Json`은 통과했으며 helper를 typed 배열 대입으로 수정했습니다. 초기 결과 `74f6d23d5b10492c826e471b343ace54`는 14/23으로 실패한 실행입니다.

doctor 검사에서는 preflight가 쓰기 진단용 빈 `.githooks` 디렉터리를 만드는 기존 동작을 hook 설치로 잘못 판정했습니다. 실제 hook 파일이 설치되는지 검사하도록 수정했습니다. 중간 PS7 `5720bec56f924a28b8a47e610707a1b2`(21/23), PS5 `333ed15b707744f3a1a2372b12e1250c`(23/25)는 최종 성공 근거에 포함하지 않았습니다. 최종 표의 새 run에서 모두 통과했습니다.

운영 계약은 [CLI 문서](cli.md), 남은 provider 분리와 legacy shell 과제는 [개선 진행표](improvement_backlog.md)에 있습니다.
