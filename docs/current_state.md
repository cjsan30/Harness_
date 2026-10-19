# Harness 개발 상태

## 최신 구현: 로컬 조회 현황판

사용자가 현황판 구현을 승인하여 `harness.ps1 dashboard`와 읽기 전용 snapshot을 추가했습니다.
작업·현재 증거 확인·worker 프로세스 관측·누적 사용량·승인 요청·최근 완료 사이클을 표시합니다.
활성 대상 프로필은 계속 없으며 실제 화면에는 미설정/빈 상태가 표시됩니다.
[사용법과 지원 범위](dashboard.md), [검증 기록](verification_dashboard_2026-10-15.md)을 확인하세요.
[후속 대화·수정 기록](conversation_history_2026-10-15.md)에 이번 범위의 결정과 다음 세션 주의사항을 정리했습니다.
작업 schema/DAG 및 프로젝트 검증 어댑터의 추가 구현은 이번 범위가 아닙니다.

세션을 이어갈 때는 [인계 문서](SESSION_HANDOFF.md)를 먼저 읽으세요. 대화의 결정 사항과 검증 근거, 다음 작업 프롬프트를 연결합니다.

## 저장소 범위

이 저장소는 재사용 가능한 Harness 엔진과 개발 문서만 유지합니다.
활성 대상 프로젝트 프로필과 대상 제품의 검증 결과는 제거했습니다.
공통 프로필 템플릿과 이식용 smoke 테스트는 유지합니다.

## 설정 상태

- 활성 `project/configs/project_profile.json`: 없음
- Harness 자체 검증: `pwsh -NoProfile -File scripts/test_harness.ps1` (대상 profile의 build/unit/integration/benchmark와 별도)
- live worker 실행: 유효한 프로필과 커밋된 baseline이 필요
- 기존 코드의 기능 목록은 구현 존재를 뜻하며, 전체 환경에서 정상 동작을 보증하지 않음
- Git hook 파일 존재와 core.hooksPath 설정은 별개
- 핵심 실행 구조: 독립 루트 및 `<target-repo>/harness/`; [배치 지원 범위](layout_support.md) 참고
- smoke 테스트는 임시 대상 저장소를 만들고 자체 프로필을 초기화

## 확인된 개선 과제

1. **독립 저장소 경로 처리:** 핵심 PowerShell과 개별 검증·cycle·retry shell을 공통화했습니다. 프로필 명령·설치 프로젝트를 사용하며 잘못된 인자와 충돌하는 상속 환경을 거부합니다. 기타 설치/smoke 유틸리티와 플랫폼 범위는 [Shell 계약](shell_commands.md)을 확인하세요.
2. **승인 범위 검사 — 수정:** 명시한 ID도 repository root/source branch/source head/target branch/stage를 함께 검사합니다. 구형 승인은 새로 요청해야 합니다.
3. **민감정보 처리 — intake 경로 수정:** Secrets And Access는 변수 이름만 생성 문서로 전달합니다. 다른 구역의 흔한 credential 패턴을 차단하며 임의의 비밀 문자열이나 모든 런타임 로그를 탐지한다고 보장하지 않습니다.
4. **운영체제 전환:** hook 설치가 절대 경로를 저장하므로 Windows와 WSL 사이에서 환경을 바꿀 때 설정을 다시 맞춰야 합니다.
5. **검증 구성 — 일부 구현:** 자체 검증과 Windows/Ubuntu CI 정의를 추가했습니다. Windows PS5/7·CMD·Git Bash 및 WSL2 Ubuntu native Linux를 실제 검사했습니다. [플랫폼별 근거](verification_platforms_2026-10-15.md)를 확인하세요. 원격 CI와 다른 Linux 환경은 남아 있습니다.
6. **프로필과 문서 정합성:** 일부 템플릿의 기본 담당자 명칭과 예시가 서로 다릅니다.
7. **감사 범위:** CI/보안/릴리스 감사 중 일부는 생성 파일의 필수 문자열을 검사합니다. 실제 원격 실행 성공과 구분해야 합니다.
8. **잠금 — 핵심 수정:** OS 파일 핸들·실행별 lease 및 별도 worker host와 durable intent로 부모 종료 후 중복 실행을 차단합니다. 종료 불명확 상태의 강제 정리와 네트워크 파일시스템 검증은 후속 과제입니다.
9. **상태 저장 — 일부 수정:** 원자적 파일 교체·workflow 충돌 거부 및 큐 전환 journal/복구를 구현했습니다. 최초 assignment/packet 생성과 외부 side effect 전체의 복구는 남았습니다.

전체 18개 개선 항목의 진행 상태와 전환 절차는 [개선 진행표](improvement_backlog.md)에 있습니다.

## 최신 추가 검증: WSL·Linux·PowerShell·CMD·Bash

현재 PowerShell 83개 + shell 20개 = 103개입니다. 엔진 실행 코드 변경 없이 진입점 비교 테스트를 추가했습니다. Windows PS5/7 각각 PowerShell/CMD/Git Bash 30/30, Linux `/tmp` 기존 회귀 185/185·보강 shell 36/36·PowerShell/Bash 20/20이 통과했습니다. 실행을 나눠 검증한 결과이며 Windows 251개·Linux 241개를 새 runner로 한 번에 실행했다는 뜻은 아닙니다.

