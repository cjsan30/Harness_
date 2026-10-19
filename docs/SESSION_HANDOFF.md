# Harness Improvement 세션 인계

## 최신 문서화 인계 — 2026-10-15

사용자가 현황판 구현 이후 수정 내용과 대화를 다시 문서로 남기도록 요청했습니다.
[후속 대화·수정·결정 기록](conversation_history_2026-10-15.md)에 초기 개선 이후 요청,
인라인 표시 실패, 이미지 초안, 현황판 데이터 의미, 변경 파일, 수정 이력과 남은 일을 정리했습니다.
초기 가치 평가·비용 가정은 [이전 대화 기록](conversation_history_2026-10-14.md)에 보존했습니다.

최종 현황판 검사는 PS5.1/PS7/WSL 각각 28/28, HTTP Windows/Linux 각각 8/8,
브라우저 11개 시나리오, CLI 25/25, 완료 증거 28/28, worker 복구 Windows/Linux
각각 16/16입니다. 실행별 범위·증거는 [검증 기록](verification_dashboard_2026-10-15.md)을 따릅니다.
이번 문서화에서는 실행 코드를 바꾸거나 위 테스트를 다시 실행하지 않았습니다.

이전 작업 종료 시점의 서버는 `http://127.0.0.1:8768/`였습니다. 새 세션에서는 생존을
가정하지 말고 확인하세요. 저장소 루트에서 `pwsh -NoProfile -File scripts/harness.ps1 dashboard`
로 다시 실행할 수 있습니다. 현재 checkout의 프로필 미설정/빈 작업은 정상입니다.
사용자의 핵심 개선 보류 결정을 유지하고 [다음 세션 프롬프트](next_session_prompt.md)로 이어갑니다.

## 최신 구현: 로컬 조회 현황판

사용자가 핵심 개선을 잠시 보류하고 현황판을 요청했습니다. 인라인 HTML 읽기 오류로
앱 내 초안 표시가 반복 실패하여 정적 이미지 초안을 생성했습니다. 이후 사용자와
지표를 합의했고 실제 로컬 브라우저 현황판 구현을 승인받았습니다.

`harness.ps1 dashboard`는 Python 표준 라이브러리 서버를 foreground로 실행합니다.
`dashboard -Snapshot -Json`은 PowerShell만으로 한 번 조회합니다. 기존 status의
보고서 저장·알림·큐 복구를 호출하지 않습니다. 기존 완료 증거에 `-ReadOnly` index
검사를 추가하여 새 Git 객체나 검증 실행 없이 실제 source/HEAD/log 등을 검사합니다.
가동 수는 host/PID와 시작 식별자로 확인한 worker host이며 미확정 사용량은 별도입니다.
Linux 새 worker에는 boot ID/PID/시작 tick을 기록하여 벽시계 변환 오차를 피합니다.
구형 기록은 시각 대조가 불일치하면 확인 불가이며 실행·복구 권한은 바꾸지 않았습니다.
현재 단계 이벤트는 없으므로 마지막 완료 사이클로 표시합니다. 작업 분모는 보존 큐이며
미배정 계획까지 포함하지 않습니다. 현재 checkout은 계속 프로필 미설정 상태입니다.

화면·서버·새 회귀·CLI 연동 파일은 [기능 목록](feature_inventory.md)의 29번,
[사용법과 한계](dashboard.md), [검증 기록](verification_dashboard_2026-10-15.md)을 보세요.
이전 shell/플랫폼·18개 backlog는 아래에 보존합니다. 다음 구현은 사용자의 현황판
피드백을 먼저 확인하고, schema/DAG·검증 어댑터를 자동으로 계속하지 않습니다.

최신 구현·검증 기준일: 2026-10-15 (KST). 이 문서는 세션의 의사결정과 구현 상태를 다음 세션으로 전달하는 진입점입니다. 대화 원문의 전사가 아니라 작업을 재개하는 데 필요한 기록입니다.

## 최신 추가 검증: WSL·Linux·PowerShell·CMD·Bash

