"use server";

// [INTENT]: Server Actions dell'anagrafica clienti: creazione, correzione (PATCH con la convenzione del
// Backend: null = non toccare, "" = svuota — si invia solo ciò che è cambiato), archiviazione. Il vincolo
// "almeno un contatto" lo verifica il Backend sul risultato: qui si mostra il suo messaggio.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type ActionState } from "@/lib/action-state";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import type { Customer, CustomerUpdateRequest, CustomerWriteRequest } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const body: CustomerWriteRequest = {
    name: str(formData, "name"),
    phone: str(formData, "phone") || null,
    email: str(formData, "email") || null,
    notes: str(formData, "notes") || null,
    regular: formData.get("regular") === "on",
    blocked: formData.get("blocked") === "on",
  };
  const values = formValues(formData);
  if (!body.name) return { error: "Il nome è obbligatorio.", values };
  if (!body.phone && !body.email) return { error: "Indica almeno un contatto: telefono o email.", values };

  let created: Customer;
  try {
    created = await api<Customer>("/api/v1/admin/customers", { method: "POST", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/clienti");
  redirect(`/clienti/${created.id}?created=1`);
}

export type CustomerSnapshot = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  regular: boolean;
  blocked: boolean;
};

export async function updateCustomer(
  customerId: string,
  current: CustomerSnapshot,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const next: CustomerSnapshot = {
    name: str(formData, "name"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    notes: str(formData, "notes"),
    regular: formData.get("regular") === "on",
    blocked: formData.get("blocked") === "on",
  };
  const values = formValues(formData);
  if (!next.name) return { error: "Il nome è obbligatorio.", values };
  const body: CustomerUpdateRequest = {
    name: next.name !== current.name ? next.name : null,
    phone: next.phone !== current.phone ? next.phone : null,
    email: next.email !== current.email ? next.email : null,
    notes: next.notes !== current.notes ? next.notes : null,
    regular: next.regular !== current.regular ? next.regular : null,
    blocked: next.blocked !== current.blocked ? next.blocked : null,
  };
  if (Object.values(body).every((v) => v === null)) return { ok: true };
  try {
    await api(`/api/v1/admin/customers/${customerId}`, { method: "PATCH", body });
  } catch (err) {
    return { error: errorMessage(err), fieldErrors: fieldErrors(err), values };
  }
  revalidatePath("/clienti");
  revalidatePath(`/clienti/${customerId}`);
  return { ok: true };
}

export async function deleteCustomer(customerId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api(`/api/v1/admin/customers/${customerId}`, { method: "DELETE" });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/clienti");
  redirect("/clienti?deleted=1");
}
