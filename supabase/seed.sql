-- ============================================================
-- seed.sql
-- QLAS — development seed data
-- ============================================================

-- -------------------------------------------------------
-- Clients
-- -------------------------------------------------------
insert into clients (id, name, industry, website) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp',          'Technology',  'https://acme.example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Industries',  'Manufacturing','https://globex.example.com')
on conflict (id) do nothing;

-- -------------------------------------------------------
-- Forms  (3 forms across the 2 clients)
-- -------------------------------------------------------
insert into forms (id, client_id, name, fields, is_active) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Demo Request',
    '[
      {"id":"f1","type":"text",  "label":"Full Name",    "required":true},
      {"id":"f2","type":"email", "label":"Work Email",   "required":true},
      {"id":"f3","type":"text",  "label":"Company",      "required":false},
      {"id":"f4","type":"select","label":"Team Size",    "required":false,
       "options":["1-10","11-50","51-200","200+"]}
    ]',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Newsletter Signup',
    '[
      {"id":"f1","type":"text", "label":"Name",  "required":true},
      {"id":"f2","type":"email","label":"Email", "required":true}
    ]',
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    'Quote Request',
    '[
      {"id":"f1","type":"text",    "label":"Full Name",   "required":true},
      {"id":"f2","type":"email",   "label":"Email",       "required":true},
      {"id":"f3","type":"text",    "label":"Phone",       "required":false},
      {"id":"f4","type":"textarea","label":"Description", "required":false}
    ]',
    true
  )
on conflict (id) do nothing;

-- -------------------------------------------------------
-- Leads  (10 leads — mixed statuses, scores 0-100)
-- -------------------------------------------------------
insert into leads (
  id, client_id, form_id,
  email, full_name, phone,
  score, status, source,
  utm_source, utm_medium, utm_campaign,
  created_at
) values
  (
    'lead0001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'alice@example.com', 'Alice Martin', '+1-555-0101',
    85, 'qualified', 'organic',
    'google', 'organic', 'brand-awareness',
    now() - interval '10 days'
  ),
  (
    'lead0002-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bob@example.com', 'Bob Johnson', '+1-555-0102',
    62, 'contacted', 'paid',
    'google', 'cpc', 'spring-promo',
    now() - interval '8 days'
  ),
  (
    'lead0003-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'carol@example.com', 'Carol White', null,
    95, 'converted', 'referral',
    null, null, null,
    now() - interval '15 days'
  ),
  (
    'lead0004-0000-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'david@example.com', 'David Lee', '+1-555-0104',
    20, 'new', 'organic',
    'bing', 'organic', null,
    now() - interval '2 days'
  ),
  (
    'lead0005-0000-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'eva@example.com', 'Eva Brown', null,
    10, 'lost', 'social',
    'linkedin', 'social', 'q1-campaign',
    now() - interval '20 days'
  ),
  (
    'lead0006-0000-0000-0000-000000000006',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'frank@example.com', 'Frank Miller', '+1-555-0106',
    75, 'qualified', 'direct',
    null, null, null,
    now() - interval '5 days'
  ),
  (
    'lead0007-0000-0000-0000-000000000007',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'grace@example.com', 'Grace Kim', null,
    45, 'contacted', 'email',
    'mailchimp', 'email', 'reactivation',
    now() - interval '7 days'
  ),
  (
    'lead0008-0000-0000-0000-000000000008',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'henry@example.com', 'Henry Clark', '+1-555-0108',
    100, 'converted', 'referral',
    null, null, null,
    now() - interval '30 days'
  ),
  (
    'lead0009-0000-0000-0000-000000000009',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'iris@example.com', 'Iris Turner', null,
    5, 'new', 'organic',
    'google', 'organic', 'brand-awareness',
    now() - interval '1 day'
  ),
  (
    'lead0010-0000-0000-0000-000000000010',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'jack@example.com', 'Jack Wilson', '+1-555-0110',
    35, 'lost', 'paid',
    'facebook', 'cpc', 'retargeting',
    now() - interval '25 days'
  )
on conflict (id) do nothing;

-- -------------------------------------------------------
-- Scoring rules (sample)
-- -------------------------------------------------------
insert into scoring_rules (client_id, condition_field, condition_value, points) values
  ('11111111-1111-1111-1111-111111111111', 'utm_source',  'google',   10),
  ('11111111-1111-1111-1111-111111111111', 'source',      'referral', 20),
  ('22222222-2222-2222-2222-222222222222', 'utm_medium',  'email',    15),
  ('22222222-2222-2222-2222-222222222222', 'source',      'direct',   10)
on conflict do nothing;

-- -------------------------------------------------------
-- Email templates (sample)
-- -------------------------------------------------------
insert into email_templates (client_id, name, subject, trigger) values
  ('11111111-1111-1111-1111-111111111111', 'Welcome Email',   'Welcome to Acme!',        'lead_created'),
  ('11111111-1111-1111-1111-111111111111', 'Follow-up',       'Following up on your request', 'lead_contacted'),
  ('22222222-2222-2222-2222-222222222222', 'Quote Received',  'We received your quote request', 'lead_created')
on conflict do nothing;
