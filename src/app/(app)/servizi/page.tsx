// [INTENT]: Catalogo servizi del salone: elenco con durata, prezzo, capienza, buffer, stato e colore.
// `?archiviati=1` include i servizi eliminati (soft delete), che dal Backend arrivano con deletedAt.

import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { BUFFER_POSITION_LABEL, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";

export const metadata: Metadata = { title: "Servizi" };

export default async function ServicesPage({ searchParams }: PageProps<"/servizi">) {
  const sp = await searchParams;
  const includeDeleted = sp.archiviati === "1";
  const services = await api<Service[]>("/api/v1/admin/services", { query: { includeDeleted: includeDeleted || undefined } });
  const sorted = [...services].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Servizi"
        subtitle={`${services.length} ${services.length === 1 ? "servizio" : "servizi"}`}
        actions={
          <>
            <LinkButton variant="ghost" href={includeDeleted ? "/servizi" : "/servizi?archiviati=1"}>
              {includeDeleted ? "Nascondi eliminati" : "Mostra eliminati"}
            </LinkButton>
            <LinkButton href="/servizi/nuovo">+ Nuovo servizio</LinkButton>
          </>
        }
      />
      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert kind="success">Servizio eliminato.</Alert>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState>Nessun servizio. Crea il primo per rendere prenotabile il salone.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2">Servizio</th>
                <th className="px-4 py-2">Durata</th>
                <th className="px-4 py-2">Prezzo</th>
                <th className="px-4 py-2">Buffer</th>
                <th className="px-4 py-2">Capienza</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-neutral-200" style={{ background: s.color ?? "transparent" }} aria-hidden />
                      <span>
                        {s.deletedAt ? (
                          <span className="text-neutral-400 line-through">{s.name}</span>
                        ) : (
                          <Link href={`/servizi/${s.id}`} className="font-medium text-neutral-900 hover:text-blue-700">
                            {s.name}
                          </Link>
                        )}
                        {s.category && <span className="block text-xs text-neutral-500">{s.category}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-neutral-600">{s.durationMinutes} min</td>
                  <td className="px-4 py-2 tabular-nums text-neutral-600">{formatPrice(s.basePrice)}</td>
                  <td className="px-4 py-2 text-neutral-600">
                    {s.bufferEnabled ? `${s.bufferMinutes} min · ${BUFFER_POSITION_LABEL[s.bufferPosition] ?? s.bufferPosition}` : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-neutral-600">{s.parallelSlots}</td>
                  <td className="px-4 py-2">
                    <span className="flex justify-end gap-1">
                      {s.deletedAt ? (
                        <Badge className="border-neutral-200 bg-neutral-100 text-neutral-500">Eliminato</Badge>
                      ) : s.active ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Attivo</Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">Non attivo</Badge>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
