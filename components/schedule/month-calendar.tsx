"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { monthRange, eachDate, weekdayIndex, WEEKDAY_LABELS } from "@/lib/utils/period";
import { todayInJakarta } from "@/lib/utils/datetime";

export type CalendarItem = {
  id: string;
  label: string;
  tone?: string;
  muted?: boolean;
};

const TONES: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  coral: "bg-coral-soft text-[#c73f35]",
  amber: "bg-amber-soft text-[#9a6a12]",
  emerald: "bg-emerald-soft text-[#1f8a51]",
  sky: "bg-sky-soft text-[#1c6fa8]",
};

/** Petak kalender satu bulan. Dipakai host (lihat jadwal) dan admin (kelola jadwal). */
export function MonthCalendar({
  month,
  items,
  hrefByDate,
  selectedDate,
  emptyLabel = "Libur",
  onSelectItem,
}: {
  month: string;
  items: Record<string, CalendarItem[]>;
  /** Tautan per tanggal. Peta, bukan fungsi, supaya aman dilewatkan dari server. */
  hrefByDate?: Record<string, string>;
  selectedDate?: string;
  emptyLabel?: string;
  /** Diisi admin: mengklik satu entri membuka editornya. */
  onSelectItem?: (itemId: string) => void;
}) {
  const { start, end } = monthRange(month);
  const dates = eachDate(start, end);
  const leadingBlanks = weekdayIndex(start);
  const today = todayInJakarta();

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-muted">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <span key={`blank-${index}`} />
        ))}

        {dates.map((date) => {
          const dayItems = items[date] ?? [];
          const isToday = date === today;
          const isSelected = date === selectedDate;

          const href = hrefByDate?.[date];
          const terlihat = onSelectItem ? dayItems : dayItems.slice(0, 3);
          const sisa = dayItems.length - terlihat.length;

          const nomor = (
            <span
              className={cn(
                "tabular inline-flex size-6 items-center justify-center rounded-full text-[12px] font-bold",
                isToday ? "bg-primary text-white" : "text-ink",
              )}
            >
              {Number(date.slice(8, 10))}
            </span>
          );

          return (
            <div
              key={date}
              className={cn(
                "relative flex min-h-[74px] w-full flex-col gap-1 rounded-[14px] border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2",
                isSelected ? "border-primary bg-primary-soft" : "border-line bg-surface",
                href && "hover:border-primary/40",
              )}
            >
              {/* Seluruh sel tetap bisa diklik untuk memilih hari; entri jadwal
                  berada di lapisan atasnya agar kliknya membuka editor. */}
              {href ? (
                <Link href={href} className="absolute inset-0 rounded-[14px]" aria-label={`Pilih ${date}`} />
              ) : null}

              <span className="relative pointer-events-none">{nomor}</span>

              <span className="pointer-events-none relative flex flex-1 flex-col gap-1 overflow-hidden">
                {dayItems.length === 0 ? (
                  <span className="text-[10px] font-medium text-ink-muted/70">{emptyLabel}</span>
                ) : (
                  terlihat.map((item) => {
                    const gaya = cn(
                      "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold sm:text-[11px]",
                      TONES[item.tone ?? "primary"] ?? TONES.primary,
                      item.muted && "opacity-60",
                    );

                    return onSelectItem ? (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem(item.id)}
                        className={cn(gaya, "pointer-events-auto transition-shadow hover:ring-2 hover:ring-primary/40")}
                        title={`Ubah ${item.label}`}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span key={item.id} className={gaya}>
                        {item.label}
                      </span>
                    );
                  })
                )}
                {sisa > 0 ? (
                  <span className="text-[10px] font-semibold text-ink-muted">+{sisa} lagi</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
