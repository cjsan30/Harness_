import { classifyTodoInput } from './classifier.js';
import { extractTextFromOpenAiResponse } from './aiResponse.js';
import { TODO_RESPONSE_SCHEMA } from './todoRules.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export function getClassifierProvider() {
  return String(process.env.TODO_CLASSIFIER_PROVIDER || 'deterministic').trim().toLowerCase();
}

export async function requestTodoClassification(input) {
  const provider = getClassifierProvider();

  if (provider === 'deterministic') {
    return {
      provider,
      rawOutput: JSON.stringify(classifyTodoInput(input))
    };
  }

  if (provider === 'malformed') {
    return {
      provider,
      rawOutput: 'not valid json'
    };
  }

  if (provider === 'openai') {
    return classifyWithOpenAi(input);
  }

  const error = new Error(`unsupported classifier provider: ${provider}`);
  error.statusCode = 500;
  throw error;
}

async function classifyWithOpenAi(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5';

  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is required when TODO_CLASSIFIER_PROVIDER=openai');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: [
        'You classify Korean natural-language todo text into structured JSON.',
        'Return only JSON that matches the supplied schema.',
        'Split multiple todos connected by words such as 하고, 그리고, 또, or commas.',
        'Use conservative confidence for ambiguous inputs instead of guessing.'
      ].join(' '),
      input,
      max_output_tokens: 1000,
      text: {
        format: {
          type: 'json_schema',
          name: 'todo_classifier_response',
          strict: true,
          schema: TODO_RESPONSE_SCHEMA
        }
      }
    })
  });

  const requestId = response.headers.get('x-request-id') ?? null;
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return {
    provider: 'openai',
    model,
    requestId,
    rawOutput: extractTextFromOpenAiResponse(payload)
  };
}
