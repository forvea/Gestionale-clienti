"use client";

import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { idleState } from "@/lib/action-state";
import { createCustomer } from "../actions";

export function NewCustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, idleState);
  const v = state.values ?? {};
  return (
    <Card className="max-w-xl">
      <form action={action} className="flex flex-col gap-3">
        <Field label="Nome" htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={v.name ?? ""} required autoFocus />
        </Field>
        <Field label="Telefono" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" defaultValue={v.phone ?? ""} />
        </Field>
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} hint="Serve almeno uno tra telefono ed email">
          <Input id="email" name="email" type="email" defaultValue={v.email ?? ""} />
        </Field>
        <Field label="Note" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={v.notes ?? ""} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="regular" defaultChecked={v.regular === "on"} className="accent-blue-600" /> Cliente abituale
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="blocked" defaultChecked={v.blocked === "on"} className="accent-blue-600" /> Segnalato
        </label>
        {state.error && <Alert>{state.error}</Alert>}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Crea scheda"}
        </Button>
      </form>
    </Card>
  );
}
