import {
  aiStatusLabels,
  currentUser as fallbackCurrentUser,
  posts as fallbackPosts,
  statusLabels,
  tags as fallbackTags
} from "./data.js";

const app = document.querySelector("#app");
const apiBaseUrl = window.__API_BASE_URL__ || new URLSearchParams(window.location.search).get("api") || "http://127.0.0.1:8080/api";
let currentUser = structuredClone(fallbackCurrentUser);
let tags = structuredClone(fallbackTags);

const state = {
  posts: structuredClone(fallbackPosts),
  selectedPostId: fallbackPosts[0]?.id,
  view: "list",
  query: "",
  status: "ALL",
  tag: "ALL",
  solved: "ALL",
  sort: "latest",
  isLoading: true,
  hasListError: false,
  solutionMode: false,
  formErrors: {}
};

initialize();

function selectedPost() {
  return state.posts.find((post) => post.id === state.selectedPostId) || state.posts[0];
}

function filteredPosts() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return state.posts
    .filter((post) => {
      const queryMatch =
        !normalizedQuery ||
        [post.title, post.summary, post.problemDescription, post.errorLog, post.solution?.detail || ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const statusMatch = state.status === "ALL" || post.status === state.status;
      const tagMatch = state.tag === "ALL" || post.tags.includes(state.tag);
      const solvedMatch =
        state.solved === "ALL" ||
        (state.solved === "SOLVED" && post.status === "SOLVED") ||
        (state.solved === "UNSOLVED" && post.status !== "SOLVED");

      return queryMatch && statusMatch && tagMatch && solvedMatch && post.status !== "DELETED";
    })
    .sort((a, b) => {
      if (state.sort === "views") {
        return b.viewCount - a.viewCount;
      }

      if (state.sort === "comments") {
        return b.commentCount - a.commentCount;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
}

function statusBadge(status) {
  const meta = statusLabels[status] || { label: status, tone: "neutral" };
  return `<span class="status-badge ${meta.tone}">${meta.label}</span>`;
}

function tagChip(tag) {
  return `<button class="tag-chip" data-filter-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initialize() {
  render();

  try {
    const [user, tagList, postList] = await Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/tags"),
      apiFetch("/posts")
    ]);
    currentUser = user;
    tags = tagList;
    state.posts = postList;
    state.selectedPostId = postList[0]?.id;
  } catch (error) {
    console.warn("Backend API unavailable. Using local mock data.", error);
  } finally {
    state.isLoading = false;
    render();
  }
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function replacePost(updatedPost) {
  const index = state.posts.findIndex((post) => post.id === updatedPost.id);
  if (index >= 0) {
    state.posts.splice(index, 1, updatedPost);
  } else {
    state.posts.unshift(updatedPost);
  }
  state.selectedPostId = updatedPost.id;
}

function render() {
  const post = selectedPost();

  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main-pane">
        ${state.view === "create" ? renderCreateView() : state.view === "detail" ? renderDetailView(post) : renderListView()}
      </main>
      ${renderAiPanel(post)}
    </div>
  `;

  bindEvents();
}

function renderSidebar() {
  const solvedCount = state.posts.filter((post) => post.status === "SOLVED").length;
  const openCount = state.posts.filter((post) => post.status !== "SOLVED" && post.status !== "DELETED").length;
  const totalTokens = state.posts.reduce((sum, post) => sum + (post.aiAnalysis?.usage?.inputTokens || 0) + (post.aiAnalysis?.usage?.outputTokens || 0), 0);

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">DT</div>
        <div>
          <strong>DevTrouble AI</strong>
          <span>RAG troubleshooting board</span>
        </div>
      </div>

      <nav class="nav-stack" aria-label="주요 메뉴">
        ${navButton("list", "게시판", "BOARD")}
        ${navButton("create", "새 트러블슈팅", "CREATE")}
        <button class="nav-item" data-status-shortcut="SOLVED">해결된 문제 <span>${solvedCount}</span></button>
        <button class="nav-item" data-status-shortcut="OPEN">미해결 문제 <span>${openCount}</span></button>
        <button class="nav-item" data-view="list" data-sort-shortcut="comments">AI 분석 이력 <span>${state.posts.length}</span></button>
      </nav>

      <section class="sidebar-section">
        <h2>태그</h2>
        <div class="sidebar-tags">
          ${tags.slice(0, 9).map((tag) => `<button data-filter-tag="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</button>`).join("")}
        </div>
      </section>

      <section class="usage-summary">
        <span>AI 사용량</span>
        <strong>${totalTokens.toLocaleString("ko-KR")} tokens</strong>
        <small>샘플 분석 기준</small>
      </section>
    </aside>
  `;
}

function navButton(view, label, key) {
  const isActive = state.view === view;
  return `<button class="nav-item ${isActive ? "active" : ""}" data-view="${view}">${label}<span>${key}</span></button>`;
}

function renderListView() {
  const posts = filteredPosts();

  return `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Troubleshooting Board</p>
        <h1>문제를 구조화하고 근거 기반으로 해결합니다</h1>
      </div>
      <button class="primary-action" data-view="create">새 글 작성</button>
    </section>

    <section class="filters" aria-label="게시글 검색과 필터">
      <label>
        <span>검색</span>
        <input type="search" id="search-input" value="${escapeHtml(state.query)}" placeholder="제목, 로그, 해결 방법 검색" />
      </label>
      <label>
        <span>상태</span>
        <select id="status-filter">
          ${option("ALL", "전체", state.status)}
          ${Object.entries(statusLabels)
            .filter(([status]) => !["DELETED", "ARCHIVED"].includes(status))
            .map(([status, meta]) => option(status, meta.label, state.status))
            .join("")}
        </select>
      </label>
      <label>
        <span>태그</span>
        <select id="tag-filter">
          ${option("ALL", "전체 태그", state.tag)}
          ${tags.map((tag) => option(tag.name, tag.name, state.tag)).join("")}
        </select>
      </label>
      <label>
        <span>해결 여부</span>
        <select id="solved-filter">
          ${option("ALL", "전체", state.solved)}
          ${option("SOLVED", "해결 완료", state.solved)}
          ${option("UNSOLVED", "미해결", state.solved)}
        </select>
      </label>
      <label>
        <span>정렬</span>
        <select id="sort-filter">
          ${option("latest", "최신순", state.sort)}
          ${option("comments", "댓글 많은 순", state.sort)}
          ${option("views", "조회 많은 순", state.sort)}
        </select>
      </label>
    </section>

    ${state.hasListError ? renderErrorState() : state.isLoading ? renderSkeletons() : posts.length ? renderPostList(posts) : renderEmptyState()}
  `;
}

function option(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderSkeletons() {
  return `
    <section class="post-list" aria-label="게시글 목록 로딩">
      ${Array.from({ length: 4 })
        .map(
          () => `
            <article class="post-card skeleton">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line medium"></div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderErrorState() {
  return `
    <section class="state-box error">
      <h2>게시글 목록을 불러오지 못했습니다.</h2>
      <p>필터와 게시글 작성 기능은 유지됩니다. 잠시 후 다시 시도해주세요.</p>
      <button class="secondary-action" id="clear-list-error">재시도</button>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="state-box">
      <h2>조건에 맞는 문제가 없습니다.</h2>
      <p>검색어나 필터를 줄이면 더 많은 트러블슈팅 기록을 볼 수 있습니다.</p>
      <button class="secondary-action" id="reset-filters">필터 초기화</button>
    </section>
  `;
}

function renderPostList(posts) {
  return `
    <section class="post-list" aria-label="게시글 목록">
      ${posts
        .map(
          (post) => `
            <article class="post-card ${post.id === state.selectedPostId ? "selected" : ""}" data-post-id="${post.id}">
              <div class="post-card-header">
                ${statusBadge(post.status)}
                <button class="title-button" data-open-post="${post.id}">${escapeHtml(post.title)}</button>
              </div>
              <p>${escapeHtml(post.summary)}</p>
              <div class="chip-row">${post.tags.map(tagChip).join("")}</div>
              <div class="post-meta">
                <span>${escapeHtml(post.author)}</span>
                <span>${escapeHtml(post.createdAt)}</span>
                <span>댓글 ${post.commentCount}</span>
                <span>조회 ${post.viewCount}</span>
                <span>AI ${aiStatusLabels[post.aiAnalysis.status] || post.aiAnalysis.status}</span>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderCreateView() {
  return `
    <section class="toolbar">
      <div>
        <p class="eyebrow">New Troubleshooting</p>
        <h1>AI 분석에 필요한 맥락을 빠짐없이 입력합니다</h1>
      </div>
      <button class="secondary-action" data-view="list">목록으로</button>
    </section>

    <form class="write-layout" id="post-form" novalidate>
      <section class="write-form">
        ${inputField("title", "제목", "Spring Security 로그인 후 /api/user 요청 시 403 발생")}
        ${tagPicker()}
        ${textareaField("environment", "실행 환경", "Backend: Spring Boot 3.3\nFrontend: React 18\nDatabase: PostgreSQL 16", "regular")}
        ${textareaField("problemDescription", "문제 설명", "어떤 상황에서 무엇을 기대했고 실제로 어떤 결과가 나왔는지 작성합니다.", "regular")}
        ${textareaField("errorLog", "에러 로그", "HTTP 403 Forbidden...", "code")}
        ${textareaField("reproductionSteps", "재현 방법", "1. 로그인 API 호출\n2. access token 저장\n3. /api/user 요청", "regular")}
        ${textareaField("triedMethods", "시도한 방법", "- CORS 설정 확인\n- Authorization 헤더 확인", "regular")}
        ${textareaField("blockedPoint", "현재 막힌 지점", "토큰은 정상 발급되지만 인증 객체 저장 여부를 모르겠습니다.", "regular")}

        <label class="check-row">
          <input type="checkbox" name="runAiAnalysis" checked />
          <span>게시글 저장 후 AI 분석을 함께 실행</span>
        </label>
        <p class="sensitive-warning">API key, access token, DB password 등 민감정보는 마스킹한 뒤 저장하세요.</p>

        <div class="form-actions">
          <button class="primary-action" type="submit">게시글 등록</button>
          <button class="secondary-action" type="button" data-view="list">취소</button>
        </div>
      </section>

      <aside class="write-guide">
        <h2>좋은 질문 조건</h2>
        <ul>
          <li>실행 환경과 버전이 포함되어 있습니다.</li>
          <li>정확한 에러 메시지와 재현 절차가 있습니다.</li>
          <li>이미 시도한 방법이 분리되어 있습니다.</li>
          <li>원하는 결과와 실제 결과가 구분됩니다.</li>
          <li>현재 막힌 지점이 한 문장으로 드러납니다.</li>
        </ul>
      </aside>
    </form>
  `;
}

function inputField(name, label, placeholder) {
  const error = state.formErrors[name];
  return `
    <label class="field">
      <span>${label}</span>
      <input name="${name}" placeholder="${escapeHtml(placeholder)}" aria-invalid="${error ? "true" : "false"}" />
      ${error ? `<small class="field-error">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function textareaField(name, label, placeholder, kind) {
  const error = state.formErrors[name];
  return `
    <label class="field">
      <span>${label}</span>
      <textarea name="${name}" class="${kind === "code" ? "code-input" : ""}" placeholder="${escapeHtml(placeholder)}" aria-invalid="${error ? "true" : "false"}"></textarea>
      ${error ? `<small class="field-error">${escapeHtml(error)}</small>` : ""}
    </label>
  `;
}

function tagPicker() {
  const error = state.formErrors.tags;
  return `
    <fieldset class="tag-picker">
      <legend>기술 태그</legend>
      <div>
        ${tags
          .slice(0, 12)
          .map(
            (tag) => `
              <label>
                <input type="checkbox" name="tags" value="${escapeHtml(tag.name)}" />
                <span>${escapeHtml(tag.name)}</span>
              </label>
            `
          )
          .join("")}
      </div>
      ${error ? `<small class="field-error">${escapeHtml(error)}</small>` : ""}
    </fieldset>
  `;
}

function renderDetailView(post) {
  if (!post) {
    return renderEmptyState();
  }

  return `
    <section class="detail-header">
      <div>
        <div class="detail-kicker">${statusBadge(post.status)} ${post.tags.map(tagChip).join("")}</div>
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.author)} · ${escapeHtml(post.createdAt)} · 수정 ${escapeHtml(post.updatedAt)}</p>
      </div>
      <div class="detail-actions">
        <button class="secondary-action" data-view="list">목록</button>
        ${post.authorId === currentUser.id ? `<button class="secondary-action">수정</button><button class="secondary-action">삭제</button>` : ""}
        <button class="secondary-action" id="request-ai">${post.aiAnalysis.status === "SUCCEEDED" ? "AI 재분석" : "AI 분석 요청"}</button>
        ${post.authorId === currentUser.id ? `<button class="primary-action" id="open-solution">해결 등록</button>` : ""}
      </div>
    </section>

    <section class="detail-grid">
      <article class="content-section">
        <h2>실행 환경</h2>
        <dl class="environment-list">
          ${post.environment.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </article>

      <article class="content-section">
        <h2>문제 설명</h2>
        <p>${escapeHtml(post.problemDescription)}</p>
      </article>

      <article class="content-section">
        <div class="section-title-row">
          <h2>에러 로그</h2>
          <button class="text-button" id="copy-log">복사</button>
        </div>
        <pre class="code-block"><code>${escapeHtml(post.errorLog || "등록된 에러 로그가 없습니다.")}</code></pre>
        <p class="sensitive-warning compact">로그 공유 전 토큰, 비밀번호, 내부 호스트명은 마스킹하세요.</p>
      </article>

      <article class="content-section split">
        <div>
          <h2>재현 방법</h2>
          ${orderedList(post.reproductionSteps)}
        </div>
        <div>
          <h2>시도한 방법</h2>
          ${unorderedList(post.triedMethods)}
        </div>
      </article>

      <article class="content-section">
        <h2>현재 막힌 지점</h2>
        <p>${escapeHtml(post.blockedPoint || "등록된 막힌 지점이 없습니다.")}</p>
      </article>

      ${post.solution ? renderSolution(post.solution) : renderNoSolution(post)}
      ${state.solutionMode ? renderSolutionForm(post) : ""}
      ${renderComments(post)}
    </section>
  `;
}

function orderedList(items) {
  return `<ol class="body-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function unorderedList(items) {
  return `<ul class="body-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSolution(solution) {
  return `
    <article class="content-section solution-section">
      <div class="section-title-row">
        <h2>해결 기록</h2>
        <span class="status-badge solved">${escapeHtml(solution.status)}</span>
      </div>
      <dl class="solution-list">
        <div><dt>최종 원인</dt><dd>${escapeHtml(solution.rootCause)}</dd></div>
        <div><dt>해결 방법</dt><dd>${escapeHtml(solution.detail)}</dd></div>
        <div><dt>검증 방법</dt><dd>${escapeHtml(solution.verification)}</dd></div>
        <div><dt>배운 점</dt><dd>${escapeHtml(solution.lessonLearned || "등록된 내용이 없습니다.")}</dd></div>
      </dl>
      <p class="rag-note">RAG 검색 대상 포함: ${solution.ragIncluded ? "예" : "아니오"}</p>
    </article>
  `;
}

function renderNoSolution(post) {
  return `
    <article class="content-section">
      <h2>해결 기록</h2>
      <p>아직 최종 원인과 해결 방법이 등록되지 않았습니다.</p>
      ${post.authorId === currentUser.id ? `<button class="secondary-action" id="open-solution-inline">해결 등록</button>` : ""}
    </article>
  `;
}

function renderSolutionForm(post) {
  return `
    <form class="content-section solution-form" id="solution-form">
      <h2>해결 등록</h2>
      ${textareaField("rootCause", "최종 원인", "실제 문제의 원인을 작성합니다.", "regular")}
      ${textareaField("detail", "해결 방법", "적용한 코드, 설정, 명령어, 절차를 작성합니다.", "regular")}
      ${textareaField("verification", "검증 방법", "해결되었음을 어떻게 확인했는지 작성합니다.", "regular")}
      ${textareaField("references", "참고 링크", "공식 문서, 이슈, 블로그 링크", "regular")}
      ${textareaField("lessonLearned", "배운 점", "회고나 면접 답변으로 재사용할 내용을 작성합니다.", "regular")}
      <label class="check-row">
        <input type="checkbox" name="ragIncluded" checked />
        <span>해결 완료 데이터를 RAG 검색 대상에 포함</span>
      </label>
      <div class="form-actions">
        <button class="primary-action" type="submit">해결 완료 저장</button>
        <button class="secondary-action" type="button" id="cancel-solution">취소</button>
      </div>
    </form>
  `;
}

function renderComments(post) {
  return `
    <article class="content-section comments-section">
      <h2>댓글</h2>
      ${post.comments.length
        ? post.comments
            .map(
              (comment) => `
                <div class="comment">
                  <div>
                    <strong>${escapeHtml(comment.author)}</strong>
                    ${comment.role !== "USER" ? `<span class="mentor-badge">${escapeHtml(comment.role)}</span>` : ""}
                    <small>${escapeHtml(comment.createdAt)}</small>
                  </div>
                  <p>${escapeHtml(comment.body)}</p>
                  ${comment.authorId === currentUser.id ? `<button class="text-button" data-delete-comment="${comment.id}">삭제</button>` : ""}
                </div>
              `
            )
            .join("")
        : `<p>아직 댓글이 없습니다.</p>`}
      <form class="comment-form" id="comment-form">
        <label>
          <span>댓글 작성</span>
          <textarea name="comment" placeholder="질문, 피드백, 추가 확인 사항을 남깁니다."></textarea>
        </label>
        <button class="secondary-action" type="submit">댓글 등록</button>
      </form>
    </article>
  `;
}

function renderAiPanel(post) {
  if (!post) {
    return `<aside class="ai-panel"><h2>AI 분석</h2><p>게시글을 선택하면 분석 결과가 표시됩니다.</p></aside>`;
  }

  const analysis = post.aiAnalysis;
  const usage = analysis.usage || {};

  return `
    <aside class="ai-panel">
      <div class="ai-panel-header">
        <div>
          <p class="eyebrow">AI Analysis</p>
          <h2>${aiStatusLabels[analysis.status] || analysis.status}</h2>
        </div>
        <span class="quality-score">${analysis.qualityScore ? `${analysis.qualityScore}점` : "대기"}</span>
      </div>

      ${analysis.status === "NOT_REQUESTED" ? renderAiEmpty(post) : ""}
      ${["PENDING", "RUNNING"].includes(analysis.status) ? renderAiRunning(post) : ""}
      ${analysis.status === "FAILED" ? renderAiFailed(post) : ""}
      ${analysis.status === "SUCCEEDED" ? renderAiSucceeded(post) : ""}

      <section class="ai-card compact-card">
        <h3>사용 정보</h3>
        <dl class="usage-grid">
          <div><dt>모델</dt><dd>${escapeHtml(usage.model || "-")}</dd></div>
          <div><dt>입력</dt><dd>${Number(usage.inputTokens || 0).toLocaleString("ko-KR")}</dd></div>
          <div><dt>출력</dt><dd>${Number(usage.outputTokens || 0).toLocaleString("ko-KR")}</dd></div>
        </dl>
      </section>
    </aside>
  `;
}

function renderAiEmpty(post) {
  return `
    <section class="ai-card">
      <h3>아직 AI 분석을 요청하지 않았습니다.</h3>
      <p>게시글 내용이 충분하면 요약, 원인 후보, 검증 체크리스트가 생성됩니다.</p>
      <button class="secondary-action" id="request-ai-panel">AI 분석 요청</button>
    </section>
  `;
}

function renderAiRunning(post) {
  return `
    <section class="ai-card">
      <h3>분석 단계</h3>
      <ol class="progress-list">
        <li class="done">입력 구조화</li>
        <li class="done">RAG 유사 사례 검색</li>
        <li class="active">원인 후보 생성</li>
        <li>검증 체크리스트 작성</li>
      </ol>
    </section>
  `;
}

function renderAiFailed(post) {
  return `
    <section class="ai-card error">
      <h3>AI 분석에 실패했습니다.</h3>
      <p>게시글 기능은 유지됩니다. 입력 로그가 너무 길면 핵심 구간만 남기고 재시도하세요.</p>
      <button class="secondary-action" id="request-ai-panel">재시도</button>
    </section>
  `;
}

function renderAiSucceeded(post) {
  const analysis = post.aiAnalysis;

  return `
    <section class="ai-card">
      <h3>문제 요약</h3>
      <p>${escapeHtml(analysis.summary)}</p>
    </section>

    <section class="ai-card">
      <h3>원인 후보 TOP 3</h3>
      <div class="cause-list">
        ${analysis.possibleCauses
          .slice(0, 3)
          .map(
            (cause) => `
              <article>
                <strong>${cause.rank}. ${escapeHtml(cause.title)}</strong>
                <p>${escapeHtml(cause.reason)}</p>
                <meter min="0" max="1" value="${cause.confidence}"></meter>
                <span>${Math.round(cause.confidence * 100)}%</span>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="ai-card">
      <h3>검증 체크리스트</h3>
      <ul class="checklist">
        ${analysis.checklist.map((item) => `<li><label><input type="checkbox" /> <span>${escapeHtml(item)}</span></label></li>`).join("")}
      </ul>
    </section>

    ${analysis.missingContext.length ? renderMissingContext(analysis.missingContext) : ""}
    ${renderSimilarCases(analysis.similarCases)}
  `;
}

function renderMissingContext(items) {
  return `
    <section class="ai-card attention">
      <h3>부족한 정보</h3>
      <ul class="body-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSimilarCases(cases) {
  return `
    <section class="ai-card">
      <h3>유사 사례</h3>
      ${
        cases.length
          ? cases
              .map(
                (item) => `
                  <button class="similar-case" data-open-post="${escapeHtml(item.postId)}">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${item.solved ? "해결 완료" : "미해결"} · 유사도 ${Math.round(item.similarity * 100)}%</span>
                    <small>${escapeHtml(item.excerpt || "관련 해결 기록이 AI 분석 근거로 사용되었습니다.")}</small>
                  </button>
                `
              )
              .join("")
          : `<p>유사한 해결 사례를 찾지 못했습니다.</p>`
      }
    </section>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.solutionMode = false;
      state.formErrors = {};
      render();
    });
  });

  app.querySelectorAll("[data-open-post]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPostId = button.dataset.openPost;
      state.view = "detail";
      state.solutionMode = false;
      render();
    });
  });

  app.querySelectorAll("[data-post-id]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      state.selectedPostId = card.dataset.postId;
      render();
    });
  });

  app.querySelectorAll("[data-filter-tag]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.tag = button.dataset.filterTag;
      state.view = "list";
      render();
    });
  });

  app.querySelectorAll("[data-status-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      state.status = button.dataset.statusShortcut;
      state.solved = button.dataset.statusShortcut === "SOLVED" ? "SOLVED" : "UNSOLVED";
      state.view = "list";
      render();
    });
  });

  const sortShortcut = app.querySelector("[data-sort-shortcut]");
  sortShortcut?.addEventListener("click", () => {
    state.sort = sortShortcut.dataset.sortShortcut;
    state.view = "list";
    render();
  });

  bindFilter("search-input", "input", (target) => {
    state.query = target.value;
  });
  bindFilter("status-filter", "change", (target) => {
    state.status = target.value;
  });
  bindFilter("tag-filter", "change", (target) => {
    state.tag = target.value;
  });
  bindFilter("solved-filter", "change", (target) => {
    state.solved = target.value;
  });
  bindFilter("sort-filter", "change", (target) => {
    state.sort = target.value;
  });

  app.querySelector("#reset-filters")?.addEventListener("click", () => {
    state.query = "";
    state.status = "ALL";
    state.tag = "ALL";
    state.solved = "ALL";
    state.sort = "latest";
    render();
  });

  app.querySelector("#clear-list-error")?.addEventListener("click", () => {
    state.hasListError = false;
    render();
  });

  app.querySelector("#post-form")?.addEventListener("submit", handleCreatePost);
  app.querySelector("#comment-form")?.addEventListener("submit", handleCreateComment);
  app.querySelectorAll("[data-delete-comment]").forEach((button) => {
    button.addEventListener("click", () => deleteComment(button.dataset.deleteComment));
  });

  app.querySelector("#open-solution")?.addEventListener("click", openSolutionForm);
  app.querySelector("#open-solution-inline")?.addEventListener("click", openSolutionForm);
  app.querySelector("#cancel-solution")?.addEventListener("click", () => {
    state.solutionMode = false;
    state.formErrors = {};
    render();
  });
  app.querySelector("#solution-form")?.addEventListener("submit", handleSolutionSubmit);

  app.querySelector("#request-ai")?.addEventListener("click", requestAiAnalysis);
  app.querySelector("#request-ai-panel")?.addEventListener("click", requestAiAnalysis);

  app.querySelector("#copy-log")?.addEventListener("click", async () => {
    const post = selectedPost();
    await navigator.clipboard?.writeText(post.errorLog || "");
  });
}

