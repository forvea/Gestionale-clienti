"use client";

// [INTENT]: Le card interattive della pagina "Orari e chiusure". Ognuna ha la propria Server Action e si
// salva da sola: orari settimanali, pause del salone, chiusure (con le festività suggerite dal Backend
// come scorciatoia), blocchi orari.

import { useActionState, useState } from "react";
import { BreaksEditor } from "@/components/BreaksEditor";
import { Alert, Badge, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { WeekHoursEditor, type WeekRow } from "@/components/WeekHoursEditor";
import { idleState } from "@/lib/action-state";
import { RECURRENCE_LABEL, formatDate, todayIso } from "@/lib/format";
import type { AdminBusinessHours, BreakItem, Closure, Holiday, TimeBlock } from "@/lib/types";
import { addClosure, addTimeBlock, deleteClosure, deleteTimeBlock, saveBusinessHours, saveTenantBreaks } from "./actions";

export function BusinessHoursCard({ hours }: { hours: AdminBusinessHours }) {
  const [state, action, pending] = useActionState(saveBusinessHours, idleState);
  const week: WeekRow[] = Array.from({ length: 7 }, (_, d) => {
    const h = hours.days.find((x) => x.dayOfWeek === d);
    return { on: h?.isOpen ?? false, start: h?.openTime ?? "09:00", end: h?.closeTime ?? "19:00" };
  });
  return (
    <Card>
      <CardTitle>Orari di apertura</CardTitle>
      {!hours.configured && (
        <div className="mb-3">
          <Alert kind="info">Gli orari non sono mai stati impostati: finché restano vuoti il salone non è prenotabile.</Alert>
        </div>
      )}
      <form action={action} className="flex flex-col gap-3">
        <WeekHoursEditor initial={week} onLabel="Aperto" />
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Orari salvati.</Alert>}
        <p className="text-xs text-neutral-400">Gli operatori hanno orari propri: cambiare questi non li aggiorna.</p>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Salva orari"}
        </Button>
      </form>
    </Card>
  );
}

