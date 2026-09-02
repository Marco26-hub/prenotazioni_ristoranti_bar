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
    return <p className="p-4 text-sm text-gray-500">Nessun ordine in corso.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="rounded border p-3">
          <p className="font-medium">
            Tavolo {item.table_code} — {item.quantity}× {item.item_name}
          </p>
          {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
          <p className="mt-1 text-sm text-gray-600">{STATUS_LABEL[item.status]}</p>
          {NEXT_STATUS[item.status] && (
            <button
              type="button"
              onClick={() => advance(item)}
              className="mt-2 rounded bg-black px-3 py-1 text-sm text-white"
            >
              Segna: {STATUS_LABEL[NEXT_STATUS[item.status]!] ?? "Servito"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
