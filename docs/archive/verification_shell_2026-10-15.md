# Shell 명령 통일 검증

이 기록 이후의 WSL/Linux·PowerShell·CMD·Bash 추가 실행은 [플랫폼별 검증](verification_platforms_2026-10-15.md)을 참고하세요. 아래는 여덟 번째 구현 당시의 결과입니다.

2026-10-15 KST. 사용자의 요구는 명령 통일 자체보다 다른 프로젝트에서 CLI 오류가 실제로 줄어드는지 확인하는 것입니다. 실제 유료 AI 호출·외부 서비스·원본 프로젝트 변경 없이 격리 프로젝트에 숫자 합계 Node CLI를 만들었습니다.

## 변경 전후

수정 전 `test_harness_shell.ps1 -BaselineOnly`로 12개 사례를 실행해 **0/12 통과**를 확인했습니다. `.test-output/e537639481d543d6a6b682532dae8f12/results.json`과 당시 스크립트 복사본이 남아 있습니다.

| 재현 조건 | 수정 전 | 수정 후 |
| --- | --- | --- |
| 독립 배치의 개별 4단계 | 존재하지 않는 harness/scripts/resolve_make.sh를 찾아 exit 127 | profile의 실제 Node CLI 검증 실행 |
| 중첩 배치에 Node 명령 설정 | PATH의 테스트용 make가 exit 0, 정작 Node CLI는 미실행 | 설정된 Node 명령 실행, fake make 미호출 확인 |
| 알 수 없는 추가 옵션 | 무시하고 실행 | 도구 실행 전에 exit 2 |
| profile 도구가 exit 37 | Node가 실행되지 않아 37도 전달되지 않음 | shell 호출자까지 37 전달 |

이 12개는 재현을 위해 선정한 사례이며 전체 CLI 오류율이 100% 감소했다는 통계가 아닙니다. 수정 후 동일한 12개를 포함해 36개 회귀를 실행했습니다.

## 신규 회귀 36개

| 범주 | 개수 | 검사 내용 |
| --- | --- | --- |
| 유닛 | 4 | 단계 registry, 빈/객체/템플릿 명령, no-op/실패 은폐, 따옴표·환경 보존 |
| 통합 | 20 | 두 배치의 실제 build/unit/integration/benchmark, 원래 종료 코드, preview, cycle 실패 중단, retry, 복사 후 실행, 절대 실행 파일·native 런타임 경로 |
| 보안 회귀 | 12 | 알 수 없는 옵션·action, 다른 프로젝트 환경, 빈/누락 프로필, wrapper/cycle 재귀, 명시적 런타임 누락 거부 |

실제 도구는 `small tool/sum.cjs`입니다. build는 실행 파일을 복사하고, unit은 2+3=5, integration은 빌드된 도구의 -2+8=6과 잘못된 입력의 exit 17, benchmark smoke는 세 번의 실제 프로세스 실행을 검사합니다. benchmark는 성능 보증이 아닌 실행 smoke입니다.

두 배치 경로에 한글·공백·대괄호·&를 넣고 호출 cwd는 별도 테스트 루트로 고정합니다. 도구 로그의 cwd·단계·공백/&/|/한글 인자를 원문과 비교하며 잘못된 옵션의 무실행도 확인합니다. 복사한 프로젝트의 로그에 새 cwd가 찍히는지 검사합니다. 테스트용 fake make는 잘못된 도구를 호출해도 성공으로 보이는 이전 결함을 재현하는 함정입니다.

전체 cycle fixture는 기존 layout suite와 동일한 HARNESS_CI_MODE=true를 사용해 현재 브랜치 승인 감사만 생략합니다. 실제 hook 설치·preflight·4단계 실행과 unit 실패 뒤 중단은 검사합니다. 사용자 저장소의 정책을 끄거나 production gate를 느슨하게 바꾸지 않았습니다.

| 단독 실행 | 결과 | results.json 디렉터리 |
| --- | --- | --- |
| Windows PowerShell 5.1 | 36/36 | `.test-output/563b525f137946238c8a6e7188743c99/` |
| PowerShell 7 | 36/36 | `.test-output/5607695b376d4fb49c11bf5509e1026a/` |

## 전체 회귀

공통 cycle 실행부 변경으로 기존 기능도 두 런타임에서 실제 재실행했습니다. `test_harness.ps1` 두 프로세스가 모두 exit 0으로 종료됐고, 18개 results.json의 각 passed 값과 suite 개수를 다시 대조했습니다.

