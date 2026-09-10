"use client";

// [INTENT]: Form unico per creare e modificare un operatore: dati, servizi eseguiti (con prezzo
// personalizzato opzionale) e orari settimanali completi. Il Backend richiede tutti e 7 i giorni con
// isAvailable esplicito: l'editor li mostra sempre tutti, e un giorno non lavorato si spegne.

import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, Input } from "@/components/ui";
import { WeekHoursEditor, type WeekRow } from "@/components/WeekHoursEditor";
import { idleState, type ActionState } from "@/lib/action-state";
import { formatPrice } from "@/lib/format";
import type { BusinessHoursItem, Service, Staff } from "@/lib/types";
import { deleteStaff } from "./actions";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  staff?: Staff;
  services: Service[];
  /** Orari del salone: default per un operatore nuovo. */
  tenantHours: BusinessHoursItem[];
  submitLabel: string;
};

export function StaffForm({ action: boundAction, staff, services, tenantHours, submitLabel }: Props) {
  const [state, action, pending] = useActionState(boundAction, idleState);
  const v = state.values ?? {};
  const submitted = v.name !== undefined;

  const week: WeekRow[] = Array.from({ length: 7 }, (_, d) => {
    if (submitted) return { on: v[`d${d}_on`] === "on", start: v[`d${d}_start`] ?? "", end: v[`d${d}_end`] ?? "" };
    const own = staff?.businessHours.find((h) => h.dayOfWeek === d);
    if (own && staff?.businessHoursConfigured) return { on: own.isAvailable, start: own.startTime ?? "09:00", end: own.endTime ?? "18:00" };
    const t = tenantHours.find((h) => h.dayOfWeek === d);
    return { on: t?.isOpen ?? false, start: t?.openTime ?? "09:00", end: t?.closeTime ?? "18:00" };
  });

  return (
    <>
      <form action={action} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Operatore</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" htmlFor="st-name" error={state.fieldErrors?.name}>
                <Input id="st-name" name="name" defaultValue={v.name ?? staff?.name ?? ""} required maxLength={255} />
              </Field>
              <Field label="Ruolo" htmlFor="st-role" hint="Es. Barbiere, Estetista">
                <Input id="st-role" name="role" defaultValue={v.role ?? staff?.role ?? ""} />
              </Field>
              <Field label="Specializzazione" htmlFor="st-spec">
                <Input id="st-spec" name="specialization" defaultValue={v.specialization ?? staff?.specialization ?? ""} />
              </Field>
              <Field label="Ordine di visualizzazione" htmlFor="st-order">
                <Input id="st-order" name="displayOrder" type="number" min={0} defaultValue={v.displayOrder ?? String(staff?.displayOrder ?? 0)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>Orari settimanali</CardTitle>
            <p className="mb-3 text-xs text-neutral-500">
              Tutti i giorni vanno dichiarati: un giorno spento è un giorno non lavorato.
              {staff && !staff.businessHoursConfigured && " Questo operatore non aveva orari propri e seguiva quelli del salone: salvando diventano espliciti."}
            </p>
            <WeekHoursEditor initial={week} onLabel="Lavora" />
            {state.fieldErrors?.businessHours && <Alert>{state.fieldErrors.businessHours.join(" ")}</Alert>}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Servizi eseguiti</CardTitle>
            {services.length === 0 ? (
              <p className="text-xs text-neutral-400">Nessun servizio nel catalogo.</p>
            ) : (
              <ServicesPicker services={services} staff={staff} values={submitted ? v : null} />
            )}
          </Card>
          <Card>
            <CardTitle>Visibilità</CardTitle>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={submitted ? v.active === "on" : (staff?.active ?? true)} className="mt-0.5 accent-blue-600" />
              <span>
                Attivo
                <span className="block text-xs text-neutral-500">Se spento non è selezionabile per nuove prenotazioni.</span>
              </span>
            </label>
          </Card>
          <Card>
            {state.error && (
              <div className="mb-3">
                <Alert>{state.error}</Alert>
              </div>
            )}
            {state.ok && (
              <div className="mb-3">
                <Alert kind="success">Operatore salvato.</Alert>
              </div>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Salvo…" : submitLabel}
            </Button>
          </Card>
        </div>
      </form>
      {staff && (
        <div className="mt-4 lg:ml-auto lg:w-1/3">
          <DeleteCard staff={staff} />
        </div>
      )}
    </>
  );
}

function ServicesPicker({ services, staff, values }: { services: Service[]; staff?: Staff; values: Record<string, string> | null }) {
  const initiallyOn = (id: string) => (values ? values[`svc_${id}`] === "on" : Boolean(staff?.services.some((s) => s.serviceId === id)));
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(services.map((s) => [s.id, initiallyOn(s.id)])));
  return (
    <ul className="flex flex-col gap-2">
      {services
        .filter((s) => s.active || on[s.id])
        .map((s) => {
          const override = values ? (values[`price_${s.id}`] ?? "") : (staff?.services.find((a) => a.serviceId === s.id)?.priceOverride?.toString() ?? "");
          return (
            <li key={s.id} className="flex flex-col gap-1 rounded-lg border border-neutral-100 p-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`svc_${s.id}`} checked={on[s.id]} onChange={(e) => setOn({ ...on, [s.id]: e.target.checked })} className="accent-blue-600" />
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-neutral-500">{formatPrice(s.basePrice)}</span>
              </label>
              {on[s.id] && (
                <Input name={`price_${s.id}`} type="number" min={0} step="0.01" defaultValue={override} placeholder="Prezzo personalizzato (vuoto = listino)" aria-label={`Prezzo personalizzato per ${s.name}`} className="text-xs" />
              )}
            </li>
          );
        })}
    </ul>
  );
}

function DeleteCard({ staff }: { staff: Staff }) {
  const [state, action, pending] = useActionState(deleteStaff.bind(null, staff.id), idleState);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card>
      <CardTitle>Elimina</CardTitle>
      <p className="mb-3 text-xs text-neutral-500">L&apos;operatore sparisce dall&apos;elenco; le prenotazioni già registrate restano intatte.</p>
      {!confirm ? (
        <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
          Elimina operatore
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Alert kind="info">Confermi l&apos;eliminazione di {staff.name}?</Alert>
          {state.error && <Alert>{state.error}</Alert>}
          <div className="flex gap-2">
            <form action={action}>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Elimino…" : "Sì, elimina"}
              </Button>
            </form>
            <Button type="button" variant="secondary" onClick={() => setConfirm(false)}>
              No
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
