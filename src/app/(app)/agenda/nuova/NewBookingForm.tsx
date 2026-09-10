"use client";

// [INTENT]: Form di creazione prenotazione dal canale amministrativo. Guida la scelta (operatori filtrati
// per servizio, orari liberi caricati dal Backend, cliente cercato in anagrafica) ma NON decide nulla al
// posto dell'API: la disponibilità la conferma il Backend al salvataggio, con le stesse regole del sito.

import { useActionState, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPrice, reasonLabel, todayIso } from "@/lib/format";
import type { AvailabilityDay, Customer, Service, Staff } from "@/lib/types";
import { idleState } from "@/lib/action-state";
import { createBooking } from "../actions";

export function NewBookingForm({ services, staff }: { services: Service[]; staff: Staff[] }) {
  const [state, action, pending] = useActionState(createBooking, idleState);
  const v = state.values ?? {};
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [additional, setAdditional] = useState<string[]>([]);
  const [chosenStaffId, setChosenStaffId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  // WHY: gli slot sono memorizzati insieme alla "chiave" dei parametri con cui sono stati caricati: se
  // servizio, operatore o data cambiano, la chiave non combacia più e la griglia sparisce da sé — senza un
  // effetto che azzera lo stato a ogni cambiamento.
  const [slots, setSlots] = useState<{ key: string; day: AvailabilityDay } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const allServiceIds = useMemo(() => [serviceId, ...additional].filter(Boolean), [serviceId, additional]);
  // WHY: il Backend rifiuta (422) un operatore che non esegue tutti i servizi scelti; si propongono solo
  // quelli idonei. Un servizio senza operatori assegnati usa la capienza (staffId null): l'opzione resta.
  const eligibleStaff = useMemo(
    () => staff.filter((s) => allServiceIds.every((id) => s.services.some((a) => a.serviceId === id))),
    [staff, allServiceIds],
  );
  const staffId = eligibleStaff.some((s) => s.id === chosenStaffId) ? chosenStaffId : "";
  const slotsKey = `${allServiceIds.join(",")}|${staffId}|${date}`;
  const day = slots?.key === slotsKey ? slots.day : null;

  const searchTerm = customerQuery.trim();
  useEffect(() => {
    if (searchTerm.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(searchTerm)}`, { signal: ctrl.signal });
        if (res.ok) setResults((await res.json()) as Customer[]);
      } catch {
        // richiesta annullata o rete: la ricerca è un aiuto, non un requisito
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [searchTerm]);
  const visibleResults = searchTerm.length >= 2 ? results : [];

  function pickCustomer(c: Customer) {
    setCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setResults([]);
    setCustomerQuery("");
  }

  async function loadSlots() {
    if (!serviceId || !date) return;
    setLoading(true);
    setLoadError(null);
    try {
      const p = new URLSearchParams({ serviceId, date });
      if (staffId) p.set("staffId", staffId);
      const res = await fetch(`/api/availability?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Errore nel caricamento della disponibilità.");
      const first = (data as AvailabilityDay[])[0];
      setSlots(first ? { key: slotsKey, day: first } : null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Errore.");
    } finally {
      setLoading(false);
    }
  }

  const total = allServiceIds.reduce(
    (acc, id) => {
      const s = services.find((x) => x.id === id);
      return { min: acc.min + (s?.durationMinutes ?? 0), price: acc.price + (s?.basePrice ?? 0) };
    },
    { min: 0, price: 0 },
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardTitle>Servizio e operatore</CardTitle>
          <div className="flex flex-col gap-3">
            <Field label="Servizio" htmlFor="serviceId" error={state.fieldErrors?.serviceId}>
              <Select id="serviceId" name="serviceId" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min · {formatPrice(s.basePrice)}
                  </option>
                ))}
              </Select>
            </Field>
            {services.length > 1 && (
              <fieldset>
                <legend className="mb-1 text-xs font-medium text-neutral-600">Servizi aggiuntivi (stesso operatore)</legend>
                <div className="flex flex-wrap gap-2">
                  {services
                    .filter((s) => s.id !== serviceId)
                    .map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          name="additionalServiceIds"
                          value={s.id}
                          checked={additional.includes(s.id)}
                          onChange={(e) =>
                            setAdditional((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
                          }
                          className="accent-blue-600"
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
              </fieldset>
            )}
            <Field label="Operatore" htmlFor="staffId" hint="Vuoto = nessun operatore (solo per servizi senza operatori assegnati)">
              <Select id="staffId" name="staffId" value={staffId} onChange={(e) => setChosenStaffId(e.target.value)}>
                <option value="">Nessun operatore</option>
                {eligibleStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-neutral-500">
              Durata totale {total.min} min · Prezzo indicativo {formatPrice(total.price)}
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Data e ora</CardTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Data" htmlFor="date" error={state.fieldErrors?.date}>
              <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Ora" htmlFor="time" error={state.fieldErrors?.time}>
              <Input id="time" name="time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
            </Field>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" variant="secondary" onClick={loadSlots} disabled={loading || !serviceId || !date} className="self-start">
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
          </div>
        </Card>

        <Card>
          <CardTitle>Cliente</CardTitle>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Field label="Cerca in anagrafica" htmlFor="customer-search" hint="Nome, telefono o email — oppure compila i campi sotto per un cliente nuovo">
                <Input
                  id="customer-search"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Inizia a digitare…"
                  autoComplete="off"
                />
              </Field>
              {visibleResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                  {visibleResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-neutral-500">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input type="hidden" name="customerId" value={customerId} />
            {customerId && (
              <p className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Scheda collegata: {name}
                <button type="button" className="underline" onClick={() => setCustomerId("")}>
                  scollega
                </button>
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome" htmlFor="name" error={state.fieldErrors?.["customer.name"]}>
                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Telefono" htmlFor="phone" error={state.fieldErrors?.["customer.phone"]}>
                <Input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </Field>
              <Field label="Email (opzionale)" htmlFor="email" error={state.fieldErrors?.["customer.email"]}>
                <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Modalità" htmlFor="appointmentMode">
                <Select id="appointmentMode" name="appointmentMode" defaultValue={v.appointmentMode ?? ""}>
                  <option value="">Non specificata</option>
                  <option value="on_site">In sede</option>
                  <option value="remote">Da remoto</option>
                </Select>
              </Field>
            </div>
            <Field label="Note" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={v.notes ?? ""} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Conferma</CardTitle>
          <div className="flex flex-col gap-3">
            <Field label="Come è arrivata la richiesta" htmlFor="consentChannel">
              <Select id="consentChannel" name="consentChannel" defaultValue={v.consentChannel ?? "phone"}>
                <option value="phone">Telefono</option>
                <option value="in_person">Di persona</option>
              </Select>
            </Field>
            <Field label="Email automatiche al cliente" htmlFor="emailsEnabled">
              <Select id="emailsEnabled" name="emailsEnabled" defaultValue={v.emailsEnabled ?? ""}>
                <option value="">Come da impostazioni del salone</option>
                <option value="true">Invia</option>
                <option value="false">Non inviare per questa prenotazione</option>
              </Select>
            </Field>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" name="consentAttested" defaultChecked={v.consentAttested === "on"} className="mt-0.5 accent-blue-600" required />
              <span>
                Ho informato il cliente su come vengono trattati i suoi dati.
                <span className="block text-xs text-neutral-500">Obbligatorio per legge (informativa privacy).</span>
              </span>
            </label>
            {state.error && <Alert>{state.error}</Alert>}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvo…" : "Crea prenotazione"}
            </Button>
            <p className="text-xs text-neutral-400">
              Le regole di disponibilità sono le stesse del sito: uno slot occupato o fuori orario viene rifiutato.
            </p>
          </div>
        </Card>
      </div>
    </form>
  );
}
