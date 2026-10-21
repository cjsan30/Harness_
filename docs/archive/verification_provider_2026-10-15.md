# Provider 계약 분리 검증

2026-10-15 KST. 공통 실행 요청·결과·사용량 v1과 Codex adapter를 분리하고 기존 worker, ledger, 완료 증거 및 복구 경로에 연결했습니다. 실제 AI 대신 로컬 fake provider를 사용했으며, Git/worktree/worker host/완료 검증은 실제 프로세스로 실행했습니다.

## 전체 회귀

| Suite | Windows PowerShell 5.1.26100.9444 | PowerShell 7.6.5 |
| --- | --- | --- |
| 안전성 | 23/23 | 23/23 |
| worker·큐 복구 | 16/16 | 16/16 |
| 사용량·예산 | 18/18 | 18/18 |
| 실행 증거 | 28/28 | 28/28 |
| 독립·이식 경로 | 15/15 | 15/15 |
| CLI | 25/25 | 25/25 |
| Provider | 22/22 | 22/22 |
| 합계 | 147/147 | 147/147 |
| PowerShell 77개 구문·설정 JSON | 통과 | 통과 |

전체 실행 명령은 두 런타임의 절대 실행 파일 경로를 지정한 `-NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1`입니다. 마지막 모델 공백 정규화 변경 후에도 두 런타임에서 `-SyntaxOnly`를 별도로 통과했습니다. 과거 통과 건수를 합산한 것이 아니라 이번 코드의 전체 회귀를 실행한 결과입니다.

아래 run ID는 이 저장소 기준 `.test-output/<run-id>/results.json`을 가리킵니다. 로컬 진단 산출물이며 Git에는 포함하지 않습니다.

| Suite | PS5 run ID | PS7 run ID |
| --- | --- | --- |
| 안전성 | `014a72312eaf4a2cb7bd346d45cbb55e` | `8683b22f94d44669be24773894442805` |
| 복구 | `0ab59ffd3a404a42b3bfd7981c9d92a3` | `3a122e0ac8244d03865dd0283f449dd3` |
| 사용량 | `a3b04edfd32a4345bd13945a1e1fae0a` | `f33c9a6baa2342eca5a1134a2d3d9b01` |
| 증거 | `96a0bd3afad547d6a0303685d908aa22` | `cd6e56b0611447a48a6e26850e18786c` |
| 경로 | `36c631b1ba7241d689573ef82a220e3f` | `8fcf7b7a09d842a8a9d1bffa911b55fc` |
| CLI | `33899e8b0cf54d4a96570b0b27dc9f5b` | `d2a17261f97e448087728a102777be46` |
| Provider | `697b4b6c6bc846c28c7e2d80177fe8ee` | `316422bc2a554b6d85e034187990f219` |

## 신규 Provider 테스트 범주

`test_provider_contract.ps1`의 22개 case에는 `kind`를 기록합니다. 두 런타임 각각 유닛 6/6·통합 4/4·보안 회귀 12/12를 통과했습니다. 다른 기존 suite는 범주가 혼합되어 있어 전체 147개를 이 세 범주의 배타적 합계로 다시 분류하지 않았습니다.

- 유닛: legacy 설정·worker 호환, 실행 인수와 공백 모델 처리, 정상 응답·텍스트만 있는 응답·provider 오류·프로세스 실패의 정규화. 미확인 usage는 null이고 실제 모델/금액을 추정하지 않습니다.
- 통합: 예약과 provider/model 연결, 결과·unknown usage의 ledger 저장 및 다음 실행 예산 차단, 실제 worker host가 정상 종료하거나 완료 뒤 실패 이벤트를 남기는 두 시나리오.
- 보안 회귀: 미지원 provider/버전/임의 adapter 필드/명시적 null 거부, 지정 실행 파일이 없을 때 fallback 금지, 결과 version/provider/invocation/model/exit 불일치 및 ledger 사용량 불일치 거부.

실패 이벤트를 출력하는 fake provider는 실제 완료 검증을 통과한 뒤 `turn.failed`를 기록하고 exit 0으로 종료합니다. 이때 worker는 성공 settle되지 않고 invoke·완료 증거·복구 경로가 거부됩니다. 정상 시나리오는 실제 증거와 정규화된 사용량을 저장하고 settle됩니다. 결과에는 원본 오류 문자열의 가짜 비밀값을 복사하지 않는 것도 확인했습니다.

## 기존 기록 호환

PowerShell 7에서 이전 구현의 실제 fixture `.test-output/5483b11a91e046edb01acbce36d7edbe/standalone 한글 [safe]`를 새 common 함수로 읽었습니다. provider_contract 필드가 없는 기존 ledger 1건과 layout-task worker를 수정 없이 읽었으며, Codex 호환 식별 및 known usage가 유지됐습니다. 이는 명시적으로 잘못된 새 계약을 허용한다는 뜻이 아닙니다.

## 범위와 제한

이번 검증은 로컬 회귀이며 실제 유료 Codex/Claude, 원격 CI/GitHub 작업, WSL/Linux, 외부 보안 스캐너나 침투 테스트를 수행하지 않았습니다. Claude는 미지원이고 실제 provider 프로토콜 변화에 대한 live 검증은 남아 있습니다. 악의적인 로컬 파일 작성자에 대한 인증 경계나 모든 로그의 비밀값 필터링을 제공하지 않습니다.

개발 checkout에는 활성 대상 프로필, remote, core.hooksPath를 추가하지 않았으며 첫 커밋도 만들지 않았습니다. fixture 안의 저장소·hook·커밋만 테스트에 사용했습니다.

계약과 전환 방법은 [Provider 계약](../provider_contract.md), 남은 구현은 [개선 진행표](../improvement_backlog.md), 재개 순서는 [세션 인계](session_handoff_2026-10-15.md)를 참고하세요.
