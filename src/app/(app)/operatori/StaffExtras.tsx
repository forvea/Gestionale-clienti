"use client";

// [INTENT]: Le due card accessorie della scheda operatore: pause ricorrenti (PUT in blocco) e assenze
// (elenco + aggiunta + rimozione puntuale). Separate dal form principale perché parlano con endpoint
// diversi e si salvano indipendentemente.

import { useActionState, useState } from "react";
import { BreaksEditor } from "@/components/BreaksEditor";
import { Alert, Button, Card, CardTitle, Field, Input, Select } from "@/components/ui";
import { idleState } from "@/lib/action-state";
import { TIME_OFF_REASON_LABEL, formatDate, todayIso } from "@/lib/format";
import type { BreakItem, StaffTimeOff } from "@/lib/types";
import { addTimeOff, deleteTimeOff, saveStaffBreaks } from "./actions";

export function StaffBreaksCard({ staffId, breaks }: { staffId: string; breaks: BreakItem[] }) {
  const [state, action, pending] = useActionState(saveStaffBreaks.bind(null, staffId), idleState);
  return (
    <Card>
      <CardTitle>Pause ricorrenti</CardTitle>
      <p className="mb-3 text-xs text-neutral-500">Fasce non prenotabili ogni settimana per questo operatore. Si sommano alle pause del salone.</p>
      <form action={action} className="flex flex-col gap-3">
        <BreaksEditor initial={breaks} />
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Pause salvate.</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Salva pause"}
        </Button>
      </form>
    </Card>
  );
}

export function StaffTimeOffCard({ staffId, items }: { staffId: string; items: StaffTimeOff[] }) {
  const [state, action, pending] = useActionState(addTimeOff.bind(null, staffId), idleState);
  const v = state.values ?? {};
  const [fullDay, setFullDay] = useState(v.fullDay !== undefined ? v.fullDay === "on" : true);
  const sorted = [...items].sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
  return (
    <Card>
      <CardTitle>Assenze</CardTitle>
      {sorted.length === 0 ? (
        <p className="mb-3 text-xs text-neutral-400">Nessuna assenza registrata.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-neutral-100 text-sm">
          {sorted.map((t) => (
            <TimeOffRow key={t.id} staffId={staffId} item={t} />
          ))}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
        <p className="text-xs font-medium text-neutral-600">Nuova assenza</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dal" htmlFor="to-from" error={state.fieldErrors?.dateFrom}>
            <Input id="to-from" name="dateFrom" type="date" defaultValue={v.dateFrom ?? todayIso()} required />
          </Field>
          <Field label="Al" htmlFor="to-to" hint="Vuoto = stesso giorno" error={state.fieldErrors?.dateTo}>
            <Input id="to-to" name="dateTo" type="date" defaultValue={v.dateTo ?? ""} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="fullDay" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} className="accent-blue-600" />
          Giornata intera
        </label>
        {!fullDay && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dalle" htmlFor="to-start">
              <Input id="to-start" name="startTime" type="time" defaultValue={v.startTime ?? "09:00"} />
            </Field>
            <Field label="Alle" htmlFor="to-end">
              <Input id="to-end" name="endTime" type="time" defaultValue={v.endTime ?? "13:00"} />
            </Field>
          </div>
        )}
        <Field label="Motivo" htmlFor="to-reason" hint="Opzionale: solo una categoria, mai testo libero">
          <Select id="to-reason" name="reason" defaultValue={v.reason ?? ""}>
            <option value="">Non indicato</option>
            {Object.entries(TIME_OFF_REASON_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Assenza registrata.</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Aggiungi assenza"}
        </Button>
      </form>
    </Card>
  );
}

function TimeOffRow({ staffId, item }: { staffId: string; item: StaffTimeOff }) {
  const [state, action, pending] = useActionState(deleteTimeOff.bind(null, staffId, item.id), idleState);
  const when = item.dateFrom === item.dateTo ? formatDate(item.dateFrom, "short") : `${formatDate(item.dateFrom, "short")} → ${formatDate(item.dateTo, "short")}`;
  const hours = item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : "giornata intera";
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="flex-1">
        <span className="font-medium">{when}</span>
        <span className="block text-xs text-neutral-500">
          {hours}
          {item.reason ? ` · ${TIME_OFF_REASON_LABEL[item.reason] ?? item.reason}` : ""}
        </span>
        {state.error && <span className="block text-xs text-red-600">{state.error}</span>}
      </span>
      <form action={action}>
        <Button type="submit" variant="ghost" disabled={pending} aria-label="Rimuovi assenza">
          ✕
        </Button>
      </form>
    </li>
  );
}
