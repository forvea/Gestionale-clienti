// [INTENT]: Modifica di un servizio esistente (PUT = sostituzione completa) ed eliminazione. 404 dal
// Backend → pagina non trovata (vale anche per un servizio già eliminato: non c'è ripristino).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { Service } from "@/lib/types";
import { ServiceForm } from "../ServiceForm";
import { updateService } from "../actions";

export const metadata: Metadata = { title: "Servizio" };

export default async function ServicePage({ params, searchParams }: PageProps<"/servizi/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  let service: Service;
  try {
    service = await api<Service>(`/api/v1/admin/services/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  return (
    <>
      <PageHeader title={service.name} subtitle={service.category ?? undefined} actions={<LinkButton variant="secondary" href="/servizi">← Servizi</LinkButton>} />
      {sp.created === "1" && (
        <div className="mb-4">
          <Alert kind="success">Servizio creato.</Alert>
        </div>
      )}
      <ServiceForm action={updateService.bind(null, service.id)} service={service} submitLabel="Salva modifiche" />
    </>
  );
}
