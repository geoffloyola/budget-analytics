// Client for DBM COMPASS (compass.dbm.gov.ph), the public portal on budget
// releases and execution. It reads the same API the portal's own pages call.
// That API isn't formally documented, so:
//   • requests go one at a time with a pause between them;
//   • the app never calls it on page views, only from `npm run sync:compass`;
//   • shapes are checked, and a sync fails loudly rather than storing junk.

const API = "https://compass-api.dbm.gov.ph/trpc";
const PAUSE_MS = 400;
const LGSF_SOURCES = ["LGSF_FA", "LGSF_GEF", "LGSF_GGG", "LGSF_SBDP", "LGSF_SAFPB"] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const k = (pesos: number | null | undefined) => (pesos == null ? null : Math.round(pesos) / 1000); // → ₱ thousands

async function call<T>(proc: string, input?: unknown): Promise<T> {
  const url = `${API}/${proc}` + (input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`);
  for (let attempt = 1; ; attempt++) {
    await sleep(PAUSE_MS);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const body = (await res.json()) as { result?: { data?: T } };
      if (body.result?.data === undefined) throw new Error(`COMPASS ${proc}: unexpected response shape`);
      return body.result.data;
    }
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`COMPASS ${proc} failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    await sleep(2000 * attempt);
  }
}

// ---- Types (what we store) -----------------------------------------------

type Measures = {
  appropriations: number;
  adjustments: number;
  total_available: number;
  allotments: number;
  obligations: number;
  disbursements: number;
  unreleased: number;
  unobligated: number;
};

export type ExecutionRow = Measures & {
  fiscal_year: number;
  period: string;
  as_of: string;
  department: string;
  agency: string;
  current_year: number | null;
  continuing: number | null;
  unprogrammed: number | null;
};

export type ExecutionTotal = Measures & { fiscal_year: number; period: string; as_of: string };

export type LgsfProject = {
  fiscal_year: number;
  program: string;
  province: string;
  municipality: string | null;
  barangay: string | null;
  project: string;
  amount_thousands: number;
  saro_thousands: number | null;
  nca_thousands: number | null;
};

export type LocalRelease = {
  doc_no: string;
  fiscal_year: number;
  released_on: string | null;
  department: string;
  agency: string;
  purpose: string;
  legal_basis: string | null;
  fund_source: string | null;
  amount_thousands: number;
};

// ---- API shapes -------------------------------------------------------------

type RawMeasures = {
  appropriations: number;
  adjustments: number;
  totalAvailable: number;
  allotments: number;
  obligations: number;
  disbursements: number;
  unreleased: number;
  unobligated: number;
};
type RawEntity = RawMeasures & { key: string; label?: string; hasChildren?: boolean };
type Dataset = { sourceType: string; fiscalYear: number; period: string; updatedAt: string };

function measures(r: RawMeasures): Measures {
  const n = (v: number, name: string) => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`COMPASS: bad ${name} value`);
    return k(v)!;
  };
  return {
    appropriations: n(r.appropriations, "appropriations"),
    adjustments: n(r.adjustments, "adjustments"),
    total_available: n(r.totalAvailable, "totalAvailable"),
    allotments: n(r.allotments, "allotments"),
    obligations: n(r.obligations, "obligations"),
    disbursements: n(r.disbursements, "disbursements"),
    unreleased: n(r.unreleased, "unreleased"),
    unobligated: n(r.unobligated, "unobligated"),
  };
}

// ---- Fetchers ---------------------------------------------------------------

export type Progress = (msg: string) => void;

export async function fetchExecution(log: Progress) {
  const { years } = await call<{ years: number[] }>("saaodb.years");
  const { items: datasets } = await call<{ items: Dataset[] }>("meta.datasets");

  const rows: ExecutionRow[] = [];
  const totals: ExecutionTotal[] = [];

  for (const fy of years) {
    const { periods } = await call<{ periods: string[] }>("saaodb.periods", { fy });
    // Full-year figures when the year is closed; otherwise the latest quarter.
    const period = periods.includes("FY") ? "FY" : periods[periods.length - 1] ?? "FY";
    const ds = datasets.find((d) => d.sourceType === "SAAODB" && d.fiscalYear === fy && d.period === period);
    const as_of = (ds?.updatedAt ?? `${fy}-12-31`).slice(0, 10);
    const base = { fy, period, scope: "agency" };

    const total = await call<RawMeasures & { hasData: boolean }>("saaodb.cascade", base);
    if (!total.hasData) continue;
    totals.push({ fiscal_year: fy, period, as_of, ...measures(total) });

    const depts = await call<{ kind: string; rows: RawEntity[] }>("saaodb.entities", base);
    if (depts.kind !== "entities") throw new Error("COMPASS: unexpected entities response");
    log(`FY${fy} ${period} (as of ${as_of}): ${depts.rows.length} departments`);

    for (const d of depts.rows) {
      // Split of the department's appropriation: current year vs carried over.
      const sub = await call<{ rows: RawEntity[] }>("saaodb.entities", { ...base, expandEntity: d.key });
      const part = (label: string) => sub.rows.find((r) => r.label === label || r.key.endsWith(`-${label}`));
      const cur = part("Current Year Budget");
      const cont = part("Continuing Appropriation");
      const unprog = part("Unprogrammed Appropriations");

      rows.push({
        fiscal_year: fy,
        period,
        as_of,
        department: d.key,
        agency: "",
        ...measures(d),
        current_year: k(cur?.appropriations),
        continuing: k(cont?.appropriations),
        unprogrammed: k(unprog?.totalAvailable),
      });

      if (d.hasChildren) {
        const kids = await call<{ rows: RawEntity[] }>("saaodb.entities", { ...base, expandParent: d.key });
        for (const a of kids.rows) {
          rows.push({
            fiscal_year: fy,
            period,
            as_of,
            department: d.key,
            agency: a.key,
            ...measures(a),
            current_year: null,
            continuing: null,
            unprogrammed: null,
          });
        }
      }
    }
  }
  return { rows, totals };
}