function bindFilter(id, eventName, handler) {
  const element = app.querySelector(`#${id}`);
  element?.addEventListener(eventName, (event) => {
    handler(event.target);
    render();
  });
}

async function handleCreatePost(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const selectedTags = formData.getAll("tags");
  const title = String(formData.get("title") || "").trim();
  const environmentText = String(formData.get("environment") || "").trim();
  const problemDescription = String(formData.get("problemDescription") || "").trim();

  const errors = {};
  if (!title) errors.title = "제목을 입력해주세요.";
  if (!selectedTags.length) errors.tags = "기술 태그를 하나 이상 선택해주세요.";
  if (!environmentText) errors.environment = "실행 환경을 입력해주세요.";
  if (!problemDescription) errors.problemDescription = "문제 설명을 입력해주세요.";

  state.formErrors = errors;
  if (Object.keys(errors).length > 0) {
    render();
    return;
  }

  const runAiAnalysis = formData.get("runAiAnalysis") === "on";
  const payload = {
    title,
    tags: selectedTags,
    environment: parseEnvironment(environmentText),
    problemDescription,
    errorLog: String(formData.get("errorLog") || "").trim(),
    reproductionSteps: splitLines(formData.get("reproductionSteps")),
    triedMethods: splitLines(formData.get("triedMethods")),
    blockedPoint: String(formData.get("blockedPoint") || "").trim(),
    runAiAnalysis
  };

  try {
    const createdPost = await apiFetch("/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    replacePost(createdPost);
    state.view = "detail";
    state.formErrors = {};
    render();
    if (runAiAnalysis) {
      await requestAiAnalysis();
    }
    return;
  } catch (error) {
    console.warn("Create post API failed. Falling back to in-memory post.", error);
  }

  const now = new Date();
  const post = {
    id: `post-${Date.now()}`,
    title,
    summary: problemDescription.slice(0, 110),
    status: runAiAnalysis ? "ANALYZING" : "OPEN",
    authorId: currentUser.id,
    author: currentUser.nickname,
    createdAt: formatDate(now),
    updatedAt: formatDate(now),
    commentCount: 0,
    viewCount: 1,
    tags: payload.tags,
    environment: payload.environment,
    problemDescription: payload.problemDescription,
    errorLog: payload.errorLog,
    reproductionSteps: payload.reproductionSteps,
    triedMethods: payload.triedMethods,
    blockedPoint: payload.blockedPoint,
    comments: [],
    aiAnalysis: runAiAnalysis ? createRunningAnalysis() : createNotRequestedAnalysis(),
    ragStatus: runAiAnalysis ? "SEARCHING" : "NOT_INDEXED"
  };

  state.posts.unshift(post);
  state.selectedPostId = post.id;
  state.view = "detail";
  state.formErrors = {};
  render();

  if (runAiAnalysis) {
    finishMockAiAnalysis(post.id);
  }
}

function parseEnvironment(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split(":");
      return rest.length ? [key.trim(), rest.join(":").trim()] : ["Environment", line];
    });
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.replace(/^[-\d.\s]+/, "").trim())
    .filter(Boolean);
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createNotRequestedAnalysis() {
  return {
    id: `analysis-${Date.now()}`,
    status: "NOT_REQUESTED",
    summary: "",
    qualityScore: null,
    possibleCauses: [],
    checklist: [],
    missingContext: [],
    similarCases: [],
    usage: {
      model: "gpt-5-mini",
      inputTokens: 0,
      outputTokens: 0
    }
  };
}

