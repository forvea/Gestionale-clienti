// [INTENT]: "Orari e chiusure" del salone: orari settimanali, pause ricorrenti, chiusure straordinarie
// (con le festività italiane suggerite dal Backend per l'anno in corso e il prossimo) e blocchi orari.
// Tutto ciò che rende non prenotabile del tempo per l'INTERO salone sta qui; le assenze e le pause dei
// singoli operatori stanno nella loro scheda.

import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { AdminBusinessHours, BreaksResponse, Closure, Holiday, TimeBlock } from "@/lib/types";
import { BusinessHoursCard, ClosuresCard, TenantBreaksCard, TimeBlocksCard } from "./OrariForms";

export const metadata: Metadata = { title: "Orari e chiusure" };

export default async function OrariPage() {
  const year = new Date().getFullYear();
  const [hours, breaks, closures, blocks, holidaysNow, holidaysNext] = await Promise.all([
    api<AdminBusinessHours>("/api/v1/admin/business-hours"),
    api<BreaksResponse>("/api/v1/admin/breaks"),
    api<Closure[]>("/api/v1/admin/closures"),
    api<TimeBlock[]>("/api/v1/admin/time-blocks"),
    api<Holiday[]>("/api/v1/admin/holidays", { query: { year } }),
    api<Holiday[]>("/api/v1/admin/holidays", { query: { year: year + 1 } }),
  ]);
  // WHY: le festività ricorrenti (annual/easter) si propongono una volta sola: quelle dell'anno prossimo
  // servono solo per ciò che nell'anno corrente è già passato.
  const today = new Date().toLocaleDateString("sv-SE");
  const seen = new Set<string>();
  const holidays = [...holidaysNow, ...holidaysNext].filter((h) => {
    const key = h.recurrence === "annual" ? h.date.slice(5) : h.recurrence;
    if (seen.has(key) || h.date < today) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      <PageHeader title="Orari e chiusure" subtitle="Quando il salone è aperto, e quando non lo è" />
      <div className="grid gap-4 lg:grid-cols-2">
        <BusinessHoursCard hours={hours} />
        <TenantBreaksCard breaks={breaks.tenant} />
        <ClosuresCard closures={closures} holidays={holidays} />
        <TimeBlocksCard blocks={blocks} />
      </div>
    </>
  );
}
