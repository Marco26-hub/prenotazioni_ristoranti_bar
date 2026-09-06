"use client";

import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";

export function PrintButton() {
  const t = tComune(useLingua());

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-background"
    >
      {t("azione.stampa")}
    </button>
  );
}
