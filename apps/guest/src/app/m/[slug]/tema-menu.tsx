"use client";

import { useEffect, useState } from "react";

function temaPerOra(): "day" | "night" {
  const ora = new Date().getHours();
  return ora >= 19 || ora < 7 ? "night" : "day";
}

export function TemaMenu() {
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
      aria-label={tema === "day" ? "Passa al tema notte" : "Passa al tema giorno"}
      title={tema === "day" ? "Tema notte" : "Tema giorno"}
    >
      {tema === "day" ? "☾ Notte" : "☀ Giorno"}
    </button>
  );
}
