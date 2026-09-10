// [INTENT]: Finto Backend per sviluppare e verificare l'interfaccia SENZA il Backend reale (in questo
// ambiente di sviluppo il dominio Railway non è raggiungibile). Implementa, in memoria e con dati inventati,
// i soli endpoint che il gestionale usa, con le stesse forme di risposta e gli stessi codici d'errore.
// Non è un sostituto delle regole del Backend: rifiuta solo i casi più evidenti (slot occupato, contatto
// mancante), quanto basta per vedere i messaggi d'errore nei form.
//
//   npm run mock-api            → http://localhost:5099
//   password di login: "demo" (qualunque email)

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 5099);
const TOKEN = "mock-token";

const services = [
  { id: "s1", name: "Taglio", category: "Capelli", description: null, durationMinutes: 30, basePrice: 18, parallelSlots: 1, bufferEnabled: false, bufferMinutes: 0, bufferPosition: "After", active: true, displayOrder: 1, deletedAt: null, color: "#2563eb" },
  { id: "s2", name: "Barba", category: "Barba", description: null, durationMinutes: 20, basePrice: 12, parallelSlots: 1, bufferEnabled: false, bufferMinutes: 0, bufferPosition: "After", active: true, displayOrder: 2, deletedAt: null, color: "#16a34a" },
  { id: "s3", name: "Taglio + Barba", category: "Combo", description: null, durationMinutes: 50, basePrice: 28, parallelSlots: 1, bufferEnabled: false, bufferMinutes: 0, bufferPosition: "After", active: true, displayOrder: 3, deletedAt: null, color: null },
];
const hours = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, isAvailable: d !== 0, startTime: d === 0 ? null : "09:00", endTime: d === 0 ? null : "19:00" }));
const staff = [
  { id: "st1", name: "Marco Bianchi", role: "Barbiere", specialization: null, photoUrl: null, active: true, displayOrder: 1, services: [{ serviceId: "s1", priceOverride: null }, { serviceId: "s2", priceOverride: null }, { serviceId: "s3", priceOverride: null }], businessHours: hours, deletedAt: null, businessHoursConfigured: true },
  { id: "st2", name: "Luca Verdi", role: "Barbiere", specialization: null, photoUrl: null, active: true, displayOrder: 2, services: [{ serviceId: "s1", priceOverride: null }], businessHours: hours, deletedAt: null, businessHoursConfigured: true },
];
const now = new Date().toISOString();
const customers = [
  { id: "c1", name: "Giulia Rossi", phone: "3331112223", email: "giulia.rossi@example.invalid", notes: null, regular: true, blocked: false, createdAt: now, updatedAt: now, deletedAt: null },
  { id: "c2", name: "Andrea Conti", phone: "3334445556", email: null, notes: "Preferisce il mattino", regular: false, blocked: false, createdAt: now, updatedAt: now, deletedAt: null },
  { id: "c3", name: "Sara Ferrari", phone: null, email: "sara.ferrari@example.invalid", notes: null, regular: false, blocked: true, createdAt: now, updatedAt: now, deletedAt: null },
];
const tenantHours = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, isOpen: d !== 0, openTime: d === 0 ? null : "09:00", closeTime: d === 0 ? null : "19:00" }));
const tenantBreaks = [{ dayOfWeek: 1, startTime: "13:00", endTime: "14:00", label: "Pranzo" }];
const staffBreaks = {};
const timeOff = {};
const closures = [{ id: "cl1", dateFrom: "2026-12-25", dateTo: "2026-12-26", reason: "Natale", recurrence: "annual" }];
const timeBlocks = [];
const today = new Date().toLocaleDateString("sv-SE");
const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("sv-SE");
const bookings = [
  mk("b1", today, "09:30", "s1", "st1", "c1", "confirmed"),
  mk("b2", today, "10:30", "s3", "st1", "c2", "confirmed"),
  mk("b3", today, "11:00", "s1", "st2", null, "completed", { name: "Paolo Neri", phone: "3390000001", email: "" }),
  mk("b4", today, "15:00", "s2", "st1", "c3", "no_show"),
  mk("b5", tomorrow, "09:00", "s1", "st2", "c1", "confirmed"),
  mk("b6", tomorrow, "16:30", "s3", "st1", null, "cancelled", { name: "Elena Galli", phone: "3390000002", email: "elena@example.invalid" }),
];

