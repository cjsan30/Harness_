create extension if not exists vector;

create type user_role as enum ('USER', 'MENTOR', 'ADMIN');
create type user_status as enum ('ACTIVE', 'SUSPENDED', 'DELETED');
create type post_status as enum ('OPEN', 'ANALYZING', 'NEEDS_MORE_CONTEXT', 'SOLVED', 'ARCHIVED', 'DELETED');
create type post_visibility as enum ('PUBLIC', 'PRIVATE', 'TEAM_ONLY');
create type comment_status as enum ('VISIBLE', 'DELETED', 'HIDDEN');
create type solution_status as enum ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'UPDATED');
create type ai_analysis_status as enum ('NOT_REQUESTED', 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRY_REQUIRED', 'CANCELLED');
create type rag_search_status as enum ('NOT_INDEXED', 'INDEXING', 'INDEXED', 'SEARCHING', 'FOUND', 'NO_RESULT', 'SEARCH_FAILED');
create type rag_source_type as enum ('POST', 'SOLUTION', 'DOC');
create type agent_run_status as enum ('CREATED', 'PLANNING', 'TOOL_CALLING', 'REASONING', 'COMPLETED', 'FAILED', 'PARTIAL_COMPLETED');
create type mcp_connection_status as enum ('NOT_CONNECTED', 'CONNECTED', 'AUTH_EXPIRED', 'PERMISSION_DENIED', 'SYNCING', 'SYNCED', 'SYNC_FAILED');

create table users (
  id bigserial primary key,
  email varchar(320) not null unique,
  password_hash text not null,
  nickname varchar(80) not null,
  role user_role not null default 'USER',
  status user_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table posts (
  id bigserial primary key,
  user_id bigint not null references users(id),
  title varchar(240) not null,
  summary text,
  problem_description text not null,
  environment jsonb not null default '{}'::jsonb,
  error_log text,
  reproduction_steps jsonb not null default '[]'::jsonb,
  tried_methods jsonb not null default '[]'::jsonb,
  blocked_point text,
  status post_status not null default 'OPEN',
  visibility post_visibility not null default 'PUBLIC',
  view_count bigint not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comments (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  user_id bigint not null references users(id),
  body text not null,
  status comment_status not null default 'VISIBLE',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table tags (
  id bigserial primary key,
  name varchar(80) not null unique,
  category varchar(80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table post_tags (
  post_id bigint not null references posts(id) on delete cascade,
  tag_id bigint not null references tags(id),
  primary key (post_id, tag_id)
);

create table solutions (
  id bigserial primary key,
  post_id bigint not null unique references posts(id),
  user_id bigint not null references users(id),
  root_cause text not null,
  solution_detail text not null,
  verification_method text not null,
  lesson_learned text,
  references jsonb not null default '[]'::jsonb,
  status solution_status not null default 'SUBMITTED',
  rag_included boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_analysis (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  analysis_version integer not null,
  status ai_analysis_status not null default 'PENDING',
  problem_type varchar(80),
  quality_score integer,
  summary text,
  possible_causes jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  missing_context jsonb not null default '[]'::jsonb,
  similar_cases jsonb not null default '[]'::jsonb,
  failure_code varchar(80),
  failure_message text,
  model_name varchar(120),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  created_at timestamptz not null default now(),
  unique (post_id, analysis_version)
);

create table rag_chunks (
  id bigserial primary key,
  source_type rag_source_type not null,
  source_id bigint not null,
  chunk_index integer not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  status rag_search_status not null default 'NOT_INDEXED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);

create table rag_search_logs (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  query_text text not null,
  top_k integer not null default 5,
  result_count integer not null default 0,
  results_snapshot jsonb not null default '[]'::jsonb,
  status rag_search_status not null default 'SEARCHING',
  created_at timestamptz not null default now()
);

create table agent_runs (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  user_id bigint not null references users(id),
  status agent_run_status not null default 'CREATED',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table agent_steps (
  id bigserial primary key,
  run_id bigint not null references agent_runs(id) on delete cascade,
  step_order integer not null,
  step_type varchar(80) not null,
  tool_name varchar(120),
  input_summary text,
  output_summary text,
  status agent_run_status not null default 'CREATED',
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default now(),
  unique (run_id, step_order)
);

create table tool_calls (
  id bigserial primary key,
  step_id bigint not null references agent_steps(id) on delete cascade,
  tool_type varchar(80) not null,
  request_meta jsonb not null default '{}'::jsonb,
  response_summary text,
  success boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create table external_connections (
  id bigserial primary key,
  user_id bigint not null references users(id),
  provider varchar(80) not null,
  status mcp_connection_status not null default 'NOT_CONNECTED',
  scope jsonb not null default '[]'::jsonb,
  connected_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table ai_usage_logs (
  id bigserial primary key,
  user_id bigint references users(id),
  post_id bigint references posts(id),
  provider varchar(80) not null,
  model_name varchar(120) not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  estimated_cost numeric(12, 6),
  created_at timestamptz not null default now()
);

create index idx_posts_status_created_at on posts(status, created_at desc) where deleted_at is null;
create index idx_posts_title_search on posts using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(problem_description, '') || ' ' || coalesce(error_log, '')));
create index idx_comments_post_id on comments(post_id) where deleted_at is null;
create index idx_ai_analysis_post_id on ai_analysis(post_id, analysis_version desc);
create index idx_rag_chunks_source on rag_chunks(source_type, source_id);
create index idx_rag_chunks_embedding on rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_agent_steps_run_id on agent_steps(run_id, step_order);
