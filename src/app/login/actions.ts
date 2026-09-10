"use server";

// [INTENT]: Server Action di login: chiama POST /api/v1/admin/auth/token e, se ok, salva il JWT nel cookie
// httpOnly. La password passa dal browser a questo server e da qui al Backend, mai in un cookie o in un
// log. Il messaggio d'errore è quello del Backend (401 "credenziali non valide", 422 validazione).

import { redirect } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { clearSession, setSession } from "@/lib/session";
import type { AdminTokenResponse } from "@/lib/types";

// WHY: `email` torna nello stato perché React 19 azzera il form dopo ogni Server Action, riuscita o no:
// senza, dopo una password sbagliata l'utente dovrebbe riscrivere anche l'email. La password no, mai.
export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password.", email };

  let token: AdminTokenResponse;
  try {
    token = await api<AdminTokenResponse>("/api/v1/admin/auth/token", {
      method: "POST",
      body: { email, password },
      anonymous: true,
    });
  } catch (err) {
    return { error: errorMessage(err), email };
  }
  await setSession(token.token, token.expiresAt);
  redirect("/agenda");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