사용자가 각 환경의 실제 실행을 요청했습니다. Windows PS5.1/7.6.5에서 PowerShell 직접 호출·CMD·Git Bash 각각을 비교해 두 런타임별 30/30을 통과했습니다. WSL2 Ubuntu 24.04의 native pwsh 7.6.2로 Linux `/tmp`에서 기존 회귀 185/185·보강 shell 36/36·새 진입점 20/20을 확인했습니다. 같은 fixture의 Windows→WSL→Windows hook 재설치, 보호 브랜치 commit 거부와 실제 도구 실행도 3단계 통과입니다.

새 파일은 `test_harness_entrypoints.ps1`이며 전체 test_harness.ps1에 기존 shell fixture 재사용 방식으로 연결했습니다. shell 테스트는 Linux의 런타임 누락과 Windows .exe 거부를 구분합니다. WSL DrvFS의 Copy-Item/Git 읽기 전용 객체 복사 오류를 피하도록 Git DB는 local clone, 나머지는 파일 복사로 이동을 검증합니다. `-CasePattern '*relocated*'`는 해당 2개만 실행하며 0건 선택은 실패합니다. 엔진 실행 코드는 바꾸지 않았습니다.

[최신 플랫폼 검증](verification_platforms_2026-10-15.md)을 먼저 읽으세요. 초기 실패와 보강 후 결과, `/tmp`와 `/mnt/c`, 이전 Windows 221개와 이번 추가 30개를 구분합니다. 원래 Linux 임시 결과는 `.test-output/platform-evidence/`에도 복사했습니다. 다른 배포판/물리 Linux/원격 CI·유료 AI까지 검증한 결과가 아닙니다. 다음 기능 우선순위는 작업 schema/DAG와 프로젝트별 검증 어댑터를 유지합니다.

`/mnt/c` 최종 재실행은 shell 36/36·진입점 20/20 및 exit 0입니다. 최종 집계에서 Linux `/tmp` 원본 일부가 없어 이미 복사·대조한 보존본을 사용했고 summary.json의 read_from에 기록했습니다. 전체 CI runner는 Windows 251개/Linux 241개 구성으로 확장했지만 이번 결과는 문서의 실행별 범위를 따릅니다. CI job 제한은 30분으로 늘렸으며 원격 실행은 하지 않았습니다.

## 이전 구현: Shell 명령 통일

사용자는 다른 프로젝트에서 CLI 명령 충돌로 고생했기 때문에 실제 오류 감소 검증을 강조했습니다. 여덟 번째 묶음은 4개 개별 검증 shell과 cycle/retry shell을 공통 bridge로 연결하고, cycle과 단일 단계의 프로필 명령 해석·실행을 공유합니다. 기본 make fallback과 추가 인자 무시를 제거하고 설치 루트/상속 환경 검사, preview, 원래 종료 코드, 재귀 차단을 추가했습니다.

새 파일은 `validation_command.ps1`, `run_harness_shell.ps1`, `invoke_harness.sh`, `test_harness_shell.ps1`입니다. 실제 Node 숫자 합계 CLI를 독립/중첩 fixture에 만들고 한글·공백·대괄호·& 경로, 인자의 &/| 보존, 빌드·테스트·실패 중단·복사 후 실행을 검증했습니다. 수정 전 0/12, 수정 후 신규 36/36(유닛 4·통합 20·보안 12)이 Windows PS5/7에서 통과했습니다. 전체 회귀·중간 fixture 문제·지원 한계는 [최신 검증](verification_shell_2026-10-15.md)에 있습니다.

[Shell 계약과 전환](shell_commands.md)을 먼저 읽으세요. 프로필 명령은 실제 도구를 지정하고 wrapper를 다시 부르지 않습니다. 명령 문자열은 여전히 OS shell 문법이며 argv schema나 sandbox는 아닙니다. 실제 유료 호출·원격 CI·WSL/Linux는 수행하지 않았습니다. 다음은 전체 작업 schema/DAG와 프로젝트별 검증 어댑터입니다. 아래 구현 묶음은 당시 이력입니다.

최종 코드 전체 회귀는 Windows PowerShell 5.1/7 각각 **221/221**과 프로세스 exit 0을 확인했습니다. 구문 PS82·shell20·설정 JSON, 별도 실제 make 2/2, 문서 링크·기능 목록 정합성도 통과했습니다. 18개 results.json을 대조한 결과는 `.test-output/full-shell-summary.json`입니다. 이전 묶음의 일부 재실행 합산과 구분합니다.

