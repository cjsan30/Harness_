import { CATEGORY_VALUES, PRIORITY_VALUES } from './todoRules.js';

const PASS = 'PASS';
const FAIL = 'FAIL';

function unique(values) {
  return [...new Set(values)];
}

function hasRequiredFields(todo) {
  return todo &&
    typeof todo.task === 'string' && todo.task.trim().length > 0 &&
    typeof todo.category === 'string' &&
    typeof todo.priority === 'string' &&
    Object.prototype.hasOwnProperty.call(todo, 'due') &&
    typeof todo.confidence === 'number';
}

function validDue(todo) {
  return todo.due === null || ['today', 'today_evening', 'tomorrow', 'this_week', 'next_week', 'this_weekend', 'unknown'].includes(todo.due);
}

export function createFailedEvaluation(reason) {
  return {
    schema_validation: FAIL,
    required_fields: FAIL,
    category_validation: FAIL,
    priority_validation: FAIL,
    due_parsing: FAIL,
    task_split: FAIL,
    confidence_check: FAIL,
    score: 0,
    status: FAIL,
    reason
  };
}

export function evaluateTodos(todos, expected = null) {
  const reasons = [];
  const isArray = Array.isArray(todos);
  const requiredFields = isArray && todos.every(hasRequiredFields);
  const categoryValid = requiredFields && todos.every((todo) => CATEGORY_VALUES.includes(todo.category));
  const priorityValid = requiredFields && todos.every((todo) => PRIORITY_VALUES.includes(todo.priority));
  const dueParsingValid = requiredFields && todos.every(validDue);
  const confidenceValid = requiredFields && todos.every((todo) => todo.confidence >= 0 && todo.confidence <= 1);

  let taskSplitValid = isArray && todos.length > 0;
  let expectedValid = true;

  if (!isArray) reasons.push('AI output is not a JSON array');
  if (!requiredFields) reasons.push('one or more todo items are missing required fields');
  if (!categoryValid) reasons.push('category contains a value outside the allowed range');
  if (!priorityValid) reasons.push('priority contains a value outside the allowed range');
  if (!dueParsingValid) reasons.push('due contains a value outside the supported mapping');
  if (!confidenceValid) reasons.push('confidence must be a number from 0 to 1');

  if (expected && isArray) {
    if (typeof expected.task_count === 'number' && todos.length !== expected.task_count) {
      taskSplitValid = false;
      expectedValid = false;
      reasons.push(`expected ${expected.task_count} todo item(s), got ${todos.length}`);
    }

    if (Array.isArray(expected.categories)) {
      const actualCategories = unique(todos.map((todo) => todo.category));
      const missing = expected.categories.filter((category) => !actualCategories.includes(category));
      if (missing.length > 0) {
        expectedValid = false;
        reasons.push(`missing expected category: ${missing.join(', ')}`);
      }
    }

    if (Array.isArray(expected.due_values)) {
      const actualDue = todos.map((todo) => todo.due);
      const missing = expected.due_values.filter((due) => !actualDue.includes(due));
      if (missing.length > 0) {
        expectedValid = false;
        reasons.push(`missing expected due value: ${missing.map(String).join(', ')}`);
      }
    }

    if (typeof expected.confidence_max === 'number') {
      const overconfident = todos.some((todo) => todo.confidence > expected.confidence_max);
      if (overconfident) {
        expectedValid = false;
        reasons.push(`ambiguous input expected confidence <= ${expected.confidence_max}`);
      }
    }
  }

  const checks = {
    schema_validation: isArray ? PASS : FAIL,
    required_fields: requiredFields ? PASS : FAIL,
    category_validation: categoryValid ? PASS : FAIL,
    priority_validation: priorityValid ? PASS : FAIL,
    due_parsing: dueParsingValid ? PASS : FAIL,
    task_split: taskSplitValid ? PASS : FAIL,
    confidence_check: confidenceValid ? PASS : FAIL
  };

  const passCount = Object.values(checks).filter((value) => value === PASS).length;
  const allCoreChecksPass = Object.values(checks).every((value) => value === PASS);
  let score = Math.round((passCount / Object.keys(checks).length) * 100);
  if (!expectedValid) score = Math.min(score, 79);
  if (!requiredFields) score = Math.min(score, 49);
  if (!isArray) score = 0;

  return {
    ...checks,
    score,
    status: score >= 80 && allCoreChecksPass && expectedValid ? PASS : FAIL,
    reason: reasons.length > 0 ? reasons.join('; ') : '기대 조건과 Harness 평가 기준을 만족함'
  };
}
