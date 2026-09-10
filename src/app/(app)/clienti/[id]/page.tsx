// [INTENT]: Scheda cliente: dati modificabili, flag "abituale"/"segnalato", archiviazione, e lo storico
// delle prenotazioni collegate (GET /admin/bookings?customerId=). 404 dal Backend → pagina non trovata.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Badge, Card, CardTitle, LinkButton, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type { Booking, Customer, PagedResponse } from "@/lib/types";
import { CustomerForms } from "./CustomerForms";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerPage({ params, searchParams }: PageProps<"/clienti/[id]">) {
  const { id } = await params;
  const sp = await searchParams;

  let customer: Customer;
  try {
    customer = await api<Customer>(`/api/v1/admin/customers/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const bookings = await api<PagedResponse<Booking>>("/api/v1/admin/bookings", {
    query: { customerId: id, pageSize: 50 },
  });
  const sorted = [...bookings.items].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const noShows = sorted.filter((b) => b.status === "no_show").length;

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Cliente dal {formatDateTime(customer.createdAt)}
            {customer.regular && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Abituale</Badge>}
            {customer.blocked && <Badge className="border-red-200 bg-red-50 text-red-700">Segnalato</Badge>}
          </span>
        }
        actions={
          <LinkButton variant="secondary" href="/clienti">
            ← Clienti
          </LinkButton>
        }
      />
      {sp.created === "1" && (
        <div className="mb-4">
          <Alert kind="success">Scheda creata.</Alert>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>
              Prenotazioni ({bookings.total}
              {noShows > 0 ? ` · ${noShows} mancati arrivi` : ""})
            </CardTitle>
            {sorted.length === 0 ? (
              <p className="text-sm text-neutral-500">Nessuna prenotazione collegata a questa scheda.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {sorted.map((b) => (
                  <li key={b.id}>
                    <Link href={`/agenda/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm hover:text-blue-700">
                      <span className="w-40 shrink-0">
                        {formatDate(b.date, "short")} · {b.time}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {b.service.name}
                        {b.staff ? ` · ${b.staff.name}` : ""}
                      </span>
                      <span className="tabular-nums text-neutral-600">{formatPrice(b.price)}</span>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <CustomerForms customer={customer} />
      </div>
    </>
  );
}
