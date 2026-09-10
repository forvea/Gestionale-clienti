// [INTENT]: Layout delle pagine autenticate. Carica il profilo (GET /admin/account/me) per intestare il
// pannello col nome del salone: è il tenant DERIVATO DAL TOKEN dal Backend, non scelto qui — l'utente vede
// il proprio salone perché è l'unico che il suo JWT può raggiungere.

import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { AdminProfile } from "@/lib/types";
import { logout } from "../login/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await api<AdminProfile>("/api/v1/admin/account/me");
  return (
    <Shell tenantName={me.tenantName} userEmail={me.email} logout={logout}>
      {children}
    </Shell>
  );
}
