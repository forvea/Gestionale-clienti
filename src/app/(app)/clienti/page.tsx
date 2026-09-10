// [INTENT]: Anagrafica clienti — elenco paginato con ricerca (nome, telefono, email; parziale) e accesso
// alla scheda. Come l'agenda, i parametri vivono nell'URL e la pagina è un Server Component.

import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { Customer, PagedResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Clienti" };

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function CustomersPage({ searchParams }: PageProps<"/clienti">) {
  const sp = await searchParams;
  const q = one(sp.q);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const customers = await api<PagedResponse<Customer>>("/api/v1/admin/customers", { query: { q, page, pageSize: 50 } });
  const totalPages = Math.max(1, Math.ceil(customers.total / customers.pageSize));
  const href = (p: number) => `/clienti?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Clienti"
        subtitle={`${customers.total} ${customers.total === 1 ? "scheda" : "schede"}`}
        actions={<LinkButton href="/clienti/nuovo">+ Nuovo cliente</LinkButton>}
      />
      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert kind="success">Scheda archiviata.</Alert>
        </div>
      )}
      <Card className="mb-4">
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Cerca per nome, telefono o email" aria-label="Cerca" />
          <Button type="submit" variant="secondary">
            Cerca
          </Button>
          {q && (
            <LinkButton variant="ghost" href="/clienti">
              Azzera
            </LinkButton>
          )}
        </form>
      </Card>

      {customers.total === 0 ? (
        <EmptyState>{q ? "Nessun cliente corrisponde alla ricerca." : "Nessun cliente in anagrafica."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Telefono</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {customers.items.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/clienti/${c.id}`} className="font-medium text-neutral-900 hover:text-blue-700">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{c.phone || "—"}</td>
                  <td className="px-4 py-2 text-neutral-600">{c.email || "—"}</td>
                  <td className="px-4 py-2">
                    <span className="flex justify-end gap-1">
                      {c.regular && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Abituale</Badge>}
                      {c.blocked && <Badge className="border-red-200 bg-red-50 text-red-700">Segnalato</Badge>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
          <span>
            Pagina {customers.page} di {totalPages}
          </span>
          <div className="flex gap-2">
            {customers.page > 1 && (
              <LinkButton variant="secondary" href={href(customers.page - 1)}>
                ← Precedente
              </LinkButton>
            )}
            {customers.page < totalPages && (
              <LinkButton variant="secondary" href={href(customers.page + 1)}>
                Successiva →
              </LinkButton>
            )}
          </div>
        </div>
      )}
    </>
  );
}
