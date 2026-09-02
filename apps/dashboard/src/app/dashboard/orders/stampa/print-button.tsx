"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
    >
      Stampa
    </button>
  );
}
