"use client";

// Printing gives a PDF copy too; the menu and contents are hidden in print.
export default function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