function createRunningAnalysis() {
  return {
    ...createNotRequestedAnalysis(),
    status: "RUNNING"
  };
}

async function requestAiAnalysis() {
  const post = selectedPost();
  if (!post || post.status === "ARCHIVED") return;

  post.status = "ANALYZING";
  post.aiAnalysis = createRunningAnalysis();
  post.ragStatus = "SEARCHING";
  render();

  try {
    const updatedPost = await apiFetch(`/posts/${encodeURIComponent(post.id)}/ai-analysis`, {
      method: "POST"
    });
    replacePost(updatedPost);
    render();
    return;
  } catch (error) {
    console.warn("AI analysis API failed. Falling back to mock result.", error);
  }

  finishMockAiAnalysis(post.id);
}

function finishMockAiAnalysis(postId) {
  setTimeout(() => {
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return;

    post.status = post.solution ? "SOLVED" : "OPEN";
    post.ragStatus = post.solution ? "INDEXED" : "FOUND";
    post.aiAnalysis = {
      id: `analysis-${Date.now()}`,
      status: "SUCCEEDED",
      summary: "입력된 환경, 로그, 재현 절차를 기준으로 원인 후보와 다음 검증 순서를 생성했습니다.",
      qualityScore: post.errorLog ? 78 : 62,
      possibleCauses: [
        {
          rank: 1,
          title: "요청 흐름과 런타임 환경의 설정 불일치",
          reason: "로그와 재현 절차가 환경 설정 문제를 가리키므로 설정값과 실제 요청값을 먼저 대조해야 합니다.",
          confidence: 0.79
        },
        {
          rank: 2,
          title: "필수 컨텍스트 누락",
          reason: "일부 코드 또는 설정 원문이 없어 단정하기보다 추가 정보를 확인해야 합니다.",
          confidence: 0.61
        }
      ],
      checklist: [
        "문제가 발생한 요청과 정상 요청의 헤더, 환경변수, 설정값을 비교합니다.",
        "에러 로그의 최초 원인 줄과 마지막 application stack frame을 분리해 확인합니다.",
        "최근 변경된 설정 또는 의존성 버전을 되돌려 재현 여부를 확인합니다."
      ],
      missingContext: post.errorLog ? ["관련 설정 파일", "최근 변경사항"] : ["핵심 에러 로그", "관련 설정 파일"],
      similarCases: state.posts
        .filter((item) => item.id !== post.id && item.status === "SOLVED")
        .slice(0, 2)
        .map((item) => ({
          postId: item.id,
          title: item.title,
          similarity: 0.82,
          solved: true,
          excerpt: item.summary
        })),
      usage: {
        model: "gpt-5-mini",
        inputTokens: 1800,
        outputTokens: 640
      }
    };
    render();
  }, 900);
}

