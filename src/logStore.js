import { mkdir, readFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { appendPostgresEvaluationLog, listPostgresEvaluationLogs } from './postgresLogStore.js';

const DEFAULT_LOG_PATH = new URL('../data/evaluation-logs.jsonl', import.meta.url);

export async function appendEvaluationLog(entry, logPath = DEFAULT_LOG_PATH) {
  if (shouldUsePostgres(logPath)) {
    return appendPostgresEvaluationLog(entry);
  }

  await mkdir(dirname(logPath.pathname), { recursive: true });
  const existing = await listEvaluationLogs(logPath);
  const nextId = existing.length > 0 ? Math.max(...existing.map((item) => item.id)) + 1 : 1;
  const record = {
    id: nextId,
    ...entry,
    created_at: new Date().toISOString()
  };
  await appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf-8');
  return record;
}

export async function listEvaluationLogs(logPath = DEFAULT_LOG_PATH) {
  if (shouldUsePostgres(logPath)) {
    return listPostgresEvaluationLogs();
  }

  try {
    const text = await readFile(logPath, 'utf-8');
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .reverse();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function shouldUsePostgres(logPath) {
  if (logPath !== DEFAULT_LOG_PATH) return false;
  const mode = String(process.env.LOG_STORE || '').trim().toLowerCase();
  if (mode === 'jsonl') return false;
  return mode === 'postgres' || Boolean(process.env.DATABASE_URL);
}

export function toLogSummary(log) {
  return {
    id: log.id,
    input_text: log.input_text,
    score: log.score,
    status: log.status,
    created_at: log.created_at,
    evaluation_result: log.evaluation_result,
    ai_output: log.ai_output,
    raw_ai_output: log.raw_ai_output,
    classifier_provider: log.classifier_provider,
    model: log.model
  };
}
