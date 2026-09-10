// [INTENT]: Sessione del titolare = il JWT rilasciato da POST /api/v1/admin/auth/token, custodito in un cookie
// httpOnly. Solo codice SERVER legge questo modulo: il browser non vede mai il token, quindi né XSS né
// script di terze parti possono rubarlo. Il tenant è dentro il JWT (lo deriva il Backend dall'utente):
// il frontend non conosce né passa mai un tenantId, e l'isolamento fra saloni non dipende da questo codice.

import { cookies } from "next/headers";

export const SESSION_COOKIE = "gc_session";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSession(token: string, expiresAtIso: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAtIso);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // WHY: scadenza allineata a quella del JWT — un cookie più lungo del token darebbe una sessione che
    // sembra viva ma riceve 401 a ogni chiamata; uno più corto costringerebbe a riloggare senza motivo.
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
