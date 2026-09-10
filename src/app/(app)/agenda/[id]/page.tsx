// [INTENT]: Dettaglio di una prenotazione con tutte le azioni ammesse al salone: cambio stato, spostamento,
// cambio operatore, correzione recapiti. Un 404 dal Backend (Id inesistente O di un altro salone: casi
// indistinguibili per contratto) diventa la pagina "non trovata" — non un errore.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Card, CardTitle, DescriptionList, LinkButton, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { CONSENT_CHANNEL_LABEL, MODE_LABEL, endTime, formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type { BookingDetail, Staff } from "@/lib/types";
import { BookingActions } from "./BookingActions";

export const metadata: Metadata = { title: "Prenotazione" };

export default async function BookingPage({ params, searchParams }: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  const sp = await searchParams;

  let booking: BookingDetail;
  try {
    booking = await api<BookingDetail>(`/api/v1/admin/bookings/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const staff = await api<Staff[]>("/api/v1/admin/staff");

  const serviceIds = booking.items.length ? booking.items.map((i) => i.serviceId) : [booking.service.id];
  // WHY: il Backend rifiuta con 422 un operatore che non esegue TUTTI i servizi dell'appuntamento;
  // filtrare qui evita di proporre scelte destinate a fallire, ma la regola resta sua.
  const eligibleStaff = staff.filter((s) => serviceIds.every((sid) => s.services.some((a) => a.serviceId === sid)));

  return (
    <>
      <PageHeader
        title={booking.customer.name}
        subtitle={
          <>
            {formatDate(booking.date)} · {booking.time}–{endTime(booking.time, booking.durationMin)}{" "}
            <StatusBadge status={booking.status} />
          </>
        }
        actions={
          <LinkButton variant="secondary" href="/agenda">
            ← Agenda
          </LinkButton>
        }
      />
      {sp.created === "1" && (
        <div className="mb-4">
          <Alert kind="success">Prenotazione creata.</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardTitle>Appuntamento</CardTitle>
            <DescriptionList
              items={[
                ["Data", formatDate(booking.date)],
                ["Orario", `${booking.time} – ${endTime(booking.time, booking.durationMin)} (${booking.durationMin} min)`],
                ["Operatore", booking.staff?.name ?? "Nessuno (capienza del servizio)"],
                ["Prezzo", formatPrice(booking.price)],
                ["Modalità", booking.appointmentMode ? MODE_LABEL[booking.appointmentMode] : "Non specificata"],
                ["Creata il", formatDateTime(booking.createdAt)],
              ]}
            />
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <p className="mb-1 text-xs text-neutral-500">Servizi</p>
              <ul className="text-sm">
                {(booking.items.length ? booking.items : [{ serviceId: booking.service.id, serviceName: booking.service.name, sequence: 1, durationMinutes: booking.durationMin, priceAtBooking: booking.price }]).map((i) => (
                  <li key={i.serviceId} className="flex justify-between">
                    <span>{i.serviceName}</span>
                    <span className="text-neutral-500">
                      {i.durationMinutes} min · {formatPrice(i.priceAtBooking)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardTitle
              action={
                booking.customerId ? (
                  <Link href={`/clienti/${booking.customerId}`} className="text-xs text-blue-600 hover:underline">
                    Scheda cliente →
                  </Link>
                ) : (
                  <span className="text-xs text-neutral-400">Nessuna scheda collegata</span>
                )
              }
            >
              Cliente
            </CardTitle>
            <DescriptionList
              items={[
                ["Nome", booking.customer.name],
                ["Telefono", booking.customer.phone || "—"],
                ["Email", booking.customer.email || "—"],
                ["Note del cliente", booking.customer.notes || "—"],
                ["Nota interna", booking.internalNotes || "—"],
                ["Canale", CONSENT_CHANNEL_LABEL[booking.consentChannel] ?? booking.consentChannel],
              ]}
            />
          </Card>

          <Card>
            <CardTitle>Storico</CardTitle>
            <DescriptionList
              items={[
                ["Informativa privacy", booking.gdprConsent ? `Sì · ${formatDateTime(booking.gdprConsentAt)}` : "No"],
                ["Promemoria inviato", formatDateTime(booking.reminderSentAt)],
                ["Annullata il", formatDateTime(booking.cancelledAt)],
                ["Motivo annullamento", booking.cancellationReason || "—"],
                ["Mancato arrivo segnato il", formatDateTime(booking.noShowMarkedAt)],
                ["Email automatiche", booking.emailsEnabled === null ? "Impostazioni del salone" : booking.emailsEnabled ? "Attive" : "Disattivate"],
              ]}
            />
          </Card>
        </div>

        <BookingActions booking={booking} eligibleStaff={eligibleStaff.map((s) => ({ id: s.id, name: s.name }))} />
      </div>
    </>
  );
}
