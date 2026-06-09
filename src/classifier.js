import { CATEGORY_VALUES, PRIORITY_VALUES } from './todoRules.js';

const SPLIT_PATTERNS = [
  /\s*(?:하고|그리고|또|,|，|&|\/)+\s*/g,
  /\s+(?:후에|다음에)\s+/g
];

const CATEGORY_RULES = [
  { category: 'career', keywords: ['이력서', '지원', '잡코리아', '포트폴리오', '면접', '채용', '커리어', '자소서', '회사'] },
  { category: 'study', keywords: ['공부', '강의', '문제', '알고리즘', '시험', '독서', '스터디', '학습', '정리'] },
  { category: 'health', keywords: ['운동', '헬스', '헬스장', '병원', '약', '산책', '요가', '러닝', '건강'] },
  { category: 'finance', keywords: ['입금', '송금', '결제', '정산', '예산', '가계부', '세금', '은행', '보험'] },
  { category: 'household', keywords: ['청소', '빨래', '설거지', '방', '분리수거', '장보기', '집', '정리'] },
  { category: 'social', keywords: ['연락', '전화', '약속', '친구', '가족', '미팅', '회식', '모임'] },
  { category: 'personal', keywords: ['예약', '여행', '취미', '일기', '메모', '계획'] }
];

const PRIORITY_RULES = [
  { priority: 'high', keywords: ['내일까지', '내일', '오늘', '급히', '긴급', '마감', '지원', '면접'] },
  { priority: 'low', keywords: ['언젠가', '시간날 때', '천천히'] }
];

function normalizeInput(input) {
  return String(input ?? '').trim().replace(/\s+/g, ' ');
}

function replaceDuePhrase(segment) {
  return segment
    .replace(/오늘\s*저녁에?/g, '')
    .replace(/오늘까지|오늘/g, '')
    .replace(/내일까지|내일/g, '')
    .replace(/이번\s*주\s*안에|이번\s*주/g, '')
    .replace(/다음\s*주/g, '')
    .replace(/주말에?|이번\s*주말에?/g, '')
    .replace(/나중에|언젠가/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTask(segment) {
  let task = replaceDuePhrase(segment)
    .replace(/^(에|까지|안에|때)\s*/g, '')
    .replace(/\s*(하기|할 것|해야 함)$/g, '')
    .trim();

  if (!task) {
    task = segment.trim() || '정리하기';
  }

  if (!/(하기|가기|수정하기|지원하기|정리하기|청소하기|풀기|듣기|쓰기|읽기|보기|하기)$/.test(task)) {
    task = `${task}하기`;
  }

  return task.replace(/하기하기$/g, '하기');
}

function inferDue(text) {
  if (/오늘\s*저녁/.test(text)) return 'today_evening';
  if (/오늘/.test(text)) return 'today';
  if (/내일|내일까지/.test(text)) return 'tomorrow';
  if (/이번\s*주말|주말/.test(text)) return 'this_weekend';
  if (/이번\s*주/.test(text)) return 'this_week';
  if (/다음\s*주/.test(text)) return 'next_week';
  if (/나중에|언젠가|그거|그것/.test(text)) return 'unknown';
  return null;
}

function inferCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }
  return 'etc';
}

function inferPriority(text, category, due) {
  if (/나중에|언젠가|그거|그것/.test(text)) return 'unknown';
  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.priority;
    }
  }
  if (category === 'finance') return 'medium';
  if (due === null) return 'medium';
  return 'medium';
}

function confidenceFor(text, segmentCount, category, due, priority) {
  let confidence = 0.78;
  if (category !== 'etc') confidence += 0.08;
  if (due && due !== 'unknown') confidence += 0.06;
  if (priority !== 'unknown') confidence += 0.03;
  if (segmentCount > 1) confidence -= 0.02;
  if (/나중에|그거|그것|아무거나|대충/.test(text)) confidence = Math.min(confidence, 0.52);
  return Number(Math.max(0.35, Math.min(0.96, confidence)).toFixed(2));
}

function splitTodoText(input) {
  let normalized = normalizeInput(input);
  for (const pattern of SPLIT_PATTERNS) {
    normalized = normalized.replace(pattern, '|');
  }
  return normalized
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function classifyTodoInput(input) {
  const normalized = normalizeInput(input);
  if (!normalized) {
    const error = new Error('input must contain at least one character');
    error.statusCode = 400;
    throw error;
  }

  const segments = splitTodoText(normalized);
  const inheritedDue = inferDue(normalized);
  return segments.map((segment) => {
    const due = inferDue(segment) ?? inheritedDue;
    const category = inferCategory(segment);
    const priority = inferPriority(segment, category, due);
    const todo = {
      task: normalizeTask(segment),
      category,
      priority,
      due,
      confidence: confidenceFor(segment, segments.length, category, due, priority)
    };

    if (!CATEGORY_VALUES.includes(todo.category) || !PRIORITY_VALUES.includes(todo.priority)) {
      throw new Error('classifier produced an invalid enum value');
    }

    return todo;
  });
}
