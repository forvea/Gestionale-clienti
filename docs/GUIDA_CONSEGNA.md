# Guida: vedere il gestionale, usarlo, consegnarlo a un salone

Per l'agenzia (chi crea i saloni) e per il titolare (chi lo usa ogni giorno).

Indice:

1. [Dove si trova](#1-dove-si-trova)
2. [Come funziona l'isolamento: un solo gestionale, ogni salone vede solo il suo](#2-come-funziona-lisolamento)
3. [Consegnarlo a un nuovo salone, passo per passo](#3-consegnarlo-a-un-nuovo-salone)
4. [Cosa NON fare](#4-cosa-non-fare)
5. [Come si usa (per il titolare)](#5-come-si-usa)
6. [Se il titolare non riesce a entrare](#6-se-il-titolare-non-riesce-a-entrare)

---

## 1. Dove si trova

| | |
|---|---|
| Gestionale (produzione) | `https://gestionale-clienti-production.up.railway.app` |
| Backend a cui parla | `https://backend-production-70c0.up.railway.app` |
| Servizio Railway | progetto `Forvea-DB` → `Gestionale-clienti` (branch `main` del repo `forvea/gestionale-clienti`) |

L'indirizzo è **lo stesso per tutti i saloni**. Non esiste un'installazione per cliente, un sottodominio
per cliente o una configurazione per cliente: ciò che distingue un salone dall'altro è **chi fa login**.

Per provarlo in locale senza credenziali reali: `npm run mock-api` e `API_BASE_URL=http://localhost:5099
npm run dev`, login con qualunque email e password `demo` (vedi `README.md`).

## 2. Come funziona l'isolamento

Il requisito "ogni cliente vede SOLO i propri dati" è garantito così, e vale la pena capirlo prima di
consegnare qualcosa:

1. Nel Backend ogni salone è un **tenant**. Ogni utente (`users`) appartiene a **un solo tenant**, fissato
   quando il salone viene creato.
2. Al login il Backend rilascia un **JWT che contiene il tenant** di quell'utente. Non c'è modo di
   chiederne un altro: il tenant non è un parametro, è dentro il token firmato.
3. Ogni chiamata del gestionale porta quel JWT. Il Backend risolve il tenant **dal token** e applica un
   filtro su `tenant_id` a **tutte** le query: per un titolare, le righe degli altri saloni **non
   esistono** (404), anche indovinando un Id.
4. Il gestionale non conosce e non passa mai un `tenantId`. Non c'è nulla da "settare per il loro tenant":
   il tenant è deciso dalle **credenziali**, e le credenziali le crea l'agenzia.

Quindi "settarlo solo per il loro tenant" significa una cosa sola: **dare al titolare le credenziali del
suo salone, e nient'altro**. Un titolare con le credenziali giuste non può vedere altro; un titolare con le
credenziali di un altro salone vedrebbe quell'altro salone. La sicurezza sta tutta lì.

Il JWT vive in un cookie `httpOnly` del gestionale: il browser non lo legge, nessuno script lo può rubare,
scade con il token (8 ore di default). Dettagli in `docs/ARCHITETTURA.md` §2.

## 3. Consegnarlo a un nuovo salone

Serve un accesso da **amministratore di piattaforma** (identità `PlatformAdmin`, separata dai saloni).
Tutto avviene sull'API del Backend; nessun accesso al database.

### 3.1 Accedi come agenzia

```
POST https://backend-production-70c0.up.railway.app/api/v1/platform/auth/token
{ "email": "<email admin piattaforma>", "password": "<password>" }
→ { "token": "..." }
```

Il token va nell'header `Authorization: Bearer <token>` delle chiamate seguenti. Se l'admin di piattaforma
non esiste ancora, si crea una volta sola con `POST /api/v1/platform/setup` e il `PLATFORM_SETUP_TOKEN`
configurato sul Backend (vedi `DEPLOY_RAILWAY.md` nel repo Backend).

### 3.2 Crea il salone

```
POST /api/v1/platform/tenants        (Authorization: Bearer <token agenzia>)
```

Il corpo è il file di provisioning: un esempio completo è `samples/barbershop-demo.json` nel repo Backend.
I campi che contano per la consegna:

| Campo | Cosa decide |
|---|---|
| `slug` | identificativo del salone negli URL pubblici. **Non è modificabile dopo** |
| `name` | nome mostrato nel gestionale e nelle email ai clienti |
| `siteUrl` | il sito del salone: abilita il suo widget a chiamare l'API (CORS) |
| `ownerEmail` | **l'email con cui il titolare farà login.** Deve essere sua e raggiungibile: ci arriva il link di attivazione |
| `timezone` | fuso orario di ogni orario mostrato. **Non modificabile dopo** |
| `bookingRules` | anticipo minimo, preavviso di disdetta, finestra di giorni prenotabili, interruttori email |
| `businessHours` | orari settimanali, **obbligatori**: un salone non può nascere non prenotabile |
| `services`, `staff`, `breaks`, `specialClosures` | il catalogo iniziale. Tutto modificabile poi dal gestionale |

La risposta contiene la **chiave API pubblica** del salone (per il widget sul sito), mostrata **una sola
volta**: va conservata e passata a chi costruisce il sito. Non serve al gestionale.

### 3.3 Il titolare attiva l'account

Il salone nasce con un utente Owner **senza password**. Il Backend accoda automaticamente un'email di
attivazione a `ownerEmail`, con un link valido **72 ore** verso una pagina del Backend dove il titolare
sceglie la propria password (minimo 12 caratteri).

L'agenzia **non conosce mai la password** del titolare. Non c'è una password iniziale da comunicare, e
questo è voluto: nessuna password viaggia in una chat o in un'email.

Se il link è scaduto o l'email non è arrivata:

```
POST /api/v1/platform/tenants/{tenantId}/owner/resend-activation   → 202
```

Prima di rimandarla, controlla che l'email non sia fra quelle fallite:
`GET /api/v1/platform/outbox-emails?status=failed` (mostra solo il dominio del destinatario, mai
l'indirizzo). Un'email `Failed` si ritenta con `POST /api/v1/platform/outbox-emails/{id}/retry`.

### 3.4 Cosa comunicare al titolare

Tre cose, e basta:

1. l'indirizzo del gestionale: `https://gestionale-clienti-production.up.railway.app`;
2. "entra con l'email `<ownerEmail>` e la password che hai scelto dal link di attivazione";
3. "se dimentichi la password, dal login puoi chiederne il reset via email".

Nessuna chiave API, nessun identificativo del salone, nessuna password.

### 3.5 Verifica

Chiedi al titolare di entrare: in alto a sinistra deve leggere **il nome del suo salone** (viene da
`GET /admin/account/me`, cioè dal tenant del suo token). Se legge quello, vede quello e solo quello.

## 4. Cosa NON fare

- **Non riusare un'email fra due saloni.** Il login è per email globale: un'email appartiene a un solo
  utente e quindi a un solo tenant. Due saloni dello stesso proprietario hanno due email diverse.
- **Non creare un utente "dell'agenzia" dentro un salone** per assistenza. Per guardare la configurazione
  di un salone l'agenzia ha le rotte `GET /api/v1/platform/tenants/{id}/services|staff|business-hours|
  closures|time-blocks`, che lasciano traccia nell'audit del salone. Prenotazioni e clienti dei saloni non
  sono raggiungibili dalla piattaforma **per scelta**.
- **Non passare l'API key del salone al titolare.** Serve al widget del sito, non al gestionale, e vive nel
  sito (è pubblica per costruzione). Ruotarla: `POST /api/v1/platform/tenants/{id}/api-keys`.
- **Non "disattivare" un salone cancellando l'utente.** Si usa `POST /api/v1/platform/tenants/{id}/deactivate`:
  il login continua a funzionare ma il profilo risulta `active: false`, e si riattiva con `/reactivate`.

## 5. Come si usa

Tutto in italiano, con le regole del sito: uno slot occupato o fuori orario viene rifiutato con lo stesso
messaggio che vedrebbe un cliente dal widget. Il gestionale non può forzare nulla.

**Agenda.** Si apre su oggi. Giorno prima / Oggi / Giorno dopo / Settimana, oppure un intervallo di date;
filtri per stato, operatore, servizio, nome o telefono. Cliccando una riga si apre il dettaglio.

**Dettaglio prenotazione.** A destra le azioni:
- *Stato*: segna completata (parte la richiesta di recensione, se configurata), mancato arrivo, annulla
  (parte l'email di disdetta al cliente), riporta a confermata.
- *Sposta*: scegli la data, premi "Mostra orari disponibili", clicca un orario libero, conferma. Gli orari
  barrati dicono perché non sono disponibili passandoci sopra. Il cliente riceve la conferma aggiornata.
- *Operatore*: cambia chi eseguirà l'appuntamento, fra quelli che fanno tutti i servizi prenotati. Data,
  ora e prezzo restano quelli. Il cliente riceve la conferma aggiornata.
- *Recapiti e note*: correggi telefono, email, modalità, note; la nota interna la vede solo il salone.

**Nuova prenotazione** (telefono o sportello). Servizio (+ eventuali servizi aggiuntivi), operatore,
data, "Mostra orari disponibili", orario. Cliente: inizia a scrivere nome o telefono per ritrovarlo in
anagrafica, oppure compila i campi per uno nuovo. La casella dell'informativa privacy è obbligatoria per
legge. "Email automatiche" permette di non scrivere al cliente per questa sola prenotazione.

**Clienti.** Ricerca per nome, telefono o email. Nella scheda: dati, "abituale", "segnalato" (è una nota
per il salone, non blocca le prenotazioni), storico degli appuntamenti con il conteggio dei mancati
arrivi, archiviazione.

**Servizi.** Nome, durata, prezzo, buffer (tempo non prenotabile prima/dopo), prenotazioni in parallelo
(solo per servizi senza operatori), colore. Un servizio non attivo non è prenotabile ma resta in elenco.

**Operatori.** Dati, servizi che esegue (con prezzo personalizzato se diverso dal listino), orari di
**tutta** la settimana: un giorno spento è un giorno non lavorato. Sotto, le pause ricorrenti e le
assenze (ferie, malattia, permesso). Gli orari dell'operatore sono suoi: cambiare quelli del salone non
li tocca.

**Orari e chiusure.** Orari di apertura del salone, pause valide per tutti (pranzo), chiusure straordinarie
con le festività italiane proposte a un click, blocchi orari (una fascia non prenotabile per tutti, per
esempio una riunione).

**Su telefono** funziona tutto: il menu si apre dall'icona in alto a sinistra.

## 6. Se il titolare non riesce a entrare

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| "Email o password non corretti" | credenziali sbagliate | dal login → reset password via email (`/admin/account/password/reset-request`, risposta sempre neutra) |
| Bloccato dopo vari tentativi | lockout: 5 tentativi falliti → 15 minuti | aspettare, poi reset password se serve |
| "Sessione scaduta" | il JWT dura 8 ore, oppure la password è stata cambiata (i vecchi token si invalidano) | rifare login |
| Mai ricevuto il link di attivazione | email fallita o finita nello spam | vedi §3.3: outbox fallite, poi `resend-activation` |
| Entra ma vede un altro salone | ha le credenziali di un altro salone | è l'unico modo in cui può succedere: verificare quale `ownerEmail` ha usato |
| Entra ma "Nome del salone" è vuoto o l'agenda è sempre vuota | salone senza orari (non dovrebbe più accadere: sono obbligatori alla creazione) | "Orari e chiusure" → salvare gli orari |
