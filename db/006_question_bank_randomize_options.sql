alter table if exists question_bank
add column if not exists randomize_options boolean not null default false;
