create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('admin','creator','participant')),
  created_at timestamptz not null default now()
);

create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null check (status in ('draft','published','archived')) default 'draft',
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists survey_versions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  version int not null,
  is_published boolean not null default false,
  title text not null,
  description text not null,
  intro_text text,
  consent_blurb text,
  thank_you_text text,
  tags text[] not null default '{}',
  questions_json jsonb not null default '[]'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (survey_id, version)
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  survey_version_id uuid not null references survey_versions(id) on delete cascade,
  question_key text not null,
  question_type text not null,
  label text not null,
  required boolean not null default false,
  help_text text,
  validation_json jsonb,
  logic_json jsonb,
  pii boolean not null default false,
  sort_order int not null default 0,
  unique (survey_version_id, question_key)
);

create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order int not null default 0,
  unique (question_id, value)
);

create table if not exists logic_rules (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  depends_on_question_key text not null,
  operator text not null default 'equals',
  expected_value text not null
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  token text not null unique,
  email text,
  expires_at timestamptz,
  status text not null check (status in ('sent','started','completed','expired')) default 'sent',
  created_at timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references surveys(id) on delete set null,
  invite_id uuid unique references invites(id) on delete set null,
  participant_user_id uuid references users(id) on delete set null,
  status text not null check (status in ('draft','completed')) default 'draft',
  answers_json jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists response_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  question_key text not null,
  value_text text,
  value_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
