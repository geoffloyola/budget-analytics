## For admins

Admins see one extra menu item, **Import data**. Most admin tasks happen outside the app, in Supabase (accounts) or on the computer the app was set up from (data scripts).

**Give someone access:**

1. In Supabase, go to **Authentication → Users → Add user → Create new user**. Enter their email and a temporary password, and tick **Auto Confirm User**.
2. Grant their role on the setup computer (next table), choosing **principal** (the Congressman), **staff** or **admin**.
3. Send them the link, their email and the temporary password. They choose their own password at first sign-in.

Someone who can sign in but has no role sees an "Access not yet granted" page and no data.

**Load new data:** a spreadsheet in the app's CSV format can be uploaded on **Import data**; the page shows the columns it expects. DBM's large line-item files and the COMPASS refresh use the commands below. Run them in the `budget-analytics` folder on the setup computer.

| Task | Command | When |
| --- | --- | --- |
| Grant a role | `npm run member:add -- email@example.com "Full Name" staff` | Each new person |
| Load a DBM budget file | `npm run import:dbm -- data/sources/<file>.xlsx --year 2027 --stage HOUSE` | When a new version comes out. Stage is NEP, HOUSE, SENATE, BICAM or GAA |
| Refresh spending data | `npm run sync:compass` | Weekly (about 3 minutes) |

Each import prints its total before saving. Check it against DBM's published figure; adding `--dry-run` checks the file without saving. Loading a version again replaces the earlier load, so fixing a mistake is safe.
