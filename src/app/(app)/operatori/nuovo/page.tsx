// [INTENT]: Creazione di un operatore. Gli orari del salone fanno da default per la settimana.

import type { Metadata } from "next";
import { LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { AdminBusinessHours, Service } from "@/lib/types";
import { StaffForm } from "../StaffForm";
import { createStaff } from "../actions";

export const metadata: Metadata = { title: "Nuovo operatore" };

export default async function NewStaffPage() {
  const [services, hours] = await Promise.all([api<Service[]>("/api/v1/admin/services"), api<AdminBusinessHours>("/api/v1/admin/business-hours")]);
  return (
    <>
      <PageHeader title="Nuovo operatore" actions={<LinkButton variant="secondary" href="/operatori">Annulla</LinkButton>} />
      <StaffForm action={createStaff} services={services} tenantHours={hours.days} submitLabel="Crea operatore" />
    </>
  );
}