## 일곱 번째 구현 이력: Claude adapter

사용자가 실제 유료 호출 없이 Claude adapter 구현과 유닛·통합·보안 검증을 요청하여 일곱 번째 묶음을 구현했습니다. `provider_claude.ps1` 및 `test_provider_claude.ps1`을 추가하고 공통 registry/결과 검사/마지막 메시지 추출/worker UTF-8 실행에 연결했습니다. 기존 invoke 파일명·CLI·기본 Codex는 유지하며 대상 프로필의 worker_provider.name=claude로 선택합니다.

Claude는 acceptEdits와 permission-prompts none을 명시합니다. 권한 우회나 무제한 Bash를 허용하지 않으며 대상 프로젝트에서 필요한 검증·완료 명령 권한을 구성해야 합니다. final result가 없거나 잘못된 경우 provider_protocol 실패입니다. 명시적 실패·권한 거부·취소도 성공으로 인정하지 않습니다. input/cache-read/cache-creation을 합산하되 assistant/delta/modelUsage는 중복 합산하지 않습니다. 실제 모델·비용·구독 한도는 추정하지 않습니다.

현재 소스는 PowerShell 79개 + shell 19개입니다. [Claude 계약](claude_adapter.md)과 [최신 검증 기록](verification_claude_2026-10-15.md)을 먼저 읽으세요. 실제 AI 인증·유료 호출·원격 CI·WSL/Linux 검증은 하지 않았습니다. 다음 우선순위는 legacy 개별 make shell 정리 및 플랫폼 실증이며, 실제 유료 provider 검증은 별도 승인 범위입니다.

최종 검증은 두 Windows 런타임 각각 기존 147/147 + Claude 38/38(유닛 10·통합 9·보안 19)입니다. PS5 전체 183개 통과 후 JSON 배열 타입 차단 2개를 추가해 Claude 38개를 재실행했고, PS7 전체 실행은 최종 185개로 통과했습니다. 구문 79개·설정 JSON, 문서 링크와 기능 목록 누락 0건도 확인했습니다. 이전 묶음 숫자는 아래에 이력으로 보존합니다.

## 여섯 번째 구현 이력: Provider 실행·결과·사용량 계약

사용자가 provider 계약 분리와 유닛·통합·보안 검증을 요청하여 여섯 번째 묶음을 구현했습니다. Codex 실행 파일·인수·버전·JSONL 응답/usage 해석을 adapter로 분리하고, worker intent와 ledger에 version 1 provider_contract/provider_result를 연결했습니다. 기존 script 이름과 CLI는 유지합니다.

미지원 provider/버전/필드와 다른 invocation·model의 결과를 거부합니다. exit 0이어도 turn.failed/error 이벤트면 성공으로 인정하지 않으며 완료 증거·복구·재검증 경로도 거부합니다. 사용량 unknown/null·실제 모델/금액 미추정·예약 보존 정책을 유지합니다. Codex가 유일한 실제 adapter이고 Claude 구현은 남아 있습니다.

새 파일: `provider_contract.ps1`, `provider_codex.ps1`, `test_provider_contract.ps1`. 프로필 template에 선택적 worker_provider v1/codex를 추가했으며 legacy 프로필/worker/ledger는 문서화된 Codex 호환 경로로 읽습니다. [계약](provider_contract.md), [최신 검증](verification_provider_2026-10-15.md)을 먼저 읽으세요. 지원 범위는 로컬 fake provider이며 실제 유료 AI·원격 CI는 실행하지 않았습니다.

다음 작업은 Claude adapter의 실행/권한/사용량 정규화 계약 구현과 legacy 개별 make shell 정리입니다. 실제 과금 실행 없이 fixture부터 확장하고, 새 provider로 예산·완료 증거·승인 정책을 우회하지 않도록 유지하세요.

이번 변경 후 전체 회귀를 실제 재실행하여 Windows PowerShell 5.1/7 각각 **147/147**과 구문 77개·설정 JSON을 통과했습니다. 신규 provider 범주는 각각 유닛 6/6·통합 4/4·보안 회귀 12/12입니다. 이전 구현의 실제 legacy worker/ledger 읽기도 확인했으며 문서 로컬 링크 오류는 0건입니다. 아래 이전 묶음의 테스트 수는 당시의 이력입니다.

