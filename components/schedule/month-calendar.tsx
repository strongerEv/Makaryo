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
  hrefFor,
  selectedDate,
  emptyLabel = "Libur",
}: {
  month: string;
  items: Record<string, CalendarItem[]>;
  hrefFor?: (date: string) => string;
  selectedDate?: string;
  emptyLabel?: string;
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

          const content = (
            <span
              className={cn(
                "flex min-h-[74px] w-full flex-col gap-1 rounded-[14px] border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2",
                isSelected
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-surface hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "tabular inline-flex size-6 items-center justify-center rounded-full text-[12px] font-bold",
                  isToday ? "bg-primary text-white" : "text-ink",
                )}
              >
                {Number(date.slice(8, 10))}
              </span>

              <span className="flex flex-1 flex-col gap-1 overflow-hidden">
                {dayItems.length === 0 ? (
                  <span className="text-[10px] font-medium text-ink-muted/70">{emptyLabel}</span>
                ) : (
                  dayItems.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-[11px]",
                        TONES[item.tone ?? "primary"] ?? TONES.primary,
                        item.muted && "opacity-60",
                      )}
                    >
                      {item.label}
                    </span>
                  ))
                )}
                {dayItems.length > 3 ? (
                  <span className="text-[10px] font-semibold text-ink-muted">+{dayItems.length - 3} lagi</span>
                ) : null}
              </span>
            </span>
          );

          return hrefFor ? (
            <Link key={date} href={hrefFor(date)} className="block">
              {content}
            </Link>
          ) : (
            <div key={date}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
