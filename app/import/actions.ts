"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { detectKind } from "@/lib/csv";
import { importCsv } from "@/lib/importer";

export type ImportState = { ok: boolean; message: string; errors: string[] } | null;

const MAX_BYTES = 20 * 1024 * 1024;

export async function importFile(_prev: ImportState, formData: FormData): Promise<ImportState> {
  // Re-checked here: a server action is callable directly, not only from the page.
  const viewer = await getViewer();
  if (viewer.demo || viewer.member?.role !== "admin") {
    return { ok: false, message: "Only admins can import data.", errors: [] };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file.", errors: [] };
  if (file.size > MAX_BYTES) return { ok: false, message: "File is larger than 20 MB. Split it by year.", errors: [] };

  const text = await file.text();
  const kind = detectKind(text);
  if (!kind) {
    return { ok: false, message: "Can't tell the file type from its header row. Use one of the templates below.", errors: [] };
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is not set on the server.", errors: [] };
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });

  const result = await importCsv(admin, kind, text);
  if (result.errors.length) {
    return {
      ok: false,
      message: `${result.errors.length} problem(s) found. ${
        result.imported ? `Rows after ${result.imported} were not imported.` : "Nothing was imported."
      }`,
      errors: result.errors.slice(0, 100),
    };
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Imported ${result.imported.toLocaleString()} ${kind === "allocations" ? "allocation" : "district item"} rows from ${file.name}.`,
    errors: [],
  };
}