## 다섯 번째 구현 이력: 단일 운영 CLI

사용자가 유닛·통합·보안 테스트가 이전에 통과했다면 다음 개선을 구현하도록 지시했습니다. 이전 200개 결과에 실패가 없고 함수·Git/worker 통합·승인/민감정보/증거 변조 회귀가 포함된 것을 확인한 후 다섯 번째 묶음인 CLI를 구현했습니다. 원격 보안 스캐너나 침투 테스트를 수행한 것으로 해석하지 않습니다.

`scripts/harness.ps1`에서 init/doctor/run/status/resume/usage/test/help를 제공합니다. `-Preview`는 파일 변경 없는 호출 계획, `-DryRun`은 기존 workflow의 preview 실행입니다. resume는 보고서 조회가 기본이고 `-Execute`로 실행합니다. run/resume는 명시적 PlanFile을 요구합니다. JSON v1 응답과 CLI exit 0/1/2를 제공하며 실제 child 코드는 보존합니다.

새 파일은 `harness.ps1`, `harness_cli.ps1`, `test_harness_cli.ps1`입니다. 기존 스크립트는 유지하며 provider·usage·증거·승인 정책은 변경하지 않았습니다. [CLI 사용법](cli.md)과 [검증 기록](verification_cli_2026-10-15.md)을 먼저 읽으세요.

신규 테스트는 Windows PS5/7 각각 유닛 12 + 통합 8 + 보안 5 = **25/25**, CLI를 통한 구문 74개·JSON 통과입니다. 이전 전체 100개는 기존 근거를 확인했으며 이번 변경 뒤 전체 125개를 재실행한 것으로 합산하지 않습니다. 다음 우선순위는 provider 실행·결과·usage 계약 분리(12)와 legacy 개별 make shell 정리입니다.

## 네 번째 구현 이력: 실행 증거 기반 성공 판정

사용자가 다음 우선순위인 실행 증거 기반 성공 판정을 지시하여 네 번째 묶음을 구현했습니다. `complete_assignment -Result pass`가 assignment의 실제 검증을 실행하고 code/HEAD/branch/index/log/assignment/invocation을 연결합니다. 실패 또는 검증 중 코드 변경 시 완료하지 않으며, 이후 변경된 증거도 성공으로 인정하지 않습니다.

worker 종료·복구·seed 재개/재시도/승격·상태 조회에 재검사를 연결했습니다. feature commit 뒤에는 검증을 다시 실행하고 integration gate 후에도 확인합니다. 증거 없는 legacy pass는 `validation_unverified`와 `done_unverified`로 표시합니다. 성공 종료가 확인된 기존 pass는 `-Revalidate`로 새 증거를 만들며 이력을 보존합니다.

먼저 [실행 증거 계약](assignment_evidence.md), [네 번째 검증 기록](verification_evidence_2026-10-15.md)을 읽으세요. 검증은 owner queue lease 안에서 실행되고 timeout은 아직 없습니다. 제품 동작 자체의 독립 검증이나 악의적인 로컬 증거 위조 방지는 보장하지 않습니다. PS5의 대괄호 경로 문제 때문에 검증 스크립트는 `$PSScriptRoot` 기반 절대 입력 경로를 사용해야 합니다.

새 스크립트는 `assignment_evidence.ps1`, `test_assignment_evidence.ps1`입니다. 다음 우선순위는 단일 운영 CLI/provider 계약 분리(11·12)이며 전체 작업 DAG/schema(13), 프로젝트별 검증 어댑터(16)는 남아 있습니다. 실제 유료 실행과 원격 서비스 변경은 수행하지 않았습니다.

최종 로컬 검증은 두 Windows 런타임 각각 안전성 23 + 복구 16 + 사용량 18 + 실행 증거 28 + 경로 15 = **100/100**, 구문 71개·JSON 통과입니다. 실제 로컬 feature commit 후 새 HEAD에 대한 증거 재발급도 PS5 standalone과 PS7 nested fixture에서 보충 확인했습니다. 구체적 run ID와 중간 실패·수정은 네 번째 검증 기록에 있습니다.

## 세 번째 구현 이력: 경로 통일과 사용량·다음 실행 제한

