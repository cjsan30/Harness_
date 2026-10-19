# 실행 증거 성공 판정 검증 기록

2026-10-15 KST, 네 번째 구현 묶음. 모든 fixture는 개발 checkout의 무시되는 `.test-output/` 아래에 있습니다. 테스트용 Git 저장소와 fake worker만 사용했으며 실제 Codex/Claude, 네트워크 또는 외부 알림을 호출하지 않았습니다.

## 실행 환경과 결과

Windows PowerShell `5.1.26100.9444`, PowerShell `7.6.5`에서 명시적 실행 파일과 `-NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1`로 실행했습니다. Git sh hook을 실행하는 테스트는 sandbox 밖의 로컬 프로세스 실행을 사용했습니다.

| 검사 | Windows PowerShell 5.1 | PowerShell 7 |
| --- | --- | --- |
| PowerShell 71개 구문·설정 JSON | 통과 | 통과 |
| 안전성 | 23/23 | 23/23 |
| 큐·worker 복구 | 16/16 | 16/16 |
| 사용량·제한 | 18/18 | 18/18 |
| 실행 증거 | 28/28 | 28/28 |
| 독립·이식 경로 | 15/15 | 15/15 |

두 런타임 모두 전체 진입점 exit 0, 각각 **100/100 회귀 통과**입니다.

최종 실행별 `results.json` 위치:

| suite | PS5.1 run ID | PS7 run ID |
| --- | --- | --- |
| 안전성 | `e177db8a489348699218a384b47849d6` | `b1ebbc34fb244ac3a445fcb5cf47ab4d` |
| 복구 | `81888b0dcb40452283ab1e9c5efe0a08` | `2098bd5ac24640fd84b861c85d83c296` |
| 사용량 | `6e4aa5c8552f4d17a3e824e8be2d723b` | `fece05073b9642efa2a02b33d2b46f3a` |
| 실행 증거 | `332637592f054766af6c4fa70ba03613` | `1c89906c0cf2444fa42cac20bca5b032` |
| 경로 | `d645652391bc457bb131fde0c7c68ddd` | `5483b11a91e046edb01acbce36d7edbe` |

각 경로는 `C:\Users\mnshell\Desktop\Jungle\Harness_Improvement\.test-output\<run ID>\results.json`입니다. Git에 포함되지 않는 로컬 근거이며 다른 세션에서 삭제하지 않고 확인할 수 있습니다.

## 새 회귀의 범위

- 실제 source assertion, exit code·시각·로그 hash 기록, 유효한 완료 반복 호출
- exit 7, 검증 중 소스 수정, PowerShell 오류 뒤 exit 0으로 종료하려는 경우
- 빈/no-op/version/실패 무시 명령, 중복 validation, 모호한 assignment 상태
- 수동으로 적은 pass와 증거 없는 legacy pass 거부
- tracked/untracked 파일, index, branch, HEAD 변경 후 오래된 증거 거부
- 로그 수정·분실, assignment 내용·owner·ID·증거 버전 불일치 거부
- 다른 worker 시도, 실행 중인 worker, 비정상 종료, 알 수 없는 worker 상태 거부
- 명시적 재검증과 이전 증거 보존, 한글 소스 파일의 변경 감지
- seed resume 미검증 분류, 실제 dispatch lifecycle의 stale pass 거부
- feature finalization이 증거 없는 완료를 Git 변경 전에 차단

복구와 경로 suite는 실제 invoke 진입점에서 fake worker가 완료 명령을 호출하고 증거 검사를 거쳐 settled가 되는 경로를 포함합니다. 경로 fixture의 `git cat-file -e HEAD:baseline.txt`는 fixture artifact의 존재를 확인합니다. 프로필 stage gate에 사용하는 `git --version`은 경로/hook 인프라 검사이며 제품 기능 검증 결과가 아닙니다.

## 보충 검증

legacy pass fixture에 실제 `get_harness_status.ps1 -Json`을 실행하여 `needs_recovery`, `validation_unverified`, `done_pass: 0`, `done_unverified: 1`, 빈 자동 실행 명령을 확인했습니다. 근거는 실행 증거 PS5 run 안에서 `plan.md`가 있는 fixture의 `harness/reports/status.json`입니다. 상태 명령은 PowerShell 7에서 실행했습니다.

`.test-output/check_evidence_promotion.ps1`은 production dispatch의 finalization/workspace/script 호출 함수를 가져와 경로 문맥만 지정하고 실제 feature gate·stage·commit·완료 재검증을 수행합니다. 전체 seed orchestration 또는 원격 merge 시험은 아닙니다.

- PS5 standalone fixture: `d645652391bc457bb131fde0c7c68ddd/standalone 한글 [safe]/evidence_promotion_result.json`. 실제 HEAD가 바뀌고 새 evidence ID가 발급되며 새 증거가 검증됐습니다.
- PS7 nested fixture: `d645652391bc457bb131fde0c7c68ddd/nested 한글 [safe]/evidence_promotion_result.json`. 실제 HEAD 변경과 새 증거 발급·검증을 통과했습니다. PS5 경로 suite가 만든 fixture에서 PS7로 실행한 보충 검증입니다.

## 조사 중 실패와 수정

초기 PS5 실행에서 상대 경로 `Add-Content -LiteralPath source.txt`가 PowerShell 설치 디렉터리를 가리키고 오류 뒤 `exit 0`이 성공을 반환했습니다. 따라서 파일이 바뀌지 않았는데 source mutation 테스트가 의도한 상황을 만들지 못했습니다. 처음의 전체 실행을 성공으로 집계하지 않았습니다 (`6d980de025b043b0a7543a7b3e963e09`, 22/23).

명시적 literal 작업 디렉터리와 terminating error를 사용하는 PowerShell 검증 runner를 추가했습니다. 중간 실행에서는 PS5 상대 LiteralPath의 대괄호 이스케이프 문제가 남아 다수 정상 fixture도 실패했습니다 (`715d21bc062d48ac8ee3e80ca4990c62`, 9/25). 검증 fixture의 실제 파일 접근을 `$PSScriptRoot` 기반 절대 경로로 고치고 비정상 exit code를 보존했습니다. 일반 오류 뒤 exit 0의 거부 사례도 추가했습니다. 이 PS5 경로 제한은 사용자 문서에 남겼으며 모든 임의 스크립트의 상대 경로 동작을 고쳤다고 주장하지 않습니다.

Git 파일 목록은 UTF-8/NUL 원문으로 읽어 한글·공백 경로와 shell 출력 변환 문제를 피했습니다. 자체 구문 검사기의 `$error` loop 변수도 `$parseIssue`로 바꿔 오류 보고가 PowerShell 자동 변수와 충돌하지 않게 했습니다. 최종 결과는 위 표의 새 run ID를 기준으로 합니다.

## 보장하지 않는 범위

제품 요구사항의 의미상 충족, 임의 스크립트가 숨긴 실패, ignored dependency·환경·외부 서비스 재현성, 악의적인 로컬 증거 변조는 이 회귀의 보장 범위가 아닙니다. owner queue lease 안의 검증에 timeout은 없습니다. 실제 유료 AI, 원격 CI/GitHub merge, WSL/Linux는 실행하지 않았습니다. 개발 저장소의 활성 프로필·baseline 커밋·hook·remote는 만들지 않았습니다.

계약과 운영 명령은 [실행 증거 문서](assignment_evidence.md), 다음 작업은 [진행표](improvement_backlog.md)와 [세션 인계](SESSION_HANDOFF.md)에 있습니다.
