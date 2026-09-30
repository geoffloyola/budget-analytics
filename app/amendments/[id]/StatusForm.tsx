"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changeStatus } from "../actions";

const OPTIONS = [
  ["proposed", "Proposed"],
  ["committee", "Adopted in committee"],
  ["plenary", "Approved in House plenary"],
  ["senate", "In Senate version"],
  ["bicam", "In bicameral version"],
  ["enacted", "Enacted in GAA"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
  ["vetoed", "Vetoed"],
] as const;

export default function StatusForm({ id, current }: { id: number; current: string }) {
  const [state, action] = useFormState(changeStatus, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state && !state.error) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={current} className="input" aria-label="New status">
        {OPTIONS.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <textarea name="note" rows={2} maxLength={5000} className="input" placeholder="Note (optional): e.g. adopted with modification, ₱300M instead of ₱500M" />
      {state?.error && (
        <p role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p role="status" className="text-sm text-good">
          Updated.
        </p>
      )}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Update"}
    </button>
  );
}
