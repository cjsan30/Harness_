import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTodoInput } from '../src/classifier.js';

test('classifies a single health todo with today_evening due', () => {
  const todos = classifyTodoInput('오늘 저녁에 운동하기');
  assert.equal(todos.length, 1);
  assert.equal(todos[0].category, 'health');
  assert.equal(todos[0].due, 'today_evening');
  assert.equal(todos[0].priority, 'high');
});

test('splits career todo items and inherits tomorrow due', () => {
  const todos = classifyTodoInput('내일까지 이력서 수정하고 잡코리아 지원하기');
  assert.equal(todos.length, 2);
  assert.deepEqual(todos.map((todo) => todo.category), ['career', 'career']);
  assert.deepEqual(todos.map((todo) => todo.due), ['tomorrow', 'tomorrow']);
});

test('keeps ambiguous input conservative', () => {
  const todos = classifyTodoInput('나중에 그거 하기');
  assert.equal(todos.length, 1);
  assert.equal(todos[0].category, 'etc');
  assert.equal(todos[0].due, 'unknown');
  assert.ok(todos[0].confidence <= 0.6);
});

test('returns stable output for the same input', () => {
  const first = classifyTodoInput('오늘 운동하고 내일 이력서 수정하고 주말에 방 청소하기');
  const second = classifyTodoInput('오늘 운동하고 내일 이력서 수정하고 주말에 방 청소하기');
  assert.deepEqual(second, first);
});