같은 격리 프로젝트의 Windows→WSL→Windows 전환은 hook 재설치·main commit 차단·실제 도구 cwd를 확인해 3단계 모두 통과했습니다. WSL의 오류 문구 기대값과 DrvFS의 Git 읽기 전용 객체 복사라는 테스트 이식 문제를 보완했습니다. `/mnt/c`의 초기 실패·재실행과 세부 결과는 [최신 검증](verification_platforms_2026-10-15.md)을 따릅니다. 테스트용 local clone만 사용했고 실제 제품·원격 Git·유료 AI는 실행하지 않았습니다.

공유경로 `/mnt/c` 최종 실행도 shell 36/36·진입점 20/20과 exit 0을 확인했습니다. 원래 Linux `/tmp` 결과 일부는 사라졌으므로 작업 중 복사한 `.test-output/platform-evidence/`를 검증 근거로 사용하세요. 문서 링크·기능 목록 정합성도 확인했습니다.

## 여덟 번째 구현 이력: Shell 명령 통일

당시 PowerShell 82개 + shell 20개 = 102개였습니다. 개별 검증·cycle이 같은 명령 해석/실행 함수를 사용하고 retry도 PowerShell에 위임합니다. 기본 make fallback, 인자 무시, 다른 프로젝트 환경 상속과 재귀 실행을 차단했습니다. 단일 단계 preview와 원래 도구의 종료 코드 전달을 제공합니다.

실제 Node CLI를 두 배치의 격리 프로젝트에 만들어 변경 전 0/12였던 명령 회귀를 재현했습니다. 변경 후 두 Windows 런타임에서 신규 36/36을 통과했습니다. 전체 회귀 결과와 중간 fixture 실패는 [최신 검증](verification_shell_2026-10-15.md)을 기준으로 읽으세요. 다음은 전체 작업 schema/DAG·프로젝트별 검증 어댑터이며 유료 호출·WSL/Linux·원격 CI는 미검증입니다.

최종 전체 실행은 Windows PowerShell 5.1/7 각각 **221/221**, 구문 PS82·shell20·설정 JSON을 통과했습니다. 별도 실제 make 호환 2/2, 문서 링크 오류·기능 목록 누락 0건도 확인했습니다.

아래 항목은 각 구현 시점의 이력입니다. 현재 상태는 위 최신 항목과 진행표를 우선합니다.

## 일곱 번째 구현: Claude adapter

현재 PowerShell 79개 + shell 19개입니다. Claude print-mode 실행·결과·캐시 usage를 공통 v1 계약에 연결했습니다. 기존 CLI/seed/invoke는 대상 worker_provider로 선택하며 기본 Codex 호환을 유지합니다. incomplete Claude 결과·권한 거부·실패 응답을 성공으로 인정하지 않고 provider 변경으로 예산을 초기화하지 않습니다.

[Claude 권한과 운영 계약](claude_adapter.md), [최신 검증 기록](verification_claude_2026-10-15.md)을 기준으로 재개하세요. 실제 유료 호출 없이 fixture로 검증합니다. 다음은 legacy make shell 정리와 WSL/Linux 실증입니다.

두 Windows 런타임 모두 기존 회귀 147/147과 최종 Claude 유닛 10/10·통합 9/9·보안 회귀 19/19를 통과했습니다. PS5는 전체 183개 통과 뒤 최종 Claude 38개 재실행, PS7은 전체 185개 통과입니다. 구문 79개·설정 JSON 및 문서 링크/기능 목록 정합성도 통과했습니다.

## 여섯 번째 구현 이력: Provider 계약

현재 PowerShell 77개 + shell 19개입니다. Codex 실행/응답/usage 해석을 adapter로 분리하고 worker/ledger에 요청·결과 v1을 연결했습니다. provider·model·invocation·종료 코드·usage 불일치를 거부하며, provider의 명시적 실패는 exit 0이라도 완료 성공으로 인정하지 않습니다. Claude는 아직 지원하지 않습니다.

[계약과 전환](provider_contract.md), [최신 검증](verification_provider_2026-10-15.md)을 기준으로 재개하세요. 기존 증거·예산·복구 정책과 unknown/null 의미를 유지합니다. 다음은 Claude adapter와 legacy make shell 정리입니다.

최신 코드로 Windows PowerShell 5.1/7 각각 전체 **147/147**을 통과했습니다. 신규 provider 테스트는 각각 유닛 6/6·통합 4/4·보안 회귀 12/12입니다. 구문 77개·설정 JSON과 문서 로컬 링크도 통과했습니다. 실제 유료 AI·원격 CI·WSL/Linux는 실행하지 않았습니다.

## 다섯 번째 구현 이력: 단일 운영 CLI

