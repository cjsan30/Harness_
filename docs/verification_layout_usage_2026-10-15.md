# 경로·사용량 개선 검증 — 2026-10-15

대상: `C:\Users\mnshell\Desktop\Jungle\Harness_Improvement`. Windows PowerShell 5.1.26100.9444와 PowerShell 7.6.5에서 검사했습니다. 이 기록은 전체 진입점 실행과 후속 수정에 필요한 suite/경계 사례 재검증 결과를 취합한 것입니다.

## 결과

| 검사 | PowerShell 5.1 | PowerShell 7 |
| --- | --- | --- |
| PowerShell 69개 구문 + 설정 JSON | 통과 | 통과 |
| 기존 안전성 | 23/23 | 23/23 |
| 중단·복구 + UTF-8 claim/완료 | 16/16 | 16/16 |
| 사용량·예약·실행 제한 | 18/18 | 18/18 |
| 독립/이식 경로 | 15/15 | 15/15 |
| 마지막 변경 보충: 두 배치의 UTF-8 packet + 한도 거부 후 assignment 보존 | 2/2 | 2/2 |

회귀 suite는 총 72개 항목입니다. 마지막 UTF-8 packet 읽기와 정책 거부 후 보존 변경은 기존 성공 fixture에서 현재 소스의 실제 invoke 진입점을 다시 실행해 추가로 확인했습니다. 해당 assertion은 이후 자체 테스트에도 포함했습니다. 마지막 변경 후 두 런타임의 구문/JSON 검사도 재실행했습니다.

## 로컬 증거

아래 경로는 개발 checkout의 `.test-output/` 기준이며 진단용으로 보존하고 Git에는 포함하지 않습니다.

| 검사 | PowerShell 5.1 results.json | PowerShell 7 results.json |
| --- | --- | --- |
| 안전성 | `40d48b6b9400497ead500fba81cda9d4/results.json` | `5719033ecb244f4da16ee5bce625eb90/results.json` |
| 복구 | `54abdf8b078b424494ce1b85101ae339/results.json` | `6d65a4178f874d939c0fb09762a63fcb/results.json` |
| 사용량 | `7c25ae68d0414273b1aca1fda6b8f3bd/results.json` | `42a5bb94743e475db06069d9b12916a0/results.json` |
| 경로 | `6732be12e0f34fe2aed4f02235494435/results.json` | `218093da25ba491987797e145fd2695c/results.json` |
| 보충 경계 검사 | `budget-retention-5.json` | `budget-retention-7.json` |

스크립트 88개(PS 69 + sh 19)가 기능 목록에 모두 기재돼 있고, 네 `.githooks` 복사본은 `githooks` 템플릿과 일치합니다. 현재 개발 checkout에는 활성 프로젝트 프로필, 첫 커밋, 활성 core.hooksPath를 만들지 않았습니다.

## 실제 확인한 동작

- Git 초기화 전 root 탐색 및 init의 프로필/명령 생성. 일반 요구사항의 `harness/scripts/custom` 문자열은 보존.
- 한글·공백·대괄호 경로의 독립/이식 배치에서 preflight, PowerShell cycle 및 Git 번들 sh를 통한 cycle wrapper 실행.
- 실제 로컬 Git의 main 및 isolated worktree 커밋이 공유 hook의 보호 정책에서 거부됨. 다른 실행 오류를 거부 성공으로 세지 않음.
- fake Codex로 실제 invoke→claim→별도 worker host→완료→settled 경로와 JSONL 사용량 저장. dry-run은 예약하지 않음.
- 생성 CI·dev environment·release provenance의 엔진 경로와 로컬 감사. 이 검사에서 제품 단계 명령은 `git --version`.
- 올바른 usage 합산, 캐시 입력 중복 합산 방지, 실패/누락/음수/문자열 수치/잘못된 캐시/깨진 JSON의 unknown 처리.
- 0 한도, 잘못된 정책, 총 실행·assignment 시도·동시 실행·누적 토큰/시간 기준, 최신 정책 재읽기, 손상 ledger 거부.
- 마지막 실행 한도에 두 독립 프로세스가 경쟁해도 한 예약만 성공.
- 한도 거부는 worker를 시작하지 않고 claim된 assignment를 보존. UTF-8 packet, claim 및 완료 내용 보존.

## 검사 중 발견·수정한 문제

- 중첩 `harness/` 경로 가정과 대괄호 경로의 `Push-Location` 오류를 공통 경로 함수와 `-LiteralPath`로 수정.
- shell cycle이 고정 make 명령과 별도 성공 판정을 사용하던 문제를 canonical PowerShell cycle 위임으로 수정.
- 설치된 CLI 도움말과 [공식 비대화형 문서](https://learn.chatgpt.com/docs/non-interactive-mode)에서 제거된 `--full-auto`를 확인해 `--sandbox workspace-write --json` 사용으로 수정. 실제 추론은 실행하지 않음.
- 초반 Git sh 검사는 sandbox의 MSYS object 생성 제한으로 실패하여 해당 격리 테스트만 승인된 권한으로 재실행.
- shell을 직접 실행하는 추가 테스트에서는 Windows PATH에 `sh`가 없어 실패. Git 설치의 `bin/sh.exe`를 찾도록 테스트를 수정한 뒤 두 런타임에서 통과.
- Windows PowerShell 5.1의 기본 인코딩에 의존하던 assignment/packet/최종 메시지 읽기를 UTF-8로 명시.

## 미검증 및 제한

실제 유료 Codex/Claude, 구독 한도, 청구 금액, GitHub API/merge, 원격 CI, Docker 실행, WSL/Linux, 네트워크 파일시스템은 이번 결과에 포함하지 않습니다. 실행 중 강제 timeout이나 process-tree 종료도 구현하지 않았습니다. 기존 ledger 이전 실행은 소급 집계하지 않습니다. 상세 운영 경계는 [사용량 정책](execution_usage.md), [배치 지원](layout_support.md), [복구 설계](recovery_design.md)에 있습니다.
