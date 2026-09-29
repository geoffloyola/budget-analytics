-- National Budget Analytics — initial schema.
--
-- Amounts are stored in THOUSAND PESOS, the unit DBM uses in the GAA, NEP and
-- BESF tables, so figures can be typed/pasted straight from the documents.
--
-- Stages:
--   NEP  National Expenditure Program — the President's proposal to Congress
--   GAA  General Appropriations Act   — what Congress enacted (net of vetoes)

-- ---------------------------------------------------------------------------
-- Access: invite-only. A signed-in user sees data only if they are a member.
-- Add people in the Supabase dashboard (Authentication → Add user), then
-- insert a row here with their user id.
-- ---------------------------------------------------------------------------
create table public.members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  role       text not null default 'staff' check (role in ('principal', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin');
$$;

alter table public.members enable row level security;
create policy "members read members" on public.members
  for select to authenticated using (public.is_member());

-- ---------------------------------------------------------------------------
-- Allocations: one row per (year, stage, department, agency, expense class).
-- Department fields are denormalised on purpose: agency/department names and
-- groupings shift between GAAs, and each row keeps what its document said.
-- ---------------------------------------------------------------------------
create table public.allocations (
  id               bigint generated always as identity primary key,
  fiscal_year      int  not null check (fiscal_year between 2000 and 2100),
  stage            text not null check (stage in ('NEP', 'GAA')),
  department_code  text not null,
  department_name  text not null,
  sector           text not null check (sector in
                     ('social', 'economic', 'general_public', 'defense', 'debt_burden')),
  agency_code      text not null,
  agency_name      text not null,
  expense_class    text not null check (expense_class in ('PS', 'MOOE', 'CO', 'FinEx')),
  amount_thousands numeric(18, 2) not null,
  source           text not null,          -- e.g. "GAA FY2026 Vol. I" or "SAMPLE"
  imported_at      timestamptz not null default now(),
  unique (fiscal_year, stage, department_code, agency_code, expense_class)
);
create index allocations_year_stage on public.allocations (fiscal_year, stage);

-- ---------------------------------------------------------------------------
-- District items: programs/projects that land in a specific district
-- (e.g. DPWH line items, school buildings, hospitals).
-- ---------------------------------------------------------------------------
create table public.district_items (
  id               bigint generated always as identity primary key,
  fiscal_year      int  not null,
  stage            text not null check (stage in ('NEP', 'GAA')),
  department_code  text not null,
  agency_code      text not null,
  item             text not null,
  province         text not null,
  district         text not null,
  municipality     text,
  category         text not null,          -- e.g. Roads, Flood control, School buildings
  amount_thousands numeric(18, 2) not null,
  source           text not null,
  imported_at      timestamptz not null default now(),
  unique (fiscal_year, stage, province, district, agency_code, item)
);
create index district_items_place on public.district_items (province, district, fiscal_year);

alter table public.allocations    enable row level security;
alter table public.district_items enable row level security;

create policy "members read allocations" on public.allocations
  for select to authenticated using (public.is_member());
create policy "members read district items" on public.district_items
  for select to authenticated using (public.is_member());
-- Writes go through the service-role key (import script / admin import page),
-- which bypasses RLS, so no insert/update policies are defined.

-- ---------------------------------------------------------------------------
-- Department totals per year and stage — what the dashboard, comparison and
-- trend pages read. security_invoker keeps the members-only RLS in force.
-- ---------------------------------------------------------------------------
create view public.department_totals with (security_invoker = true) as
select
  fiscal_year,
  stage,
  department_code,
  max(department_name) as department_name,
  max(sector)          as sector,
  sum(amount_thousands)                                           as total,
  sum(amount_thousands) filter (where expense_class = 'PS')       as ps,
  sum(amount_thousands) filter (where expense_class = 'MOOE')     as mooe,
  sum(amount_thousands) filter (where expense_class = 'CO')       as co,
  sum(amount_thousands) filter (where expense_class = 'FinEx')    as finex,
  bool_or(source = 'SAMPLE')                                      as has_sample
from public.allocations
group by fiscal_year, stage, department_code;

create view public.agency_totals with (security_invoker = true) as
select
  fiscal_year,
  stage,
  department_code,
  agency_code,
  max(agency_name)       as agency_name,
  sum(amount_thousands)  as total
from public.allocations
group by fiscal_year, stage, department_code, agency_code;

-- Saved AI briefings, so staff can reopen or forward what was generated.
create table public.briefings (
  id          bigint generated always as identity primary key,
  created_by  uuid not null references auth.users (id) default auth.uid(),
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);
alter table public.briefings enable row level security;
create policy "members read briefings" on public.briefings
  for select to authenticated using (public.is_member());
create policy "members save briefings" on public.briefings
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());
create policy "authors delete briefings" on public.briefings
  for delete to authenticated using (created_by = auth.uid());