사용자가 “내 승인이나 의견이 필요한게 아니면 계속 구현하자”라고 지시했습니다. routine 구현·격리 테스트·문서 갱신은 계속 진행하며 제품 개발로 전환하지 않습니다.

세 번째 묶음은 독립/이식 엔진 위치 구분, 한글·공백·대괄호 경로, worktree hook bootstrap, 생성 환경·CI·릴리스 경로, cycle shell 위임입니다. 이어 JSONL 토큰·실행 시간·시도 이력을 invocation별로 저장하고 공통 lease 안에서 실행 횟수·재시도·동시 실행과 다음 실행 토큰/시간 제한을 적용했습니다. 제거된 Codex `--full-auto`도 수정했습니다.

[배치 지원](layout_support.md), [사용량과 제한](execution_usage.md), [최신 검증 기록](verification_layout_usage_2026-10-15.md)을 우선 읽으세요. 금액·구독 잔여량·실행 중 강제 timeout은 미구현입니다. 모르는 사용량은 null/unknown이며 미확인 예약을 자동 환불하지 않습니다.

새 파일: `harness_layout.ps1`, `hook_bootstrap.sh`, `test_harness_layout.ps1`, `execution_usage.ps1`, `get_execution_usage.ps1`, `test_execution_usage.ps1`. 핵심 기존 경로와 worker host를 연결했고 비활성 .githooks 복사본도 동기화했습니다. 실제 개발 checkout에 hook을 활성화하거나 프로필을 만들지는 않았습니다.

두 Windows 런타임 각각 안전성 23/23 + 복구 16/16 + 사용량 18/18 + 경로 15/15, PowerShell 69개 구문/설정 JSON 통과. 마지막 정책 거부 보존과 UTF-8 packet 처리는 두 배치에서 보충 확인했습니다. claim/complete/invoke의 UTF-8 읽기도 수정했습니다. 검사별 artifact와 중간 실패·수정 내역은 최신 검증 기록에 있습니다.

세 번째 묶음 당시의 다음 우선 작업은 완료 조건과 실행 증거를 연결하는 성공 판정(7·13)이었습니다. 이후 구현과 다음 작업은 맨 위 네 번째 묶음을 따릅니다. WSL/Linux 실증, 금액 정책, 실행 중 강제 종료는 별도 범위입니다.

## 두 번째 구현 이력: worker 수명과 큐 복구

문서 인계 후 사용자가 다음 개선 구현을 요청하여 두 번째 묶음을 구현했습니다. **worker 실행 전 durable intent, 별도 worker host/lease, 부모 종료 후 중복 실행 차단, 담당자별 큐 journal과 중단 복구**가 추가됐습니다. 종료가 불명확하면 강제 재실행하지 않고 격리합니다.

설계·운영 명령·남은 한계는 [복구 설계](recovery_design.md), 결과는 [2026-10-15 검증](verification_2026-10-15.md)에 있습니다. Windows PowerShell 5.1/7 각각 기존 안전성 23/23 + 복구 15/15, PowerShell 64개 구문/설정 JSON이 통과했습니다. 실제 AI나 원격 CI 실행은 여전히 하지 않았습니다.

새 파일은 `assignment_state.ps1`, `run_assignment_worker.ps1`, `repair_assignment_state.ps1`, `test_harness_recovery.ps1`, `test_recovery_child.ps1`입니다. common/claim/complete/invoke/seed dispatch/retry dispatch/seed resume와 자체 테스트 진입점을 연결했습니다. `repair_assignment_state.ps1 -Agent <owner> [-AssignmentId <id>]`는 journal과 확인된 종료만 조정합니다.

두 번째 묶음 종료 당시의 우선 과제는 독립 루트·이식 경로 공통화와 플랫폼 검증이었습니다. 이후 구현은 맨 위 최신 항목을 따릅니다. 불확실한 worker의 검토 후 해제 UX, process-tree 강제 종료, 최초 assignment/packet 생성 및 외부 side effect 전체 복구는 별도 과제로 남았습니다.

## 먼저 읽을 문서

1. 이 문서: 현재 상태, 구현 내용, 작업 재개 순서
2. [대화·평가·비용 논의 기록](conversation_history_2026-10-14.md): 사용자 의도와 추정의 가정
3. [개선 진행표](improvement_backlog.md): 18개 과제의 상태와 완료 기준
4. [최신 검증 기록](verification_platforms_2026-10-15.md), [첫 검증 기록](verification_2026-10-14.md): 실제 실행한 테스트와 미검증 범위
5. [기능 목록](feature_inventory.md), [개발 지침](../AGENT.md), [현재 상태](current_state.md)

