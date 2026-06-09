const state = {
  todos: [],
  evaluation: null,
  testCases: [],
  logs: [],
  logFilter: 'ALL'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'request failed');
  return payload;
}

function statusClass(status) {
  return status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'neutral';
}

function setBadge(element, status) {
  element.textContent = status;
  element.className = `badge ${statusClass(status)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function jsonBlock(value) {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function syncInputState() {
  const input = $('#todo-input').value.trim();
  const button = $('#classify-button');
  button.disabled = input.length === 0;
  $('#input-error').textContent = input.length === 0 ? '1자 이상 입력하면 분류를 실행할 수 있습니다.' : '';
}

function renderTodos() {
  $('#todo-count').textContent = `${state.todos.length} item${state.todos.length === 1 ? '' : 's'}`;
  $('#todo-list').innerHTML = state.todos.length === 0
    ? '<p class="muted">아직 분류된 Todo가 없습니다.</p>'
    : state.todos.map((todo) => `
      <article class="todo-card">
        <strong>${escapeHtml(todo.task)}</strong>
        <div class="meta-row">
          <span>${escapeHtml(todo.category)}</span>
          <span>${escapeHtml(todo.priority)}</span>
          <span>${escapeHtml(todo.due ?? 'no_due')}</span>
          <span>${escapeHtml(Math.round(todo.confidence * 100))}% confidence</span>
        </div>
      </article>
    `).join('');
}

function renderEvaluation() {
  const evaluation = state.evaluation;
  if (!evaluation) return;
  setBadge($('#eval-status'), evaluation.status);
  $('#side-status').textContent = evaluation.status;
  $('#score-ring').textContent = evaluation.score;
  $('#eval-reason').textContent = evaluation.reason;
  const details = evaluation.details ?? evaluation;
  $('#check-grid').innerHTML = Object.entries(details)
    .filter(([key]) => !['score', 'status', 'reason'].includes(key))
    .map(([key, value]) => `<div class="check-item ${String(value).toLowerCase()}">${key}: ${value}</div>`)
    .join('');
}

function renderJson(payload) {
  $('#json-output').textContent = JSON.stringify(payload, null, 2);
}

async function classifyInput() {
  const input = $('#todo-input').value.trim();
  if (!input) {
    syncInputState();
    return;
  }
  const button = $('#classify-button');
  button.classList.add('is-loading');
  button.querySelector('span').textContent = 'Classifying...';
  $('#input-error').textContent = '';
  try {
    const result = await api('/api/todos/classify', {
      method: 'POST',
      body: JSON.stringify({ input })
    });
    state.todos = result.todos;
    state.evaluation = result.evaluation;
    renderTodos();
    renderEvaluation();
    renderJson(result.todos);
    await loadLogs();
  } catch (error) {
    setBadge($('#eval-status'), 'FAIL');
    $('#eval-reason').textContent = error.message;
  } finally {
    button.classList.remove('is-loading');
    button.querySelector('span').textContent = 'Classify';
    syncInputState();
  }
}

async function runTestCase(id) {
  const result = await api(`/api/test-cases/${id}/run`, { method: 'POST', body: '{}' });
  setBadge($('#test-result-status'), result.evaluation.status);
  $('#test-result-json').textContent = JSON.stringify(result, null, 2);
  await loadLogs();
}

function renderTestCases() {
  $('#test-case-list').innerHTML = state.testCases.map((testCase) => `
    <article class="test-case">
      <div class="test-case-header">
        <strong>#${escapeHtml(testCase.id)} ${escapeHtml(testCase.title)}</strong>
        <button class="small-button" data-run-test="${testCase.id}">Run Test</button>
      </div>
      <p class="muted">${escapeHtml(testCase.input)}</p>
      <pre>${jsonBlock(testCase.expected)}</pre>
    </article>
  `).join('');
  $$('[data-run-test]').forEach((button) => button.addEventListener('click', () => runTestCase(button.dataset.runTest)));
}

function renderLogs() {
  const logs = state.logs.filter((log) => state.logFilter === 'ALL' || log.status === state.logFilter);
  $('#log-list').innerHTML = logs.length === 0
    ? '<p class="muted">로그가 없습니다.</p>'
    : logs.map((log) => `
      <article class="log-item">
        <div class="log-header">
          <strong>#${escapeHtml(log.id)} ${escapeHtml(log.input_text)}</strong>
          <span class="badge ${statusClass(log.status)}">${escapeHtml(log.status)} · ${escapeHtml(log.score)}</span>
        </div>
        <span class="muted">${escapeHtml(new Date(log.created_at).toLocaleString())}</span>
        <pre>${jsonBlock({ ai_output: log.ai_output, evaluation_result: log.evaluation_result, raw_ai_output: log.raw_ai_output })}</pre>
      </article>
    `).join('');
}

async function loadLogs() {
  state.logs = await api('/api/evaluation-logs');
  renderLogs();
}

async function bootstrap() {
  $('#todo-input').addEventListener('input', syncInputState);
  $('#classify-button').addEventListener('click', classifyInput);
  $('#sample-button').addEventListener('click', () => {
    $('#todo-input').value = '오늘 저녁에 운동하고 내일 이력서 수정하기';
    syncInputState();
  });
  $('#copy-json').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#json-output').textContent);
  });
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => {
    $$('.nav-item').forEach((item) => item.classList.remove('is-active'));
    $$('.view').forEach((view) => view.classList.remove('is-visible'));
    button.classList.add('is-active');
    $(`#view-${button.dataset.view}`).classList.add('is-visible');
  }));
  $$('.segmented button').forEach((button) => button.addEventListener('click', () => {
    $$('.segmented button').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    state.logFilter = button.dataset.filter;
    renderLogs();
  }));

  await api('/api/health');
  $('#api-status').textContent = 'API ONLINE';
  state.testCases = await api('/api/test-cases');
  renderTestCases();
  await loadLogs();
  const rules = await api('/api/schema-rules');
  $('#schema-json').textContent = JSON.stringify(rules, null, 2);
  renderTodos();
  syncInputState();
}

bootstrap().catch((error) => {
  $('#api-status').textContent = 'API ERROR';
  $('#api-status').classList.add('fail');
  console.error(error);
});
