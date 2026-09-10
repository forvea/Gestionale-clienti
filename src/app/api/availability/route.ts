// [INTENT]: Route Handler interno che inoltra al Backend la richiesta di disponibilità (con la causa di
// indisponibilità, canale admin). Esiste perché i form nel browser non parlano mai direttamente con
// l'API: il token resta nel cookie httpOnly e passa da qui. Un giorno solo per chiamata: è ciò che i
// form mostrano.

import { NextResponse, type NextRequest } from "next/server";
import { ApiError, api } from "@/lib/api";
import type { AvailabilityDay } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? "";
  try {
    const days = await api<AvailabilityDay[]>("/api/v1/admin/availability", {
      query: {
        serviceId: sp.get("serviceId"),
        staffId: sp.get("staffId"),
        dateFrom: date,
        dateTo: date,
        excludeBookingId: sp.get("excludeBookingId"),
      },
    });
    return NextResponse.json(days);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ message: err.message }, { status: err.status });
    throw err;
  }
}
