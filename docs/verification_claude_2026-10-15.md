# Claude adapter 검증

2026-10-15 KST. 실제 유료 호출 없이 로컬 fake Claude 실행기와 실제 Git/worktree/worker host/완료 검증을 사용했습니다. Claude 실행 파일의 설치·로그인·API 키·계정 상태를 변경하거나 조회하지 않았습니다.

## 신규 테스트

최종 `test_provider_claude.ps1`은 유닛 10개·통합 9개·보안 회귀 19개, 총 38개입니다. 각 case의 범주와 성공 여부를 results.json에 기록합니다.

- 유닛: provider 선택과 legacy 기본값, 캐시 입력 합산·중복 방지, 잘못된/누락된 사용량의 unknown/null, 최종 메시지 추출·오래된 메시지 제거.
- 통합: provider 변경 시 공통 토큰·시도 예산 유지, unknown Claude 사용량의 다음 Codex 예약 차단, 실제 native UTF-8 stdin/stdout, standalone/nested의 실제 invoke→host→완료 증거 경로. 두 배치에서 정상·명시적 실패·최종 응답 누락을 검증합니다. 정상 case는 DryRun의 무실행·무예약 및 provider별 버전 조회도 검사합니다.
- 보안 회귀: 권한 우회 없는 고정 실행 인수와 모델 literal 전달, 명시한 실행 파일 누락 시 fallback 금지, 오류 flag/subtype·권한 거부·취소·비정상 exit·누락/손상/중복/다른 session 결과 및 배열 타입 거부, provider 결과 바꿔치기 시 예약 보존.

실패 시나리오는 fake Claude가 실제 validation을 통과해 pass를 작성한 다음 실패 또는 누락 응답으로 exit 0을 반환합니다. invoke 성공/worker settle/복구/명시적 재검증을 모두 거부하는지 확인합니다. 보안 회귀 통과는 외부 침투 테스트나 모든 취약점 부재를 의미하지 않습니다.

## 실행 결과

전체 실행은 두 런타임의 절대 경로를 지정하여 `-NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1`로 실행합니다. 실제 Git sh hook 검증을 위해 로컬 프로세스 실행 권한을 사용했으며 원격 요청은 하지 않습니다.

| Suite | Windows PowerShell 5.1.26100.9444 | PowerShell 7.6.5 |
| --- | --- | --- |
| 안전성 | 23/23 | 23/23 |
| worker·큐 복구 | 16/16 | 16/16 |
| 사용량·예산 | 18/18 | 18/18 |
| 실행 증거 | 28/28 | 28/28 |
| 독립·이식 경로 | 15/15 | 15/15 |
| CLI | 25/25 | 25/25 |
| 공통 provider | 22/22 | 22/22 |
| Claude | 38/38 (최종 별도 실행) | 38/38 |
| 최종 suite 합계 | 185/185 (147 + 최종 38) | 185/185 (전체 실행) |
| PowerShell 79개 구문·설정 JSON | 통과 | 통과 |

아래 run ID는 저장소의 `.test-output/<run-id>/results.json`입니다. Git에 포함하지 않는 로컬 진단 산출물입니다.

| Suite | PS5 run ID | PS7 run ID |
| --- | --- | --- |
| 안전성 | `1b925b8416644c08b2fb84d461247e2e` | `36d22d9c87b846eabbb6a6e01b247ff2` |
| 복구 | `e8043b1c74274d35bb28c8540b48cd72` | `1829d07deaeb40159ea2e22438c7ed97` |
| 사용량 | `dfb3809726ec46e58e2b01827d19edc2` | `950b8bbf76b54a57a5c7ef058061ce34` |
| 증거 | `5b7e1296bfee4ae5b2da4524ef036866` | `1511a146535047b899b09ccaf5a463a1` |
| 경로 | `72daee1aaba44cb4adf92c67790b8b6c` | `ebce8b09ee97415dadb09aa0f7946582` |
| CLI | `676cd4173c6b4d67bf28c180de36a4fd` | `ef0e64ede8fd4c36a4003ce97c6d2bf6` |
| 공통 provider | `889a6781cc424c248a4b030171cdc921` | `bb48886310714c819afb1d192ce5cfe8` |
| Claude | `d24a8f39a1ce4bc5bc7c085b9efeb73a` | `5b6eaeb57a72450ebd142d023f03c57b` |

초기 targeted 실행은 각각 35/35였습니다: PS5 `3fd6d2337b5b4b8989e6fcd128973963`, PS7 `456e4713264344b0b7c2b8b913b48afb`. 이후 native UTF-8 case 1개 및 정상 invoke case의 preview 검사도 추가했습니다. PS5 전체 실행은 당시 183/183(Claude `95486e683832485aa7dc60709f75682b`의 36/36 포함)으로 종료했습니다.

마지막 코드 검토에서 PowerShell의 단일 원소 배열 비교가 잘못된 event type/subtype을 허용할 여지를 확인하고 두 필드를 문자열로 제한했습니다. 보안 case 2개를 추가한 최종 Claude 38개를 PS5에서 다시 실행해 38/38로 통과했습니다. PS7의 전체 실행은 Claude suite 시작 전에 이 수정을 읽으므로 185개입니다. 표의 최종 결과를 초기 35/36개 실행과 구분합니다. 마지막 변경은 Claude parser와 해당 테스트에만 있으며, 기존 147개 suite를 PS5에서 다시 실행하지는 않았습니다.

두 런타임의 최종 Claude 결과는 각각 유닛 10/10·통합 9/9·보안 회귀 19/19입니다. 전체 실행과 마지막 targeted 실행 모두 종료 코드 0을 확인했습니다. 마지막 타입 검사 수정 후 두 런타임에서 구문 79개·설정 JSON을 별도로 재검사했고 통과했습니다. 스크립트 기능 목록의 누락과 문서 로컬 링크 오류도 0건입니다.

## 범위와 운영 전제

- 공식 문서와 SDK의 메시지 정의를 토대로 fixture를 구성했습니다. [Claude 계약](claude_adapter.md)에 출처·권한·토큰 계산·필요 CLI 옵션을 기록했습니다. fake 실행기는 실제 Claude가 해당 인수를 지원하고 권한 정책을 집행한다는 실증이 아닙니다.
- 실제 Claude Code 호출·모델 품질·계정 요금·CLI 버전별 동작, WSL/Linux·원격 CI는 미검증입니다. 실제 AI 유료 호출은 이번 요청에서 제외했습니다.
- adapter는 acceptEdits와 승인 필요 호출 거부를 사용합니다. 대상 프로젝트는 검증/완료 shell 명령의 권한을 별도로 설정해야 합니다. OS sandbox나 범용 secret 마스킹은 제공하지 않습니다.
- 공통 worker의 native 입력/출력을 UTF-8로 지정했으며, 기존 Codex 회귀도 함께 실행합니다. 구형 metadata 없는 기록은 계속 Codex로 해석합니다.
- 개발 checkout의 활성 프로필·remote·core.hooksPath·첫 커밋은 추가하지 않았습니다. 원본 Harness 폴더도 변경하지 않았습니다.

재개 문서는 [세션 인계](SESSION_HANDOFF.md), 남은 작업은 [개선 진행표](improvement_backlog.md)입니다.
