"use client";

// [INTENT]: Colonna delle azioni sul dettaglio prenotazione. Ogni form chiama la propria Server Action e
// mostra l'esito; l'unica logica di interfaccia è il caricamento degli slot disponibili per lo spostamento
// (via /api/availability, con excludeBookingId perché la prenotazione non confligga con sé stessa).

import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { reasonLabel } from "@/lib/format";
import type { AvailabilityDay, BookingDetail, Ref } from "@/lib/types";
import { idleState, type ActionState } from "@/lib/action-state";
import { changeStaff, reschedule, updateContact, updateStatus } from "../actions";

function Outcome({ state, success }: { state: ActionState; success: string }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.ok) return <Alert kind="success">{success}</Alert>;
  return null;
}

function StatusCard({ booking }: { booking: BookingDetail }) {
  const [state, action, pending] = useActionState(updateStatus.bind(null, booking.id), idleState);
  const options: Array<{ status: string; label: string; variant: "primary" | "secondary" | "danger" }> = [];
  if (booking.status !== "completed") options.push({ status: "completed", label: "Segna completata", variant: "primary" });
  if (booking.status !== "no_show") options.push({ status: "no_show", label: "Mancato arrivo", variant: "secondary" });
  if (booking.status !== "confirmed") options.push({ status: "confirmed", label: "Riporta a confermata", variant: "secondary" });
  if (booking.status !== "cancelled") options.push({ status: "cancelled", label: "Annulla prenotazione", variant: "danger" });
  return (
    <Card>
      <CardTitle>Stato</CardTitle>
      <form action={action} className="flex flex-col gap-2">
        {options.map((o) => (
          <Button key={o.status} type="submit" name="status" value={o.status} variant={o.variant} disabled={pending}>
            {o.label}
          </Button>
        ))}
        <Outcome state={state} success="Stato aggiornato." />
      </form>
    </Card>
  );
}

function RescheduleCard({ booking }: { booking: BookingDetail }) {
  const [state, action, pending] = useActionState(reschedule.bind(null, booking.id), idleState);
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);
  const [day, setDay] = useState<AvailabilityDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadSlots() {
    setLoading(true);
    setLoadError(null);
    try {
      const p = new URLSearchParams({ serviceId: booking.service.id, date, excludeBookingId: booking.id });
      if (booking.staff) p.set("staffId", booking.staff.id);
      const res = await fetch(`/api/availability?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Errore nel caricamento della disponibilità.");
      setDay((data as AvailabilityDay[])[0] ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Errore.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle>Sposta</CardTitle>
      <form action={action} className="flex flex-col gap-3">
        <Field label="Nuova data" htmlFor="rs-date">
          <Input id="rs-date" name="date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setDay(null); }} required />
        </Field>
        <Field label="Nuovo orario" htmlFor="rs-time" error={state.fieldErrors?.time}>
          <Input id="rs-time" name="time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
        <Button type="button" variant="secondary" onClick={loadSlots} disabled={loading || !date}>
          {loading ? "Carico…" : "Mostra orari disponibili"}
        </Button>
        {loadError && <Alert>{loadError}</Alert>}
        {day && !day.available && <Alert kind="info">Giorno non prenotabile: {reasonLabel(day.reason)}.</Alert>}
        {day?.available && (
          <div className="flex flex-wrap gap-1.5">
            {day.slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available}
                title={s.available ? "Libero" : reasonLabel(s.reason)}
                onClick={() => setTime(s.time)}
                className={
                  "rounded-md border px-2 py-1 text-xs tabular-nums " +
                  (s.time === time
                    ? "border-blue-600 bg-blue-600 text-white"
                    : s.available
                      ? "border-neutral-200 bg-white hover:border-blue-400"
                      : "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 line-through")
                }
              >
                {s.time}
              </button>
            ))}
          </div>
        )}
        <Button type="submit" disabled={pending || booking.status !== "confirmed"}>
          {pending ? "Sposto…" : "Sposta prenotazione"}
        </Button>
        {booking.status !== "confirmed" && <p className="text-xs text-neutral-400">Si può spostare solo una prenotazione confermata.</p>}
        <Outcome state={state} success="Prenotazione spostata." />
      </form>
    </Card>
  );
}

function StaffCard({ booking, eligibleStaff }: { booking: BookingDetail; eligibleStaff: Ref[] }) {
  const [state, action, pending] = useActionState(changeStaff.bind(null, booking.id), idleState);
  const others = eligibleStaff.filter((s) => s.id !== booking.staff?.id);
  return (
    <Card>
      <CardTitle>Operatore</CardTitle>
      <p className="mb-2 text-sm text-neutral-600">Attuale: {booking.staff?.name ?? "nessuno"}</p>
      {others.length === 0 ? (
        <p className="text-xs text-neutral-400">Nessun altro operatore esegue tutti i servizi di questo appuntamento.</p>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          <Select name="staffId" defaultValue="" aria-label="Nuovo operatore" required>
            <option value="" disabled>
              Scegli un operatore…
            </option>
            {others.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Cambio…" : "Cambia operatore"}
          </Button>
          <p className="text-xs text-neutral-400">Data, ora e prezzo restano invariati. Il cliente riceve la conferma aggiornata.</p>
          <Outcome state={state} success="Operatore cambiato." />
        </form>
      )}
    </Card>
  );
}

function ContactCard({ booking }: { booking: BookingDetail }) {
  const current = {
    phone: booking.customer.phone ?? "",
    email: booking.customer.email ?? "",
    notes: booking.customer.notes ?? "",
    internalNotes: booking.internalNotes ?? "",
    appointmentMode: booking.appointmentMode ?? "",
  };
  const [state, action, pending] = useActionState(updateContact.bind(null, booking.id, current), idleState);
  const v = state.values;
  return (
    <Card>
      <CardTitle>Recapiti e note</CardTitle>
      <form action={action} className="flex flex-col gap-3">
        <Field label="Telefono" htmlFor="ct-phone" error={state.fieldErrors?.phone}>
          <Input id="ct-phone" name="phone" defaultValue={v?.phone ?? current.phone} />
        </Field>
        <Field label="Email" htmlFor="ct-email" error={state.fieldErrors?.email}>
          <Input id="ct-email" name="email" type="email" defaultValue={v?.email ?? current.email} />
        </Field>
        <Field label="Modalità" htmlFor="ct-mode">
          <Select id="ct-mode" name="appointmentMode" defaultValue={v?.appointmentMode ?? current.appointmentMode}>
            <option value="">Non specificata</option>
            <option value="on_site">In sede</option>
            <option value="remote">Da remoto</option>
          </Select>
        </Field>
        <Field label="Note del cliente" htmlFor="ct-notes">
          <Textarea id="ct-notes" name="notes" defaultValue={v?.notes ?? current.notes} />
        </Field>
        <Field label="Nota interna (solo salone)" htmlFor="ct-internal">
          <Textarea id="ct-internal" name="internalNotes" defaultValue={v?.internalNotes ?? current.internalNotes} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Salvo…" : "Salva recapiti"}
        </Button>
        <Outcome state={state} success="Recapiti aggiornati." />
      </form>
    </Card>
  );
}

export function BookingActions({ booking, eligibleStaff }: { booking: BookingDetail; eligibleStaff: Ref[] }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusCard booking={booking} />
      <RescheduleCard booking={booking} />
      {booking.staff && <StaffCard booking={booking} eligibleStaff={eligibleStaff} />}
      <ContactCard booking={booking} />
    </div>
  );
}
