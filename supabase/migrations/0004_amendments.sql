-- Amendments log: proposed changes to the budget during legislation, and
-- where each one stands. Amounts in THOUSAND pesos like the rest of the app.
--
-- Status follows the legislative path:
--   proposed → committee (adopted in committee) → plenary (approved by the
--   House) → senate (in the Senate version) → bicam (in the bicameral
--   version) → enacted (in the signed GAA)
-- or ends as rejected / withdrawn / vetoed.

create table public.amendments (
  id            bigint generated always as identity primary key,
  fiscal_year   int  not null check (fiscal_year between 2000 and 2100),
  title         text not null check (length(title) between 3 and 300),
  kind          text not null check (kind in ('realignment', 'increase', 'decrease', 'new_item', 'provision')),
  proposed_by   text not null check (length(proposed_by) between 1 and 200),
  justification text check (length(justification) <= 10000),
  status        text not null default 'proposed' check (status in
                  ('proposed', 'committee', 'plenary', 'senate', 'bicam', 'enacted', 'rejected', 'withdrawn', 'vetoed')),
  home_district boolean not null default false,
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index amendments_year on public.amendments (fiscal_year, status);

-- Where the money moves. Positive = added, negative = cut.
create table public.amendment_lines (
  id               bigint generated always as identity primary key,
  amendment_id     bigint not null references public.amendments (id) on delete cascade,
  department_code  text not null,
  agency_code      text,
  item             text check (length(item) <= 1000),
  amount_thousands numeric(18, 2) not null check (amount_thousands <> 0)
);
create index amendment_lines_amendment on public.amendment_lines (amendment_id);
create index amendment_lines_dept on public.amendment_lines (department_code);

-- Audit trail: every status change and note, with who and when.
create table public.amendment_events (
  id            bigint generated always as identity primary key,
  amendment_id  bigint not null references public.amendments (id) on delete cascade,
  status        text not null,
  note          text check (length(note) <= 5000),
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now()
);
create index amendment_events_amendment on public.amendment_events (amendment_id, created_at);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger amendments_touch before update on public.amendments
  for each row execute function public.touch_updated_at();

alter table public.amendments       enable row level security;
alter table public.amendment_lines  enable row level security;
alter table public.amendment_events enable row level security;

-- Every member can read and work on amendments; the log is a team tool.
create policy "members read amendments" on public.amendments
  for select to authenticated using (public.is_member());
create policy "members add amendments" on public.amendments
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());
create policy "members edit amendments" on public.amendments
  for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "author or admin deletes amendments" on public.amendments
  for delete to authenticated using (public.is_admin() or created_by = auth.uid());

create policy "members read lines" on public.amendment_lines
  for select to authenticated using (public.is_member());
create policy "members write lines" on public.amendment_lines
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Events are append-only: no update or delete policies.
create policy "members read events" on public.amendment_events
  for select to authenticated using (public.is_member());
create policy "members add events" on public.amendment_events
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());

-- Names for the audit trail (members can already see each other's names).
create or replace view public.amendment_events_named with (security_invoker = true) as
select e.*, m.full_name as by_name
from public.amendment_events e
left join public.members m on m.user_id = e.created_by;