현재 PowerShell 74개 + shell 19개입니다. `scripts/harness.ps1`은 init/doctor/run/status/resume/usage/test/help, `-Preview`, `-Json`, 명시적 대상 루트를 제공합니다. 기존 스크립트의 안전성 정책을 재사용하며 provider 분리는 후속 작업입니다. [CLI](cli.md)를 참고하세요.

이전 전체 회귀의 두 런타임 각 100/100 결과를 다시 확인한 뒤 신규 CLI 테스트를 각각 유닛 12/12·통합 8/8·보안 5/5와 구문 74개·JSON 검사로 검증했습니다. 이번에 전체 125개를 다시 실행한 것은 아닙니다. [검증 기록](verification_cli_2026-10-15.md)에 범주·근거·한계를 명시했습니다.

## 네 번째 구현 이력: 실행 증거 기반 성공 판정

현재 스크립트는 PowerShell 71개 + shell 19개입니다. 완료 시 실제 validation 명령을 실행하고 코드·Git snapshot·로그·assignment·worker ID를 연결합니다. 후속 코드 변경이나 worker 비정상 종료는 성공으로 인정하지 않으며, legacy pass는 미검증으로 분류합니다. 명시적 `-Revalidate`와 feature commit 뒤 재검증을 추가했습니다.

[계약과 사용법](assignment_evidence.md), [최신 검증 기록](verification_evidence_2026-10-15.md)을 기준으로 재개하세요. 실제 제품 요구사항 충족은 설정된 assertion의 품질에 달려 있습니다. 전체 작업 정의 schema와 프로젝트별 테스트 어댑터는 후속 과제입니다.

Windows PowerShell 5.1/7 각각 전체 회귀 100/100(신규 증거 28개 포함), 구문 71개·JSON 검사를 통과했습니다. 실제 feature commit 뒤의 증거 갱신도 두 런타임에서 보충 검증했습니다. 실제 AI나 원격 merge의 결과는 아닙니다.

## 세 번째 구현 이력: 경로와 실행 기록

PowerShell 69개 + shell 19개입니다. 실행별 durable reservation, JSONL 토큰·실행 시간·시도 번호와 선언된 과금 모드를 기록합니다. 실행 횟수·동시 실행·assignment 시도 상한 및 누적 토큰/시간에 따른 다음 실행 제한을 추가했습니다. 제거된 Codex `--full-auto`는 `--sandbox workspace-write --json`으로 교체했습니다.

[사용량 정책](execution_usage.md), [배치 지원](layout_support.md), [세 번째 검증](verification_layout_usage_2026-10-15.md)을 기준으로 재개하세요. 미확인 사용량은 0이 아니며 실제 청구액·구독 잔여량·실행 중 강제 timeout은 제공하지 않습니다.

Windows PowerShell 5.1/7 각각 안전성 23/23, 복구 16/16, 사용량 18/18, 경로 15/15를 확인했습니다. 마지막 UTF-8 packet/한도 거부 보존 변경은 두 배치에서 별도 재검증했습니다.

## 첫 안전성 개선 후 검증

두 번째 묶음 결과(2026-10-15)는 두 런타임 각각 기존 23/23 + 복구 15/15입니다. 64개 PowerShell 구문 및 설정 JSON도 통과했습니다. [새 검증 기록](verification_2026-10-15.md)과 [복구 명령·제한](recovery_design.md)을 참고하세요. 아래는 첫 개선 당시의 이력입니다.

2026-10-14, Windows PowerShell 5.1 및 PowerShell 7에서 각각 23/23 안전성 회귀 테스트를 통과했습니다.
두 런타임에서 PowerShell 59개 파일 구문 검사와 설정 JSON 파싱도 통과했습니다.
테스트에는 실제 로컬 Git 상태, fake GitHub CLI, 서로 다른 잠금 소유 프로세스와 강제 종료가 포함됩니다.
원격 CI는 정의만 추가했으며 아직 실행 결과가 없습니다.

- PowerShell 5.1 결과: `.test-output/f92f6bde078a49c3b6d6529283f082b4/results.json`
- PowerShell 7 결과: `.test-output/0a10351680c644a98bc20b7b1d5eeac5/results.json`

위 경로는 이 개발 checkout의 로컬 진단 산출물이며 Git에 포함되지 않습니다.

## 초기 분리·정리 당시의 검증 기록 (엔진 수정 전)

2026-10-14 정리 후 다음을 확인했습니다.

- PowerShell 55개 파일의 구문 오류 0건, 남은 JSON 파싱 성공
- 제거 대상 관련 참조 검색 결과 0건
- 스크립트 73개 및 hook 파일 8개의 원본 대비 SHA-256 일치
- 기능 목록의 스크립트 누락 0건, 문서 내부 로컬 링크 오류 0건
- 별도 임시 대상 저장소에서 어댑터 초기화와 preflight 통과

임시 대상은 제품 소스를 생성하지 않으므로 작업 영역 미존재 경고가 남습니다.
preflight 통과는 실제 build/test 및 live worker의 성공을 뜻하지 않습니다.
외부 서비스 실행, 원격 저장소 변경, 실제 Codex 작업자 실행은 이번 정리의 검증 범위에 포함하지 않습니다.
