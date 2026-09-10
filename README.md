# Gestionale clienti — Forvea

Pannello web per il **titolare di un salone** (il cliente dell'agenzia): agenda delle prenotazioni e
anagrafica clienti, collegato all'Admin API del Backend Forvea (`forvea/Backend`).

Un'unica installazione serve tutti i saloni. Ogni titolare accede con le proprie credenziali e vede
**solo i dati del proprio salone**: l'isolamento lo garantisce il Backend (il tenant è dentro il JWT e
ogni query è filtrata lato server), non questo frontend. Dettagli in [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md).

## Stack

| Componente | Scelta |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Stile | Tailwind CSS v4 |
| Chiamate API | solo lato server (Server Components, Server Actions, Route Handlers) |
| Sessione | JWT del Backend in un cookie `httpOnly` |
| Deploy | Railway, immagine Docker (`output: "standalone"`) |

Nessuna libreria di UI, di form o di stato: il progetto è volutamente piccolo e leggibile.

## Avvio in locale

Requisiti: Node 22.

```bash
npm ci
cp .env.example .env.local        # e imposta API_BASE_URL
npm run dev                       # http://localhost:3000
```

### Con il finto Backend (senza credenziali reali)

```bash
npm run mock-api                  # finto Backend su http://localhost:5099, in memoria
API_BASE_URL=http://localhost:5099 npm run dev
```

Login con **qualunque email** e password `demo`. Il mock ha un salone "Barberia Demo" con tre servizi,
due operatori, tre clienti e sei prenotazioni; rifiuta uno slot occupato (409) e una scheda cliente senza
contatti (422), quanto basta per vedere i messaggi d'errore nei form. I dati si azzerano a ogni riavvio.

## Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `API_BASE_URL` | sì | URL pubblico del Backend, senza slash finale. Letta **solo lato server**: il browser non la vede mai |
| `PORT` | sì su Railway | Porta su cui ascolta il server. **Deve coincidere con il target port del dominio**: Railway di default inietta `8080` mentre il dominio generato punta alla `3000` — senza `PORT=3000` (o un dominio sulla 8080) il sito non risponde, con deploy verde e log puliti |

Non esistono altre variabili: nessun segreto vive in questo progetto. Le credenziali le detiene il
titolare, il JWT lo emette il Backend.

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione (standalone) |
| `npm start` | avvia la build |
| `npm run lint` | ESLint (config Next + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run mock-api` | finto Backend su `:5099` |

Prima di ogni commit: `npm run typecheck && npm run lint && npm run build` devono passare puliti.

## Deploy su Railway

Il repository contiene un `Dockerfile` a tre stadi; Railway lo rileva da solo.

1. Nuovo servizio dal repo GitHub `forvea/gestionale-clienti`, branch `main`.
2. Variabili `API_BASE_URL=https://<backend>.up.railway.app` e `PORT=3000`.
3. Il deploy automatico al push non parte finché il servizio non ha un deployment riuscito: il primo va
   avviato ricollegando la sorgente (o da dashboard). Un cambio di variabile da solo non basta.
4. Genera un dominio pubblico dal pannello del servizio.

Non serve altro: il server standalone legge `PORT` e ascolta su `0.0.0.0`.

> Dopo aver cambiato variabili o configurazione di un servizio già deployato, fai partire un **deploy
> nuovo** (una modifica di variabile basta): `Redeploy` riesegue il deployment precedente **con la
> configurazione vecchia**, non con quella appena modificata.

## Struttura

```
src/
├── proxy.ts                  cancello di autenticazione (Next 16 "proxy", ex middleware)
├── lib/
│   ├── api.ts                UNICO punto di contatto con l'Admin API
│   ├── session.ts            cookie httpOnly con il JWT
│   ├── types.ts              tipi TS specchio dei DTO del Backend
│   ├── format.ts             date, prezzi, etichette italiane
│   └── action-state.ts       forma dello stato delle Server Action
├── components/               ui.tsx (primitive), Shell.tsx (sidebar/drawer), StatusBadge.tsx
└── app/
    ├── login/                pagina + Server Action di login/logout
    ├── api/                  Route Handler interni (disponibilità, ricerca clienti)
    └── (app)/                pagine autenticate
        ├── agenda/           elenco, dettaglio + azioni, nuova prenotazione
        └── clienti/          elenco, scheda, nuovo cliente
scripts/mock-api.mjs          finto Backend per lo sviluppo
docs/ARCHITETTURA.md          come è fatto, perché, e cosa fa
```

## Funzionalità (riassunto)

- **Accesso**: login con email e password del titolare; sessione che scade con il JWT; logout.
- **Agenda**: prenotazioni per giorno o intervallo, filtri per stato, operatore, servizio, nome o telefono;
  navigazione giorno prima/dopo/oggi/settimana; paginazione.
- **Dettaglio prenotazione**: cambio stato (completata, mancato arrivo, annullata, confermata), spostamento
  con griglia degli orari liberi e causa di indisponibilità, cambio operatore fra quelli idonei, correzione
  di recapiti, note e modalità.
- **Nuova prenotazione** (telefono o sportello): servizio + servizi aggiuntivi, operatore idoneo, orari
  liberi dal Backend, cliente cercato in anagrafica o inserito al volo, canale e attestazione
  dell'informativa privacy, override delle email automatiche.
- **Clienti**: elenco con ricerca e paginazione, scheda con storico prenotazioni e conteggio dei mancati
  arrivi, modifica, flag "abituale" e "segnalato", archiviazione con conferma, nuova scheda.
- **Mobile**: sidebar a scomparsa, layout a una colonna, verificato a 390px.

L'elenco completo, con l'endpoint del Backend dietro ogni azione, è in
[`docs/ARCHITETTURA.md` §Funzionalità](docs/ARCHITETTURA.md#funzionalità).
