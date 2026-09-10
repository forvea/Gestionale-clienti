// [INTENT]: Cancello di autenticazione a livello di richiesta (Next 16 "proxy", ex middleware). Senza il
// cookie di sessione qualunque pagina dell'app rimanda al login; con il cookie, il login rimanda all'agenda.
// Controlla solo la PRESENZA del cookie: la validità del JWT la verifica il Backend a ogni chiamata (e un
// 401 riporta al login da `lib/api.ts`). Non decodifica né si fida del contenuto del token.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/agenda";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export default proxy;

export const config = {
  // WHY: escluse le risorse statiche e le API interne: il cancello serve alle pagine, non ai file.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\..*).*)"],
};
