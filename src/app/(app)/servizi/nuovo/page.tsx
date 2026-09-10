// [INTENT]: Creazione di un servizio.

import type { Metadata } from "next";
import { LinkButton, PageHeader } from "@/components/ui";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export const metadata: Metadata = { title: "Nuovo servizio" };

export default function NewServicePage() {
  return (
    <>
      <PageHeader title="Nuovo servizio" actions={<LinkButton variant="secondary" href="/servizi">Annulla</LinkButton>} />
      <ServiceForm action={createService} submitLabel="Crea servizio" />
    </>
  );
}
