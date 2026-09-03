import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { CambiaForm } from "./form";

/**
 * Fuori dal gestionale di proposito: finché la password iniziale è in uso
 * non si entra da nessun'altra parte, e il layout del gestionale rimanda
 * qui. Se stesse dentro, i due redirect si rincorrerebbero.
 */
export default async function CambiaPasswordPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const sql = db();
  const [u] = await sql<{ must_change_password: boolean }[]>`
    select must_change_password from users where id = ${session.user.id}`;

  if (!u?.must_change_password) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-lg font-semibold">Scegli la tua password</h1>
      <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Quella con cui sei entrato ti è stata comunicata a voce per darti il
        primo accesso: da quel momento non è più solo tua. Scegline una tu.
      </p>
      <div className="mt-5">
        <CambiaForm />
      </div>
    </main>
  );
}
