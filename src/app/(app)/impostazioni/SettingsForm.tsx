"use client";

// [INTENT]: Form delle impostazioni del salone (PATCH per differenza) e card separata per il logo
// (upload multipart, form a sé perché è un'altra chiamata). I campi in sola lettura — nome, slug, fuso
// orario — si mostrano ma non si inviano: il Backend li ignora deliberatamente.

import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, DescriptionList, Field, Input } from "@/components/ui";
import { idleState } from "@/lib/action-state";
import type { AdminTenant } from "@/lib/types";
import { updateTenant, uploadLogo, type TenantSnapshot } from "./actions";

type SwitchKey = "emailConfirmationEnabled" | "emailReminderEnabled" | "emailCancellationEnabled" | "emailOwnerNotificationEnabled" | "emailReviewRequestEnabled";
const SWITCH_LABELS: Array<[SwitchKey, string, string]> = [
  ["emailConfirmationEnabled", "Conferma al cliente", "Alla prenotazione e dopo uno spostamento"],
  ["emailReminderEnabled", "Promemoria", "Prima dell'appuntamento"],
  ["emailCancellationEnabled", "Disdetta", "Quando la prenotazione viene annullata, da chiunque"],
  ["emailOwnerNotificationEnabled", "Notifica al titolare", "A te, per ogni nuova prenotazione"],
  ["emailReviewRequestEnabled", "Richiesta di recensione", "Quando segni un appuntamento come completato; serve il link Google qui sotto"],
];

export function SettingsForm({ tenant }: { tenant: AdminTenant }) {
  const current: TenantSnapshot = {
    address: tenant.address ?? "",
    phone: tenant.phone ?? "",
    color: tenant.color ?? "",
    bookingManagementPath: tenant.bookingManagementPath ?? "",
    googleReviewUrl: tenant.googleReviewUrl ?? "",
    emailConfirmationEnabled: tenant.emailConfirmationEnabled,
    emailReminderEnabled: tenant.emailReminderEnabled,
    emailCancellationEnabled: tenant.emailCancellationEnabled,
    emailOwnerNotificationEnabled: tenant.emailOwnerNotificationEnabled,
    emailReviewRequestEnabled: tenant.emailReviewRequestEnabled,
  };
  const [state, action, pending] = useActionState(updateTenant.bind(null, current), idleState);
  const v = state.values;
  const [colorOn, setColorOn] = useState(v ? v.colorEnabled === "on" : Boolean(tenant.color));

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <form action={action} className="flex flex-col gap-4">
        <Card>
          <CardTitle>Salone</CardTitle>
          <DescriptionList items={[["Nome", tenant.name], ["Identificativo", tenant.slug], ["Fuso orario", tenant.timezone]]} />
          <p className="mt-2 text-xs text-neutral-400">Nome, identificativo e fuso orario non si modificano da qui: chiedi all&apos;agenzia.</p>
        </Card>

        <Card>
          <CardTitle>Contatti</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Indirizzo" htmlFor="t-address" hint="Compare nelle email e nel link al calendario" error={state.fieldErrors?.address}>
              <Input id="t-address" name="address" defaultValue={v?.address ?? current.address} maxLength={300} />
            </Field>
            <Field label="Telefono" htmlFor="t-phone" error={state.fieldErrors?.phone}>
              <Input id="t-phone" name="phone" defaultValue={v?.phone ?? current.phone} maxLength={50} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Link</CardTitle>
          <div className="flex flex-col gap-3">
            <Field
              label="Pagina di gestione prenotazione sul tuo sito"
              htmlFor="t-path"
              hint="Percorso relativo, es. /prenotazione. Il cliente ci arriva dalle email per spostare o disdire. Vuoto = nessun link"
              error={state.fieldErrors?.bookingManagementPath}
            >
              <Input id="t-path" name="bookingManagementPath" defaultValue={v?.bookingManagementPath ?? current.bookingManagementPath} maxLength={200} placeholder="/prenotazione" />
            </Field>
            <Field
              label="Link alla scheda Google per le recensioni"
              htmlFor="t-review"
              hint="URL completo https://… Senza, la richiesta di recensione non parte anche se attiva"
              error={state.fieldErrors?.googleReviewUrl}
            >
              <Input id="t-review" name="googleReviewUrl" type="url" defaultValue={v?.googleReviewUrl ?? current.googleReviewUrl} maxLength={500} placeholder="https://g.page/r/…" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Email automatiche</CardTitle>
          <ul className="flex flex-col gap-2">
            {SWITCH_LABELS.map(([key, label, hint]) => (
              <li key={key}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name={key} defaultChecked={v ? v[key] === "on" : current[key]} className="mt-0.5 accent-blue-600" />
                  <span>
                    {label}
                    <span className="block text-xs text-neutral-500">{hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-400">Le email di sicurezza (attivazione, reset password) partono sempre. Ogni singola prenotazione può comunque escludere le email.</p>
        </Card>

        <Card>
          <CardTitle>Colore</CardTitle>
          <p className="mb-2 text-xs text-neutral-500">Usato nell&apos;intestazione delle email ai clienti, insieme al logo.</p>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="colorEnabled" checked={colorOn} onChange={(e) => setColorOn(e.target.checked)} className="accent-blue-600" />
            Usa un colore del salone
          </label>
          <Field label="Colore" htmlFor="t-color" error={state.fieldErrors?.color}>
            <input id="t-color" name="color" type="color" defaultValue={v?.color || current.color.slice(0, 7) || "#111827"} disabled={!colorOn} className="h-9 w-16 cursor-pointer rounded border border-neutral-200 bg-white" />
          </Field>
        </Card>

        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Impostazioni salvate.</Alert>}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvo…" : "Salva impostazioni"}
        </Button>
      </form>

      <LogoCard logoUrl={tenant.logoUrl} name={tenant.name} />
    </div>
  );
}

function LogoCard({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [state, action, pending] = useActionState(uploadLogo, idleState);
  return (
    <Card className="self-start">
      <CardTitle>Logo</CardTitle>
      {logoUrl ? (
        // WHY: <img> nativo e non next/image: l'URL è su un CDN esterno non elencato in next.config e
        // il logo è un'immagine piccola per cui l'ottimizzazione non vale la configurazione.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`Logo di ${name}`} className="mb-3 max-h-24 rounded border border-neutral-100 bg-white p-2" />
      ) : (
        <p className="mb-3 text-xs text-neutral-400">Nessun logo caricato.</p>
      )}
      <form action={action} className="flex flex-col gap-2">
        <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required className="text-sm" aria-label="File del logo" />
        <p className="text-xs text-neutral-400">PNG, JPEG o WebP, massimo 2 MB. Compare nelle email ai clienti.</p>
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="success">Logo aggiornato.</Alert>}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Carico…" : "Carica logo"}
        </Button>
      </form>
    </Card>
  );
}
