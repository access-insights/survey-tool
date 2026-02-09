alter table if exists question_bank
add column if not exists archived_at timestamptz;
