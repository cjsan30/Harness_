import { expect, test } from "@playwright/test";

test.describe("AI troubleshooting board user flow", () => {
  test("creates, analyzes, comments on, and solves a troubleshooting post", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "문제를 구조화하고 근거 기반으로 해결합니다" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Spring Security 로그인 후 403 Forbidden 발생/ })).toBeVisible();

    await page.locator("#search-input").fill("Docker");
    await expect(page.getByRole("button", { name: /Docker 컨테이너 간 통신이 안 됨/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Spring Security 로그인 후 403 Forbidden 발생/ })).toHaveCount(0);

    await page.locator("#search-input").fill("");
    await expect(page.getByRole("button", { name: /Spring Security 로그인 후 403 Forbidden 발생/ })).toBeVisible();
    await page.getByRole("button", { name: "새 글 작성" }).click();
    await page.getByRole("button", { name: "게시글 등록" }).click();
    await expect(page.getByText("제목을 입력해주세요.")).toBeVisible();
    await expect(page.getByText("기술 태그를 하나 이상 선택해주세요.")).toBeVisible();

    const uniqueTitle = `E2E JWT 인증 컨텍스트 누락 ${Date.now()}`;
    await page.locator('input[name="title"]').fill(uniqueTitle);
    await page.locator('input[name="tags"][value="Spring"]').check();
    await page.locator('input[name="tags"][value="JWT"]').check();
    await page.locator('textarea[name="environment"]').fill("Backend: Spring Boot 3.3\nAuth: JWT\nDatabase: PostgreSQL 16");
    await page.locator('textarea[name="problemDescription"]').fill("로그인은 성공하지만 보호 API에서 인증 컨텍스트가 비어 있습니다.");
    await page.locator('textarea[name="errorLog"]').fill("HTTP 403 Forbidden\nSecurityContextHolder authentication is null");
    await page.locator('textarea[name="reproductionSteps"]').fill("1. 로그인\n2. 토큰 저장\n3. 보호 API 호출");
    await page.locator('textarea[name="triedMethods"]').fill("- Authorization 헤더 확인\n- CORS 확인");
    await page.locator('textarea[name="blockedPoint"]').fill("JWT 필터 이후 인증 객체 저장 여부가 불명확합니다.");
    await page.getByRole("button", { name: "게시글 등록" }).click();

    await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();
    await expect(page.getByText("입력된 환경, 로그, 재현 절차를 기준으로 원인 후보와 다음 검증 순서를 생성했습니다.")).toBeVisible();

    await page.locator('textarea[name="comment"]').fill("E2E 댓글: 필터 로그와 SecurityContext 저장 여부를 확인했습니다.");
    await page.getByRole("button", { name: "댓글 등록" }).click();
    await expect(page.getByText("E2E 댓글: 필터 로그와 SecurityContext 저장 여부를 확인했습니다.")).toBeVisible();

    await page.getByRole("button", { name: "해결 등록" }).first().click();
    await page.locator('textarea[name="rootCause"]').fill("JWT 필터에서 Authentication 객체를 SecurityContext에 저장하지 않았습니다.");
    await page.locator('textarea[name="detail"]').fill("토큰 검증 후 UsernamePasswordAuthenticationToken을 생성해 SecurityContextHolder에 저장했습니다.");
    await page.locator('textarea[name="verification"]').fill("보호 API가 200을 반환하고 사용자 정보가 내려오는 것을 확인했습니다.");
    await page.locator('textarea[name="references"]').fill("https://docs.spring.io/spring-security/reference/");
    await page.locator('textarea[name="lessonLearned"]').fill("인증 성공과 SecurityContext 저장은 별도 단계입니다.");
    await page.getByRole("button", { name: "해결 완료 저장" }).click();

    await expect(page.getByText("RAG 검색 대상 포함: 예")).toBeVisible();
    await expect(page.locator(".detail-kicker").getByText("해결됨")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("keeps the mobile layout usable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "문제를 구조화하고 근거 기반으로 해결합니다" })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("grid-template-columns", /.+/);
    await page.getByRole("button", { name: /Spring Security 로그인 후 403 Forbidden 발생/ }).click();
    await expect(page.getByRole("heading", { name: "Spring Security 로그인 후 403 Forbidden 발생" })).toBeVisible();
    await expect(page.getByText("AI Analysis")).toBeVisible();
  });
});