type RawLgsf = {
  fiscalYear: number;
  province: string;
  cityMunicipality: string | null;
  barangay: string | null;
  projectName: string;
  amountSaro: number | null;
  amountNca: number | null;
  amountTotal: number;
};

const title = (s: string | null) =>
  s ? s.toLowerCase().replace(/(^|[\s(-])\S/g, (c) => c.toUpperCase()).trim() : null;

// DBM sometimes lists separate grants under one description (same year, place
// and wording, different amounts). Combine them so each project key is unique
// and totals still match COMPASS.
export function mergeLgsf(rows: LgsfProject[]): LgsfProject[] {
  const byKey = new Map<string, LgsfProject & { count: number }>();
  const add = (a: number | null, b: number | null) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));
  for (const r of rows) {
    const key = [r.fiscal_year, r.program, r.province, r.municipality, r.barangay, r.project].join("|");
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...r, count: 1 });
      continue;
    }
    prev.amount_thousands += r.amount_thousands;
    prev.saro_thousands = add(prev.saro_thousands, r.saro_thousands);
    prev.nca_thousands = add(prev.nca_thousands, r.nca_thousands);
    prev.count++;
  }
  return [...byKey.values()].map(({ count, ...r }) => (count > 1 ? { ...r, project: `${r.project} (${count} releases)` } : r));
}

export async function fetchLgsf(province: string, years: number[], log: Progress): Promise<LgsfProject[]> {
  const out: LgsfProject[] = [];
  for (const source of LGSF_SOURCES) {
    for (const fy of years) {
      for (let page = 1; ; page++) {
        const data = await call<{ rows: RawLgsf[]; total: number }>("lgsf.projects", {
          source,
          fy,
          provinces: [province, province.toUpperCase()],
          page,
          pageSize: 200,
        });
        for (const r of data.rows) {
          if (r.province.toLowerCase() !== province.toLowerCase()) continue; // belt and braces
          out.push({
            fiscal_year: r.fiscalYear,
            program: source,
            province,
            municipality: title(r.cityMunicipality),
            barangay: title(r.barangay),
            project: r.projectName.trim(),
            amount_thousands: k(r.amountTotal)!,
            saro_thousands: k(r.amountSaro),
            nca_thousands: k(r.amountNca),
          });
        }
        if (page * 200 >= data.total) break;
      }
    }
    log(`LGSF ${source}: ${out.filter((p) => p.program === source).length} ${province} projects`);
  }
  return mergeLgsf(out);
}

type RawSaro = {
  docNo: string;
  amount: number;
  releasedDate: string | null;
  purpose: string;
  deptName: string;
  agencyName: string;
  legal: string | null;
  fundSourceName: string | null;
};

// SARO search is free text and returns at most ~30 hits per query, so this
// is a sample of releases mentioning the province, not a complete list.
export async function fetchLocalReleases(province: string, years: number[], log: Progress): Promise<LocalRelease[]> {
  const out = new Map<string, LocalRelease>();
  const mentions = new RegExp(`\\b${province}\\b`, "i");
  for (const fy of years) {
    const data = await call<{ items: RawSaro[]; total: number }>("saro.search", { fy, q: province });
    for (const r of data.items) {
      // Keep only real matches: the search is fuzzy.
      if (!mentions.test(`${r.purpose} ${r.agencyName}`)) continue;
      out.set(r.docNo, {
        doc_no: r.docNo,
        fiscal_year: fy,
        released_on: r.releasedDate,
        department: r.deptName,
        agency: r.agencyName,
        purpose: r.purpose.trim(),
        legal_basis: r.legal || null,
        fund_source: r.fundSourceName || null,
        amount_thousands: k(r.amount)!,
      });
    }
    log(`SARO FY${fy}: ${[...out.values()].filter((x) => x.fiscal_year === fy).length} releases mentioning ${province} (of ${data.total} search hits)`);
  }
  return [...out.values()];
}
