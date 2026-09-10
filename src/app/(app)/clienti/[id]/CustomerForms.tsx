"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, Input, Textarea } from "@/components/ui";
import type { Customer } from "@/lib/types";
import { idleState } from "@/lib/action-state";
import { deleteCustomer, updateCustomer } from "../actions";

export function CustomerForms({ customer }: { customer: Customer }) {
  const current = {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? "",
    regular: customer.regular,
    blocked: customer.blocked,
  };
  const [state, action, pending] = useActionState(updateCustomer.bind(null, customer.id, current), idleState);
  const [delState, delAction, deleting] = useActionState(deleteCustomer.bind(null, customer.id), idleState);
  const [confirm, setConfirm] = useState(false);
  const v = state.values;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Dati</CardTitle>
        <form action={action} className="flex flex-col gap-3">
          <Field label="Nome" htmlFor="c-name" error={state.fieldErrors?.name}>
            <Input id="c-name" name="name" defaultValue={v?.name ?? current.name} required />
          </Field>
          <Field label="Telefono" htmlFor="c-phone" error={state.fieldErrors?.phone}>
            <Input id="c-phone" name="phone" defaultValue={v?.phone ?? current.phone} />
          </Field>
          <Field label="Email" htmlFor="c-email" error={state.fieldErrors?.email}>
            <Input id="c-email" name="email" type="email" defaultValue={v?.email ?? current.email} />
          </Field>
          <Field label="Note" htmlFor="c-notes">
            <Textarea id="c-notes" name="notes" defaultValue={v?.notes ?? current.notes} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="regular" defaultChecked={v ? v.regular === "on" : current.regular} className="accent-blue-600" />
            Cliente abituale
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="blocked" defaultChecked={v ? v.blocked === "on" : current.blocked} className="mt-0.5 accent-blue-600" />
            <span>
              Segnalato
              <span className="block text-xs text-neutral-500">Nota per il salone: non impedisce le prenotazioni.</span>
            </span>
          </label>
          {state.error && <Alert>{state.error}</Alert>}
          {state.ok && <Alert kind="success">Scheda aggiornata.</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvo…" : "Salva"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Archivia</CardTitle>
        <p className="mb-3 text-xs text-neutral-500">
          La scheda sparisce dall&apos;anagrafica; le prenotazioni già registrate restano intatte.
        </p>
        {!confirm ? (
          <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
            Archivia scheda
          </Button>
        ) : (
          <form action={delAction} className="flex flex-col gap-2">
            <Alert kind="info">Confermi l&apos;archiviazione di {customer.name}?</Alert>
            {delState.error && <Alert>{delState.error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" disabled={deleting}>
                {deleting ? "Archivio…" : "Sì, archivia"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirm(false)}>
                No
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