새 세션에 전달할 문구는 [다음 세션 시작 프롬프트](next_session_prompt.md)에 있습니다.

## 사용자와 확정한 방향

- 이 폴더는 **재사용 가능한 Harness 자체를 개선하는 저장소**입니다.
- 처음 검토했던 AI 트러블슈팅 게시판의 제품 코드·요구사항·프로필은 제거했습니다. 게시판을 다시 만들지 않습니다.
- 웹사이트용 챗봇은 비용과 활용 규모를 설명하기 위한 예시였습니다. 챗봇 구현을 시작하라는 지시는 없었습니다.
- 비용 논의 중 보완을 잠시 보류했다가, 개선점 목록을 정리하고 사용자가 “구현시작하자”라고 승인했습니다.
- 첫 안전성 개선과 문서 인계 후, 다음 개선 요청으로 worker 수명·큐 복구 묶음까지 구현했습니다.

## 위치와 저장소 상태

| 항목 | 상태 |
| --- | --- |
| 현재 작업 루트 | `C:\Users\mnshell\Desktop\Jungle\Harness_Improvement` |
| 비교했던 원본 1 | `C:\Users\mnshell\Desktop\Jungle\[Harness]Week_C_DB_AI\harness` |
| 복사의 기준이 된 원본 2 | `C:\Users\mnshell\Desktop\Jungle\HarnessTest_0609\harness_board\harness` |
| 초기 격리 감사 폴더 | `C:\Users\mnshell\Desktop\Jungle\.harness-audit-20261014` |
| Git | 새 저장소의 `main`, **아직 첫 커밋 없음**. 파일들이 `??`로 표시되는 것은 정상적인 현재 상태 |
| remote / core.hooksPath | 이번 확인에서 설정값 없음. hook 파일이 있다고 활성 hook인 것은 아님 |
| 대상 프로젝트 프로필 | `project/configs/project_profile.json` 없음. 공통 template만 유지 |
| 현재 스크립트 | PowerShell 83개 + shell 20개 = 103개 |
| 외부 반영 | 원본 폴더 수정, push/PR, 실제 AI worker, 실제 원격 merge 수행 안 함 |

`git clean`, `reset` 또는 원본 재복사로 현재 파일을 없애지 마세요. 첫 커밋이 없어서 일반적인 `git diff HEAD`로 이번 변경만 추출할 수 없습니다. 아래 변경 목록과 테스트를 기준으로 검토하고, baseline 커밋은 별도 단계로 다루세요. 임시 테스트 저장소 안에는 테스트를 위한 커밋이 있습니다.

## 완료한 정리 작업

원본 2에서 Git 추적 대상/비무시 소스 156개를 복사하고 SHA-256을 비교했습니다. 원본 `.git`, 런타임 산출물, 캐시와 `node_modules`는 복사 대상에서 제외했습니다. 이후 게시판 관련 52개 파일을 제거하고 README, 관리자 프롬프트, 개발 지침을 엔진 전용으로 정리했습니다.

제거 범위에는 `frontend/`, `backend/`, `baseline-audit/`, 게시판 package/config/요구사항, 제품 테스트 기록, 생성된 환경·프로필 문서와 활성 대상 프로필이 포함됩니다. 기존 Harness 변경 이력은 보존했습니다. 엔진 수정 전에는 기존 73개 스크립트 및 hook 8개가 원본과 일치했습니다. **그 일치 결과는 이후 엔진 수정까지 포함한 현재 상태의 일치를 의미하지 않습니다.**

## 첫 구현 묶음의 상세 (2026-10-14 이력)

아래는 첫 구현 시점의 기록입니다. worker 자식 수명과 큐 journal에 관한 이후 변경은 맨 위 최신 구현 및 복구 설계를 우선합니다.

### 승인 범위와 병합

`Get-BoundGitApproval`로 `repository_root`, `source_branch`, `source_head`, `target_branch`, `stage`, ID 및 상태를 함께 검사합니다. ID를 직접 지정해도 다른 변경의 승인을 재사용할 수 없습니다. 승인 요청과 결정 단계도 동일한 범위를 검증합니다.

