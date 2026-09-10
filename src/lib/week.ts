// [INTENT]: Lettura dei campi emessi da WeekHoursEditor e BreaksEditor dentro le Server Action. Un solo
// posto che conosce i nomi dei campi (`d{n}_on`, `br_day`…), così editor e azioni non possono divergere.
// Restituisce sempre 7 giorni: è il contratto del Backend per gli orari (settimana intera, mai parziale).

import type { BreakItem } from "./types";

export type WeekDay = { dayOfWeek: number; on: boolean; start: string | null; end: string | null };

export function parseWeek(formData: FormData): WeekDay[] {
  return Array.from({ length: 7 }, (_, d) => {
    const on = formData.get(`d${d}_on`) === "on";
    const start = String(formData.get(`d${d}_start`) ?? "").trim();
    const end = String(formData.get(`d${d}_end`) ?? "").trim();
    return { dayOfWeek: d, on, start: on ? start || null : null, end: on ? end || null : null };
  });
}

/** Messaggio d'errore locale se un giorno acceso non ha entrambi gli orari; null se tutto a posto. */
export function validateWeek(days: WeekDay[], dayLabels: string[]): string | null {
  const missing = days.filter((d) => d.on && (!d.start || !d.end)).map((d) => dayLabels[d.dayOfWeek]);
  if (missing.length) return `Indica inizio e fine per: ${missing.join(", ")}.`;
  const inverted = days.filter((d) => d.on && d.start && d.end && d.start >= d.end).map((d) => dayLabels[d.dayOfWeek]);
  if (inverted.length) return `L'inizio deve precedere la fine: ${inverted.join(", ")}.`;
  return null;
}

export function parseBreaks(formData: FormData): BreakItem[] {
  const days = formData.getAll("br_day").map(String);
  const starts = formData.getAll("br_start").map(String);
  const ends = formData.getAll("br_end").map(String);
  const labels = formData.getAll("br_label").map(String);
  return days.map((d, i) => ({
    dayOfWeek: Number(d),
    startTime: starts[i] ?? "",
    endTime: ends[i] ?? "",
    label: (labels[i] ?? "").trim() || null,
  }));
}
