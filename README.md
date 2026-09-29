# National Budget Analytics

A private analytics app for a Member's office on the House Committee on Appropriations. It covers:

- **Overview**: the size, sector mix, largest departments, expense types and biggest movers for any budget edition (e.g. FY2027 NEP), plus key findings computed from the numbers.
- **NEP vs GAA**: any two editions side by side (by default, this year's proposal against the budget in force), with agency drill-down.
- **Spending**: official budget execution from DBM COMPASS. Shows how much each department has been released, has committed and has paid, its unused balances and unreleased funds, and multi-year rates.
- **Trends**: up to 5 departments across fiscal years, plus sector shares by year.
- **District lens**: official Local Government Support Fund projects and release orders (SAROs) for the home province from DBM COMPASS, plus imported NEP/GAA district project lists.
- **AI insights**: plain-language Q&A and briefings from Claude (Opus 5.5), grounded in the loaded data. Answers can be saved as briefings.
- **Import data**: admins upload GAA/NEP tables as CSV.

Stack: Next.js 14 · Supabase (Postgres + auth + RLS) · Tailwind · Anthropic SDK.

## Try it now (demo mode, sample data)

```bash
npm install
npm run sample:generate     # writes data/sample/*.csv (SAMPLE, not official)
echo "DEMO_MODE=1" > .env.local
npm run dev
```

Demo mode reads the sample CSVs from disk and skips sign-in. **Never set `DEMO_MODE` on a real deployment.** A banner flags sample data on every page, and the AI is told to warn about it too.

## Set up for real use

1. **Supabase project**: create one, then run `supabase/migrations/0001_init.sql` in the SQL editor.
2. **Environment**: copy `.env.example` to `.env.local` and fill it in. Remove `DEMO_MODE`.
3. **Accounts** (invite-only): in Supabase → Authentication → Users → *Add user* (auto-confirm, set a password). Then grant access:
   ```sql
   insert into members (user_id, full_name, role)
   values ('<user uuid>', 'Rep. …', 'principal');   -- or 'staff' / 'admin'
   ```
   Signed-in users without a `members` row see nothing: row-level security blocks every table.
4. **Load data**: use the *Import data* page (admins) or the CLI:
   ```bash
   npm run import -- path/to/gaa-2026.csv path/to/nep-2027.csv
   ```
5. **AI**: set `ANTHROPIC_API_KEY` on the server. Optionally set `PRINCIPAL_TITLE` (how the AI refers to the office).

## Official data from DBM COMPASS

```bash
npm run sync:compass
```

This pulls from [compass.dbm.gov.ph](https://compass.dbm.gov.ph), DBM's public portal on releases and spending, and takes about 3 minutes (requests are spaced out on purpose). It stores:

- **SAAODB** execution by department and agency, FY2022 to date (latest period of each year)
- **LGSF** projects in `NEXT_PUBLIC_HOME_PROVINCE`
- **SARO** release orders mentioning the province (text search, a sample and not a complete list)

It writes a snapshot to `data/compass/` (read by demo mode) and, when Supabase is configured, upserts into the tables from `supabase/migrations/0002_compass.sql`. Run it weekly; DBM updates SAAODB quarterly and releases continuously.

Caveats:
- COMPASS's API is what the portal itself uses, not a documented open-data API. Confirm reuse with DBM before relying on it, and keep syncs infrequent.
- SAAODB "appropriations" include **continuing appropriations** carried over from prior years, so they are not GAA figures. The app shows the current-year/continuing split per department.
- Department figures are authoritative. In a few years, the agency breakdown in the source doesn't sum exactly to its department.
- To narrow the District lens to the district, set `NEXT_PUBLIC_HOME_MUNICIPALITIES` to the district's municipalities.

## Data format

Amounts are in **₱ thousands**, the unit DBM prints in the GAA/NEP. Templates are in `data/templates/`.

| File | Columns |
|---|---|
| Allocations | `fiscal_year, stage (NEP/GAA), department_code, department_name, sector, agency_code, agency_name, expense_class (PS/MOOE/CO/FinEx), amount_thousands, source` |
| District items | `fiscal_year, stage, department_code, agency_code, item, province, district, municipality, category, amount_thousands, source` |

`sector` is one of `social, economic, general_public, defense, debt_burden` (DBM's sectoral classification, assigned per department). Re-importing the same year/stage/agency/class updates the row, so corrections are safe. Rows that repeat a key within one file (e.g. several program lines for one agency and class) are added together.

Sources: DBM (GAA, NEP, BESF), the Appropriations Committee secretariat, CPBRD, and agency itemized lists for district projects.

## Not yet covered (good next steps)

- Unprogrammed appropriations and continuing appropriations, as separate from programmed totals
- Program/activity/project (PAP) level detail below agencies
- Inflation-adjusted (real) trends
- COA audit findings per agency
- PDF/Excel parsers for DBM's published tables (today the tables are copied into the CSV template)
