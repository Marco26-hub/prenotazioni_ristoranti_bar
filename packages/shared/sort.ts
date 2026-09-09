const CODICI = new Intl.Collator("it-IT", {
  numeric: true,
  sensitivity: "base",
});

/** Ordina codici leggibili come li ordinerebbe una persona: T2 prima di T10. */
export function confrontaCodici(a: string, b: string): number {
  return CODICI.compare(a, b);
}
