"use client";

// [INTENT]: Editor di un elenco di pause ricorrenti (giorno, inizio, fine, etichetta), righe aggiungibili e
// rimovibili. Emette campi ripetuti `br_day`, `br_start`, `br_end`, `br_label` che la Server Action legge
// con `getAll` (lib/week.ts → parseBreaks). Le pause sono una griglia settimanale sostituita in blocco dal
// Backend (PUT): il form invia sempre l'elenco completo, e un elenco vuoto le rimuove tutte.

import { useState } from "react";
import { DAY_SHORT } from "@/lib/format";
import type { BreakItem } from "@/lib/types";
import { Button, Input, Select } from "./ui";

type Row = { key: number; dayOfWeek: number; startTime: string; endTime: string; label: string };

export function BreaksEditor({ initial }: { initial: BreakItem[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((b, i) => ({ key: i, dayOfWeek: b.dayOfWeek, startTime: b.startTime, endTime: b.endTime, label: b.label ?? "" })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  function add() {
    setRows([...rows, { key: nextKey, dayOfWeek: 1, startTime: "13:00", endTime: "14:00", label: "" }]);
    setNextKey(nextKey + 1);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && <p className="text-xs text-neutral-400">Nessuna pausa.</p>}
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[6rem_7rem_7rem_1fr_auto]">
          <Select name="br_day" defaultValue={String(r.dayOfWeek)} aria-label="Giorno">
            {DAY_SHORT.map((l, d) => (
              <option key={d} value={d}>
                {l}
              </option>
            ))}
          </Select>
          <Input type="time" name="br_start" defaultValue={r.startTime} required aria-label="Inizio pausa" />
          <Input type="time" name="br_end" defaultValue={r.endTime} required aria-label="Fine pausa" />
          <Input name="br_label" defaultValue={r.label} placeholder="Etichetta (es. Pranzo)" maxLength={100} aria-label="Etichetta" />
          <Button type="button" variant="ghost" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Rimuovi pausa">
            ✕
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="self-start">
        + Aggiungi pausa
      </Button>
    </div>
  );
}
