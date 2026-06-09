export function parseAiTodoOutput(output) {
  const parsed = parseJsonLikeOutput(output);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.todos)) return parsed.todos;

  const error = new Error('AI output must be a JSON array or an object with a todos array');
  error.statusCode = 502;
  throw error;
}

function parseJsonLikeOutput(output) {
  if (Array.isArray(output) || (output && typeof output === 'object')) {
    return output;
  }

  if (typeof output !== 'string') {
    const error = new Error('AI output must be valid JSON text');
    error.statusCode = 502;
    throw error;
  }

  const text = output.trim();
  if (!text) {
    const error = new Error('AI output was empty');
    error.statusCode = 502;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('AI output was not valid JSON');
    error.statusCode = 502;
    throw error;
  }
}

export function extractTextFromOpenAiResponse(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const parts = [];
  for (const item of response?.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string') parts.push(content.text);
    }
  }

  const text = parts.join('\n').trim();
  if (!text) {
    const error = new Error('OpenAI response did not include text output');
    error.statusCode = 502;
    throw error;
  }
  return text;
}
