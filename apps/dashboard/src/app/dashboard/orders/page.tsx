import Link from "next/link";
import { LiveBoard } from "./live-board";

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ordini in corso</h1>
        <Link href="/dashboard/orders/stampa" className="text-sm underline">
          Stampa comande
        </Link>
      </div>
      <LiveBoard />
    </main>
  );
}
