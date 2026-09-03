"use client";

import { useTransition } from "react";
import { segnaTutteLette } from "./actions";

/** Un tocco per azzerare il "da leggere": senza, il numero non scende mai. */
export function SegnaLette({ quante }: { quante: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => segnaTutteLette().then(() => undefined))}
      className="mt-3 min-h-11 rounded-full border border-border px-5 text-sm disabled:opacity-60"
    >
      {pending ? "Segno…" : `Segna lette (${quante})`}
    </button>
  );
}
