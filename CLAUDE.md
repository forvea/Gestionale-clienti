# Gestionale clienti — riferimento per agenti AI

Pannello web Next.js 16 per il titolare di un salone, collegato all'Admin API del Backend Forvea
(`forvea/Backend`). Prima di toccare il codice leggi, in ordine:

1. [`README.md`](README.md) — avvio, variabili, script, deploy.
2. [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md) — modello di sicurezza, architettura, elenco delle
   funzionalità con l'endpoint dietro ciascuna, convenzioni, lezioni imparate, cosa manca.

## Regole non negoziabili

- **L'isolamento fra saloni è del Backend** (tenant nel JWT + query filter). Il frontend non conosce e
  non passa mai un `tenantId`. Non aggiungerne uno "per comodità".
- **Il JWT sta in un cookie `httpOnly` e non raggiunge mai il browser.** Ogni chiamata all'API parte dal
  server: Server Component, Server Action o Route Handler in `src/app/api/*`. Mai un `fetch` diretto
  all'API da un Client Component.
- **Un solo punto di contatto con l'API**: `src/lib/api.ts`. **Un solo posto per i tipi**: `src/lib/types.ts`.
- **Le regole le applica il Backend**: disponibilità, stati, validazioni. Qui si mostrano i suoi messaggi,
  non si reinventano.
- **PATCH per differenza**: `null` = non toccare, `""` = svuota. Si invia solo ciò che è cambiato rispetto
  allo snapshot mostrato nel form.
- **Ogni azione fallita restituisce `values`** (`formValues(formData)`), perché React 19 azzera il form
  dopo ogni Server Action. Mai la password.
- `ActionState`/`idleState` vivono in `src/lib/action-state.ts`: un modulo `"use server"` può esportare
  solo funzioni async.
- Ogni file inizia con `// [INTENT]:`; le logiche non ovvie hanno un `// WHY:`.

## Prima di dichiarare finito

```bash
npm run typecheck && npm run lint && npm run build
```

Tutti e tre puliti. Per una verifica di comportamento: `npm run mock-api` + build standalone + un giro
nel browser (vedi `docs/ARCHITETTURA.md` §8). Guarda gli screenshot, non contarli.

## Stato

MVP completo e verificato end-to-end sul mock (2026-09-10): login, agenda con filtri, dettaglio con
cambio stato / spostamento / cambio operatore / recapiti, nuova prenotazione, clienti (elenco, scheda,
modifica, archiviazione, nuova scheda), mobile. Le aree non ancora coperte (servizi, operatori, orari,
chiusure, impostazioni, GDPR, calendario a griglia) sono elencate in `docs/ARCHITETTURA.md` §10 con gli
endpoint già pronti lato Backend.
