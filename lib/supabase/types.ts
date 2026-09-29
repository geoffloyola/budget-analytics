import type { ExecutionRow, ExecutionTotal, LgsfProject, LocalRelease } from "@/lib/compass";

// Hand-written to match supabase/migrations/. Regenerate with
// `npx supabase gen types typescript` once the project is linked.

export type Stage = "NEP" | "GAA";
export type Sector = "social" | "economic" | "general_public" | "defense" | "debt_burden";
export type ExpenseClass = "PS" | "MOOE" | "CO" | "FinEx";

export type Allocation = {
  id: number;
  fiscal_year: number;
  stage: Stage;
  department_code: string;
  department_name: string;
  sector: Sector;
  agency_code: string;
  agency_name: string;
  expense_class: ExpenseClass;
  amount_thousands: number;
  source: string;
  imported_at: string;
};

export type DistrictItem = {
  id: number;
  fiscal_year: number;
  stage: Stage;
  department_code: string;
  agency_code: string;
  item: string;
  province: string;
  district: string;
  municipality: string | null;
  category: string;
  amount_thousands: number;
  source: string;
  imported_at: string;
};

export type DepartmentTotal = {
  fiscal_year: number;
  stage: Stage;
  department_code: string;
  department_name: string;
  sector: Sector;
  total: number;
  ps: number | null;
  mooe: number | null;
  co: number | null;
  finex: number | null;
  has_sample: boolean;
};

export type AgencyTotal = {
  fiscal_year: number;
  stage: Stage;
  department_code: string;
  agency_code: string;
  agency_name: string;
  total: number;
};

export type Member = {
  user_id: string;
  full_name: string;
  role: "principal" | "staff" | "admin";
  created_at: string;
};

export type Briefing = {
  id: number;
  created_by: string;
  question: string;
  answer: string;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      members: Table<Member>;
      allocations: Table<Allocation, Omit<Allocation, "id" | "imported_at">>;
      district_items: Table<DistrictItem, Omit<DistrictItem, "id" | "imported_at">>;
      briefings: Table<Briefing, { question: string; answer: string }>;
      execution: Table<ExecutionRow & { id: number; synced_at: string }, ExecutionRow>;
      execution_totals: Table<ExecutionTotal & { synced_at: string }, ExecutionTotal>;
      lgsf_projects: Table<LgsfProject & { id: number; synced_at: string }, LgsfProject>;
      local_releases: Table<LocalRelease & { id: number; synced_at: string }, LocalRelease>;
    };
    Views: {
      department_totals: { Row: DepartmentTotal; Relationships: [] };
      agency_totals: { Row: AgencyTotal; Relationships: [] };
    };
    Functions: {
      is_member: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