function mk(id, date, time, serviceId, staffId, customerId, status, inline) {
  const s = services.find((x) => x.id === serviceId);
  const c = customerId ? customers.find((x) => x.id === customerId) : null;
  const inl = inline ?? {};
  return {
    id, date, time, durationMin: s.durationMinutes, status,
    serviceId, staffId, customerId,
    customer: c
      ? { name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: null }
      : { name: inl.name ?? "", phone: inl.phone ?? "", email: inl.email ?? "", notes: null },
    price: s.basePrice, createdAt: now,
    items: [{ serviceId, serviceName: s.name, sequence: 1, durationMinutes: s.durationMinutes, priceAtBooking: s.basePrice }],
    appointmentMode: null, emailsEnabled: null, gdprConsent: true, gdprConsentAt: now, gdprConsentVersion: null,
    cancelledAt: status === "cancelled" ? now : null, cancellationReason: null, noShowMarkedAt: status === "no_show" ? now : null,
    reminderSentAt: null, consentChannel: "web", internalNotes: null,
  };
}
const listView = (b) => ({
  id: b.id, date: b.date, time: b.time, durationMin: b.durationMin, status: b.status,
  service: { id: b.serviceId, name: services.find((s) => s.id === b.serviceId).name },
  staff: b.staffId ? { id: b.staffId, name: staff.find((s) => s.id === b.staffId).name } : null,
  customer: b.customer, price: b.price, createdAt: b.createdAt,
});
const detailView = (b) => ({ ...listView(b), items: b.items, appointmentMode: b.appointmentMode, customerId: b.customerId, emailsEnabled: b.emailsEnabled, gdprConsent: b.gdprConsent, gdprConsentAt: b.gdprConsentAt, gdprConsentVersion: b.gdprConsentVersion, cancelledAt: b.cancelledAt, cancellationReason: b.cancellationReason, noShowMarkedAt: b.noShowMarkedAt, reminderSentAt: b.reminderSentAt, consentChannel: b.consentChannel, internalNotes: b.internalNotes });

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const overlaps = (a, b) => a.date === b.date && a.staffId && a.staffId === b.staffId && a.status === "confirmed" && b.status === "confirmed"
  && toMin(a.time) < toMin(b.time) + b.durationMin && toMin(b.time) < toMin(a.time) + a.durationMin;

