create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  label text not null,
  type text not null,
  required boolean not null default false,
  help_text text,
  options_json jsonb,
  min_value numeric,
  max_value numeric,
  regex text,
  max_length int,
  pii boolean not null default false,
  logic_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_bank_org_created_at on question_bank(org_id, created_at desc);
