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

CREATE INDEX IF NOT EXISTS evaluation_logs_created_at_idx
  ON evaluation_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS evaluation_logs_status_idx
  ON evaluation_logs (status);
