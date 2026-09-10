// [INTENT]: Unico punto di contatto con l'Admin API del Backend. Gira SOLO lato server (Server Components,
// Server Actions, Route Handlers): legge il JWT dal cookie httpOnly e lo mette in Authorization. Il browser
// parla solo con questo frontend, mai direttamente con l'API — quindi nessuna dipendenza dalla policy CORS
// del Backend e nessun token esposto al client.
//
// Ogni errore dell'API (ErrorResponse: { type, message, errors? }) diventa un ApiError tipizzato, così le
// pagine mostrano il messaggio italiano che il Backend produce già invece di reinventarlo.

import { redirect } from "next/navigation";
import { getToken } from "./session";
import type { ErrorResponse } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    message: string,
    public readonly errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL non impostata: indica l'URL pubblico del Backend (es. https://....up.railway.app).");
  }
  return url.replace(/\/+$/, "");
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Senza token: solo per il login. */
  anonymous?: boolean;
  /** Query string; i valori undefined/null/"" vengono omessi. */
  query?: Record<string, string | number | boolean | null | undefined>;
};

async function parseError(res: Response): Promise<ApiError> {
  let payload: Partial<ErrorResponse> & { title?: string; detail?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    // corpo vuoto o non JSON: si usa lo status
  }
  const message =
    payload.message ?? payload.detail ?? payload.title ?? `Errore ${res.status} dal server.`;
  return new ApiError(res.status, payload.type ?? "error", message, payload.errors ?? null);
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!opts.anonymous) {
    const token = await getToken();
    if (!token) redirect("/login");
    headers.Authorization = `Bearer ${token}`;
  }
  // WHY: con un FormData (upload del logo) il Content-Type lo imposta fetch, con il boundary del multipart;
  // metterlo a mano lo romperebbe.
  const isMultipart = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isMultipart) headers["Content-Type"] = "application/json";

  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : isMultipart ? (opts.body as FormData) : JSON.stringify(opts.body),
    cache: "no-store",
  });

  // WHY: un 401 su una chiamata autenticata significa token scaduto o invalidato (cambio password,
  // security stamp rigenerato): la risposta giusta è tornare al login, non mostrare un errore generico.
  if (res.status === 401 && !opts.anonymous) redirect("/login?expired=1");
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Converte un ApiError (o un errore qualsiasi) nel messaggio da mostrare all'utente. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Errore imprevisto.";
}

export function fieldErrors(err: unknown): Record<string, string[]> | null {
  return err instanceof ApiError ? err.errors : null;
}
