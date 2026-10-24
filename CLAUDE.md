# CLAUDE.md — Harness_ 개발 규칙

재사용 가능한 Harness 엔진(AI 코딩 worker 배정·실행 증거 기반 검증·재시도·Git 승격 통제)을 개발하는 저장소입니다.
이 파일은 잘 바뀌지 않는 규칙만 담습니다. **진행 상황과 다음 작업은 `local_notes/current_state.md`에만** 기록합니다. `local_notes/`는 Git에서 제외된 로컬 전용 폴더(인계 문서, 과거 기록, 실사용 발견 목록, 수정 기록)이며 원격에 올라가지 않습니다.

## 세션 시작

1. `local_notes/current_state.md`를 읽습니다. 다른 문서는 작업 영역에 해당할 때만 읽습니다 (문서 지도는 그 파일 7절).
2. `git status`, `git branch --show-current`로 상태를 확인합니다. 사용자가 만든 미커밋 변경은 보존합니다.
3. 사용자 요청이 `current_state.md`의 "다음 작업"과 다르면 사용자 요청을 우선합니다.

## 명령 (Windows, 저장소 루트)

```powershell
pwsh -NoProfile -File scripts/test_harness.ps1                  # 전체 자체 회귀 (PowerShell 7)
pwsh -NoProfile -File scripts/test_harness.ps1 -SyntaxOnly      # 구문·JSON만
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test_harness.ps1   # Windows PowerShell 5.1
pwsh -NoProfile -File scripts/harness.ps1 help                  # 단일 CLI
python -B scripts/test_harness_dashboard_server.py              # 현황판 HTTP 회귀
pwsh -NoProfile -File scripts/install_git_hooks.ps1             # hook 설치 (core.hooksPath 설정)
```

- 테스트 결과는 `.test-output/<run-id>/results.json`에 남습니다 (Git 제외).
- 개별 테스트 파일은 `scripts/test_*.ps1`입니다. 변경 영역의 테스트를 먼저 돌리고, 커밋 전에는 전체 회귀를 PS7과 PS5.1 모두에서 돌립니다.

## 저장소 특성 (오해하기 쉬운 것)

- 활성 대상 프로필 `project/configs/project_profile.json`이 **없는 것이 정상**입니다. 만들거나 다른 프로젝트 결과를 가정하지 마세요. preflight/cycle 실패나 현황판 빈 화면은 이 때문입니다.
- `AGENT.md`, `project/prompts/`, 문서 속 `harness/...` 경로는 **대상 저장소에 이식될 엔진 산출물**입니다. 이 저장소에서는 루트 기준으로 읽습니다. `AGENT.md` 이름·위치를 바꾸면 `configs/project_profile.template.json`과 `scripts/harness_common.ps1`도 함께 바꿔야 합니다.
- `.githooks/`는 `install_git_hooks.ps1`이 쓰는 설치 위치입니다. 원본 hook 템플릿은 `githooks/`입니다.
- `-Preview`는 부작용이 없고, seed의 `-DryRun`은 hook 설치·보고서 작성 같은 부작용이 있습니다. 혼동하지 마세요.
- CLI 조회 성공은 "조회가 끝났다"는 뜻이지 프로젝트 검증 통과가 아닙니다.

## 불변 규칙 (엔진 동작)

- 성공은 `complete_assignment`의 실행 증거(코드·HEAD·로그·worker 종료) 바인딩으로만 판정합니다. pass 표시만 믿는 경로를 만들지 마세요.
- 지원하지 않는 provider로 대체 실행하지 않습니다. provider의 명시적 실패 이벤트는 exit 0이어도 실패입니다.
- 테스트를 통과시키려고 권한을 넓히지 않습니다 (무제한 Bash, bypassPermissions, 승인 우회 금지).
- 사용량을 모르면 unknown/null이지 0이 아닙니다. 미확인 worker·usage 예약을 자동 삭제·환불·재실행하지 않습니다.
- 잠금은 lease 객체로 acquire/release하며, 경과 시간만으로 활성 소유자를 무시하지 않습니다. 애매하면 실패로 닫습니다(fail closed).
- 승인은 repository root, source branch/head, target branch, stage에 묶입니다. 범위가 다른 승인을 재사용하지 않습니다.

