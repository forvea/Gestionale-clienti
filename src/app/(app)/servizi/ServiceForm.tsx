"use client";

// [INTENT]: Form unico per creare e modificare un servizio. Riceve l'azione già legata (create o update)
// e i valori iniziali; dopo un errore i campi si ripopolano da `state.values` (React 19 azzera il form).

import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { idleState, type ActionState } from "@/lib/action-state";
import { BUFFER_POSITION_LABEL } from "@/lib/format";
import type { Service } from "@/lib/types";
import { deleteService } from "./actions";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  service?: Service;
  submitLabel: string;
};

export function ServiceForm({ action: boundAction, service, submitLabel }: Props) {
  const [state, action, pending] = useActionState(boundAction, idleState);
  const v = state.values ?? {};
  const init = {
    name: v.name ?? service?.name ?? "",
    category: v.category ?? service?.category ?? "",
    description: v.description ?? service?.description ?? "",
    durationMinutes: v.durationMinutes ?? String(service?.durationMinutes ?? 30),
    basePrice: v.basePrice ?? (service?.basePrice != null ? String(service.basePrice) : ""),
    parallelSlots: v.parallelSlots ?? String(service?.parallelSlots ?? 1),
    bufferEnabled: v.name !== undefined ? v.bufferEnabled === "on" : (service?.bufferEnabled ?? false),
    bufferMinutes: v.bufferMinutes ?? String(service?.bufferMinutes ?? 0),
    bufferPosition: v.bufferPosition ?? service?.bufferPosition ?? "After",
    active: v.name !== undefined ? v.active === "on" : (service?.active ?? true),
    displayOrder: v.displayOrder ?? String(service?.displayOrder ?? 0),
    colorEnabled: v.name !== undefined ? v.colorEnabled === "on" : Boolean(service?.color),
    color: v.color ?? service?.color?.slice(0, 7) ?? "#2563eb",
  };
  const [bufferOn, setBufferOn] = useState(init.bufferEnabled);
  const [colorOn, setColorOn] = useState(init.colorEnabled);

  return (
    <>
    <form action={action} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Servizio</CardTitle>
          <div className="flex flex-col gap-3">
            <Field label="Nome" htmlFor="s-name" error={state.fieldErrors?.name}>
              <Input id="s-name" name="name" defaultValue={init.name} required maxLength={255} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria" htmlFor="s-category" hint="Es. Capelli, Barba, Estetica">
                <Input id="s-category" name="category" defaultValue={init.category} />
              </Field>
              <Field label="Ordine di visualizzazione" htmlFor="s-order" hint="Numero più basso = più in alto">
                <Input id="s-order" name="displayOrder" type="number" min={0} defaultValue={init.displayOrder} />
              </Field>
            </div>
            <Field label="Descrizione" htmlFor="s-desc">
              <Textarea id="s-desc" name="description" defaultValue={init.description} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Durata, prezzo e capienza</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Durata (minuti)" htmlFor="s-duration" error={state.fieldErrors?.durationMinutes}>
              <Input id="s-duration" name="durationMinutes" type="number" min={5} step={5} defaultValue={init.durationMinutes} required />
            </Field>
            <Field label="Prezzo (€)" htmlFor="s-price" hint="Vuoto = non indicato">
              <Input id="s-price" name="basePrice" type="number" min={0} step="0.01" defaultValue={init.basePrice} />
            </Field>
            <Field label="Prenotazioni in parallelo" htmlFor="s-parallel" hint="Conta solo per servizi senza operatori" error={state.fieldErrors?.parallelSlots}>
              <Input id="s-parallel" name="parallelSlots" type="number" min={1} defaultValue={init.parallelSlots} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Buffer</CardTitle>
          <p className="mb-3 text-xs text-neutral-500">
            Tempo non prenotabile attorno all&apos;appuntamento (pulizia, preparazione). Si somma alla durata nel calcolo della disponibilità.
          </p>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="bufferEnabled" checked={bufferOn} onChange={(e) => setBufferOn(e.target.checked)} className="accent-blue-600" />
            Attiva buffer
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minuti" htmlFor="s-buffer-min" error={state.fieldErrors?.bufferMinutes}>
              <Input id="s-buffer-min" name="bufferMinutes" type="number" min={0} step={5} defaultValue={init.bufferMinutes} disabled={!bufferOn} />
            </Field>
            <Field label="Posizione" htmlFor="s-buffer-pos" error={state.fieldErrors?.bufferPosition}>
              <Select id="s-buffer-pos" name="bufferPosition" defaultValue={init.bufferPosition} disabled={!bufferOn}>
                {Object.entries(BUFFER_POSITION_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {/* WHY: un select/input disabilitato non viene inviato; con il buffer spento si mandano comunque
              valori validi (0 minuti, "After") perché il PUT è una sostituzione e il Backend li richiede. */}
          {!bufferOn && (
            <>
              <input type="hidden" name="bufferMinutes" value="0" />
              <input type="hidden" name="bufferPosition" value="After" />
            </>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Visibilità</CardTitle>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={init.active} className="mt-0.5 accent-blue-600" />
            <span>
              Attivo
              <span className="block text-xs text-neutral-500">Se spento non è prenotabile dal sito né dal pannello.</span>
            </span>
          </label>
        </Card>
        <Card>
          <CardTitle>Colore</CardTitle>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="colorEnabled" checked={colorOn} onChange={(e) => setColorOn(e.target.checked)} className="accent-blue-600" />
            Usa un colore identificativo
          </label>
          <Field label="Colore" htmlFor="s-color" error={state.fieldErrors?.color}>
            <input id="s-color" name="color" type="color" defaultValue={init.color} disabled={!colorOn} className="h-9 w-16 cursor-pointer rounded border border-neutral-200 bg-white" />
          </Field>
        </Card>
        <Card>
          {state.error && (
            <div className="mb-3">
              <Alert>{state.error}</Alert>
            </div>
          )}
          {state.ok && (
            <div className="mb-3">
              <Alert kind="success">Servizio salvato.</Alert>
            </div>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvo…" : submitLabel}
          </Button>
        </Card>
      </div>
    </form>
    {/* WHY: fuori dal form principale — un <form> annidato non è HTML valido e il browser lo scarta. */}
    {service && (
      <div className="mt-4 lg:w-1/3 lg:ml-auto">
        <DeleteCard service={service} />
      </div>
    )}
    </>
  );
}

function DeleteCard({ service }: { service: Service }) {
  const [state, action, pending] = useActionState(deleteService.bind(null, service.id), idleState);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card>
      <CardTitle>Elimina</CardTitle>
      <p className="mb-3 text-xs text-neutral-500">Il servizio sparisce dal catalogo; le prenotazioni già registrate restano intatte.</p>
      {!confirm ? (
        <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
          Elimina servizio
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Alert kind="info">Confermi l&apos;eliminazione di {service.name}?</Alert>
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
