"use client";

import { useMemo, useState } from "react";

import {
  DayPreviewSheet,
  type DayPreviewEntry,
} from "@/components/schedule/day-preview-sheet";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";

/**
 * Kalender bulanan host dengan pratinjau sekali ketuk.
 *
 * Halaman jadwal host adalah server component, sedangkan pratinjau butuh state
 * di sisi klien — pembungkus tipis ini yang menjembatani keduanya.
 */
export function MonthView({
  month,
  items,
  entriesByDate,
}: {
  month: string;
  items: Record<string, CalendarItem[]>;
  entriesByDate: Record<string, DayPreviewEntry[]>;
}) {
  const [tanggal, setTanggal] = useState<string | null>(null);

  const entri = useMemo(() => (tanggal ? (entriesByDate[tanggal] ?? []) : []), [tanggal, entriesByDate]);

  return (
    <>
      <MonthCalendar month={month} items={items} onSelectDate={setTanggal} />

      <DayPreviewSheet
        date={tanggal}
        open={tanggal !== null}
        onClose={() => setTanggal(null)}
        entries={entri}
      />
    </>
  );
}
