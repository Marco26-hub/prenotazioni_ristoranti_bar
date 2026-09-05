"use client";

import { useState, useTransition } from "react";
import { removeStaff, changeStaffRole } from "./actions";
import { RangoForm, type TavoloRango } from "./rango-form";
import type { StaffRole } from "@repo/shared";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  roleLabel: string;
  isMe: boolean;
  reparti: string[];
  codice: string | null;
}

export function StaffList({
  staff,
  tavoli,
  nomiPerUtente,
  repartiDisponibili,
}: {
  staff: Member[];
  tavoli: TavoloRango[];
  nomiPerUtente: Record<string, string>;
  repartiDisponibili: { chiave: string; etichetta: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  };

  return (
    <section>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {staff.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="truncate">
                {m.name ?? m.email}
                {m.isMe && <span className="ml-2 text-xs text-muted">(tu)</span>}
              </p>
              {m.name && <p className="truncate text-sm text-muted">{m.email}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {m.isMe ? (
                <span className="text-sm text-muted">{m.roleLabel}</span>
              ) : (
                <>
                  <select
                    defaultValue={m.role}
                    disabled={pending}
                    onChange={(e) =>
                      act(() => changeStaffRole(m.id, e.target.value as StaffRole))
                    }
                    className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value="waiter">Sala</option>
                    <option value="kitchen">Cucina</option>
                    <option value="manager">Responsabile</option>
                    <option value="owner">Titolare</option>
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => removeStaff(m.id))}
                    className="text-sm text-danger underline disabled:opacity-50"
                  >
                    Rimuovi
                  </button>
                </>
              )}
            </div>

            {/* Il rango riguarda chi sta in sala: cucina e titolare non
                servono ai tavoli, e un bottone in più per loro è rumore. */}
            {(m.role === "waiter" || m.role === "manager") && (
              <RangoForm
                repartiDisponibili={repartiDisponibili}
                userId={m.userId}
                nome={m.name ?? m.email}
                tavoli={tavoli}
                altri={nomiPerUtente}
                reparti={m.reparti}
                codice={m.codice}
                ruolo={m.role}
              />
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
