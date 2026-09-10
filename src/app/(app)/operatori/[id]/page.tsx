// [INTENT]: Scheda operatore: dati e orari (PUT completo), pause ricorrenti, assenze, eliminazione.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { AdminBusinessHours, BreaksResponse, Service, Staff, StaffTimeOff } from "@/lib/types";
import { StaffBreaksCard, StaffTimeOffCard } from "../StaffExtras";
import { StaffForm } from "../StaffForm";
import { updateStaff } from "../actions";

export const metadata: Metadata = { title: "Operatore" };

export default async function StaffPage({ params, searchParams }: PageProps<"/operatori/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  let staff: Staff;
  try {
    staff = await api<Staff>(`/api/v1/admin/staff/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [services, hours, breaks, timeOff] = await Promise.all([
    api<Service[]>("/api/v1/admin/services", { query: { includeDeleted: true } }),
    api<AdminBusinessHours>("/api/v1/admin/business-hours"),
    api<BreaksResponse>("/api/v1/admin/breaks"),
    api<StaffTimeOff[]>(`/api/v1/admin/staff/${id}/time-off`),
  ]);
  const ownBreaks = breaks.staff.find((g) => g.staffId === id)?.breaks ?? [];

  return (
    <>
      <PageHeader title={staff.name} subtitle={[staff.role, staff.specialization].filter(Boolean).join(" · ") || undefined} actions={<LinkButton variant="secondary" href="/operatori">← Operatori</LinkButton>} />
      {sp.created === "1" && (
        <div className="mb-4">
          <Alert kind="success">Operatore creato.</Alert>
        </div>
      )}
      <StaffForm action={updateStaff.bind(null, staff.id)} staff={staff} services={services} tenantHours={hours.days} submitLabel="Salva modifiche" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StaffBreaksCard staffId={staff.id} breaks={ownBreaks} />
        <StaffTimeOffCard staffId={staff.id} items={timeOff} />
      </div>
    </>
  );
}
