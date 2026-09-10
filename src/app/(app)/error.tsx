"use client";

// [INTENT]: Confine d'errore delle pagine autenticate: se il Backend non risponde (o API_BASE_URL manca)
// si vede un messaggio con "Riprova", non una pagina bianca.

import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="mb-1 font-semibold text-red-800">Qualcosa è andato storto</h1>
      <p className="mb-4 text-sm text-red-700">{error.message || "Errore imprevisto."}</p>
      <Button variant="secondary" onClick={reset}>
        Riprova
      </Button>
    </div>
  );
}
