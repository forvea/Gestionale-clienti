"use server";

// [INTENT]: Server Actions delle impostazioni del salone: PATCH per differenza su GET/PATCH /admin/tenant
// (testo: null = non toccare, "" = svuota; interruttori: bool o null) e upload del logo in multipart.
// Le regole sui link (percorso relativo per la gestione, https assoluto per le recensioni) e sul formato
// del logo (magic bytes, max 2 MB) le applica il Backend: qui si mostrano i suoi messaggi.

import { revalidatePath } from "next/cache";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import type { AdminUpdateTenantRequest } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export type TenantSnapshot = {
  address: string;
  phone: string;
  color: string;
  bookingManagementPath: string;
  googleReviewUrl: string;
  emailConfirmationEnabled: boolean;
  emailReminderEnabled: boolean;
  emailCancellationEnabled: boolean;
  emailOwnerNotificationEnabled: boolean;
  emailReviewRequestEnabled: boolean;
};

const SWITCHES = [
  "emailConfirmationEnabled",
  "emailReminderEnabled",
  "emailCancellationEnabled",
  "emailOwnerNotificationEnabled",
  "emailReviewRequestEnabled",
] as const;

export async function updateTenant(current: TenantSnapshot, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  // WHY: il selettore colore emette sempre un valore; la casella "usa un colore" decide se il colore
  // viaggia oppure se va svuotato ("" = azzera, convenzione del PATCH).
  const colorOn = formData.get("colorEnabled") === "on";
  const next = {
    address: str(formData, "address"),
    phone: str(formData, "phone"),
    color: colorOn ? str(formData, "color") : "",
    bookingManagementPath: str(formData, "bookingManagementPath"),
    googleReviewUrl: str(formData, "googleReviewUrl"),
  };
  const body: AdminUpdateTenantRequest = {};
  for (const key of Object.keys(next) as Array<keyof typeof next>) {
    if (next[key] !== current[key]) body[key] = next[key];
  }
  for (const key of SWITCHES) {
    const on = formData.get(key) === "on";
    if (on !== current[key]) body[key] = on;
  }
  if (Object.keys(body).length === 0) return { ok: true };
  try {
    await api("/api/v1/admin/tenant", { method: "PATCH", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/impostazioni");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadLogo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Scegli un'immagine." };
  if (file.size > 2 * 1024 * 1024) return { error: "Il logo non può superare 2 MB." };
  const upload = new FormData();
  upload.append("file", file, file.name);
  try {
    await api("/api/v1/admin/tenant/logo", { method: "POST", body: upload });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidatePath("/impostazioni");
  return { ok: true };
}
