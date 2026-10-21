# 두 번째 개선 검증 (2026-10-15 KST)

Windows PowerShell 5.1과 7에서 각각 기존 안전성 23/23 및 새 복구 15/15가 통과했습니다. PowerShell 64개 구문 및 설정 JSON 검사도 통과했습니다. Git 초기화·커밋·worktree와 테스트 전용 프로세스는 격리 fixture에만 만들었습니다.

| 환경 | 기존 안전성 | 최종 복구 결과 |
| --- | --- | --- |
| Windows PowerShell 5.1 | `.test-output/47ddb9b47bb84c9cb50cc82d137fb22a/results.json` (23/23) | `.test-output/e351ba71e8974390b1a3013945b70a61/results.json` (15/15) |
| Windows PowerShell 7 | `.test-output/68c553c90ef348d7b547c7f1a02900b1/results.json` (23/23) | `.test-output/57575a4a4b91424f9cd6cf374404b017/results.json` (15/15) |

첫 전체 실행에서는 기존 23개+복구 13개를 확인했습니다. 이후 seed 상태 보고 회귀 2개를 추가하고 복구 suite를 두 환경에서 다시 실행해 15/15를 확인했습니다. 같은 테스트의 결과 수를 중복 합산하지 않았습니다. 결과 JSON은 테스트 이름·통과 여부만 포함하고 런타임 구분은 실행 기록을 근거로 합니다. 산출물은 Git 무시 대상입니다.

## 새 회귀 15개

1. intent 저장 직후 큐 프로세스 강제 종료 → 반복 복구 성공
2. 목적 파일 생성 직후 강제 종료 → 중복 제거·복구 성공
3. 원본 삭제 직후 강제 종료 → commit 확정·복구 성공
4. 원본 동시 편집 시 복구 거부·내용 보존
5. 목적 파일 충돌 시 복구 거부·내용 보존
6. 손상된 journal fail-closed
7. journal의 큐 경로 이탈 차단
8. 두 복구자 동시 실행 후 목적 파일 하나 보존
9. 완료 재호출은 멱등, 다른 결과 재호출은 거부
10. host 시작 전 intent만 있는 상태에서 stale 복구·중복 launch·다른 invocation ID의 실행 차단
11. 미완료 queue journal이 있으면 seed pass로 보고하지 않음
12. 미해결 worker 기록이 있으면 seed pass로 보고하지 않음
13. 실제 invoke 진입점이 fake CLI를 격리 Git worktree에서 실행하고 완료·log·settled까지 연결
14. 부모만 강제 종료하고 fake worker가 살아 있는 동안 재실행 차단; 확인된 종료 후 조정은 작업 재실행 없이 fail 완료로 처리
15. host까지 종료하고 native fake child를 남겼을 때 격리 유지; PID 기록을 관계없는 프로세스로 바꿔도 kill 또는 복구를 하지 않음

15번은 실제 운영 PID 재사용을 기다린 테스트가 아니라 잘못되거나 재사용된 PID를 가리키는 metadata를 주입한 회귀입니다. 테스트 종료 시에는 테스트가 만든 프로세스 객체만 정리합니다. 운영 복구 코드는 프로세스를 종료하지 않습니다.

## 실행과 한계

```powershell
pwsh -NoProfile -File scripts/test_harness.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1
```

복구만 실행하려면 `scripts/test_harness_recovery.ps1`을 사용합니다. 코드·설계는 [복구 설계](../recovery_design.md)에 정리했습니다.

유료 AI, 실제 GitHub API/merge, Docker, Telegram, WSL/Linux 및 원격 CI는 실행하지 않았습니다. 실제 전체 seed 배포·승격 cycle을 통과했다는 뜻도 아닙니다. 강제 종료 시험은 로컬 파일시스템의 프로세스 중단을 검증하며 전원 손실·네트워크 파일시스템·CLI가 분리해 둔 임의 background descendant의 종료를 보장하지 않습니다.
