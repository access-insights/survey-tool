alter table if exists public.invites
add column if not exists email_sent_at timestamptz;
