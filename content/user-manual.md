# National Budget Analytics — User Manual

National Budget Analytics lets the Congressman and his staff see the national budget, follow it through Congress, track amendments and ask questions in plain language.

## Getting started

You need an account from the office administrator; there is no sign-up page. The app works in any web browser, on a computer or a phone.

1. Open [ph-budget-analytics.netlify.app](https://ph-budget-analytics.netlify.app).
2. Sign in with the email and the **temporary password** the administrator gave you.
3. The first time, the app asks you to choose **your own password**: at least 8 characters, with a letter and a number. Type the temporary password once more, then your new password twice.
4. You land on the **Overview** page. Use the menu along the top to move between pages.

To change your password later, click your name at the top right. To leave, click **Sign out**, especially on a shared computer.

| Menu item | Use it to |
| --- | --- |
| Overview | See one budget at a glance: total, biggest items, biggest changes |
| In Congress | Follow this year's budget through the House, Senate and Bicam |
| Amendments | Log proposed amendments and track where each one stands |
| Compare | Put any two budgets side by side, department by department |
| Spending | See how much of the budget has been released, committed and paid |
| Trends | See how departments' budgets changed over the years |
| District lens | See projects and funds for Bataan and the district |
| AI insights | Ask questions in plain language and get briefings |
| Help | Open this manual |
| Import data | Load new budget files (admins only) |

## At a glance

[[diagram:budget-cycle]]

The budget moves through four overlapping stages each year. The FY2027 budget is now in Congress, while the FY2026 budget is being spent.

## Reading the numbers

All amounts are in Philippine pesos, shortened for reading: **₱7.20T** = 7.20 trillion, **₱644.0B** = 644.0 billion, **₱403.1M** = 403.1 million. Hover over or tap a bar or line to see the exact figure.

Each fiscal year's budget exists in several **versions** as it moves through Congress. The app labels every figure with its year and version, e.g. "FY2027 NEP".

| Version | What it is |
| --- | --- |
| NEP | National Expenditure Program: the President's proposed budget, submitted to Congress around July–August |
| House | The House of Representatives' version of the General Appropriations Bill (GAB) |
| Senate | The Senate's version of the GAB |
| Bicam | The version agreed by the Bicameral Conference Committee, then ratified by both Houses |
| GAA | General Appropriations Act: the budget as signed into law, after any vetoes |

Where the figures come from:

- **Budgets (NEP and GAA):** DBM's official line-item spreadsheets. Totals match DBM to the peso.
- **Spending and releases:** DBM COMPASS ([compass.dbm.gov.ph](https://compass.dbm.gov.ph)), refreshed by the administrator.
- **Amendments:** the office's own log. It is internal working material, not an official figure.

Two things to keep in mind:

- **Sectors** (social, economic, general public services, defense, debt burden) are assigned per department. DBM's own sector figures classify by function, so they can differ slightly.
- A yellow **Sample data** banner means you are looking at placeholder numbers. Never use those in a briefing.

## Overview page

The Overview shows one budget at a glance; it opens on the newest one (now the FY2027 NEP). Use the **Budget** dropdown at the top right to switch.

- **Four boxes at the top:** the total, the change from the budget before it, the largest item, and capital outlays (infrastructure and equipment). A ▲ means up, a ▼ means down.
- **Key findings:** short statements worked out from the numbers, such as the biggest increase and the biggest cut. They are always exact, because they are calculated, not written by AI.
- **By sector:** how the budget splits across social services, economic services, general public services, defense and debt.
- **Largest departments:** the top 12, with bars you can hover over for exact amounts.
- **Biggest movers:** the five largest increases and cuts. Click one to open it on the Compare page.
- **By type of expense:** personnel, operating expenses (MOOE), capital outlays and financial expenses such as interest.

## In Congress page

In Congress follows one fiscal year's budget from the President's proposal to the signed GAA, and shows what changed at each step. Pick the year with the **Fiscal year** dropdown.

- **The five cards across the top** are the versions in order. A card with a green ✓ is loaded, with its total. "Under way" in yellow means that step usually happens around now; the months follow DBM's typical calendar, and actual dates vary.
- **The table** lists every department and fund, with its amount in each loaded version. A ▲ or ▼ beside an amount means that version changed it. **vs NEP** is the change from the President's proposal so far.
- **Click a department** to see the same figures for each of its agencies.
- **Sort** by *Biggest change* to see where Congress moved money, or by *Largest* to see the biggest budgets first.
- A blue **"2 amendments"** tag under a department links to the amendments that affect it.
- **Realigned (gross)** adds up everything moved into departments. When the total stays the same, as in FY2026, the money was moved around rather than added.

New versions appear here once the administrator loads them.

## Amendments log

The Amendments log is the office's shared record of proposed changes to the budget during deliberations: who proposed each one, where the money moves, and where it stands. Everyone with an account can add and update entries, and every change is recorded with a name and time. The log is confidential working material.

**To log a new amendment:**

1. Go to **Amendments** and click **＋ Log an amendment**.
2. Write a short **title**, e.g. "Realign ₱500M from DPWH central office to Bataan 2nd DEO flood control".
3. Choose the **type**:
    - *Realignment*: moves money from one item to another.
    - *Increase* or *Cut*: changes one item.
    - *New item*: adds a project that isn't in the budget.
    - *Special provision*: changes the wording only, with no amounts.
4. Pick the **fiscal year**, and fill in **Proposed by** (a Member, the committee, the Senate).
5. Tick **Affects the home district** if it does. Add the reasons and sources under **Justification**.
6. Under **Where the money moves**, fill in one line per item:
    - **＋ Add** or **− Cut**.
    - The **department or fund**, and optionally the agency and the program or project.
    - The **amount**. You can type 500,000,000 or the short forms 500M, 1.2B or 750k.
7. For a realignment, check the line under the amounts: it should read **✓ balanced**, meaning the adds equal the cuts. ⚠ means they don't match.
8. Click **Log amendment**.

**To record progress:** open the amendment, choose its new status under **Update status**, add a note if useful (e.g. "adopted with modification, ₱300M instead of ₱500M"), and click **Update**. The note appears in the **History** with your name.

| Status | Means |
| --- | --- |
| Proposed | Logged, not yet acted on |
| Adopted in committee | Accepted by the Committee on Appropriations |
| Approved in House plenary | Included in the House-approved GAB |
| In Senate version | Included in the Senate's version |
| In bicameral version | Kept in the Bicam version |
| Enacted in GAA | In the signed budget |
| Rejected / Withdrawn / Vetoed | Not going ahead |

On the list, filter by status with the buttons above the table, or click a department name to see only its amendments. Use **Edit** to fix details; status changes always go through **Update status**, so the history stays complete. Only the person who logged an amendment, or an admin, can delete it.

## Compare page

Compare puts any two budgets side by side. Choose them with **From** and **To** at the top right. It opens on this year's proposal against the budget now in force (FY2026 GAA → FY2027 NEP).

- The departments are sorted by the size of the change, largest first. The bar on the right grows left for a cut and right for an increase.
- **Click a department** to see its agencies.
- To see **what Congress changed** in a year, choose the same year twice, e.g. From *FY2026 NEP* To *FY2026 GAA*. The page then says "What changed in Congress".

Useful pairs:

| From → To | Shows |
| --- | --- |
| FY2026 GAA → FY2027 NEP | What the President proposes to change from this year's budget |
| FY2026 NEP → FY2026 GAA | What Congress changed last year |
| FY2025 GAA → FY2026 GAA | How the enacted budget changed year to year |

## Spending page

Spending shows how much of the budget has actually moved, using DBM COMPASS data from FY2022 to the latest quarter. Pick the year at the top right. A year marked *(to Q2)* is still in progress, so its rates will be lower than a full year's.

The money moves in four steps, and the page follows them:

1. **Available to spend:** the appropriation, including funds carried over from earlier years.
2. **Released to agencies (allotments):** permission to commit the money.
3. **Committed (obligations):** contracts signed and staff hired.
4. **Paid (disbursements):** money actually paid out.

- **Key findings** point out the slowest departments to commit their funds, the largest unused balances, and funds not yet released.
- **Rates over the years** compares the commitment and payment rates with past years.
- **The table** can be sorted by *Unused releases*, *Slowest to commit*, *Not yet released* or *Largest budget*. Click a department to see its agencies, and how much of its money is new this year versus carried over.

A low rate early in the year is normal. Compare with the same quarter of past years before raising it in a hearing.

## Trends and District lens

**Trends** draws a line per department across the years.

- Tick up to **5 departments** in the list on the right. Each keeps its colour even when you add or remove others.
- Switch between **Enacted (GAA)** and **Proposed (NEP)** at the top.
- The table below shows each sector's share of the budget by year.
- Amounts are not adjusted for inflation.

**District lens** focuses on Bataan and the 2nd District (Balanga, Limay, Orion and Pilar). It has two parts.

1. **Official releases** (from DBM COMPASS), for the year chosen with the buttons at the right:
    - Local Government Support Fund projects by municipality, each with its barangay where DBM gives one.
    - Release orders (SAROs) that mention Bataan. This list is a sample found by text search, not a complete record.
2. **Proposed & enacted district items** (from the NEP and GAA), for the budget chosen at the top:
    - Items under the **Bataan 2nd District Engineering Office**, compared with the previous version, by category and municipality.
    - **Province-wide items** that serve all of Bataan, such as the schools division, Bataan General Hospital and the Bataan–Cavite bridge. These are listed separately and not counted in the district total.

## AI insights

AI insights answers questions about the budget in plain language. It reads the budgets, spending data, district items and amendments loaded in the app, and works out its figures from them.

1. Go to **AI insights**.
2. Click one of the suggested questions, or type your own in the box at the bottom and press **Enter**.
3. The answer takes about **15–60 seconds**. Longer briefings take longer. Click **Stop** to cancel.
4. Ask a follow-up in the same box; it remembers the conversation. Click **New** to start over.
5. Under an answer, click **Copy** to paste it elsewhere, or **Save briefing** to keep it for everyone in the office. Saved briefings are listed at the bottom of the page.

Questions that work well:

- "Give me a one-page briefing on the FY2027 NEP for the committee hearing."
- "Draft 8 questions for the DPWH budget hearing using its spending record."
- "What did Congress change between the FY2026 NEP and GAA?"
- "Which departments are slowest to spend their 2026 releases?"
- "Summarize the open amendments that affect the home district."

Before using an answer outside the office:

- **Check key figures** against the source pages in the app or DBM's documents. The AI is usually right with numbers, but not always.
- It says so when the data doesn't cover a question, e.g. a project-level detail that isn't loaded. Treat anything it can't source as unconfirmed.
- Answers that draw on the **amendments log** use internal working material. Don't quote them as official figures.
- Each question costs roughly ₱1–15 in AI fees (US$0.02–0.25), less for quick follow-ups. A busy day costs a few hundred pesos at most.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Wrong email or password" | Check the email's spelling and that Caps Lock is off. If it still fails, ask an admin to set a new temporary password in Supabase. |
| "Access not yet granted" | Your sign-in works but you have no role yet. Ask an admin to grant you one. |
| The app keeps sending me to the password page | Finish choosing your own password: the temporary one, then the new one twice. |
| A page is empty or says "No budget data yet" | That budget or year hasn't been loaded. Ask an admin. |
| A yellow "Sample data" banner | These are placeholder numbers. Don't use them; ask an admin to load the official data. |
| AI says "isn't set up yet" | The AI key is missing on the server. Ask the admin who manages the Netlify site. |
| An AI answer stops mid-sentence | Ask "please continue", or ask for a shorter answer. Tell an admin if it keeps happening. |
| Spending figures look old | The page footer shows when it was last refreshed. Ask an admin to run the COMPASS refresh. |
| Numbers differ from a DBM document | Check that you are comparing the same year and version (NEP vs GAA), and that the DBM figure isn't grouped by function. Report the difference to an admin. |
