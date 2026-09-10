// [INTENT]: Impostazioni del salone: contatti, link (gestione prenotazione, recensioni Google), cinque
// interruttori email, colore e logo. Nome, slug e fuso orario in sola lettura.

import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { AdminTenant } from "@/lib/types";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const tenant = await api<AdminTenant>("/api/v1/admin/tenant");
  return (
    <>
      <PageHeader title="Impostazioni" subtitle={tenant.name} />
      <SettingsForm tenant={tenant} />
    </>
  );
}
