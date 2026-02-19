alter function public.current_role() set search_path = public;

alter table if exists public.question_bank enable row level security;

drop policy if exists question_bank_admin_all on public.question_bank;
create policy question_bank_admin_all on public.question_bank
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists question_bank_creator_org on public.question_bank;
create policy question_bank_creator_org on public.question_bank
for all
using (
  public.current_role() = 'creator'
  and org_id in (select org_id from public.users where id = auth.uid())
)
with check (
  public.current_role() = 'creator'
  and org_id in (select org_id from public.users where id = auth.uid())
);
