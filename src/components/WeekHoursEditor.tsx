"use client";

// [INTENT]: Editor della settimana (7 righe: attivo + inizio + fine), usato sia per gli orari del salone sia
// per quelli dell'operatore. Emette campi `d{giorno}_on`, `d{giorno}_start`, `d{giorno}_end` che le Server
// Action leggono con `parseWeek` (lib/week.ts). I campi orario sono disabilitati quando il giorno è spento,
// così l'utente vede subito cosa conta e cosa no; i valori restano nel DOM, quindi riaccendere il giorno
// ripropone gli orari di prima.

import { useState } from "react";
import { DAY_LABEL } from "@/lib/format";
import { Input } from "./ui";

export type WeekRow = { on: boolean; start: string; end: string };

export function WeekHoursEditor({ initial, onLabel = "Aperto" }: { initial: WeekRow[]; onLabel?: string }) {
  const [on, setOn] = useState(initial.map((r) => r.on));
  return (
    <div className="flex flex-col gap-2">
      {initial.map((row, d) => (
        <div key={d} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[8rem_7rem_1fr_1fr]">
          <span className="text-sm font-medium">{DAY_LABEL[d]}</span>
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              name={`d${d}_on`}
              checked={on[d]}
              onChange={(e) => setOn(on.map((v, i) => (i === d ? e.target.checked : v)))}
              className="accent-blue-600"
            />
            {onLabel}
          </label>
          <Input type="time" name={`d${d}_start`} defaultValue={row.start} disabled={!on[d]} aria-label={`${DAY_LABEL[d]} inizio`} />
          <Input type="time" name={`d${d}_end`} defaultValue={row.end} disabled={!on[d]} aria-label={`${DAY_LABEL[d]} fine`} />
        </div>
      ))}
    </div>
  );
}