async function handleCreateComment(event) {
  event.preventDefault();
  const post = selectedPost();
  const formData = new FormData(event.currentTarget);
  const body = String(formData.get("comment") || "").trim();
  if (!post || !body) return;

  try {
    const updatedPost = await apiFetch(`/posts/${encodeURIComponent(post.id)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
    replacePost(updatedPost);
    render();
    return;
  } catch (error) {
    console.warn("Comment API failed. Falling back to in-memory comment.", error);
  }

  post.comments.push({
    id: `comment-${Date.now()}`,
    authorId: currentUser.id,
    author: currentUser.nickname,
    role: currentUser.role,
    body,
    createdAt: formatDate(new Date())
  });
  post.commentCount = post.comments.length;
  render();
}

async function deleteComment(commentId) {
  const post = selectedPost();
  if (!post) return;

  try {
    const updatedPost = await apiFetch(`/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE"
    });
    replacePost(updatedPost);
    render();
    return;
  } catch (error) {
    console.warn("Delete comment API failed. Falling back to in-memory delete.", error);
  }

  post.comments = post.comments.filter((comment) => comment.id !== commentId || comment.authorId !== currentUser.id);
  post.commentCount = post.comments.length;
  render();
}

function openSolutionForm() {
  state.solutionMode = true;
  state.formErrors = {};
  render();
}

