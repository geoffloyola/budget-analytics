"use client";

import { useFormState, useFormStatus } from "react-dom";
import { importFile, type ImportState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Importing…" : "Import"}
    </button>
  );
}

export default function ImportForm() {
  const [state, action] = useFormState<ImportState, FormData>(importFile, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <label className="block text-sm font-medium">
        CSV file
        <input className="input mt-1" type="file" name="file" accept=".csv,text/csv" required />
      </label>
      <Submit />
      {state?.ok && (
        <p role="status" className="text-sm text-good">
          {state.message}
        </p>
      )}
      {state && !state.ok && (
        <div role="alert" className="text-sm text-critical">
          <p>{state.message}</p>
          {state.errors.length > 0 && (
            <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5 font-mono text-xs">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
