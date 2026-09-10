"use server";

// [INTENT]: Server Actions del catalogo servizi. POST e PUT del Backend sono una SOSTITUZIONE completa
// (un campo omesso viene azzerato, non lasciato com'era), quindi il form invia sempre tutti i campi e
// l'azione costruisce il body intero — nessun PATCH per differenza qui, a differenza di clienti e recapiti.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import type { Service, ServiceWriteRequest } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key).replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function buildRequest(formData: FormData): { request?: ServiceWriteRequest; error?: string } {
  const name = str(formData, "name");
  if (!name) return { error: "Il nome è obbligatorio." };
  const duration = num(formData, "durationMinutes");
  if (!duration || duration <= 0) return { error: "La durata deve essere maggiore di zero." };
  const position = str(formData, "bufferPosition");
  if (!["Before", "After", "Both"].includes(position)) return { error: "Posizione del buffer non valida." };
  const color = str(formData, "color");
  return {
    request: {
      name,
      category: str(formData, "category") || null,
      description: str(formData, "description") || null,
      durationMinutes: duration,
      basePrice: num(formData, "basePrice"),
      parallelSlots: Math.max(1, num(formData, "parallelSlots") ?? 1),
      bufferEnabled: formData.get("bufferEnabled") === "on",
      bufferMinutes: Math.max(0, num(formData, "bufferMinutes") ?? 0),
      bufferPosition: position as ServiceWriteRequest["bufferPosition"],
      active: formData.get("active") === "on",
      displayOrder: num(formData, "displayOrder") ?? 0,
      // WHY: il selettore colore nativo emette sempre #000000 anche se l'utente non ha scelto nulla; la
      // casella "usa un colore" decide se inviarlo, altrimenti il servizio resta senza colore.
      color: formData.get("colorEnabled") === "on" && color ? color : null,
    },
  };
}

export async function createService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const { request, error } = buildRequest(formData);
  if (!request) return { error, values };
  let created: Service;
  try {
    created = await api<Service>("/api/v1/admin/services", { method: "POST", body: request });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/servizi");
  redirect(`/servizi/${created.id}?created=1`);
}

export async function updateService(serviceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const { request, error } = buildRequest(formData);
  if (!request) return { error, values };
  try {
    await api(`/api/v1/admin/services/${serviceId}`, { method: "PUT", body: request });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/servizi");
  revalidatePath(`/servizi/${serviceId}`);
  return { ok: true };
}

export async function deleteService(serviceId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/services/${serviceId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/servizi");
  redirect("/servizi?deleted=1");
}
