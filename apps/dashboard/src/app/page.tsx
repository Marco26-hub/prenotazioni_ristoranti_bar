import { redirect } from "next/navigation";

/**
 * La radice non ha contenuto proprio: chi arriva qui vuole entrare nel
 * gestionale. Il proxy manda poi al login se non c'è una sessione valida.
 */
export default function RootPage() {
  redirect("/dashboard");
}
