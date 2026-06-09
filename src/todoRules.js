export const CATEGORY_VALUES = [
  'career',
  'study',
  'health',
  'personal',
  'finance',
  'household',
  'social',
  'etc'
];

export const PRIORITY_VALUES = ['high', 'medium', 'low', 'unknown'];

export const DUE_VALUES = [
  'today',
  'today_evening',
  'tomorrow',
  'this_week',
  'next_week',
  'this_weekend',
  'unknown',
  null
];

export const TODO_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['task', 'category', 'priority', 'due', 'confidence'],
  properties: {
    task: { type: 'string', minLength: 1 },
    category: { type: 'string', enum: CATEGORY_VALUES },
    priority: { type: 'string', enum: PRIORITY_VALUES },
    due: {
      anyOf: [
        { type: 'string', enum: DUE_VALUES.filter((value) => value !== null) },
        { type: 'null' }
      ]
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  }
};

export const TODO_SCHEMA = {
  type: 'array',
  items: TODO_ITEM_SCHEMA
};

export const TODO_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['todos'],
  properties: {
    todos: TODO_SCHEMA
  }
};

export const TEST_CASES = [
  {
    id: 1,
    title: '단일 Todo',
    input: '오늘 저녁에 운동하기',
    expected: {
      task_count: 1,
      categories: ['health'],
      due_values: ['today_evening']
    }
  },
  {
    id: 2,
    title: '복수 Todo',
    input: '내일까지 이력서 수정하고 잡코리아 지원하기',
    expected: {
      task_count: 2,
      categories: ['career'],
      due_values: ['tomorrow']
    }
  },
  {
    id: 3,
    title: '날짜 없음',
    input: '포트폴리오 정리하기',
    expected: {
      task_count: 1,
      categories: ['career'],
      due_values: [null]
    }
  },
  {
    id: 4,
    title: '애매한 입력',
    input: '나중에 그거 하기',
    expected: {
      task_count: 1,
      categories: ['etc'],
      due_values: ['unknown'],
      confidence_max: 0.6
    }
  },
  {
    id: 5,
    title: '생활 Todo',
    input: '주말에 방 청소하고 빨래하기',
    expected: {
      task_count: 2,
      categories: ['household'],
      due_values: ['this_weekend']
    }
  },
  {
    id: 6,
    title: '학습 Todo',
    input: '이번 주 안에 알고리즘 강의 듣고 문제 풀기',
    expected: {
      task_count: 2,
      categories: ['study'],
      due_values: ['this_week']
    }
  }
];
