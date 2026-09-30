"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import {
  createAmendment,
  deleteAmendment,
  KINDS,
  setStatus,
  STATUSES,
  updateAmendment,
  type AmendmentInput,
  type AmendmentLine,
  type Kind,
  type Status,
} from "@/lib/amendments";

export type FormState = { error?: string } | null;

async function requireMember() {
  const viewer = await getViewer();
  if (!viewer.member) throw new Error("Not authorized");
  return viewer.member;
}

// "50,000,000", "50M", "1.2B", "750k" → pesos
function parsePesos(raw: string): number | null {
  const s = raw.trim().replace(/[₱,\s]/g, "").toUpperCase();
  const m = s.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[m[2] as "K" | "M" | "B"] ?? 1;
  return Number(m[1]) * mult;
}

async function readInput(formData: FormData): Promise<AmendmentInput | string> {
  const fiscal_year = Number(formData.get("fiscal_year"));
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as Kind;
  const proposed_by = String(formData.get("proposed_by") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim() || null;
  const home_district = formData.get("home_district") === "on";

  if (!Number.isInteger(fiscal_year) || fiscal_year < 2000 || fiscal_year > 2100) return "Choose a fiscal year.";
  if (title.length < 3 || title.length > 300) return "Give the amendment a short title (3–300 characters).";
  if (!KINDS.some((k) => k.key === kind)) return "Choose the type of amendment.";
  if (!proposed_by || proposed_by.length > 200) return "Say who proposed it.";
  if (justification && justification.length > 10000) return "The justification is too long (10,000 characters max).";

  let raw: { department_code?: string; agency_code?: string; item?: string; direction?: string; amount?: string }[];
  try {
    raw = JSON.parse(String(formData.get("lines") ?? "[]"));
    if (!Array.isArray(raw)) throw new Error();
  } catch {
    return "The amounts couldn't be read. Please try again.";
  }
  const lines: AmendmentLine[] = [];
  for (const [i, l] of raw.slice(0, 50).entries()) {
    if (!l.department_code && !l.amount) continue; // blank row
    const pesos = parsePesos(String(l.amount ?? ""));
    if (!l.department_code) return `Line ${i + 1}: choose a department or fund.`;
    if (!pesos) return `Line ${i + 1}: enter an amount, e.g. 50,000,000 or 50M.`;
    const item = String(l.item ?? "").trim().slice(0, 1000) || null;
    lines.push({
      department_code: l.department_code,
      agency_code: l.agency_code || null,
      item,
      amount_thousands: ((l.direction === "cut" ? -1 : 1) * pesos) / 1000,
    });
  }
  const adds = lines.filter((l) => l.amount_thousands > 0).length;
  const cuts = lines.filter((l) => l.amount_thousands < 0).length;
  if (kind === "realignment" && (!adds || !cuts)) return "A realignment needs at least one line that adds and one that cuts.";
  if (kind === "increase" && !adds) return "Add at least one line that adds funds.";
  if (kind === "decrease" && !cuts) return "Add at least one line that cuts funds.";
  if (kind === "new_item" && !adds) return "Add the new item and its amount.";

  return { fiscal_year, title, kind, proposed_by, justification, home_district, lines };
}

export async function saveAmendment(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const input = await readInput(formData);
  if (typeof input === "string") return { error: input };
  const idRaw = formData.get("id");
  let id: number;
  try {
    if (idRaw) {
      id = Number(idRaw);
      await updateAmendment(id, input);
    } else {
      id = await createAmendment(input, member.full_name);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/amendments");
  revalidatePath("/legislation");
  redirect(`/amendments/${id}`);
}

export async function changeStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as Status;
  const note = String(formData.get("note") ?? "").trim().slice(0, 5000) || null;
  if (!STATUSES.some((s) => s.key === status)) return { error: "Choose a status." };
  try {
    await setStatus(id, status, note, member.full_name);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/amendments/${id}`);
  revalidatePath("/amendments");
  revalidatePath("/legislation");
  return {};
}

export async function removeAmendment(formData: FormData) {
  await requireMember();
  await deleteAmendment(Number(formData.get("id")));
  revalidatePath("/amendments");
  redirect("/amendments");
}