export function TenantBreaksCard({ breaks }: { breaks: BreakItem[] }) {
  const [state, action, pending] = useActionState(saveTenantBreaks, idleState);
  return (
    <Card>
      <CardTitle>Pause del salone</CardTitle>
      <p className="mb-3 text-xs text-neutral-500">Fasce non prenotabili ogni settimana per tutti gli operatori (es. pausa pranzo).</p>
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

export function ClosuresCard({ closures, holidays }: { closures: Closure[]; holidays: Holiday[] }) {
  const [state, action, pending] = useActionState(addClosure, idleState);
  const v = state.values ?? {};
  const [recurrence, setRecurrence] = useState(v.recurrence ?? "none");
  const isEaster = recurrence === "easter" || recurrence === "easter_monday";
  const today = todayIso();
  const sorted = [...closures].sort((a, b) => {
    const ra = a.recurrence !== "none" ? 0 : 1;
    const rb = b.recurrence !== "none" ? 0 : 1;
    return ra - rb || a.dateFrom.localeCompare(b.dateFrom);
  });
  // Festività non ancora coperte da una chiusura ricorrente equivalente.
  const covered = (h: Holiday) =>
    closures.some((c) => c.recurrence === h.recurrence && (h.recurrence !== "annual" || (c.dateFrom.slice(5) <= h.date.slice(5) && h.date.slice(5) <= c.dateTo.slice(5))));
  const suggestions = holidays.filter((h) => !covered(h));

  return (
    <Card>
      <CardTitle>Chiusure straordinarie</CardTitle>
      {sorted.length === 0 ? (
        <p className="mb-3 text-xs text-neutral-400">Nessuna chiusura registrata.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-neutral-100 text-sm">
          {sorted.map((c) => (
            <ClosureRow key={c.id} closure={c} past={c.recurrence === "none" && c.dateTo < today} />
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="mb-2 text-xs font-medium text-blue-800">Festività non ancora registrate</p>
          <ul className="flex flex-wrap gap-1.5">
            {suggestions.map((h) => (
              <li key={h.date}>
                <HolidayButton holiday={h} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={action} className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
        <p className="text-xs font-medium text-neutral-600">Nuova chiusura</p>
        <Field label="Ricorrenza" htmlFor="cl-rec">
          <Select id="cl-rec" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            {Object.entries(RECURRENCE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {!isEaster && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dal" htmlFor="cl-from" error={state.fieldErrors?.dateFrom}>
              <Input id="cl-from" name="dateFrom" type="date" defaultValue={v.dateFrom ?? today} required />
            </Field>
            <Field label="Al" htmlFor="cl-to" hint={recurrence === "annual" ? "Contano solo giorno e mese; può scavalcare Capodanno" : "Vuoto = stesso giorno"} error={state.fieldErrors?.dateTo}>
              <Input id="cl-to" name="dateTo" type="date" defaultValue={v.dateTo ?? ""} />
            </Field>
          </div>
        )}
        <Field label="Motivo" htmlFor="cl-reason" hint="Opzionale. Visibile anche sul sito del salone.">
          <Input id="cl-reason" name="reason" defaultValue={v.reason ?? ""} maxLength={300} />
        </Field>
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Chiusura registrata.</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Aggiungi chiusura"}
        </Button>
      </form>
    </Card>
  );
}

function HolidayButton({ holiday }: { holiday: Holiday }) {
  const [state, action, pending] = useActionState(addClosure, idleState);
  return (
    <form action={action}>
      <input type="hidden" name="recurrence" value={holiday.recurrence} />
      <input type="hidden" name="dateFrom" value={holiday.date} />
      <input type="hidden" name="dateTo" value={holiday.date} />
      <input type="hidden" name="reason" value={holiday.name} />
      <Button type="submit" variant="secondary" disabled={pending} className="px-2 py-1 text-xs">
        + {holiday.name}
      </Button>
      {state.error && <span className="ml-1 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

function ClosureRow({ closure, past }: { closure: Closure; past: boolean }) {
  const [state, action, pending] = useActionState(deleteClosure.bind(null, closure.id), idleState);
  const when =
    closure.recurrence === "easter" || closure.recurrence === "easter_monday"
      ? RECURRENCE_LABEL[closure.recurrence]
      : closure.recurrence === "annual"
        ? `ogni anno, ${closure.dateFrom.slice(8, 10)}/${closure.dateFrom.slice(5, 7)}${closure.dateFrom !== closure.dateTo ? ` → ${closure.dateTo.slice(8, 10)}/${closure.dateTo.slice(5, 7)}` : ""}`
        : closure.dateFrom === closure.dateTo
          ? formatDate(closure.dateFrom, "short")
          : `${formatDate(closure.dateFrom, "short")} → ${formatDate(closure.dateTo, "short")}`;
  return (
    <li className={"flex items-center gap-2 py-2" + (past ? " text-neutral-400" : "")}>
      <span className="flex-1">
        <span className="font-medium">{when}</span>
        <span className="block text-xs text-neutral-500">{closure.reason || "—"}</span>
        {state.error && <span className="block text-xs text-red-600">{state.error}</span>}
      </span>
      {closure.recurrence !== "none" && <Badge className="border-blue-200 bg-blue-50 text-blue-700">{RECURRENCE_LABEL[closure.recurrence]}</Badge>}
      {past && <Badge className="border-neutral-200 bg-neutral-100 text-neutral-500">Passata</Badge>}
      <form action={action}>
        <Button type="submit" variant="ghost" disabled={pending} aria-label="Rimuovi chiusura">
          ✕
        </Button>
      </form>
    </li>
  );
}

export function TimeBlocksCard({ blocks }: { blocks: TimeBlock[] }) {
  const [state, action, pending] = useActionState(addTimeBlock, idleState);
  const v = state.values ?? {};
  const today = todayIso();
  const sorted = [...blocks].sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
  return (
    <Card>
      <CardTitle>Blocchi orari</CardTitle>
      <p className="mb-3 text-xs text-neutral-500">Una fascia oraria non prenotabile per tutto il salone, in uno o più giorni (riunione, manutenzione).</p>
      {sorted.length === 0 ? (
        <p className="mb-3 text-xs text-neutral-400">Nessun blocco registrato.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-neutral-100 text-sm">
          {sorted.map((b) => (
            <TimeBlockRow key={b.id} block={b} past={b.dateTo < today} />
          ))}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
        <p className="text-xs font-medium text-neutral-600">Nuovo blocco</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dal" htmlFor="tb-from" error={state.fieldErrors?.dateFrom}>
            <Input id="tb-from" name="dateFrom" type="date" defaultValue={v.dateFrom ?? today} required />
          </Field>
          <Field label="Al" htmlFor="tb-to" hint="Vuoto = stesso giorno" error={state.fieldErrors?.dateTo}>
            <Input id="tb-to" name="dateTo" type="date" defaultValue={v.dateTo ?? ""} />
          </Field>
          <Field label="Dalle" htmlFor="tb-start" error={state.fieldErrors?.startTime}>
            <Input id="tb-start" name="startTime" type="time" defaultValue={v.startTime ?? "13:00"} required />
          </Field>
          <Field label="Alle" htmlFor="tb-end" error={state.fieldErrors?.endTime}>
            <Input id="tb-end" name="endTime" type="time" defaultValue={v.endTime ?? "14:00"} required />
          </Field>
        </div>
        <Field label="Motivo" htmlFor="tb-reason" hint="Opzionale, solo per il salone: non è mostrato ai clienti">
          <Textarea id="tb-reason" name="reason" defaultValue={v.reason ?? ""} maxLength={300} className="min-h-12" />
        </Field>
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Blocco registrato.</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Aggiungi blocco"}
        </Button>
      </form>
    </Card>
  );
}

function TimeBlockRow({ block, past }: { block: TimeBlock; past: boolean }) {
  const [state, action, pending] = useActionState(deleteTimeBlock.bind(null, block.id), idleState);
  const when = block.dateFrom === block.dateTo ? formatDate(block.dateFrom, "short") : `${formatDate(block.dateFrom, "short")} → ${formatDate(block.dateTo, "short")}`;
  return (
    <li className={"flex items-center gap-2 py-2" + (past ? " text-neutral-400" : "")}>
      <span className="flex-1">
        <span className="font-medium">
          {when} · {block.startTime}–{block.endTime}
        </span>
        <span className="block text-xs text-neutral-500">{block.reason || "—"}</span>
        {state.error && <span className="block text-xs text-red-600">{state.error}</span>}
      </span>
      {past && <Badge className="border-neutral-200 bg-neutral-100 text-neutral-500">Passato</Badge>}
      <form action={action}>
        <Button type="submit" variant="ghost" disabled={pending} aria-label="Rimuovi blocco">
          ✕
        </Button>
      </form>
    </li>
  );
}