## 코드 작성 규칙

- **PowerShell 5.1과 7 모두** 동작해야 합니다. PS7 전용 문법(`??`, `?:` 삼항, `&&`/`||` 파이프라인 체인, `-Parallel`)을 쓰지 마세요.
- 파일은 UTF-8로 쓰고 기존 헬퍼(`Write-Utf8File` 등 `harness_common.ps1`)를 사용합니다. 경로는 `-LiteralPath`를 씁니다.
- `*.sh`, hook, YAML/JS/CSS/HTML은 LF입니다 (`.gitattributes` 참고).
- 기존 압축된 한 줄 스타일 코드를 고칠 때는 해당 함수 범위만 읽기 쉽게 정리해도 됩니다. 파일 전체 리포맷은 별도 커밋으로 합니다.
- 실제 유료 AI·GitHub API 대신 기존 fake provider/fake gh fixture로 테스트를 추가합니다. 새 동작에는 회귀 테스트를 함께 추가합니다.

## 변경 시 함께 갱신할 문서

| 변경 | 갱신 |
| --- | --- |
| 사용자 동작·명령 추가/변경 | `docs/user_actions_and_commands.md`, `configs/commands.md` |
| 스크립트 추가/삭제/역할 변경 | `docs/feature_inventory.md`, 필요 시 `scripts/README.md` |
| 개선 과제 진행 | `docs/improvement_backlog.md`의 해당 행 |
| 세션 종료 | `local_notes/current_state.md`의 "최근 변경", "마지막 검증 기록", "다음 작업" |
| 실사용에서 발견한 엔진 버그·개선점, 그 수정 | `local_notes/field_findings.md`(목록·상태), `local_notes/fix_log_<YYYY-MM-DD>.md`(수정 내역) |
| 상세 검증 근거가 필요할 때만 | `local_notes/archive/verification_<영역>_<YYYY-MM-DD>.md` (새 인계 문서는 만들지 않음) |

문서 링크를 옮기거나 파일을 이동하면 저장소 전체의 상대 링크를 검사합니다.

## Git

- 기본 작업 브랜치는 `dev`입니다. 변경은 작업 단위 브랜치에서 하고 `dev`로 합칩니다.
- `main` 반영, 원격 push, PR merge, GitHub ruleset 변경은 **사용자 확인 후**에만 합니다.
- `git reset --hard`, `git clean`, force push, 기록 재작성은 사용자 요청 없이 하지 않습니다.
- 커밋 메시지는 한국어 또는 영어 한 줄 요약 + 필요 시 본문(무엇을, 왜, 어떤 테스트를 돌렸는지).

## 사용자 승인이 필요한 일

- 실제 유료 AI(Codex/Claude) 호출, 외부 알림 발송, 원격 push/merge
- 보류된 개선 과제 13~16(작업 schema/DAG, 문맥 최소화, 형식 통일, 검증 어댑터) 착수
- 대상 프로필 생성이나 제품 코드 추가

그 외 구현·격리 테스트·문서 갱신은 승인 없이 진행하고 결과를 보고합니다.

## 보안·환경

- 토큰, credential, 쿠키 값을 읽거나 출력하지 않습니다. GitHub 인증 확인이 필요하면 `gh auth status -h github.com`만 사용합니다.
- sandbox 오류만으로 재로그인을 요구하지 않습니다.
- Orca CLI·스킬은 사용하거나 제안하지 않습니다.

## 완료 보고 형식

1. 변경 파일과 요지
2. 실행한 테스트와 결과 (런타임별 `n/n`, 일부만 실행했다면 범위 명시)
3. 실행하지 않은 검증과 남은 위험
4. `current_state.md` 갱신 여부

한국어로 답하고, 최종 답변의 마지막 줄에 `최종 답변 시각: YYYY-MM-DD HH:mm (KST)`를 적습니다.
