import { performance } from 'node:perf_hooks';
import { classifyTodoInput } from '../src/classifier.js';
import { evaluateTodos } from '../src/evaluator.js';

const samples = [
  '오늘 저녁에 운동하고 내일 이력서 수정하기',
  '내일까지 이력서 수정하고 잡코리아 지원하기',
  '주말에 방 청소하고 빨래하기',
  '나중에 그거 하기'
];

const started = performance.now();
for (let i = 0; i < 200; i += 1) {
  const todos = classifyTodoInput(samples[i % samples.length]);
  const result = evaluateTodos(todos);
  if (!['PASS', 'FAIL'].includes(result.status)) throw new Error('invalid evaluation status');
}
const elapsed = performance.now() - started;
if (elapsed > 1000) {
  throw new Error(`benchmark smoke exceeded 1000ms: ${elapsed.toFixed(1)}ms`);
}
console.log(`benchmark_smoke: pass ${elapsed.toFixed(1)}ms`);