승격, hook 검사, 감사, 로컬 merge, PR merge 경로를 연결했습니다. 로컬 merge는 hook 설치 여부와 관계없이 권한을 검사하고 승인된 commit SHA를 병합합니다. PR merge는 `--match-head-commit`을 유지합니다. 구형 root 없는 승인은 새로 요청해야 하며, 저장소 위치 이동도 승인 재요청 사유입니다. 로컬 JSON과 hook은 협업 통제이며 악의적인 로컬 파일 수정까지 막는 보안 경계는 아닙니다.

### Intake 민감정보

새 `intake_safety.ps1`의 `ConvertTo-SafeHarnessIntake`는 `Secrets And Access`에서 행 앞의 대문자 환경변수 이름만 남기고 값·설명·자유 텍스트를 전달하지 않습니다. 다른 구역에서는 흔한 credential 토큰, private key 헤더, 암호/키 할당, credential URL을 검사해 중단합니다. 오류에 탐지한 값을 출력하지 않습니다.

검사 및 정규화는 review, env manifest, start-from-intake에 적용했고 review 생략 경로도 포함합니다. 원본 intake 파일은 수정하지 않습니다. 임의의 모든 비밀 문자열 탐지, 이미 저장된 이력 정리, 모든 런타임 로그 마스킹은 완료하지 않았습니다.

### 잠금과 소유권

시간 만료 후 잠금 디렉터리를 지우는 방식 대신 `lease` 파일의 배타적 OS 파일 핸들을 유지합니다. 획득 결과는 `PortableHarness.LockLease` 객체이며 같은 객체로 update/release 해야 합니다. 소유자 GUID, PID, 호스트, 프로세스 시작 시간 및 heartbeat 등을 `lock.meta` v2에 기록합니다. 이전 lease로 새 소유자의 잠금을 해제할 수 없습니다.

프로세스가 종료되면 OS가 핸들을 반환하므로 재획득할 수 있습니다. `lease` 파일과 디렉터리는 정상 종료 뒤에도 남으며 파일 존재로 활성 여부를 판단하면 안 됩니다. `Test-HarnessLockActive`를 사용합니다. 구형 lease 없는 디렉터리는 fail-closed로 처리하고 오래됐다는 이유로 삭제하지 않습니다.

`Update-HarnessLock`은 heartbeat 갱신 함수를 제공하지만 모든 실행 경로에 주기적 타이머를 연결한 것은 아닙니다. 현재 생존 판단의 근거는 OS 핸들입니다. **부모가 죽은 뒤 살아 있는 AI 자식 프로세스의 수명 관리와 네트워크 파일시스템 검증은 남았습니다.**

### 파일·상태 저장과 경로

`Write-Utf8File`은 같은 볼륨의 임시 파일을 사용하고 기존 파일에는 `File.Replace`, 새 파일에는 `File.Move`를 사용합니다. 비원자적 덮어쓰기 fallback을 제거하여 원자적 교체를 할 수 없으면 실패합니다.

Git workflow 상태는 읽은 원문 snapshot을 기록하고 저장 잠금 안에서 현재 파일과 비교합니다. 오래된 snapshot의 갱신을 거부해 승인이 조용히 사라지는 것을 방지합니다. 자동 충돌 병합 기능은 없습니다.

큐의 `Move-FileWithUpdatedContent`는 아직 목적 파일 생성 후 원본 삭제입니다. 두 파일 사이 전환은 하나의 트랜잭션이 아니므로 중단 시 중복이 생길 수 있습니다. `Invoke-HarnessProcess`의 `Push-Location`은 `-LiteralPath`로 바꿔 대괄호 경로 오류를 고쳤습니다. 전체 standalone 경로 통일은 별도 과제입니다.

### 자체 테스트와 CI

활성 프로필 없이 실행 가능한 `test_harness.ps1`과 안전성 회귀 테스트를 추가했습니다. Windows PowerShell 5.1과 PowerShell 7에서 각각 23/23, 59개 PowerShell 구문 및 설정 JSON 검사가 통과했습니다. Windows 두 shell 및 Ubuntu pwsh용 CI를 정의했으나 원격 실행 결과는 없습니다.

## 구현 변경 파일 지도

