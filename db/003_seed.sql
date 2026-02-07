insert into organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Access Insights')
on conflict (id) do nothing;

insert into users (id, org_id, email, full_name, role)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@accessinsights.net', 'Admin User', 'admin'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'creator@accessinsights.net', 'Creator User', 'creator'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'participant@accessinsights.net', 'Participant User', 'participant')
on conflict (id) do nothing;

insert into surveys (id, org_id, owner_user_id, title, description, status, is_template)
values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Screener Template', 'Reusable template for participant screening', 'draft', true),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Published Product Research Screener', 'Published survey for sample recruitment', 'published', false)
on conflict (id) do nothing;

insert into survey_versions (survey_id, version, is_published, title, description, intro_text, thank_you_text, tags, questions_json, created_by)
values
  (
    '55555555-5555-5555-5555-555555555555',
    1,
    false,
    'Screener Template',
    'Reusable screener template',
    'Welcome. Please answer to determine eligibility.',
    'Thanks for your time.',
    array['template','screener'],
    '[
      {"id":"age","label":"What is your age?","type":"number","required":true,"min":18,"max":99,"helpText":"Enter your age in years"},
      {"id":"uses_product","label":"Have you used product X in the last 30 days?","type":"yes_no","required":true},
      {"id":"reason","label":"Why not?","type":"long_text","required":false,"logic":{"questionId":"uses_product","equals":"No"}}
    ]'::jsonb,
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    1,
    true,
    'Published Product Research Screener',
    'Find participants for product interviews',
    'Please complete this short screener.',
    'Submission received.',
    array['published','research'],
    '[
      {"id":"consent","label":"I consent to participate in this research","type":"consent","required":true},
      {"id":"email","label":"Contact email","type":"email","required":true,"pii":true},
      {"id":"role","label":"Current role","type":"dropdown","required":true,"options":["Engineer","Designer","PM","Other"]},
      {"id":"satisfaction","label":"How satisfied are you with product X?","type":"likert","required":true,"options":["1","2","3","4","5"]}
    ]'::jsonb,
    '33333333-3333-3333-3333-333333333333'
  )
on conflict do nothing;
