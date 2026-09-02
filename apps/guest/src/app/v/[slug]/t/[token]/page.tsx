import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { resolveTableFromQr } from "@/lib/table";
import { OrderMenu } from "./order-menu";
import { Bill } from "./bill";

export default async function TablePage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const resolved = await resolveTableFromQr(slug, token);
  if (!resolved) notFound();

  const sql = db();

  const categories = await sql<{ id: string; name: string; sort_order: number }[]>`
    select id, name, sort_order from menu_categories
    where venue_id = ${resolved.venue.id}
    order by sort_order`;

  const items = await sql<
    {
      id: string;
      category_id: string | null;
      name: string;
      description: string | null;
      price_cents: number;
      allergens: string[] | null;
    }[]
  >`
    select id, category_id, name, description, price_cents, allergens
    from menu_items
    where venue_id = ${resolved.venue.id} and available = true
    order by sort_order`;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{resolved.venue.name}</h1>
        <p className="text-sm text-gray-500">Tavolo {resolved.table.code}</p>
      </header>

      <OrderMenu
        sessionId={resolved.sessionId}
        currency={resolved.venue.currency}
        categories={categories}
        items={items}
      />

      <Bill sessionId={resolved.sessionId} />
    </main>
  );
}