| Suite | Windows PowerShell 5.1 | PowerShell 7 |
| --- | --- | --- |
| 안전성 | 23/23 | 23/23 |
| worker·큐 복구 | 16/16 | 16/16 |
| 사용량·예산 | 18/18 | 18/18 |
| 실행 증거 | 28/28 | 28/28 |
| 독립·이식 경로 | 15/15 | 15/15 |
| 단일 CLI | 25/25 | 25/25 |
| Provider 계약 | 22/22 | 22/22 |
| Claude adapter | 38/38 | 38/38 |
| Shell 명령 | 36/36 | 36/36 |
| **합계** | **221/221** | **221/221** |

로그는 `.test-output/full-shell-ps5.log`, `.test-output/full-shell-ps7.log`, 재집계 결과는 `.test-output/full-shell-summary.json`입니다. 각 suite의 results.json은 아래 run 디렉터리에 있습니다. 이전 실행 결과를 합산한 수치가 아니라 이번 최종 코드 전체 실행 결과입니다.

| Suite | PS5 run ID | PS7 run ID |
| --- | --- | --- |
| 안전성 | `caa3a2819a75457a82216d203e10ea26` | `cc64f05c5e78402e9dd8352e2cedaaef` |
| 복구 | `41b222fbb371466eb81d3110faaec319` | `defb7eb17441404d9191babf7ddafcda` |
| 사용량 | `9820bc8410a446e495645633c5ff8985` | `4c59f08f7ad442db89797cf3347a26e9` |
| 증거 | `c7d208a8c2834c1cb08153b1cc41d1aa` | `adf0c38dacb3481abf9b943019de9400` |
| 경로 | `e7e496801efe4de4a32d1a6dd40451d3` | `8201dba799394edf99eaece30a9aca4a` |
| CLI | `d9261ef78f154d1488ddfc3690724bf4` | `117f7c0fff7c456bb2aad265966c7430` |
| Provider | `34ca647b82164e3aac95922d417ffdd6` | `2b81cc35ee574baa95b45644cd78dcc0` |
| Claude | `bbc89773223b4bee91efc21b13cf7eb1` | `53ff716ff47640cb8fabf52a5777bd1d` |
| Shell | `2297607ace3b4a96ac4c318808913815` | `5558d565182e41e4bda474b763947413` |

## 별도 확인과 중간 실패

- `sh -n`으로 shell 20개 구문 통과. 자체 테스트에서 PowerShell 82개 구문과 설정 JSON 통과.
- 문서 로컬 링크 오류·기능 목록의 스크립트 누락 0건. 활성 대상 프로필·remote·core.hooksPath를 만들지 않았으며 개발 저장소는 첫 커밋 없는 상태를 유지했습니다.
- 실제 설치된 make 계열 실행기로 프로필의 `make -f "small tool/Makefile" check`를 실행했습니다. 두 Windows 런타임에서 실제 Node unit 실행 **2/2 통과**, `.test-output/real-make-results.json`에 기록했습니다. 이 별도 호환 smoke는 36개 회귀 수에 합산하지 않습니다.
- 첫 수정 후 26/28: cycle fixture에 Git 저장소/hook 준비가 없어 실패했습니다. 이후 31/33: 초기 main 브랜치의 bootstrap gate/승인 요구로 cycle이 막혔습니다. 기존 layout 테스트와 같은 CI fixture 조건으로 수정했고 production preflight는 그대로 유지했습니다. 중간 run은 각각 `be02c827877a444c8103fddd0997993b`, `c4afb6d345da4bcf868636cb2e63af53`(PS5), `db1582489c6d416ca3641d368a823ed9`(PS7)입니다.
- 별도 make 검사 드라이버의 첫 실행은 PS5의 BOM 없는 한글 소스 리터럴 해석 때문에 fixture 경로를 열지 못했습니다. ASCII 문자 코드로 경로를 만들도록 고친 후 두 런타임에서 통과했습니다. 제품 코드 실패와 구분합니다.

## 검증 한계

Windows Git POSIX shell + PowerShell 5.1/7에서 검증했습니다. WSL/Linux·원격 CI·유료 provider는 실행하지 않았습니다. 임의의 사용자 명령 전체, 모든 shell quoting 문법, 실제 대규모 제품을 검증한 결과는 아닙니다. 보안 범주는 입력/경로/재귀/실패 오인 회귀이며 외부 침투 테스트나 OS sandbox 검증을 뜻하지 않습니다.

실행 명령은 여전히 OS shell 문자열이므로 운영체제별 인용 규칙과 신뢰할 수 있는 프로필이 필요합니다. 정확한 옵션·종료 코드·설치 경계와 전환 방법은 [Shell 계약](../shell_commands.md)을 따릅니다.
