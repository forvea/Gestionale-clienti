// [INTENT]: Elenco operatori con ruolo, servizi eseguiti e giorni lavorati. `?archiviati=1` include gli
// eliminati.

import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { DAY_SHORT } from "@/lib/format";
import type { Service, Staff } from "@/lib/types";

export const metadata: Metadata = { title: "Operatori" };

export default async function StaffListPage({ searchParams }: PageProps<"/operatori">) {
  const sp = await searchParams;
  const includeDeleted = sp.archiviati === "1";
  const [staff, services] = await Promise.all([
    api<Staff[]>("/api/v1/admin/staff", { query: { includeDeleted: includeDeleted || undefined } }),
    api<Service[]>("/api/v1/admin/services", { query: { includeDeleted: true } }),
  ]);
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "?";
  const sorted = [...staff].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Operatori"
        subtitle={`${staff.length} ${staff.length === 1 ? "operatore" : "operatori"}`}
        actions={
          <>
            <LinkButton variant="ghost" href={includeDeleted ? "/operatori" : "/operatori?archiviati=1"}>
              {includeDeleted ? "Nascondi eliminati" : "Mostra eliminati"}
            </LinkButton>
            <LinkButton href="/operatori/nuovo">+ Nuovo operatore</LinkButton>
          </>
        }
      />
      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert kind="success">Operatore eliminato.</Alert>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState>Nessun operatore. Senza operatori sono prenotabili solo i servizi con capienza propria.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((s) => {
            const days = s.businessHoursConfigured
              ? s.businessHours.filter((h) => h.isAvailable).map((h) => DAY_SHORT[h.dayOfWeek]).join(" ")
              : "come il salone";
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <span className="min-w-48 flex-1">
                  {s.deletedAt ? (
                    <span className="block font-medium text-neutral-400 line-through">{s.name}</span>
                  ) : (
                    <Link href={`/operatori/${s.id}`} className="block font-medium text-neutral-900 hover:text-blue-700">
                      {s.name}
                    </Link>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {[s.role, s.specialization].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="text-xs text-neutral-600">
                  {s.services.length === 0 ? "nessun servizio" : s.services.map((a) => serviceName(a.serviceId)).join(", ")}
                </span>
                <span className="text-xs tabular-nums text-neutral-500">{days || "mai"}</span>
                {s.deletedAt ? (
                  <Badge className="border-neutral-200 bg-neutral-100 text-neutral-500">Eliminato</Badge>
                ) : s.active ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Attivo</Badge>
                ) : (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">Non attivo</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
