import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAiTodoOutput, extractTextFromOpenAiResponse } from '../src/aiResponse.js';

test('parses JSON array AI output', () => {
  const todos = parseAiTodoOutput('[{"task":"운동하기","category":"health","priority":"medium","due":"today","confidence":0.8}]');
  assert.equal(todos.length, 1);
  assert.equal(todos[0].category, 'health');
});

test('parses wrapped todos AI output', () => {
  const todos = parseAiTodoOutput('{"todos":[{"task":"이력서 수정하기","category":"career","priority":"high","due":"tomorrow","confidence":0.9}]}');
  assert.equal(todos.length, 1);
  assert.equal(todos[0].due, 'tomorrow');
});

test('rejects malformed AI output', () => {
  assert.throws(() => parseAiTodoOutput('not json'), /not valid JSON/);
});

test('extracts text from OpenAI Responses output shape', () => {
  const text = extractTextFromOpenAiResponse({
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: '{"todos":[]}' }]
      }
    ]
  });
  assert.equal(text, '{"todos":[]}');
});
