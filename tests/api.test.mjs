import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createTodoServer } from '../src/server.js';

async function withServer(fn) {
  const server = createTodoServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('POST /api/todos/classify returns todos and evaluation', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/todos/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: '오늘 저녁에 운동하기' })
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.todos.length, 1);
    assert.equal(payload.evaluation.status, 'PASS');
  });
});

test('POST /api/todos/classify rejects empty input', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/todos/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: '   ' })
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /input/);
  });
});

test('POST /api/todos/classify records malformed AI output as FAIL evaluation', async () => {
  const previousProvider = process.env.TODO_CLASSIFIER_PROVIDER;
  process.env.TODO_CLASSIFIER_PROVIDER = 'malformed';
  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/todos/classify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: '오늘 운동하기' })
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.evaluation.status, 'FAIL');
      assert.equal(payload.evaluation.score, 0);
      assert.match(payload.evaluation.reason, /not valid JSON/);
    });
  } finally {
    if (previousProvider === undefined) {
      delete process.env.TODO_CLASSIFIER_PROVIDER;
    } else {
      process.env.TODO_CLASSIFIER_PROVIDER = previousProvider;
    }
  }
});

test('POST /api/test-cases/:id/run evaluates a sample case', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/test-cases/2/run`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.test_case_id, 2);
    assert.equal(payload.evaluation.status, 'PASS');
  });
});

test('GET /api/evaluation-logs returns summaries', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/evaluation-logs`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await response.json()));
  });
});