| 파일 | 핵심 역할 |
| --- | --- |
| `scripts/git_workflow_common.ps1` | 범위가 연결된 승인 조회, workflow snapshot 충돌 검사 |
| `scripts/harness_common.ps1` | OS 잠금·lease, 원자적 쓰기, literal working directory |
| `scripts/request_main_merge_approval.ps1`, `scripts/set_main_merge_approval.ps1` | 승인 요청·결정 시 범위 기록과 검사 |
| `scripts/authorize_branch_promotion.ps1`, `scripts/assert_git_action_allowed.ps1` | 승격 및 Git action 승인 검사 |
| `scripts/merge_authorized_branch.ps1`, `scripts/merge_pr_if_allowed.ps1` | 로컬/PR 병합 검사와 승인 commit 고정 |
| `scripts/intake_safety.ps1` (신규) | intake 정규화·credential 검사 |
| `scripts/review_project_intake.ps1`, `scripts/generate_env_manifest.ps1`, `scripts/start_from_intake.ps1` | intake 안전 처리 연결 |
| `scripts/test_harness.ps1`, `scripts/test_harness_safety.ps1`, `scripts/test_lock_child.ps1` (신규) | 검증 진입점, 격리 회귀 테스트, 잠금 경쟁 프로세스 |
| `.github/workflows/harness-self-test.yml` (신규) | Windows 5.1/7 및 Ubuntu 7 자체 검증 정의 |

첫 구현에서 README, AGENT, `.gitignore`, commands, intake template, 사용법, 기능 목록, 현재 상태, 개선 진행표도 갱신했습니다. 이후 문서 인계 단계에서는 문서만 변경했고, 두 번째 구현 변경은 맨 위에 별도로 기록했습니다.

## 다음 세션에서 실행할 순서

1. 루트와 Git 상태를 확인하고 이 문서·진행표·검증 기록을 읽습니다. 새로 발생한 사용자 변경을 보존합니다.
2. 자체 테스트를 실행해 다음 구현 전 기준 상태를 확인합니다. 기존 `.test-output/`이 없더라도 [검증 기록](verification_2026-10-14.md)에 이전 결과가 남습니다.
3. 최우선 후속 구현은 **전체 작업 schema/의존성 DAG와 프로젝트별 검증 어댑터(13·16)**입니다. 최신 shell 회귀와 기존 증거·provider·복구 계약을 유지합니다.
4. 추가 Linux 환경·원격 CI, 금액 예산·실행 중 timeout은 환경·정책을 확인합니다. 이미 검증한 WSL2 Ubuntu 범위는 최신 기록을 따르며 불확실한 worker/예약은 계속 fail-closed로 유지합니다.
5. 필요한 코드 검증과 함께 진행표·현재 상태·이 문서의 상태를 갱신합니다. 사용자 지시가 바뀌면 새 지시를 우선합니다.

다음 순서는 기술적 권고이며 18개 과제 전체의 완료를 뜻하지 않습니다. 각 과제의 상세 완료 기준은 [개선 진행표](improvement_backlog.md)가 기준입니다.

## 다음 세션에도 유지할 사용자 작업 규칙

- 한국어 최종 답변의 마지막 줄에 `최종 답변 시각: YYYY-MM-DD HH:mm (KST)`를 적고 가능하면 직전에 시스템 시간을 확인합니다.
- Windows shell은 명시적인 PowerShell 경로, profile 비의존 실행, UTF-8 출력과 `Get-Content -Encoding UTF8 -LiteralPath`를 사용합니다. 수동 수정은 `apply_patch`를 우선합니다.
- Orca CLI·스킬·computer-use 경로를 사용하거나 제안하지 않습니다.
- Git/GCM, gh keyring, GitHub connector, 브라우저 쿠키는 독립된 인증입니다. sandbox의 오류만으로 재로그인을 요구하지 않습니다. 필요한 경우 네트워크 권한으로 `gh auth status -h github.com`, `gh api user --jq .login`을 확인합니다. 토큰/credential/쿠키 값은 읽거나 출력하지 않습니다.
- Harness 개선 요청을 유료 AI 작업, 외부 알림 발송 또는 제품 배포 완료로 확대 해석하지 않습니다. 현재 기록에는 그러한 실행 결과가 없습니다.
