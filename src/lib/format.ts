// [INTENT]: Formattazione e traduzioni per l'interfaccia in italiano: date, orari, prezzi, e le etichette
// umane per i valori del contratto API (stati, cause di indisponibilità, modalità, canali di consenso).
// Un punto solo, così un valore nuovo del Backend si traduce una volta e non pagina per pagina.

import type { AppointmentMode, BookingStatus } from "./types";

export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE"); // yyyy-MM-dd
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE");
}

export function formatDate(iso: string, style: "short" | "long" = "long"): string {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT", {
    weekday: style === "long" ? "long" : undefined,
    day: "numeric",
    month: style === "long" ? "long" : "2-digit",
    year: style === "long" ? "numeric" : "2-digit",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export function endTime(time: string, durationMin: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confermata",
  completed: "Completata",
  cancelled: "Annullata",
  no_show: "Mancato arrivo",
};

export const STATUS_CLASS: Record<BookingStatus, string> = {
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
};

export const MODE_LABEL: Record<AppointmentMode, string> = {
  on_site: "In sede",
  remote: "Da remoto",
};

export const CONSENT_CHANNEL_LABEL: Record<string, string> = {
  web: "Sito web",
  phone: "Telefono",
  in_person: "Di persona",
};

export const UNAVAILABLE_REASON: Record<string, string> = {
  special_closure: "Chiusura straordinaria",
  closed_day: "Giorno di chiusura",
  hours_not_configured: "Orari non configurati",
  staff_schedule_unavailable: "Operatore non in servizio",
  staff_full_day_absence: "Operatore assente",
  outside_booking_window: "Fuori dalla finestra prenotabile",
  lunch_break: "Pausa",
  outside_working_hours: "Fuori orario",
  staff_partial_absence: "Operatore assente",
  salon_time_block: "Blocco del salone",
  existing_booking: "Già occupato",
  capacity_exhausted: "Capienza esaurita",
  minimum_advance_notice: "Troppo a ridosso",
};

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return UNAVAILABLE_REASON[reason] ?? reason;
}