const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const err = (res, status, type, message, errors) => json(res, status, { type, message, errors: errors ?? null });
const readBody = (req) => new Promise((resolve) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => resolve(d ? JSON.parse(d) : {})); });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const q = url.searchParams;
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
  console.log(req.method, p, q.toString());

  if (req.method === "POST" && p === "/api/v1/admin/auth/token") {
    if (body.password !== "demo") return err(res, 401, "invalid_credentials", "Email o password non corretti.");
    return json(res, 200, { token: TOKEN, tokenType: "Bearer", expiresAt: new Date(Date.now() + 8 * 3600e3).toISOString() });
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return err(res, 401, "unauthorized", "Token mancante o non valido.");

  if (p === "/api/v1/admin/account/me") return json(res, 200, { userId: "u1", email: "titolare@barberia-demo.invalid", role: "Owner", active: true, activatedAt: now, lastLoginAt: now, createdAt: now, tenantId: "t1", tenantName: "Barberia Demo", tenantSlug: "barberia-demo" });
  // ── services ──
  const visibleServices = () => q.get("includeDeleted") === "true" ? services : services.filter((s) => !s.deletedAt);
  const serviceFromBody = (id) => ({ id, name: body.name, category: body.category ?? null, description: body.description ?? null, durationMinutes: body.durationMinutes, basePrice: body.basePrice ?? null, parallelSlots: body.parallelSlots ?? 1, bufferEnabled: !!body.bufferEnabled, bufferMinutes: body.bufferMinutes ?? 0, bufferPosition: body.bufferPosition ?? "After", active: body.active ?? true, displayOrder: body.displayOrder ?? 0, deletedAt: null, color: body.color ?? null });
  if (p === "/api/v1/admin/services" && req.method === "GET") return json(res, 200, visibleServices());
  if (p === "/api/v1/admin/services" && req.method === "POST") {
    if (!body.name) return err(res, 422, "validation_error", "Dati non validi.", { name: ["Il nome è obbligatorio."] });
    if (!(body.durationMinutes > 0)) return err(res, 422, "validation_error", "La durata deve essere > 0.");
    const s = serviceFromBody(randomUUID()); services.push(s); return json(res, 201, s);
  }
  const svm = p.match(/^\/api\/v1\/admin\/services\/([^/]+)$/);
  if (svm) {
    const s = services.find((x) => x.id === svm[1] && !x.deletedAt);
    if (!s) return err(res, 404, "not_found", "Servizio non trovato.");
    if (req.method === "GET") return json(res, 200, s);
    if (req.method === "DELETE") { s.deletedAt = new Date().toISOString(); return json(res, 204); }
    if (req.method === "PUT") {
      if (!body.name) return err(res, 422, "validation_error", "Dati non validi.", { name: ["Il nome è obbligatorio."] });
      Object.assign(s, serviceFromBody(s.id)); return json(res, 200, s);
    }
  }

  // ── staff ──
  const visibleStaff = () => q.get("includeDeleted") === "true" ? staff : staff.filter((s) => !s.deletedAt);
  const staffFromBody = (id) => ({ id, name: body.name, role: body.role ?? null, specialization: body.specialization ?? null, photoUrl: null, active: body.active ?? true, displayOrder: body.displayOrder ?? 0, services: body.services ?? [], businessHours: body.businessHours, deletedAt: null, businessHoursConfigured: true });
  const weekError = (h) => (!Array.isArray(h) || h.length !== 7 || new Set(h.map((x) => x.dayOfWeek)).size !== 7) ? "businessHours: sono richiesti tutti e 7 i giorni (0..6), con isAvailable esplicito." : null;
  if (p === "/api/v1/admin/staff" && req.method === "GET") return json(res, 200, visibleStaff());
  if (p === "/api/v1/admin/staff" && req.method === "POST") {
    if (!body.name) return err(res, 422, "validation_error", "Dati non validi.", { name: ["Il nome è obbligatorio."] });
    const we = weekError(body.businessHours); if (we) return err(res, 422, "validation_error", we, { businessHours: [we] });
    const s = staffFromBody(randomUUID()); staff.push(s); return json(res, 201, s);
  }
  const stm = p.match(/^\/api\/v1\/admin\/staff\/([^/]+)(?:\/(breaks|time-off)(?:\/([^/]+))?)?$/);
  if (stm) {
    const s = staff.find((x) => x.id === stm[1] && !x.deletedAt);
    if (!s) return err(res, 404, "not_found", "Operatore non trovato.");
    if (!stm[2]) {
      if (req.method === "GET") return json(res, 200, s);
      if (req.method === "DELETE") { s.deletedAt = new Date().toISOString(); return json(res, 204); }
      if (req.method === "PUT") {
        const we = weekError(body.businessHours); if (we) return err(res, 422, "validation_error", we, { businessHours: [we] });
        Object.assign(s, staffFromBody(s.id)); return json(res, 200, s);
      }
    }
    if (stm[2] === "breaks" && req.method === "PUT") { staffBreaks[s.id] = body.breaks ?? []; return json(res, 204); }
    if (stm[2] === "time-off") {
      timeOff[s.id] ??= [];
      if (req.method === "GET") return json(res, 200, timeOff[s.id]);
      if (req.method === "POST") { const t = { id: randomUUID(), dateFrom: body.dateFrom, dateTo: body.dateTo, startTime: body.startTime ?? null, endTime: body.endTime ?? null, reason: body.reason ?? null }; timeOff[s.id].push(t); return json(res, 201, t); }
      if (req.method === "DELETE") { const i = timeOff[s.id].findIndex((t) => t.id === stm[3]); if (i < 0) return err(res, 404, "not_found", "Assenza non trovata."); timeOff[s.id].splice(i, 1); return json(res, 204); }
    }
  }

  // ── schedule ──
  if (p === "/api/v1/admin/business-hours" && req.method === "GET") return json(res, 200, { configured: true, days: tenantHours });
  if (p === "/api/v1/admin/business-hours" && req.method === "PUT") { tenantHours.splice(0, 7, ...body.days); return json(res, 204); }
  if (p === "/api/v1/admin/breaks" && req.method === "GET") return json(res, 200, { tenant: tenantBreaks, staff: staff.filter((s) => !s.deletedAt).map((s) => ({ staffId: s.id, staffName: s.name, breaks: staffBreaks[s.id] ?? [] })) });
  if (p === "/api/v1/admin/breaks/tenant" && req.method === "PUT") { tenantBreaks.splice(0, tenantBreaks.length, ...(body.breaks ?? [])); return json(res, 204); }
  if (p === "/api/v1/admin/closures" && req.method === "GET") return json(res, 200, closures);
  if (p === "/api/v1/admin/closures" && req.method === "POST") { const c = { id: randomUUID(), dateFrom: body.dateFrom, dateTo: body.dateTo, reason: body.reason ?? null, recurrence: body.recurrence ?? "none" }; closures.push(c); return json(res, 201, c); }
  const clm = p.match(/^\/api\/v1\/admin\/closures\/([^/]+)$/);
  if (clm && req.method === "DELETE") { const i = closures.findIndex((c) => c.id === clm[1]); if (i < 0) return err(res, 404, "not_found", "Chiusura non trovata."); closures.splice(i, 1); return json(res, 204); }
  if (p === "/api/v1/admin/time-blocks" && req.method === "GET") return json(res, 200, timeBlocks);
  if (p === "/api/v1/admin/time-blocks" && req.method === "POST") { const t = { id: randomUUID(), ...body, reason: body.reason ?? null }; timeBlocks.push(t); return json(res, 201, t); }
  const tbm = p.match(/^\/api\/v1\/admin\/time-blocks\/([^/]+)$/);
  if (tbm && req.method === "DELETE") { const i = timeBlocks.findIndex((c) => c.id === tbm[1]); if (i < 0) return err(res, 404, "not_found", "Blocco non trovato."); timeBlocks.splice(i, 1); return json(res, 204); }
  if (p === "/api/v1/admin/holidays") { const y = q.get("year") ?? new Date().getFullYear(); return json(res, 200, [{ date: `${y}-01-01`, name: "Capodanno", recurrence: "annual" }, { date: `${y}-04-25`, name: "Liberazione", recurrence: "annual" }, { date: `${y}-08-15`, name: "Ferragosto", recurrence: "annual" }, { date: `${y}-12-25`, name: "Natale", recurrence: "annual" }, { date: `${y}-04-05`, name: "Pasqua", recurrence: "easter" }, { date: `${y}-04-06`, name: "Lunedì dell'Angelo", recurrence: "easter_monday" }]); }

  if (p === "/api/v1/admin/availability") {
    const date = q.get("dateFrom");
    const staffId = q.get("staffId");
    const exclude = q.get("excludeBookingId");
    const dow = new Date(date + "T00:00:00").getDay();
    if (dow === 0) return json(res, 200, [{ date, available: false, reason: "closed_day", slots: [] }]);
    const slots = [];
    for (let m = 9 * 60; m < 19 * 60; m += 30) {
      const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      let reason = null;
      if (m >= 13 * 60 && m < 14 * 60) reason = "lunch_break";
      else if (bookings.some((b) => b.id !== exclude && b.date === date && b.status === "confirmed" && (!staffId || b.staffId === staffId) && toMin(b.time) <= m && m < toMin(b.time) + b.durationMin)) reason = "existing_booking";
      slots.push({ time, available: !reason, reason });
    }
    return json(res, 200, [{ date, available: true, reason: null, slots }]);
  }

  // ── bookings ──
  if (p === "/api/v1/admin/bookings" && req.method === "GET") {
    let items = bookings.filter((b) => (!q.get("dateFrom") || b.date >= q.get("dateFrom")) && (!q.get("dateTo") || b.date <= q.get("dateTo"))
      && (!q.get("status") || b.status === q.get("status")) && (!q.get("staffId") || b.staffId === q.get("staffId"))
      && (!q.get("serviceId") || b.serviceId === q.get("serviceId")) && (!q.get("customerId") || b.customerId === q.get("customerId"))
      && (!q.get("q") || (b.customer.name + " " + b.customer.phone).toLowerCase().includes(q.get("q").toLowerCase())));
    return json(res, 200, { items: items.map(listView), page: 1, pageSize: 100, total: items.length });
  }
  if (p === "/api/v1/admin/bookings" && req.method === "POST") {
    if (!body.customer?.name || !body.customer?.phone) return err(res, 422, "validation_error", "Dati non validi.", { "customer.phone": ["Il telefono è obbligatorio."] });
    if (!body.consentAttested) return err(res, 422, "validation_error", "L'informativa deve essere attestata.");
    const s = services.find((x) => x.id === body.serviceId);
    if (!s) return err(res, 422, "validation_error", "Servizio non trovato.");
    const extra = (body.additionalServiceIds ?? []).map((id) => services.find((x) => x.id === id)).filter(Boolean);
    const dur = s.durationMinutes + extra.reduce((a, x) => a + x.durationMinutes, 0);
    const price = s.basePrice + extra.reduce((a, x) => a + x.basePrice, 0);
    const b = { ...mk(randomUUID(), body.date, body.time, body.serviceId, body.staffId ?? null, body.customerId ?? null, "confirmed", body.customer), durationMin: dur, price, appointmentMode: body.appointmentMode ?? null, emailsEnabled: body.emailsEnabled ?? null, consentChannel: body.consentChannel };
    b.items = [s, ...extra].map((x, i) => ({ serviceId: x.id, serviceName: x.name, sequence: i + 1, durationMinutes: x.durationMinutes, priceAtBooking: x.basePrice }));
    if (!body.customerId) b.customer = { name: body.customer.name, phone: body.customer.phone, email: body.customer.email ?? "", notes: body.customer.notes ?? null };
    if (bookings.some((o) => overlaps(o, b))) return err(res, 409, "slot_unavailable", "Lo slot richiesto non è disponibile.");
    bookings.push(b);
    return json(res, 201, detailView(b));
  }
  const m = p.match(/^\/api\/v1\/admin\/bookings\/([^/]+)(?:\/(reschedule|staff|contact))?$/);
  if (m) {
    const b = bookings.find((x) => x.id === m[1]);
    if (!b) return err(res, 404, "not_found", "Prenotazione non trovata.");
    if (req.method === "GET") return json(res, 200, detailView(b));
    if (m[2] === "reschedule") {
      if (b.status !== "confirmed") return err(res, 422, "invalid_state", "Si può spostare solo una prenotazione confermata.");
      const probe = { ...b, date: body.date, time: body.time };
      if (bookings.some((o) => o.id !== b.id && overlaps(o, probe))) return err(res, 409, "slot_unavailable", "Lo slot richiesto non è disponibile.");
      Object.assign(b, { date: body.date, time: body.time });
      return json(res, 200, detailView(b));
    }
    if (m[2] === "staff") {
      const s = staff.find((x) => x.id === body.staffId);
      if (!s) return err(res, 422, "validation_error", "Operatore non trovato.");
      if (!b.items.every((i) => s.services.some((a) => a.serviceId === i.serviceId))) return err(res, 422, "staff_not_qualified", "L'operatore non esegue tutti i servizi dell'appuntamento.");
      const probe = { ...b, staffId: s.id };
      if (bookings.some((o) => o.id !== b.id && overlaps(o, probe))) return err(res, 409, "slot_unavailable", "L'operatore è già occupato in quell'orario.");
      b.staffId = s.id;
      return json(res, 200, detailView(b));
    }
    if (m[2] === "contact") {
      if (body.phone === "") return err(res, 422, "validation_error", "Dati non validi.", { phone: ["Il telefono non può essere svuotato."] });
      if (body.phone != null) b.customer.phone = body.phone;
      if (body.email != null) b.customer.email = body.email;
      if (body.notes != null) b.customer.notes = body.notes || null;
      if (body.internalNotes != null) b.internalNotes = body.internalNotes || null;
      if (body.appointmentMode != null) b.appointmentMode = body.appointmentMode || null;
      return json(res, 200, detailView(b));
    }
    if (req.method === "PATCH") {
      if (!["confirmed", "cancelled", "no_show", "completed"].includes(body.status)) return err(res, 422, "validation_error", "Stato non valido.");
      b.status = body.status;
      b.cancelledAt = body.status === "cancelled" ? new Date().toISOString() : null;
      b.noShowMarkedAt = body.status === "no_show" ? new Date().toISOString() : null;
      return json(res, 200, listView(b));
    }
  }

  // ── customers ──
  const active = () => customers.filter((c) => !c.deletedAt);
  if (p === "/api/v1/admin/customers" && req.method === "GET") {
    const needle = (q.get("q") ?? "").toLowerCase();
    const items = active().filter((c) => !needle || [c.name, c.phone, c.email].filter(Boolean).some((v) => v.toLowerCase().includes(needle)));
    return json(res, 200, { items: items.slice(0, Number(q.get("pageSize") || 50)), page: 1, pageSize: Number(q.get("pageSize") || 50), total: items.length });
  }
  if (p === "/api/v1/admin/customers" && req.method === "POST") {
    if (!body.phone && !body.email) return err(res, 422, "validation_error", "Serve almeno un contatto tra telefono ed email.");
    const c = { id: randomUUID(), name: body.name, phone: body.phone ?? null, email: body.email?.toLowerCase() ?? null, notes: body.notes ?? null, regular: !!body.regular, blocked: !!body.blocked, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
    customers.push(c);
    return json(res, 201, c);
  }
  const cm = p.match(/^\/api\/v1\/admin\/customers\/([^/]+)$/);
  if (cm) {
    const c = active().find((x) => x.id === cm[1]);
    if (!c) return err(res, 404, "not_found", "Cliente non trovato.");
    if (req.method === "GET") return json(res, 200, c);
    if (req.method === "DELETE") { c.deletedAt = new Date().toISOString(); return json(res, 204); }
    if (req.method === "PATCH") {
      const next = { ...c };
      if (body.name != null) next.name = body.name;
      if (body.phone != null) next.phone = body.phone || null;
      if (body.email != null) next.email = body.email ? body.email.toLowerCase() : null;
      if (body.notes != null) next.notes = body.notes || null;
      if (body.regular != null) next.regular = body.regular;
      if (body.blocked != null) next.blocked = body.blocked;
      if (!next.name) return err(res, 422, "validation_error", "Il nome non può essere vuoto.");
      if (!next.phone && !next.email) return err(res, 422, "validation_error", "Serve almeno un contatto tra telefono ed email.");
      Object.assign(c, next, { updatedAt: new Date().toISOString() });
      return json(res, 200, c);
    }
  }

  err(res, 404, "not_found", `Rotta non gestita dal mock: ${req.method} ${p}`);
}).listen(PORT, () => console.log(`Mock Backend su http://localhost:${PORT} — password di login: demo`));
