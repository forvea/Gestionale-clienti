"use server";

// [INTENT]: Server Actions degli operatori: creazione e modifica (PUT = sostituzione completa, con la
// settimana INTERA di orari: 7 giorni obbligatori, un giorno non lavorato si dichiara spento, mai omesso),
// eliminazione, pause ricorrenti dell'operatore (PUT in blocco) e assenze (aggiunta/rimozione puntuale).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { DAY_LABEL } from "@/lib/format";
import type { Staff, StaffTimeOffReason, StaffTimeOffRequest, StaffWriteRequest } from "@/lib/types";
import { parseBreaks, parseWeek, validateWeek } from "@/lib/week";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildRequest(formData: FormData): { request?: StaffWriteRequest; error?: string } {
  const name = str(formData, "name");
  if (!name) return { error: "Il nome è obbligatorio." };
  const week = parseWeek(formData);
  const weekError = validateWeek(week, DAY_LABEL);
  if (weekError) return { error: weekError };

  // Servizi: checkbox `svc_{id}` + eventuale override `price_{id}`.
  const services: StaffWriteRequest["services"] = [];
  for (const [key] of formData.entries()) {
    if (!key.startsWith("svc_")) continue;
    const serviceId = key.slice(4);
    const raw = str(formData, `price_${serviceId}`).replace(",", ".");
    const override = raw === "" ? null : Number(raw);
    if (override !== null && (!Number.isFinite(override) || override < 0)) return { error: "Un prezzo personalizzato non è valido." };
    services.push({ serviceId, priceOverride: override });
  }

  return {
    request: {
      name,
      role: str(formData, "role") || null,
      specialization: str(formData, "specialization") || null,
      photoUrl: null,
      active: formData.get("active") === "on",
      displayOrder: Number(str(formData, "displayOrder")) || 0,
      services,
      businessHours: week.map((d) => ({ dayOfWeek: d.dayOfWeek, isAvailable: d.on, startTime: d.start, endTime: d.end })),
    },
  };
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const { request, error } = buildRequest(formData);
  if (!request) return { error, values };
  let created: Staff;
  try {
    created = await api<Staff>("/api/v1/admin/staff", { method: "POST", body: request });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/operatori");
  redirect(`/operatori/${created.id}?created=1`);
}

export async function updateStaff(staffId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const { request, error } = buildRequest(formData);
  if (!request) return { error, values };
  try {
    await api(`/api/v1/admin/staff/${staffId}`, { method: "PUT", body: request });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/operatori");
  revalidatePath(`/operatori/${staffId}`);
  return { ok: true };
}

export async function deleteStaff(staffId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/staff/${staffId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/operatori");
  redirect("/operatori?deleted=1");
}

export async function saveStaffBreaks(staffId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const breaks = parseBreaks(formData);
  if (breaks.some((b) => !b.startTime || !b.endTime || b.startTime >= b.endTime)) return { error: "Ogni pausa deve avere inizio e fine, con l'inizio che precede la fine." };
  try {
    await api(`/api/v1/admin/staff/${staffId}/breaks`, { method: "PUT", body: { breaks } });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidatePath(`/operatori/${staffId}`);
  return { ok: true };
}

const REASONS: StaffTimeOffReason[] = ["vacation", "illness", "personal_leave", "other"];

export async function addTimeOff(staffId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const dateFrom = str(formData, "dateFrom");
  const dateTo = str(formData, "dateTo") || dateFrom;
  if (!dateFrom) return { error: "Indica la data di inizio.", values };
  const fullDay = formData.get("fullDay") === "on";
  const startTime = fullDay ? null : str(formData, "startTime") || null;
  const endTime = fullDay ? null : str(formData, "endTime") || null;
  if (!fullDay && (!startTime || !endTime)) return { error: "Per un'assenza parziale indica inizio e fine.", values };
  const reasonRaw = str(formData, "reason");
  const reason = REASONS.includes(reasonRaw as StaffTimeOffReason) ? (reasonRaw as StaffTimeOffReason) : null;
  const body: StaffTimeOffRequest = { dateFrom, dateTo, startTime, endTime, reason };
  try {
    await api(`/api/v1/admin/staff/${staffId}/time-off`, { method: "POST", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath(`/operatori/${staffId}`);
  return { ok: true };
}

export async function deleteTimeOff(staffId: string, timeOffId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/staff/${staffId}/time-off/${timeOffId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath(`/operatori/${staffId}`);
  return { ok: true };
}
