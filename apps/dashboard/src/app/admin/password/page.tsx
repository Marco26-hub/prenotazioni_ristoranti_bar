import { requireSuperAdmin } from "@/lib/authz";
import { CambiaPasswordForm } from "./form";
import { tSuperAdmin } from "@/i18n/superadmin";
import { linguaUtente } from "@/lib/lingua";

export default async function PasswordPage() {
  const admin = await requireSuperAdmin();
  const t = tSuperAdmin(await linguaUtente());

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-lg font-semibold">
        {admin.deveCambiarePassword
          ? t("password.titolo.primo")
          : t("password.titolo")}
      </h1>
      {admin.deveCambiarePassword && (
        <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t("password.avviso")}
        </p>
      )}
      <div className="mt-5">
        <CambiaPasswordForm />
      </div>
    </main>
  );
}
