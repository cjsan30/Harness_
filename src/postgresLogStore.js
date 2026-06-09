let pool;
let initialized = false;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS evaluation_logs (
  id BIGSERIAL PRIMARY KEY,
  input_text TEXT NOT NULL,
  ai_output JSONB NOT NULL,
  raw_ai_output TEXT,
  evaluation_result JSONB NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL')),
  classifier_provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function appendPostgresEvaluationLog(entry) {
  const client = await getPool();
  const result = await client.query(
    `INSERT INTO evaluation_logs
      (input_text, ai_output, raw_ai_output, evaluation_result, score, status, classifier_provider, model)
     VALUES ($1, $2::jsonb, $3, $4::jsonb, $5, $6, $7, $8)
     RETURNING id, input_text, ai_output, raw_ai_output, evaluation_result, score, status, classifier_provider, model, created_at`,
    [
      entry.input_text,
      JSON.stringify(entry.ai_output ?? []),
      entry.raw_ai_output ?? null,
      JSON.stringify(entry.evaluation_result),
      entry.score,
      entry.status,
      entry.classifier_provider ?? null,
      entry.model ?? null
    ]
  );
  return normalizeRow(result.rows[0]);
}

export async function listPostgresEvaluationLogs() {
  const client = await getPool();
  const result = await client.query(
    `SELECT id, input_text, ai_output, raw_ai_output, evaluation_result, score, status,
      classifier_provider, model, created_at
     FROM evaluation_logs
     ORDER BY id DESC
     LIMIT 100`
  );
  return result.rows.map(normalizeRow);
}

async function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL log storage');
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('PostgreSQL log storage requires the optional "pg" package. Run npm install first.');
  }

  pool = new pg.Pool({ connectionString });
  if (!initialized) {
    await pool.query(CREATE_TABLE_SQL);
    initialized = true;
  }
  return pool;
}

function normalizeRow(row) {
  return {
    id: Number(row.id),
    input_text: row.input_text,
    ai_output: parseJsonb(row.ai_output),
    raw_ai_output: row.raw_ai_output,
    evaluation_result: parseJsonb(row.evaluation_result),
    score: Number(row.score),
    status: row.status,
    classifier_provider: row.classifier_provider,
    model: row.model,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function parseJsonb(value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}
