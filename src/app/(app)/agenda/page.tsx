// [INTENT]: Agenda — elenco prenotazioni del salone per intervallo di date, con filtri (stato, operatore,
// servizio, ricerca per nome/telefono) e paginazione. I filtri viaggiano nell'URL (form GET): la vista è
// condivisibile e il tasto indietro funziona. Tutto è Server Component: nessun dato passa dal browser
// all'API, e la pagina è leggibile anche senza JavaScript.

import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, EmptyState, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { addDaysIso, endTime, formatDate, formatPrice, todayIso } from "@/lib/format";
import type { Booking, PagedResponse, Service, Staff } from "@/lib/types";

export const metadata: Metadata = { title: "Agenda" };

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  const dateFrom = one(sp.date) || todayIso();
  const dateTo = one(sp.to) || dateFrom;
  const status = one(sp.status);
  const staffId = one(sp.staffId);
  const serviceId = one(sp.serviceId);
  const q = one(sp.q);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [bookings, staff, services] = await Promise.all([
    api<PagedResponse<Booking>>("/api/v1/admin/bookings", {
      query: { dateFrom, dateTo, status, staffId, serviceId, q, page, pageSize: 100 },
    }),
    api<Staff[]>("/api/v1/admin/staff"),
    api<Service[]>("/api/v1/admin/services"),
  ]);

  const sorted = [...bookings.items].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const byDate = new Map<string, Booking[]>();
  for (const b of sorted) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);

  const keep = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ date: dateFrom, to: dateTo, status, staffId, serviceId, q, ...overrides })) {
      if (v) p.set(k, v);
    }
    return `/agenda?${p.toString()}`;
  };
  const singleDay = dateFrom === dateTo;
  const totalPages = Math.max(1, Math.ceil(bookings.total / bookings.pageSize));

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={
          singleDay ? formatDate(dateFrom) : `${formatDate(dateFrom, "short")} → ${formatDate(dateTo, "short")}`
        }
        actions={<LinkButton href="/agenda/nuova">+ Nuova prenotazione</LinkButton>}
      />

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <LinkButton variant="secondary" href={keep({ date: addDaysIso(dateFrom, -1), to: addDaysIso(dateFrom, -1) })}>
            ← Giorno prima
          </LinkButton>
          <LinkButton variant="secondary" href={keep({ date: todayIso(), to: todayIso() })}>
            Oggi
          </LinkButton>
          <LinkButton variant="secondary" href={keep({ date: addDaysIso(dateFrom, 1), to: addDaysIso(dateFrom, 1) })}>
            Giorno dopo →
          </LinkButton>
          <LinkButton variant="ghost" href={keep({ date: dateFrom, to: addDaysIso(dateFrom, 6) })}>
            Settimana
          </LinkButton>
        </div>
        <form method="get" className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Input type="date" name="date" defaultValue={dateFrom} aria-label="Dal" />
          <Input type="date" name="to" defaultValue={dateTo} aria-label="Al" />
          <Select name="status" defaultValue={status} aria-label="Stato">
            <option value="">Tutti gli stati</option>
            <option value="confirmed">Confermate</option>
            <option value="completed">Completate</option>
            <option value="no_show">Mancati arrivi</option>
            <option value="cancelled">Annullate</option>
          </Select>
          <Select name="staffId" defaultValue={staffId} aria-label="Operatore">
            <option value="">Tutti gli operatori</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select name="serviceId" defaultValue={serviceId} aria-label="Servizio">
            <option value="">Tutti i servizi</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <div className="col-span-2 flex gap-2 md:col-span-1">
            <Input name="q" defaultValue={q} placeholder="Nome o telefono" aria-label="Cerca" />
            <Button type="submit" variant="secondary">
              Filtra
            </Button>
          </div>
        </form>
      </Card>

      {bookings.total === 0 ? (
        <EmptyState>Nessuna prenotazione per questi filtri.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {[...byDate.entries()].map(([date, list]) => (
            <section key={date}>
              {!singleDay && <h2 className="mb-2 text-sm font-semibold text-neutral-600">{formatDate(date)}</h2>}
              <ul className="flex flex-col gap-2">
                {list.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/agenda/${b.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                    >
                      <span className="w-28 shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {b.time}–{endTime(b.time, b.durationMin)}
                      </span>
                      {/* WHY: min-w-48 costringe prezzo e stato ad andare a capo su schermi stretti, invece
                          di schiacciare il nome a "Gi…" — visto a 390px, non dedotto. */}
                      <span className="min-w-48 flex-1">
                        <span className="block truncate font-medium">{b.customer.name}</span>
                        <span className="block truncate text-sm text-neutral-500">
                          {b.service.name}
                          {b.staff ? ` · ${b.staff.name}` : ""}
                        </span>
                      </span>
                      <span className="hidden text-sm text-neutral-600 sm:inline">{b.customer.phone}</span>
                      <span className="text-sm tabular-nums text-neutral-700">{formatPrice(b.price)}</span>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                Pagina {bookings.page} di {totalPages} · {bookings.total} prenotazioni
              </span>
              <div className="flex gap-2">
                {bookings.page > 1 && (
                  <LinkButton variant="secondary" href={keep({ page: String(bookings.page - 1) })}>
                    ← Precedente
                  </LinkButton>
                )}
                {bookings.page < totalPages && (
                  <LinkButton variant="secondary" href={keep({ page: String(bookings.page + 1) })}>
                    Successiva →
                  </LinkButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
