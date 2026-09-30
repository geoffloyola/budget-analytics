# National Budget Analytics

A private analytics app for a Member's office on the House Committee on Appropriations. It covers:

- **Overview**: the size, sector mix, largest departments, expense types and biggest movers for any budget edition (e.g. FY2027 NEP), plus key findings computed from the numbers.
- **In Congress**: one fiscal year's budget through each version (NEP → House → Senate → Bicam → GAA), per department and agency, with what changed at each step and where the typical calendar says the process is.
- **Compare**: any two editions side by side (by default, this year's proposal against the budget in force), with agency drill-down.
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

## Set up for real use (Supabase + Netlify)

1. **Supabase**: create a project, then fill `.env.local` from `.env.example` (URL, anon key, service-role key, and `SUPABASE_DB_URL`). Remove `DEMO_MODE`.
2. **Database**: `npm run db:migrate` creates the tables and security rules.
3. **Data**: `npm run sync:compass:load` loads the saved COMPASS snapshot (or `npm run sync:compass` for a fresh pull). Import GAA/NEP CSVs with `npm run import -- file.csv` or the *Import data* page.
4. **People** (invite-only): create each sign-in in Supabase → Authentication → Users → *Add user* (tick *Auto Confirm User*, give a temporary password), then grant access:
   ```bash
   npm run member:add -- someone@example.com "Full Name" staff   # or principal / admin
   ```
   On first sign-in they must choose their own password. Signed-in users who aren't members see no data: row-level security blocks every table.
5. **Netlify**: import the GitHub repo. Set these environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_HOME_PROVINCE`, `NEXT_PUBLIC_HOME_DISTRICT`, and optionally `NEXT_PUBLIC_HOME_MUNICIPALITIES` and `PRINCIPAL_TITLE`. In Supabase → Authentication → URL Configuration, set the Site URL to the Netlify address.

`DEMO_MODE` only works under `npm run dev`. A production build always requires sign-in.

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

## Real NEP / GAA data from DBM

DBM publishes each NEP and GAA as a line-item Excel file ("by object"), e.g. `NEP-FY2027.xlsx` and `FY2026-GAA-Byobject.xlsx`, on dbm.gov.ph. DBM blocks automated downloads, so download them in a browser into `data/sources/` (git-ignored; each is about 65 MB), then:

```bash
npm run import:dbm -- data/sources/NEP-FY2027.xlsx --year 2027 --stage NEP
npm run import:dbm -- data/sources/FY2026-GAA-Byobject.xlsx --year 2026 --stage GAA
```

Stages: `NEP`, `HOUSE` (House version of the GAB), `SENATE`, `BICAM` (bicameral conference version), `GAA`. Load each version as it becomes available and the *In Congress* page tracks the changes. Each run takes 1–2 minutes. It prints totals to check against DBM's published figures (add `--dry-run` to check without saving), then replaces that year and stage in Supabase:
- **allocations**: department/agency × expense class; special purpose funds and automatic appropriations (tax allotment, debt interest, pension fund…) each become their own line
- **district_items**: every line tied to the home province, via its operating unit (e.g. "Bataan 2nd District Engineering Office", "Division of Bataan") or its description. Items under a district engineering office get that district; the rest are "Province-wide"

Sector is assigned per department (lib/dbm.ts), an approximation of DBM's functional classification.

## Data format (manual CSV import)

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
