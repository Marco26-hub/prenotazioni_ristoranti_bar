"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-background"
    >
      Stampa
    </button>
  );
}