async function handleSolutionSubmit(event) {
  event.preventDefault();
  const post = selectedPost();
  const formData = new FormData(event.currentTarget);
  const rootCause = String(formData.get("rootCause") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const verification = String(formData.get("verification") || "").trim();

  const errors = {};
  if (!rootCause) errors.rootCause = "최종 원인을 입력해주세요.";
  if (!detail) errors.detail = "해결 방법을 입력해주세요.";
  if (!verification) errors.verification = "검증 방법을 입력해주세요.";
  state.formErrors = errors;

  if (!post || Object.keys(errors).length > 0) {
    render();
    return;
  }

  const payload = {
    rootCause,
    detail,
    verification,
    references: splitLines(formData.get("references")),
    lessonLearned: String(formData.get("lessonLearned") || "").trim(),
    ragIncluded: formData.get("ragIncluded") === "on"
  };

  try {
    const updatedPost = await apiFetch(`/posts/${encodeURIComponent(post.id)}/solutions`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    replacePost(updatedPost);
    state.solutionMode = false;
    state.formErrors = {};
    render();
    return;
  } catch (error) {
    console.warn("Solution API failed. Falling back to in-memory solution.", error);
  }

  post.solution = {
    id: `solution-${Date.now()}`,
    status: "SUBMITTED",
    ...payload
  };
  post.status = "SOLVED";
  post.ragStatus = post.solution.ragIncluded ? "INDEXED" : "NOT_INDEXED";
  post.updatedAt = formatDate(new Date());
  state.solutionMode = false;
  state.formErrors = {};
  render();
}

render();
