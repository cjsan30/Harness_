import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestTodoClassification, getClassifierProvider } from './aiProvider.js';
import { parseAiTodoOutput } from './aiResponse.js';
import { createFailedEvaluation, evaluateTodos } from './evaluator.js';
import { TEST_CASES, TODO_SCHEMA, TODO_RESPONSE_SCHEMA, CATEGORY_VALUES, PRIORITY_VALUES } from './todoRules.js';
import { appendEvaluationLog, listEvaluationLogs, toLogSummary } from './logStore.js';

const rootDir = join(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = join(rootDir, 'public');
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    const error = new Error('request body must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function handleClassify(request, response) {
  const body = await readJsonBody(request);
  const input = String(body.input ?? '').trim();
  if (!input) {
    sendJson(response, 400, { error: 'input must contain at least one character' });
    return;
  }

  const result = await classifyAndEvaluate(input, body.expected ?? null);
  const log = await appendEvaluationLog({
    input_text: input,
    ai_output: result.todos,
    raw_ai_output: result.rawOutput,
    classifier_provider: result.provider,
    model: result.model,
    evaluation_result: result.evaluation,
    score: result.evaluation.score,
    status: result.evaluation.status
  });

  sendJson(response, 200, {
    input,
    todos: result.todos,
    raw_output: result.rawOutput,
    classifier: {
      provider: result.provider,
      model: result.model,
      request_id: result.requestId
    },
    evaluation: {
      score: result.evaluation.score,
      status: result.evaluation.status,
      reason: result.evaluation.reason,
      details: result.evaluation
    },
    log_id: log.id
  });
}

async function handleRunTestCase(request, response, id) {
  const testCase = TEST_CASES.find((item) => item.id === Number(id));
  if (!testCase) {
    sendJson(response, 404, { error: `test case not found: ${id}` });
    return;
  }

  const result = await classifyAndEvaluate(testCase.input, testCase.expected);
  const log = await appendEvaluationLog({
    input_text: testCase.input,
    ai_output: result.todos,
    raw_ai_output: result.rawOutput,
    classifier_provider: result.provider,
    model: result.model,
    evaluation_result: result.evaluation,
    score: result.evaluation.score,
    status: result.evaluation.status
  });

  sendJson(response, 200, {
    test_case_id: testCase.id,
    input: testCase.input,
    expected: testCase.expected,
    actual: result.todos,
    raw_output: result.rawOutput,
    classifier: {
      provider: result.provider,
      model: result.model,
      request_id: result.requestId
    },
    evaluation: result.evaluation,
    log_id: log.id
  });
}

async function classifyAndEvaluate(input, expected) {
  const provider = getClassifierProvider();
  let aiResult = {
    provider,
    model: null,
    requestId: null,
    rawOutput: null
  };

  try {
    aiResult = {
      ...aiResult,
      ...await requestTodoClassification(input)
    };
    const todos = parseAiTodoOutput(aiResult.rawOutput);
    return {
      ...aiResult,
      todos,
      evaluation: evaluateTodos(todos, expected)
    };
  } catch (error) {
    return {
      ...aiResult,
      todos: [],
      evaluation: createFailedEvaluation(error.message ?? 'AI classification failed')
    };
  }
}

async function serveStatic(pathname, response) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(publicDir, cleanPath));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const index = await readFile(join(publicDir, 'index.html'));
      response.writeHead(200, { 'content-type': contentTypes['.html'] });
      response.end(index);
      return;
    }
    throw error;
  }
}

export function createTodoServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? '127.0.0.1'}`);

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok', service: 'todo-classifier' });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/todos/classify') {
        await handleClassify(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/test-cases') {
        sendJson(response, 200, TEST_CASES);
        return;
      }

      const runMatch = url.pathname.match(/^\/api\/test-cases\/(\d+)\/run$/);
      if (request.method === 'POST' && runMatch) {
        await handleRunTestCase(request, response, runMatch[1]);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/evaluation-logs') {
        const logs = await listEvaluationLogs();
        sendJson(response, 200, logs.map(toLogSummary));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/schema-rules') {
        sendJson(response, 200, {
          schema: TODO_SCHEMA,
          response_schema: TODO_RESPONSE_SCHEMA,
          categories: CATEGORY_VALUES,
          priorities: PRIORITY_VALUES
        });
        return;
      }

      if (request.method === 'GET') {
        await serveStatic(url.pathname, response);
        return;
      }

      sendJson(response, 405, { error: 'method not allowed' });
    } catch (error) {
      sendJson(response, error.statusCode ?? 500, { error: error.message ?? 'internal server error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createTodoServer().listen(port, '127.0.0.1', () => {
    console.log(`Todo Classifier running at http://127.0.0.1:${port}`);
  });
}
