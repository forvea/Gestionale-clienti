"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email ?? ""} required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Accesso in corso…" : "Entra"}
      </Button>
    </form>
  );
}
