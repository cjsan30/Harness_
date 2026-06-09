import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTodoInput } from '../src/classifier.js';
import { evaluateTodos } from '../src/evaluator.js';

test('passes matching expected values', () => {
  const todos = classifyTodoInput('주말에 방 청소하고 빨래하기');
  const result = evaluateTodos(todos, {
    task_count: 2,
    categories: ['household'],
    due_values: ['this_weekend']
  });
  assert.equal(result.status, 'PASS');
  assert.ok(result.score >= 80);
});

test('fails invalid enum values', () => {
  const result = evaluateTodos([{ task: 'x', category: 'invalid', priority: 'medium', due: null, confidence: 0.8 }]);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.category_validation, 'FAIL');
});

test('fails non-array output without throwing expected comparisons', () => {
  const result = evaluateTodos({ task: 'x' }, {
    task_count: 1,
    categories: ['etc'],
    due_values: [null]
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.schema_validation, 'FAIL');
  assert.equal(result.score, 0);
});
