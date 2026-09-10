"use server";

// [INTENT]: Server Actions di "Orari e chiusure": orari settimanali del salone (PUT in blocco, 7 giorni),
// pause ricorrenti del salone (PUT in blocco), chiusure straordinarie e blocchi orari (aggiunta e
// rimozione puntuali). Le regole (formati, inizio < fine, ricorrenze ammesse) le applica il Backend.

import { revalidatePath } from "next/cache";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { DAY_LABEL } from "@/lib/format";
import type { ClosureRecurrence, ClosureRequest, TimeBlockRequest } from "@/lib/types";
import { parseBreaks, parseWeek, validateWeek } from "@/lib/week";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveBusinessHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const week = parseWeek(formData);
  const weekError = validateWeek(week, DAY_LABEL);
  if (weekError) return { error: weekError };
  try {
    await api("/api/v1/admin/business-hours", {
      method: "PUT",
      body: { days: week.map((d) => ({ dayOfWeek: d.dayOfWeek, isOpen: d.on, openTime: d.start, closeTime: d.end })) },
    });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidatePath("/orari");
  return { ok: true };
}

export async function saveTenantBreaks(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const breaks = parseBreaks(formData);
  if (breaks.some((b) => !b.startTime || !b.endTime || b.startTime >= b.endTime)) return { error: "Ogni pausa deve avere inizio e fine, con l'inizio che precede la fine." };
  try {
    await api("/api/v1/admin/breaks/tenant", { method: "PUT", body: { breaks } });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidatePath("/orari");
  return { ok: true };
}

const RECURRENCES: ClosureRecurrence[] = ["none", "annual", "easter", "easter_monday"];

export async function addClosure(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const recurrenceRaw = str(formData, "recurrence") || "none";
  if (!RECURRENCES.includes(recurrenceRaw as ClosureRecurrence)) return { error: "Ricorrenza non valida.", values };
  const recurrence = recurrenceRaw as ClosureRecurrence;
  const dateFrom = str(formData, "dateFrom");
  const dateTo = str(formData, "dateTo") || dateFrom;
  // WHY: per Pasqua e Pasquetta il Backend IGNORA le date del corpo (la ricorrenza si calcola sull'anno),
  // ma il campo è obbligatorio nel contratto: si manda una data qualsiasi valida.
  const isEaster = recurrence === "easter" || recurrence === "easter_monday";
  if (!isEaster && !dateFrom) return { error: "Indica la data di inizio.", values };
  const body: ClosureRequest = {
    dateFrom: isEaster ? dateFrom || "2000-01-01" : dateFrom,
    dateTo: isEaster ? dateTo || "2000-01-01" : dateTo,
    reason: str(formData, "reason") || null,
    recurrence,
  };
  try {
    await api("/api/v1/admin/closures", { method: "POST", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/orari");
  return { ok: true };
}

export async function deleteClosure(closureId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/closures/${closureId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/orari");
  return { ok: true };
}

export async function addTimeBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const dateFrom = str(formData, "dateFrom");
  const body: TimeBlockRequest = {
    dateFrom,
    dateTo: str(formData, "dateTo") || dateFrom,
    startTime: str(formData, "startTime"),
    endTime: str(formData, "endTime"),
    reason: str(formData, "reason") || null,
  };
  if (!body.dateFrom) return { error: "Indica la data di inizio.", values };
  if (!body.startTime || !body.endTime) return { error: "Indica la fascia oraria.", values };
  if (body.startTime >= body.endTime) return { error: "L'inizio deve precedere la fine.", values };
  try {
    await api("/api/v1/admin/time-blocks", { method: "POST", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/orari");
  return { ok: true };
}

export async function deleteTimeBlock(timeBlockId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/time-blocks/${timeBlockId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/orari");
  return { ok: true };
}
