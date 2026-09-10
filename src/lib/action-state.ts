// [INTENT]: Forma dello stato restituito da ogni Server Action usata con `useActionState`, e il suo valore
// iniziale. Vive in un modulo NORMALE (non "use server"): un modulo "use server" può esportare solo
// funzioni async — un oggetto esportato da lì arriva al client come riferimento a un'azione remota, non
// come dato, e React va in errore alla prima chiamata.
//
// WHY `values`: React 19 azzera il form dopo OGNI Server Action, anche fallita. Senza rimandare indietro
// ciò che l'utente aveva scritto, un 422 del Backend (es. "serve almeno un contatto") cancellerebbe tutto
// il modulo compilato — il modo più sicuro per far abbandonare un inserimento. I campi non controllati dei
// form usano `defaultValue={state.values?.campo ?? …}` e tornano com'erano.

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]> | null;
  values?: Record<string, string>;
};

export const idleState: ActionState = {};

/** Copia i campi testuali del FormData (mai file, mai password) per ripopolare il form dopo un errore. */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.toLowerCase().includes("password")) continue;
    out[key] = value;
  }
  return out;
}
