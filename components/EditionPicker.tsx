"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A budget "edition" is a fiscal year + stage, e.g. "2027-NEP". Selecting one
// rewrites the given query param so the page (a Server Component) re-renders.
export default function EditionPicker({
  label,
  param,
  value,
  options,
}: {
  label: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-ink2">
      <span className="font-medium">{label}</span>
      <select
        className="input w-auto py-1.5"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set(param, e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
