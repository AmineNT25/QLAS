-- ============================================================
-- 001_initial_schema.sql
-- QLAS — Leads Acquisition System
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  full_name   text,
  role        text not null default 'member',
  created_at  timestamptz not null default now()
);

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  website     text,
  created_by  uuid references users(id) on delete set null
);

create table if not exists forms (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  fields      jsonb not null default '[]',
  is_active   boolean not null default true
);

create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  form_id       uuid references forms(id) on delete set null,
  email         text not null,
  full_name     text,
  phone         text,
  score         int not null default 0,
  status        text not null default 'new',
  source        text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists lead_activities (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  user_id       uuid references users(id) on delete set null,
  type          text not null,
  description   text,
  created_at    timestamptz not null default now()
);

create table if not exists scoring_rules (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id) on delete cascade,
  condition_field  text not null,
  condition_value  text not null,
  points           int not null default 0
);

create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  subject     text not null,
  trigger     text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists leads_client_id_idx  on leads(client_id);
create index if not exists leads_email_idx       on leads(email);
create index if not exists leads_status_idx      on leads(status);
create index if not exists leads_created_at_idx  on leads(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users           enable row level security;
alter table clients         enable row level security;
alter table forms           enable row level security;
alter table leads           enable row level security;
alter table lead_activities enable row level security;
alter table scoring_rules   enable row level security;
alter table email_templates enable row level security;

-- -------------------------------------------------------
-- Helper: check if the calling user is an admin
-- -------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from   users
    where  id   = auth.uid()
    and    role = 'admin'
  );
$$;

-- -------------------------------------------------------
-- Helper: get the client_id assigned to the calling user
-- (stored as user metadata for simplicity)
-- -------------------------------------------------------
create or replace function my_client_id()
returns uuid
language sql
security definer
stable
as $$
  select (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
$$;

-- -------------------------------------------------------
-- users policies
-- -------------------------------------------------------
create policy "admins_all_users"
  on users for all
  using (is_admin());

create policy "users_read_own"
  on users for select
  using (id = auth.uid());

-- -------------------------------------------------------
-- clients policies
-- -------------------------------------------------------
create policy "admins_all_clients"
  on clients for all
  using (is_admin());

create policy "members_read_own_client"
  on clients for select
  using (id = my_client_id());

-- -------------------------------------------------------
-- forms policies
-- -------------------------------------------------------
create policy "admins_all_forms"
  on forms for all
  using (is_admin());

create policy "members_crud_own_forms"
  on forms for all
  using (client_id = my_client_id());

-- -------------------------------------------------------
-- leads policies
-- -------------------------------------------------------
create policy "admins_all_leads"
  on leads for all
  using (is_admin());

create policy "members_crud_own_leads"
  on leads for select
  using (client_id = my_client_id());

create policy "members_insert_own_leads"
  on leads for insert
  with check (client_id = my_client_id());

create policy "members_update_own_leads"
  on leads for update
  using (client_id = my_client_id());

-- Public (anon) may insert leads (form submissions)
create policy "anon_insert_leads"
  on leads for insert
  to anon
  with check (true);

-- -------------------------------------------------------
-- lead_activities policies
-- -------------------------------------------------------
create policy "admins_all_activities"
  on lead_activities for all
  using (is_admin());

create policy "members_crud_own_activities"
  on lead_activities for all
  using (
    exists (
      select 1
      from   leads
      where  leads.id        = lead_activities.lead_id
      and    leads.client_id = my_client_id()
    )
  );

-- Public (anon) may insert activities (form submission tracking)
create policy "anon_insert_activities"
  on lead_activities for insert
  to anon
  with check (true);

-- -------------------------------------------------------
-- scoring_rules policies
-- -------------------------------------------------------
create policy "admins_all_scoring_rules"
  on scoring_rules for all
  using (is_admin());

create policy "members_crud_own_scoring_rules"
  on scoring_rules for all
  using (client_id = my_client_id());

-- -------------------------------------------------------
-- email_templates policies
-- -------------------------------------------------------
create policy "admins_all_email_templates"
  on email_templates for all
  using (is_admin());

create policy "members_crud_own_email_templates"
  on email_templates for all
  using (client_id = my_client_id());
