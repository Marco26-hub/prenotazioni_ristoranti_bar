"use client";

import { useEffect, useState } from "react";
import { setOrderItemStatus } from "./actions";
import type { OrderItemStatus } from "@repo/shared";

interface LiveItem {
  id: string;
  table_code: string;
  item_name: string;
  quantity: number;
  status: OrderItemStatus;
  notes: string | null;
}

const NEXT_STATUS: Partial<Record<OrderItemStatus, OrderItemStatus>> = {
  sent_to_kitchen: "preparing",
  preparing: "ready",
  ready: "served",
};

const STATUS_LABEL: Record<string, string> = {
  sent_to_kitchen: "Da preparare",
  preparing: "In preparazione",
  ready: "Pronto",
};

export function LiveBoard() {
  const [items, setItems] = useState<LiveItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/orders-live");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const advance = async (item: LiveItem) => {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    try {
      await setOrderItemStatus(item.id, next);
    } catch {
      // Server action fallita (sessione scaduta, permessi) — non lasciare
      // la UI a mostrare uno stato che il DB non ha mai registrato.
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
    }
  };

  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Nessun ordine in corso.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-xl border bg-surface p-4 ${
            item.status === "ready" ? "border-success" : "border-border"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">Tavolo {item.table_code}</p>
            <span className="shrink-0 text-xs text-muted">{STATUS_LABEL[item.status]}</span>
          </div>
          <p className="mt-1 text-lg leading-snug">
            <strong className="tabular-nums">{item.quantity}×</strong> {item.item_name}
          </p>
          {item.notes && <p className="mt-0.5 text-sm italic text-muted">{item.notes}</p>}
          {NEXT_STATUS[item.status] && (
            <button
              type="button"
              onClick={() => advance(item)}
              className="mt-3 min-h-11 w-full rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground active:scale-95"
            >
              Segna: {STATUS_LABEL[NEXT_STATUS[item.status]!] ?? "Servito"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
