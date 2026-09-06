"use client";

import { useEffect, useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tMenu } from "@/i18n/menu";

function temaPerOra(): "day" | "night" {
  const ora = new Date().getHours();
  return ora >= 19 || ora < 7 ? "night" : "day";
}

export function TemaMenu() {
  const t = tMenu(useLingua());
  const [tema, setTema] = useState<"day" | "night">("day");

  useEffect(() => {
    const aggiorna = () => {
      const salvato = window.sessionStorage.getItem("menu-theme");
      const prossimo = salvato === "day" || salvato === "night" ? salvato : temaPerOra();
      setTema(prossimo);
      document.documentElement.dataset.menuTheme = prossimo;
      document.documentElement.style.colorScheme = prossimo === "night" ? "dark" : "light";
    };
    aggiorna();
    const timer = window.setInterval(aggiorna, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const cambia = () => {
    const prossimo = tema === "day" ? "night" : "day";
    window.sessionStorage.setItem("menu-theme", prossimo);
    setTema(prossimo);
    document.documentElement.dataset.menuTheme = prossimo;
    document.documentElement.style.colorScheme = prossimo === "night" ? "dark" : "light";
  };

  return (
    <button
      type="button"
      onClick={cambia}
      className="menu-theme-toggle rounded-full border border-border px-3 py-2 text-sm font-medium"
      aria-label={tema === "day" ? t("tema.passa_notte") : t("tema.passa_giorno")}
      title={tema === "day" ? t("tema.titolo.notte") : t("tema.titolo.giorno")}
    >
      {tema === "day" ? t("tema.notte") : t("tema.giorno")}
    </button>
  );
}
