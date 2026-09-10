"use server";

// [INTENT]: Server Actions dell'agenda: ogni mutazione su una prenotazione passa da qui e da qui sola.
// Ognuna chiama l'endpoint admin corrispondente, invalida le pagine che mostrano quella prenotazione e
// restituisce lo stato per il form (errore dal Backend, già in italiano, o ok). Le REGOLE — disponibilità,
// stati ammessi, contatto obbligatorio — le applica il Backend: qui non si duplicano, si mostrano.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import type {
  AppointmentMode,
  BookingDetail,
  ConsentChannel,
  CreateBookingRequest,
  UpdateBookingContactRequest,
} from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateBooking(id: string) {
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

export async function updateStatus(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const status = str(formData, "status");
  try {
    await api(`/api/v1/admin/bookings/${bookingId}`, { method: "PATCH", body: { status } });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}

export async function reschedule(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = str(formData, "date");
  const time = str(formData, "time");
  if (!date || !time) return { error: "Indica data e ora." };
  try {
    await api(`/api/v1/admin/bookings/${bookingId}/reschedule`, { method: "PUT", body: { date, time } });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}

export async function changeStaff(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const staffId = str(formData, "staffId");
  if (!staffId) return { error: "Scegli un operatore." };
  try {
    await api(`/api/v1/admin/bookings/${bookingId}/staff`, { method: "PUT", body: { staffId } });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err) };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}

export type ContactSnapshot = {
  phone: string;
  email: string;
  notes: string;
  internalNotes: string;
  appointmentMode: string;
};

/**
 * PATCH con la convenzione del Backend: null = non toccare, "" = svuota. Si invia SOLO ciò che è cambiato
 * rispetto allo snapshot mostrato nel form, così un campo lasciato com'era non viene mai "svuotato" per
 * sbaglio. Il telefono non è svuotabile (422 lato Backend): se lo si cancella, si lascia invariato.
 */
export async function updateContact(
  bookingId: string,
  current: ContactSnapshot,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const next: ContactSnapshot = {
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    notes: str(formData, "notes"),
    internalNotes: str(formData, "internalNotes"),
    appointmentMode: str(formData, "appointmentMode"),
  };
  const body: UpdateBookingContactRequest = {
    phone: next.phone && next.phone !== current.phone ? next.phone : null,
    email: next.email !== current.email ? next.email : null,
    notes: next.notes !== current.notes ? next.notes : null,
    internalNotes: next.internalNotes !== current.internalNotes ? next.internalNotes : null,
    appointmentMode: next.appointmentMode !== current.appointmentMode ? next.appointmentMode : null,
  };
  if (Object.values(body).every((v) => v === null)) return { ok: true };
  try {
    await api(`/api/v1/admin/bookings/${bookingId}/contact`, { method: "PATCH", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values: formValues(formData) };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}

export async function createBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const additional = formData.getAll("additionalServiceIds").map(String).filter(Boolean);
  const emails = str(formData, "emailsEnabled");
  const mode = str(formData, "appointmentMode");
  const request: CreateBookingRequest = {
    serviceId: str(formData, "serviceId"),
    additionalServiceIds: additional.length ? additional : null,
    staffId: str(formData, "staffId") || null,
    date: str(formData, "date"),
    time: str(formData, "time"),
    customer: {
      name: str(formData, "name"),
      phone: str(formData, "phone"),
      email: str(formData, "email") || null,
      notes: str(formData, "notes") || null,
    },
    customerId: str(formData, "customerId") || null,
    consentChannel: (str(formData, "consentChannel") || "phone") as ConsentChannel,
    consentAttested: formData.get("consentAttested") === "on",
    gdprConsentVersion: null,
    emailsEnabled: emails === "" ? null : emails === "true",
    appointmentMode: (mode || null) as AppointmentMode | null,
  };

  const values = formValues(formData);
  if (!request.serviceId) return { error: "Scegli un servizio.", values };
  if (!request.date || !request.time) return { error: "Indica data e ora.", values };
  if (!request.customer.name || !request.customer.phone) return { error: "Nome e telefono del cliente sono obbligatori.", values };
  if (!request.consentAttested) return { error: "Conferma di aver informato il cliente sul trattamento dei dati.", values };

  let created: BookingDetail;
  try {
    created = await api<BookingDetail>("/api/v1/admin/bookings", { method: "POST", body: request });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/agenda");
  redirect(`/agenda/${created.id}?created=1`);
}
