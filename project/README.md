# Project Adapter

이 디렉터리는 Harness를 대상 프로젝트에 적용할 때 사용할 설정 및 관리자 프롬프트를 다룹니다.

현재는 Harness 개선 전용 저장소이므로 활성 대상 프로젝트 프로필이 없습니다.
`configs/project_profile.json`을 임의로 가정하거나 다른 프로젝트의 검증 결과를 사용하지 마세요.

- 공통 프로필 템플릿: `../configs/project_profile.template.json`
- 총괄 관리자 프롬프트: `prompts/manager_main.md`
- Harness 관리자 프롬프트: `prompts/manager_harness.md`
- Seed 계획 형식: `prompts/manager_main_seed.md`

대상 저장소에 이식할 때는 엔진을 `<target-repo>/harness/`에 복사하고
`harness/scripts/init_project_adapter.ps1`로 프로필과 프로젝트 문서를 생성합니다.
Harness 자체를 이 도구로 개발하려면 먼저 Harness 전용 프로필과 검증 명령을 정의해야 합니다.

프롬프트 안의 `harness/...` 경로는 이식된 대상 저장소를 기준으로 합니다.
