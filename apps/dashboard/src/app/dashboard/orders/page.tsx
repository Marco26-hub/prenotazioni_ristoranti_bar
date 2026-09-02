import { LiveBoard } from "./live-board";

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="p-4 pb-0 text-xl font-semibold">Ordini in corso</h1>
      <LiveBoard />
    </main>
  );
}
