import { requireSuperAdmin } from "@/lib/authz";
import { CambiaPasswordForm } from "./form";

export default async function PasswordPage() {
  const admin = await requireSuperAdmin();

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-lg font-semibold">
        {admin.deveCambiarePassword ? "Scegli la tua password" : "Cambia password"}
      </h1>
      {admin.deveCambiarePassword && (
        <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          La password con cui sei entrato è stata comunicata in chiaro per
          poterti dare il primo accesso: da quel momento non è più un segreto.
          Cambiala adesso — questo account vede i dati di tutti i locali.
        </p>
      )}
      <div className="mt-5">
        <CambiaPasswordForm />
      </div>
    </main>
  );
}
