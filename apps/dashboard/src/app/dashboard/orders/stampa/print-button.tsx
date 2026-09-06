"use client";

import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";

export function PrintButton() {
  const t = tComune(useLingua());

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
    >
      {t("azione.stampa")}
    </button>
  );
}
