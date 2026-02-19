alter table organizations enable row level security;
alter table users enable row level security;
alter table surveys enable row level security;
alter table survey_versions enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table logic_rules enable row level security;
alter table invites enable row level security;
alter table responses enable row level security;
alter table response_answers enable row level security;
alter table audit_log enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
set search_path = public
as $$
  select role from users where id = auth.uid()
$$;

create policy org_read_users on users
for select using (org_id in (select org_id from users where id = auth.uid()));

create policy admin_update_users on users
for update using (public.current_role() = 'admin');

create policy admin_all_surveys on surveys
for all using (public.current_role() = 'admin');

create policy creator_own_surveys on surveys
for all using (
  public.current_role() = 'creator'
  and owner_user_id = auth.uid()
)
with check (
  public.current_role() = 'creator'
  and owner_user_id = auth.uid()
);

create policy participant_read_published on surveys
for select using (public.current_role() = 'participant' and status = 'published');

create policy survey_versions_admin_creator on survey_versions
for select using (
  exists (
    select 1 from surveys s
    where s.id = survey_id
      and (
        public.current_role() = 'admin'
        or (public.current_role() = 'creator' and s.owner_user_id = auth.uid())
      )
  )
);

create policy invites_admin_creator on invites
for all using (
  exists (
    select 1 from surveys s
    where s.id = survey_id
      and (
        public.current_role() = 'admin'
        or (public.current_role() = 'creator' and s.owner_user_id = auth.uid())
      )
  )
);

create policy response_access_admin_creator on responses
for select using (
  exists (
    select 1 from surveys s
    where s.id = survey_id
      and (
        public.current_role() = 'admin'
        or (public.current_role() = 'creator' and s.owner_user_id = auth.uid())
      )
  )
);

create policy response_access_participant on responses
for select using (participant_user_id = auth.uid());

create policy audit_admin_read on audit_log
for select using (public.current_role() = 'admin');
