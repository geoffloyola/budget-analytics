-- Budget execution and release data from DBM COMPASS (compass.dbm.gov.ph).
-- Filled by `npm run sync:compass`. Amounts in THOUSAND pesos, like the rest
-- of the app (COMPASS reports pesos; the sync divides by 1,000).

-- SAAODB: Statement of Appropriations, Allotments, Obligations,
-- Disbursements and Balances. One row per department (agency = '') or agency,
-- for the latest reporting period of each fiscal year.
--
-- Note: `appropriations` here = current-year budget + continuing
-- appropriations carried over from earlier years, so it is NOT the same
-- as the GAA figure. `current_year` is the new appropriation for the year.
create table public.execution (
  id                bigint generated always as identity primary key,
  fiscal_year       int  not null,
  period            text not null,           -- FY, Q1, Q2, Q3
  as_of             date not null,
  department        text not null,
  agency            text not null default '', -- '' = department total
  appropriations    numeric(18, 2) not null,
  current_year      numeric(18, 2),           -- department rows only
  continuing        numeric(18, 2),           -- department rows only
  unprogrammed      numeric(18, 2),           -- unprogrammed appropriations released to the dept
  adjustments       numeric(18, 2) not null,
  total_available   numeric(18, 2) not null,
  allotments        numeric(18, 2) not null,
  obligations       numeric(18, 2) not null,
  disbursements     numeric(18, 2) not null,
  unreleased        numeric(18, 2) not null,
  unobligated       numeric(18, 2) not null,
  synced_at         timestamptz not null default now(),
  unique (fiscal_year, department, agency)
);

-- Government-wide totals per year (includes special purpose funds and
-- automatic appropriations such as debt interest and the tax allotment,
-- which aren't broken down by department).
create table public.execution_totals (
  fiscal_year      int primary key,
  period           text not null,
  as_of            date not null,
  appropriations   numeric(18, 2) not null,
  adjustments      numeric(18, 2) not null,
  total_available  numeric(18, 2) not null,
  allotments       numeric(18, 2) not null,
  obligations      numeric(18, 2) not null,
  disbursements    numeric(18, 2) not null,
  unreleased       numeric(18, 2) not null,
  unobligated      numeric(18, 2) not null,
  synced_at        timestamptz not null default now()
);

-- Local Government Support Fund projects in the home province.
create table public.lgsf_projects (
  id                bigint generated always as identity primary key,
  fiscal_year       int  not null,
  program           text not null,           -- LGSF_FA, LGSF_SBDP, ...
  province          text not null,
  municipality      text,
  barangay          text,
  project           text not null,
  amount_thousands  numeric(18, 2) not null,
  saro_thousands    numeric(18, 2),
  nca_thousands     numeric(18, 2),
  synced_at         timestamptz not null default now(),
  unique nulls not distinct (fiscal_year, program, province, municipality, barangay, project)
);

-- Release orders (SARO) that mention the home province.
create table public.local_releases (
  id                bigint generated always as identity primary key,
  doc_no            text not null unique,
  fiscal_year       int  not null,
  released_on       date,
  department        text not null,
  agency            text not null,
  purpose           text not null,
  legal_basis       text,
  fund_source       text,
  amount_thousands  numeric(18, 2) not null,
  synced_at         timestamptz not null default now()
);

alter table public.execution        enable row level security;
alter table public.execution_totals enable row level security;
alter table public.lgsf_projects    enable row level security;
alter table public.local_releases   enable row level security;

create policy "members read execution" on public.execution
  for select to authenticated using (public.is_member());
create policy "members read execution totals" on public.execution_totals
  for select to authenticated using (public.is_member());
create policy "members read lgsf" on public.lgsf_projects
  for select to authenticated using (public.is_member());
create policy "members read releases" on public.local_releases
  for select to authenticated using (public.is_member());
