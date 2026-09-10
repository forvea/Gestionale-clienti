import type { Metadata } from "next";
import { LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { Service, Staff } from "@/lib/types";
import { NewBookingForm } from "./NewBookingForm";

export const metadata: Metadata = { title: "Nuova prenotazione" };

export default async function NewBookingPage() {
  const [services, staff] = await Promise.all([api<Service[]>("/api/v1/admin/services"), api<Staff[]>("/api/v1/admin/staff")]);
  return (
    <>
      <PageHeader
        title="Nuova prenotazione"
        subtitle="Prenotazione presa al telefono o allo sportello"
        actions={
          <LinkButton variant="secondary" href="/agenda">
            Annulla
          </LinkButton>
        }
      />
      <NewBookingForm
        services={services.filter((s) => s.active && !s.deletedAt)}
        staff={staff.filter((s) => s.active && !s.deletedAt)}
      />
    </>
  );
}
