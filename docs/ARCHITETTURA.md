# Architettura del gestionale clienti

Questo documento spiega **come è fatto** il codice, **perché** è fatto così, e **cosa fa** ogni parte.
È scritto per chi deve mettere mano al progetto senza averlo visto nascere, persona o agente AI.

Indice:

1. [Cosa è, per chi è](#1-cosa-è-per-chi-è)
2. [Il modello di sicurezza: "ogni cliente vede solo i propri dati"](#2-il-modello-di-sicurezza)
3. [Architettura: tutto passa dal server](#3-architettura-tutto-passa-dal-server)
4. [Struttura del codice, file per file](#4-struttura-del-codice)
5. [Funzionalità](#funzionalità)
6. [Convenzioni ereditate dal Backend](#6-convenzioni-ereditate-dal-backend)
7. [Decisioni tecniche e lezioni imparate](#7-decisioni-tecniche-e-lezioni-imparate)
8. [Come è stato verificato](#8-come-è-stato-verificato)
9. [Deploy](#9-deploy)
10. [Cosa NON fa, e cosa aggiungere dopo](#10-cosa-non-fa-e-cosa-aggiungere-dopo)

---

## 1. Cosa è, per chi è

Forvea è un'agenzia web che realizza siti per attività locali (barbieri, saloni, estetiste) e li collega a
un Backend di prenotazioni multi-tenant (`forvea/Backend`, .NET 10). Fino a oggi quel Backend era
**headless**: il widget di prenotazione sul sito lo costruisce l'agenzia, e il titolare del salone non
aveva alcuna interfaccia per gestire le prenotazioni ricevute se non le email.

Questo progetto è **il pannello del titolare**: una sola applicazione web, deployata una volta, che ogni
titolare apre con le proprie credenziali per gestire agenda e clienti del proprio salone.

Non è:
- il pannello dell'agenzia (le rotte `/api/v1/platform/*` del Backend non sono usate qui);
- la dashboard interna di analisi (`tools/dashboard*` nel repo Backend, che legge direttamente il DB);
- il widget pubblico di prenotazione sul sito del salone.

## 2. Il modello di sicurezza

Il requisito centrale: **ogni cliente (titolare) deve vedere e modificare SOLO i dati del proprio
salone.** Va detto chiaramente dove questo requisito è garantito, perché **non è in questo codice**.

### L'isolamento è del Backend, il frontend lo eredita

1. Il titolare fa login con email e password. Il Backend (`POST /api/v1/admin/auth/token`) verifica le
   credenziali e rilascia un **JWT che contiene il tenant** dell'utente.
2. Ogni chiamata successiva porta quel JWT. Il Backend risolve il tenant **dal token**, e tutte le sue
   query hanno un *global query filter* su `tenant_id`: un titolare non può leggere né scrivere righe di
   un altro salone nemmeno indovinando un Id, perché per lui quelle righe **non esistono** (404).
3. Il frontend **non conosce e non passa mai un `tenantId`**. Non c'è un parametro, un cookie o un campo
   nascosto da manipolare: l'unico dato di identità è il JWT, e il JWT lo ha firmato il Backend.

Conseguenza pratica: un bug in questo frontend può mostrare una pagina sbagliata, ma **non** può mostrare
i dati di un altro salone. Chi volesse rompere l'isolamento dovrebbe rompere il Backend.

### Il JWT non tocca mai il browser

Il token vive in un cookie **`httpOnly`** (`gc_session`, `src/lib/session.ts`):
- `httpOnly`: nessuno script nel browser può leggerlo, quindi né un XSS né uno script di terze parti
  possono rubarlo;
- `sameSite: lax`: non viaggia nelle richieste cross-site avviate da altri domini;
- `secure` in produzione;
- **scadenza allineata a quella del JWT** (`expiresAt` della risposta di login). Un cookie più lungo del
  token darebbe una sessione che sembra viva ma riceve 401 a ogni chiamata; uno più corto costringerebbe
  a riloggare senza motivo.

Tutte le chiamate all'API partono **dal server Next**, mai dal browser (§3). Il browser parla solo con
questo frontend.

### Le due difese in cascata

| Livello | File | Cosa fa | Cosa NON fa |
|---|---|---|---|
| Richiesta | `src/proxy.ts` | Senza cookie → `/login`; con cookie su `/login` → `/agenda` | Non decodifica il token, non si fida del suo contenuto |
| Chiamata API | `src/lib/api.ts` | Ogni 401 dal Backend → `redirect("/login?expired=1")` | Non "ripara" un token: lo scarta |

La prima è un cancello di comodità (evita di renderizzare pagine che fallirebbero); la seconda è quella
che conta, perché è il Backend a dire se il token vale ancora. Un token invalidato lato Backend (cambio
password, *security stamp* rigenerato) viene rifiutato alla prima chiamata, e l'utente torna al login.

### Cosa resta lato frontend

- La **password** passa dal browser alla Server Action di login e da lì al Backend. Non viene mai messa in
  un cookie, in un log, né nello stato del form (`formValues` la esclude esplicitamente).
- Nessun segreto in questo repository: l'unica variabile è `API_BASE_URL`, che è un indirizzo pubblico.

## 3. Architettura: tutto passa dal server

```
Browser ──(HTML, form, fetch a /api/*)──▶ Next.js (server) ──(Bearer JWT)──▶ Backend Admin API
                                              ▲
                                    cookie httpOnly gc_session
```

Tre meccanismi di Next, e la regola per scegliere fra loro:

| Meccanismo | Quando | Esempi |
|---|---|---|
| **Server Component** | leggere dati per una pagina | `agenda/page.tsx`, `clienti/[id]/page.tsx` |
| **Server Action** | scrivere (ogni mutazione) | `agenda/actions.ts`, `clienti/actions.ts`, `login/actions.ts` |
| **Route Handler** (`/api/*`) | dati che un form nel browser deve caricare **mentre l'utente interagisce** | `/api/availability`, `/api/customers/search` |

I Route Handler esistono solo perché il browser non può chiamare l'API direttamente (non ha il token):
sono proxy sottili che leggono il cookie e inoltrano. Sono due, e devono restare pochi.

**Vantaggi concreti di questo modello:**
- nessun token nel browser (§2);
- nessuna dipendenza dalla policy CORS del Backend: il Backend vede un client server-side;
- le pagine di elenco sono leggibili anche senza JavaScript (i filtri sono form `GET`, l'URL è condivisibile
  e il tasto "indietro" funziona);
- un solo modulo (`src/lib/api.ts`) conosce l'URL del Backend, il formato degli errori e la gestione del 401.

### `src/lib/api.ts` — l'unico punto di contatto

```ts
api<T>(path, { method?, body?, query?, anonymous? }): Promise<T>
```

- aggiunge `Authorization: Bearer` dal cookie (o `redirect("/login")` se manca);
- `anonymous: true` solo per il login;
- `query`: i valori vuoti/null/undefined vengono **omessi** (così un filtro non selezionato non viaggia);
- `cache: "no-store"` sempre: un gestionale mostra lo stato attuale, mai una copia;
- ogni risposta non-2xx diventa un `ApiError { status, type, message, errors }` con il messaggio
  **italiano già prodotto dal Backend**. Le pagine lo mostrano, non lo reinventano.

## 4. Struttura del codice

Ogni file sorgente inizia con un commento `// [INTENT]:` che dice cosa fa e perché esiste; le logiche non
ovvie hanno un `// WHY:`. È la stessa convenzione del repo Backend, così un agente si orienta leggendo
solo le intestazioni.

```
src/
├── proxy.ts                         cancello di autenticazione a livello di richiesta
├── lib/
│   ├── api.ts                       client dell'Admin API (server-only)
│   ├── session.ts                   lettura/scrittura/cancellazione del cookie di sessione
│   ├── types.ts                     tipi TS specchio 1:1 dei DTO C# (camelCase)
│   ├── format.ts                    date/orari/prezzi it-IT, etichette per stati, cause, giorni
│   ├── week.ts                      lettura dei campi di WeekHoursEditor/BreaksEditor nelle azioni
│   └── action-state.ts              ActionState, idleState, formValues (vedi §7)
├── components/
│   ├── ui.tsx                       primitive: Button, Input, Select, Field, Card, Alert, Badge, …
│   ├── Shell.tsx                    sidebar (drawer su mobile) + header + area contenuto
│   ├── StatusBadge.tsx              badge colorato per lo stato prenotazione
│   ├── WeekHoursEditor.tsx          7 righe giorno/interruttore/inizio/fine (salone e operatori)
│   └── BreaksEditor.tsx             righe di pausa aggiungibili/rimovibili
└── app/
    ├── layout.tsx                   <html lang="it">, font Inter
    ├── page.tsx                     redirect a /agenda
    ├── not-found.tsx                404
    ├── login/
    │   ├── page.tsx · LoginForm.tsx
    │   └── actions.ts               login (salva cookie) e logout (lo cancella)
    ├── api/
    │   ├── availability/route.ts    GET → /admin/availability (un giorno, con cause)
    │   └── customers/search/route.ts GET → /admin/customers?q= (max 8 righe)
    └── (app)/                       gruppo di rotte autenticate
        ├── layout.tsx               carica /admin/account/me e monta Shell
        ├── error.tsx                error boundary con "Riprova"
        ├── agenda/
        │   ├── page.tsx             elenco con filtri in URL
        │   ├── actions.ts           updateStatus, reschedule, changeStaff, updateContact, createBooking
        │   ├── [id]/page.tsx        dettaglio (Server Component)
        │   ├── [id]/BookingActions.tsx  le quattro card di azione (Client Component)
        │   └── nuova/page.tsx · NewBookingForm.tsx
        ├── clienti/
        │   ├── page.tsx             elenco con ricerca
        │   ├── actions.ts           createCustomer, updateCustomer, deleteCustomer
        │   ├── [id]/page.tsx · CustomerForms.tsx
        │   └── nuovo/page.tsx · NewCustomerForm.tsx
        ├── servizi/
        │   ├── page.tsx · ServiceForm.tsx (nuovo e modifica)
        │   ├── actions.ts           createService, updateService, deleteService
        │   └── [id]/page.tsx · nuovo/page.tsx
        ├── operatori/
        │   ├── page.tsx · StaffForm.tsx · StaffExtras.tsx (pause, assenze)
        │   ├── actions.ts           createStaff, updateStaff, deleteStaff, saveStaffBreaks, addTimeOff, deleteTimeOff
        │   └── [id]/page.tsx · nuovo/page.tsx
        ├── orari/
        │   ├── page.tsx · OrariForms.tsx
        │   └── actions.ts           saveBusinessHours, saveTenantBreaks, addClosure, deleteClosure, addTimeBlock, deleteTimeBlock
        └── impostazioni/
            ├── page.tsx · SettingsForm.tsx
            └── actions.ts           updateTenant (PATCH per differenza), uploadLogo (multipart)
scripts/mock-api.mjs                 finto Backend in memoria (vedi §8)
Dockerfile · .dockerignore           immagine di produzione (vedi §9)
```

### Divisione fra Server e Client Component

La regola: **una pagina è Server Component; diventa Client solo la parte che ha stato interattivo.**
Per questo ogni pagina con form ha una coppia `page.tsx` (server: carica i dati) + `XxxForm.tsx`
(`"use client"`: `useActionState`, stato locale). Il dettaglio prenotazione carica tutto lato server e
passa a `BookingActions` solo ciò che serve alle card.

### I tipi (`src/lib/types.ts`)

Rispecchiano i DTO del Backend (`WebAgency_BookingSystem.Core/Dtos/Admin/*`) in camelCase, come li
serializza `System.Text.Json`. **Se un DTO cambia lato .NET, cambia qui e in nessun altro posto.**
Un tipo per ogni risposta usata: `Booking`, `BookingDetail`, `Customer`, `Service`, `Staff`,
`AvailabilityDay`, `PagedResponse<T>`, `ErrorResponse`, più le richieste di scrittura.

## Funzionalità

Ogni voce indica l'endpoint del Backend che la realizza. Tutte le rotte sono sotto `/api/v1/admin`.

### Accesso

| Funzione | Endpoint | Note |
|---|---|---|
| Login | `POST /auth/token` | Email globale (non serve lo slug del salone). L'email resta nel campo dopo un errore |
| Profilo in sidebar | `GET /account/me` | Nome del salone e email: sono il tenant **derivato dal token** |
| Scadenza sessione | — | Cookie con la stessa scadenza del JWT; 401 → `/login?expired=1` con avviso |
| Logout | — | Cancella il cookie e torna al login |

### Agenda (`/agenda`)

| Funzione | Endpoint | Note |
|---|---|---|
| Elenco per giorno o intervallo | `GET /bookings?dateFrom&dateTo` | Default: oggi. Raggruppato per data, ordinato per ora |
| Filtri | `…&status&staffId&serviceId&q` | In AND; `q` cerca nome/telefono **registrati sulla prenotazione** (trova anche quelle senza scheda) |
| Navigazione | — | Giorno prima / Oggi / Giorno dopo / Settimana; i filtri sono nell'URL |
| Paginazione | `…&page&pageSize=100` | |
| Riga | — | orario inizio–fine, cliente, servizio · operatore, telefono, prezzo, stato |

### Dettaglio prenotazione (`/agenda/[id]`)

| Funzione | Endpoint | Note |
|---|---|---|
| Dati | `GET /bookings/{id}` | Appuntamento, servizi (multi-servizio con durata e prezzo), cliente, storico (consenso, annullamento, mancato arrivo, promemoria) |
| Cambio stato | `PATCH /bookings/{id}` `{status}` | Completata · Mancato arrivo · Annullata · Riporta a confermata. I bottoni mostrano solo le transizioni diverse dallo stato attuale; le regole di ammissibilità le applica il Backend |
| Spostamento | `PUT /bookings/{id}/reschedule` `{date,time}` | Griglia degli orari da `/api/availability` con `excludeBookingId` (la prenotazione non confligge con sé stessa). Slot occupati barrati con la **causa** al passaggio del mouse. Solo su prenotazioni confermate. **Nessun preavviso minimo**: il salone che sposta la propria prenotazione non è soggetto a `minCancellationHours` (regola del Backend) |
| Cambio operatore | `PUT /bookings/{id}/staff` `{staffId}` | Proposti solo gli operatori che eseguono **tutti** i servizi dell'appuntamento. Data, ora e prezzo restano invariati; il cliente riceve la conferma aggiornata |
| Recapiti e note | `PATCH /bookings/{id}/contact` | Telefono, email, modalità (in sede / da remoto), note del cliente, nota interna. **Si invia solo ciò che è cambiato** (§6). Il nome non è modificabile (snapshot storico) |
| Link alla scheda | — | "Scheda cliente →" se la prenotazione è collegata a un'anagrafica |

### Nuova prenotazione (`/agenda/nuova`)

Il canale amministrativo: prenotazione presa **al telefono o allo sportello**.

| Passo | Endpoint | Note |
|---|---|---|
| Servizio + servizi aggiuntivi | `GET /services` | Durata e prezzo totali mostrati in tempo reale |
| Operatore | `GET /staff` | Filtrati per idoneità su tutti i servizi scelti; "nessuno" ammesso solo per servizi senza operatori assegnati (capienza `parallelSlots`) |
| Data e ora | `/api/availability` → `GET /availability` | Griglia degli orari liberi con cause; la griglia sparisce da sé se cambiano servizio, operatore o data |
| Cliente | `/api/customers/search` → `GET /customers?q=` | Ricerca in anagrafica con debounce; scegliendo una scheda si compilano i campi e si passa `customerId`; "scollega" torna all'inserimento libero |
| Consenso | — | Canale (telefono / di persona) e attestazione dell'informativa privacy, **obbligatoria** (base giuridica: esecuzione del contratto; il flag attesta l'informativa resa, non un consenso) |
| Email automatiche | — | Come da impostazioni del salone / sì / no (override `emailsEnabled` della singola prenotazione) |
| Salvataggio | `POST /bookings` | Le regole di disponibilità sono **identiche** al sito: uno slot occupato o fuori orario viene rifiutato (409/422) con il messaggio del Backend. Dopo il successo: redirect al dettaglio con avviso "Prenotazione creata" |

### Clienti (`/clienti`)

| Funzione | Endpoint | Note |
|---|---|---|
| Elenco | `GET /customers?page&pageSize=50` | Nome, contatti, flag, data di creazione |
| Ricerca | `…&q=` | Parziale, case-insensitive su nome/telefono/email |
| Scheda | `GET /customers/{id}` + `GET /bookings?customerId=` | Storico prenotazioni collegate, conteggio dei **mancati arrivi** (calcolato, come nel Backend) |
| Modifica | `PATCH /customers/{id}` | Nome, telefono, email, note, "abituale", "segnalato". Solo i campi cambiati (§6). Il vincolo "almeno un contatto" lo verifica il Backend **sul risultato**: il messaggio 422 arriva già in italiano e il form resta compilato |
| Archiviazione | `DELETE /customers/{id}` | Con conferma esplicita. Soft delete: le prenotazioni restano intatte. Redirect all'elenco con avviso |
| Nuova scheda | `POST /customers` | Nome obbligatorio, almeno un contatto |

"Segnalato" (`blocked`) è una **nota per il salone**, non un divieto: il Backend non rifiuta prenotazioni
di un cliente segnalato, e il pannello lo dice sotto la casella.

### Servizi (`/servizi`)

| Funzione | Endpoint | Note |
|---|---|---|
| Elenco | `GET /services` | Durata, prezzo, buffer, capienza, stato, colore. `?archiviati=1` → `includeDeleted=true`, gli eliminati compaiono barrati |
| Nuovo | `POST /services` | Nome, categoria, descrizione, durata, prezzo, prenotazioni in parallelo, buffer (minuti + posizione), attivo, ordine, colore |
| Modifica | `PUT /services/{id}` | **Sostituzione completa**: il form invia sempre tutti i campi (§6). Il colore viaggia solo se la casella "usa un colore" è accesa: il selettore nativo emette sempre un valore |
| Elimina | `DELETE /services/{id}` | Con conferma. Soft delete: le prenotazioni restano; non c'è ripristino |

### Operatori (`/operatori`)

| Funzione | Endpoint | Note |
|---|---|---|
| Elenco | `GET /staff` + `GET /services?includeDeleted=true` | Ruolo, servizi eseguiti, giorni lavorati; `?archiviati=1` |
| Nuovo | `POST /staff` | Dati, servizi eseguiti con prezzo personalizzato opzionale, **settimana intera** (7 giorni con "lavora" esplicito; un nuovo operatore parte dagli orari del salone) |
| Modifica | `PUT /staff/{id}` | Sostituzione completa. Un operatore senza orari propri (dati anteriori al 2026-09-02) mostra un avviso: salvando gli orari diventano espliciti |
| Pause ricorrenti | `PUT /staff/{id}/breaks` | Griglia sostituita in blocco; si sommano alle pause del salone |
| Assenze | `GET|POST /staff/{id}/time-off`, `DELETE …/{timeOffId}` | Giornata intera o fascia; motivo solo a categoria chiusa (ferie, malattia, permesso, altro), mai testo libero |
| Elimina | `DELETE /staff/{id}` | Con conferma, soft delete |

### Orari e chiusure (`/orari`)

| Funzione | Endpoint | Note |
|---|---|---|
| Orari di apertura | `GET|PUT /business-hours` | 7 giorni; avviso se mai configurati (salone non prenotabile). Cambiarli **non** aggiorna gli operatori, che hanno orari propri |
| Pause del salone | `GET /breaks`, `PUT /breaks/tenant` | Valgono per tutti gli operatori |
| Chiusure straordinarie | `GET|POST /closures`, `DELETE /closures/{id}` | Una tantum, ogni anno (può scavalcare Capodanno), Pasqua, Pasquetta. Le passate restano visibili, marcate |
| Festività suggerite | `GET /holidays?year=` | Anno corrente + prossimo, dedotte quelle già registrate e quelle passate. Un click crea la chiusura ricorrente con il nome della festività |
| Blocchi orari | `GET|POST /time-blocks`, `DELETE /time-blocks/{id}` | Fascia non prenotabile per tutto il salone in uno o più giorni. Il motivo non è mostrato ai clienti |

Tutto ciò che rende non prenotabile del tempo per l'**intero salone** sta in questa pagina; ciò che riguarda
un **singolo operatore** (pause, assenze) sta nella sua scheda. È la stessa distinzione che il Backend fa
fra i suoi cinque strumenti di indisponibilità.

### Impostazioni (`/impostazioni`)

| Funzione | Endpoint | Note |
|---|---|---|
| Lettura | `GET /tenant` | Nome, slug e fuso orario in **sola lettura** (il Backend li ignora nel PATCH: è una scelta, non un rinvio) |
| Contatti, link, colore, interruttori | `PATCH /tenant` | **Per differenza** (§6): testo `null` = non toccare, `""` = svuota; interruttori `bool` solo se cambiati. Il colore viaggia solo con la casella "usa un colore" accesa, altrimenti `""` lo azzera |
| Link di gestione prenotazione | `bookingManagementPath` | Percorso relativo sul sito del salone; un URL assoluto è rifiutato (422) perché il link porta il token della prenotazione |
| Link recensioni Google | `googleReviewUrl` | Regola opposta: `https://` assoluto obbligatorio. Senza, la richiesta di recensione non parte anche se attiva |
| Cinque interruttori email | `email*Enabled` | Conferma, promemoria, disdetta, notifica al titolare, richiesta di recensione. Effetto immediato (cache invalidata lato Backend) |
| Logo | `POST /tenant/logo` (multipart) | PNG/JPEG/WebP dai magic bytes, max 2 MB; `api()` passa il `FormData` senza `Content-Type` così `fetch` mette il boundary. Il logo è un `<img>` nativo verso il CDN |

### Trasversali

- **Interfaccia in italiano**, incluse le etichette di stati, cause di indisponibilità, modalità e canali
  (`src/lib/format.ts`): un valore nuovo del Backend si traduce una volta sola.
- **Errori**: ogni form mostra il messaggio del Backend in un `Alert` con `role="alert"`; gli errori di
  campo (`errors` della `ErrorResponse`) compaiono sotto il campo corrispondente.
- **Mobile**: sotto la soglia `md` la sidebar è un drawer fuori schermo con backdrop e hamburger; da chiusa
  è anche `invisible` (fuori dall'albero di accessibilità). Le righe dell'agenda vanno a capo invece di
  troncare il nome. Verificato a 390×844.
- **Error boundary** (`(app)/error.tsx`): un errore imprevisto in una pagina mostra un messaggio e un
  bottone "Riprova" invece di una pagina bianca.

## 6. Convenzioni ereditate dal Backend

### PATCH: `null` = non toccare, `""` = svuota

Gli endpoint `PATCH` del Backend (`/bookings/{id}/contact`, `/customers/{id}`) distinguono fra un campo
**assente/null** (lasciato com'è) e una **stringa vuota** (svuotato). Un form HTML però invia sempre tutti
i campi, vuoti compresi: mandare il form così com'è **svuoterebbe** ogni campo che l'utente ha lasciato
in bianco perché era già vuoto… o, peggio, un campo che aveva un valore e che il form non mostrava.

Per questo le Server Action di modifica ricevono uno **snapshot** dei valori mostrati nel form
(`ContactSnapshot`, `CustomerSnapshot`) e costruiscono il body **per differenza**: solo ciò che è
diverso dallo snapshot viene inviato, tutto il resto è `null`. Se nulla è cambiato, non si chiama l'API.

Caso particolare: il **telefono di una prenotazione** non è svuotabile (422 lato Backend). Se l'utente lo
cancella, l'azione lo lascia invariato invece di mandare `""`.

### PUT: sostituzione completa (servizi, operatori, orari, pause)

L'opposto del `PATCH`. `PUT /services/{id}`, `PUT /staff/{id}`, `PUT /business-hours`, `PUT /breaks/*`
**sostituiscono** la risorsa: un campo omesso viene azzerato, non lasciato com'era. Per questo i form di
servizi e operatori inviano sempre tutti i campi e l'azione costruisce il body intero, senza snapshot. Un
dettaglio che ne discende: un `<input disabled>` non viene inviato, quindi quando il buffer di un servizio
è spento il form aggiunge campi nascosti con valori validi (0 minuti, "After") invece di lasciare il
Backend senza quei campi.

### Le regole le applica il Backend, il frontend le mostra

Nessuna regola di disponibilità, di stato o di validazione è duplicata qui. Il form può *guidare*
(operatori filtrati per idoneità, griglia degli orari liberi), ma non *decide*: al salvataggio è il
Backend a dire sì o no, e il suo messaggio viene mostrato tale e quale. È la stessa disciplina del
Backend ("nessuna deroga, per nessun canale"): il pannello non può forzare uno slot pieno, e non deve
sembrare che possa.

### Valori del contratto

Stati (`confirmed | completed | cancelled | no_show`), modalità (`on_site | remote`), canale di consenso
(`phone | in_person`) e cause di indisponibilità viaggiano in **snake_case** come li espone l'API; la
traduzione è solo in `format.ts`.

## 7. Decisioni tecniche e lezioni imparate

Ognuna di queste è costata un giro di verifica. Sono scritte perché non si ripetano.

**React 19 azzera il form dopo OGNI Server Action, anche fallita.** Senza contromisura, un 422 del Backend
("serve almeno un contatto") cancellerebbe tutto ciò che l'utente aveva scritto. Ogni azione che fallisce
restituisce `values: formValues(formData)` e i campi non controllati usano
`defaultValue={state.values?.campo ?? valoreIniziale}`. La password è esclusa esplicitamente. Il login fa
lo stesso con la sola email.

**Un modulo `"use server"` può esportare SOLO funzioni async.** `idleState` era esportato da `actions.ts`
e arrivava al client come *riferimento a un'azione remota*, non come oggetto: React andava in errore
(#441) alla prima chiamata. `ActionState` e `idleState` vivono in `src/lib/action-state.ts`, un modulo
normale.

**`proxy.ts`, non `middleware.ts`.** Next 16 ha rinominato il middleware in "proxy"
(`export function proxy`). Il matcher esclude `_next/`, `api/` e i file statici: il cancello serve alle
pagine, non alle risorse.

**`cookies()`, `params` e `searchParams` sono asincroni** in Next 16: vanno sempre `await`-ati. Le pagine
usano i tipi generati `PageProps<"/rotta">`.

**Nessun `setState` dentro `useEffect`** (regola ESLint `react-hooks/set-state-in-effect`). Lo stato
derivato si calcola con `useMemo`; la griglia degli orari è memorizzata insieme alla *chiave* dei parametri
con cui è stata caricata (`slotsKey`), così sparisce da sé se servizio, operatore o data cambiano, senza un
effetto che la azzera.

**La griglia degli orari usa `excludeBookingId` sullo spostamento.** Senza, la prenotazione che si sta
spostando occupa i propri slot e proprio gli orari vicini a quello attuale, i più utili, risultano
occupati da sé stessa. Il parametro esiste solo sul canale admin del Backend, per ragioni di sicurezza
documentate là.

**Il drawer mobile da chiuso è `invisible`, non solo traslato.** Un elemento traslato fuori schermo resta
raggiungibile con Tab e per gli screen reader (e Playwright lo considera visibile). `max-md:invisible` lo
toglie davvero.

**Le righe dell'agenda su schermi stretti.** Con `flex-wrap` e il blocco del nome a `flex-1`, telefono e
prezzo si prendevano lo spazio e il nome diventava "Gi…". Il blocco ha ora `min-w-48` e il telefono è
nascosto sotto `sm`: prezzo e stato vanno a capo, il nome si legge. Visto a 390px, non dedotto.

**Nel markup server-side React separa i nodi di testo adiacenti con `<!-- -->`.** `{a}–{b}` esce come
`13:00<!-- -->–<!-- -->14:00`: un test che cerca la stringa nell'HTML grezzo non la trova, pur essendo
corretta a schermo. Le asserzioni sul contenuto usano il testo renderizzato (`inner_text`), non `content()`.

**Mai un `<form>` dentro un altro.** Il browser scarta il form annidato in silenzio. La card "Elimina" di
servizi e operatori sta fuori dal form principale, e i pulsanti di rimozione delle righe (assenze,
chiusure, blocchi) sono ciascuno un form a sé.

**I tipi delle rotte (`PageProps<"/rotta">`) vengono generati da `next build`.** Dopo aver aggiunto una
pagina `tsc` fallisce finché non si è fatto un build: non è un errore del codice.

**`cache: "no-store"` su ogni chiamata** e `revalidatePath` dopo ogni mutazione: un gestionale mostra
sempre lo stato attuale. Le pagine sono tutte dinamiche (`ƒ` nel report di build), tranne login e 404.

## 8. Come è stato verificato

L'ambiente in cui il progetto è stato scritto **non raggiunge il Backend di produzione** (policy di rete),
quindi la verifica è avvenuta contro un finto Backend, e poi in produzione dall'utente.

### Il mock (`scripts/mock-api.mjs`)

Un server Node senza dipendenze che implementa, in memoria, **i soli endpoint usati dal gestionale** con
le stesse forme di risposta e gli stessi codici d'errore: login (`demo`), profilo, servizi, operatori,
elenco/dettaglio/creazione prenotazioni, cambio stato, spostamento (409 su slot occupato), cambio
operatore, recapiti (422 su telefono vuoto), disponibilità con cause, clienti (422 senza contatti).

**Non è un sostituto delle regole del Backend**: rifiuta solo i casi più evidenti, quanto basta per vedere
i messaggi d'errore nei form. Un comportamento che passa sul mock e fallisce in produzione è un caso da
aggiungere al mock, non un bug del Backend.

### Il ciclo di verifica

```bash
npm run typecheck && npm run lint && npm run build
# server standalone (come in produzione)
cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
(cd .next/standalone && API_BASE_URL=http://localhost:5099 PORT=3100 node server.js)
npm run mock-api
```

Poi uno script Playwright (Chromium headless) percorre l'intero flusso: login con errore e poi corretto,
agenda e filtri, conflitto 409 mostrato, spostamento, cambio stato, cambio operatore, recapiti, nuova
prenotazione con ricerca cliente, modifica cliente con 422, nuovo cliente, drawer mobile a 390px, logout.
Ascolta `pageerror` e `console.error`: **zero errori JS** è parte del criterio di successo. Gli screenshot
di ogni passo vengono guardati, non solo contati: due dei difetti in §7 sono emersi così.

## 9. Deploy

`Dockerfile` a tre stadi su `node:22-alpine`:

1. `deps`: `npm ci`;
2. `build`: `next build` con `output: "standalone"`;
3. `runner`: copia **solo** `.next/standalone`, `.next/static` e `public`. Niente `node_modules`
   completi, niente sorgenti. `CMD ["node", "server.js"]`.

Il server standalone legge `PORT` e `HOSTNAME=0.0.0.0` dall'ambiente: Railway inietta `PORT` da sé.
Unica variabile da impostare: `API_BASE_URL`.

Due cose imparate deployando altri servizi Forvea su Railway, valide anche qui:
- **`Redeploy` riesegue il deployment vecchio con la configurazione vecchia**: dopo aver cambiato
  variabili o impostazioni serve un deploy nuovo (basta toccare una variabile).
- Un `startCommand` personalizzato **non passa da una shell**: `$PORT` resterebbe letterale. Qui non serve
  perché il `CMD` del Dockerfile non usa variabili.

## 10. Cosa NON fa, e cosa aggiungere dopo

Scelte di scope, non dimenticanze. Servizi, operatori, orari, pause, chiusure, blocchi, assenze e impostazioni
del salone sono coperti dal 2026-09-10. Il Backend espone già tutto il necessario: si tratta solo di
aggiungere pagine.

| Area | Endpoint già disponibili |
|---|---|
| Vista aggregata delle assenze di tutti gli operatori | `GET /admin/time-off` (oggi le assenze si vedono solo per operatore) |
| Foto dell'operatore | `photoUrl` su `/admin/staff` (il form lo invia sempre `null`) |
| Unione schede duplicate, scoperta duplicati, export CSV | `/admin/customers/{id}/merge`, `/duplicates`, `/export` |
| Registro di audit | `GET /admin/audit-log` |
| Cambio password, reset via email | `/admin/account/password*` |
| GDPR: export e cancellazione per un cliente | `/admin/gdpr/customer[/erase]` |
| Vista calendario a griglia (settimana/giorno per operatore) | `GET /admin/availability` + `GET /bookings` |

Vincoli da rispettare aggiungendo pagine:
- ogni nuova chiamata passa da `src/lib/api.ts`, ogni nuovo DTO da `src/lib/types.ts`;
- ogni mutazione è una Server Action che restituisce `ActionState` (con `values` in caso di errore);
- ogni `PATCH` costruisce il body per differenza da uno snapshot (§6);
- nessuna regola del Backend viene duplicata lato client.
