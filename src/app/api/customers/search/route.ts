// [INTENT]: Ricerca clienti per il completamento automatico nei form (nome, telefono o email, parziale).
// Inoltra a GET /admin/customers?q= restituendo poche righe: serve a scegliere, non a sfogliare.

import { NextResponse, type NextRequest } from "next/server";
import { ApiError, api } from "@/lib/api";
import type { Customer, PagedResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  try {
    const page = await api<PagedResponse<Customer>>("/api/v1/admin/customers", { query: { q, pageSize: 8 } });
    return NextResponse.json(page.items);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ message: err.message }, { status: err.status });
    throw err;
  }
}
