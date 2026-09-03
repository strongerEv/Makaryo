import { CalendarOff, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Shift } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatClock, formatDateShort, todayInJakarta } from "@/lib/utils/datetime";

export type WeekAssignment = {
  id: string;
  hostId: string;
  hostName: string;
  shiftId: string;
  workDate: string;
  status: "draft" | "published" | "cancelled";
};

export type WeekLeave = {
  hostId: string;
  hostName: string;
  date: string;
  type: "weekly_off" | "urgent";
};

export type WeekHost = {
  id: string;
  name: string;
};

const DOT: Record<string, string> = {
  primary: "bg-primary",
  coral: "bg-coral",
  amber: "bg-amber",
  emerald: "bg-emerald",
  sky: "bg-sky",
};

/**
 * Papan mingguan: tiap hari menampilkan seluruh shift beserta host yang bertugas,
 * lalu siapa saja yang libur pada hari itu — dipisah antara izin yang disetujui
 * dan yang memang tidak dijadwalkan.
 */
export function WeekBoard({
  dates,
  shifts,
  assignments,
  leaves,
  hosts,
  hrefFor,
  selectedDate,
}: {
  dates: string[];
  shifts: Shift[];
  assignments: WeekAssignment[];
  leaves: WeekLeave[];
  hosts: WeekHost[];
  hrefFor?: (date: string) => string;
  selectedDate?: string;
}) {
  const today = todayInJakarta();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {dates.map((date) => {
        const harian = assignments.filter((item) => item.workDate === date);
        const izin = leaves.filter((item) => item.date === date);
        const bertugas = new Set(harian.map((item) => item.hostId));
        const izinIds = new Set(izin.map((item) => item.hostId));
        const tanpaJadwal = hosts.filter((host) => !bertugas.has(host.id) && !izinIds.has(host.id));

        const isToday = date === today;
        const isSelected = date === selectedDate;

        const konten = (
          <div
            className={cn(
              "flex h-full flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-4 transition-colors",
              isSelected ? "border-primary" : "border-line",
              hrefFor && "hover:border-primary/50",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn("text-sm font-bold", isToday ? "text-primary" : "text-ink")}>
                {new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long" }).format(
                  new Date(`${date}T00:00:00Z`),
                )}
              </p>
              <span className="tabular text-[12px] text-ink-muted">{formatDateShort(date)}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {shifts.map((shift) => {
                const isi = harian.filter((item) => item.shiftId === shift.id);
                const kurang = isi.length < shift.min_hosts;

                return (
                  <div key={shift.id} className="rounded-[var(--radius-md)] bg-surface-muted px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={cn("size-2 shrink-0 rounded-full", DOT[shift.color] ?? DOT.primary)} aria-hidden />
                        <span className="truncate text-[12px] font-bold text-ink">{shift.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-[11px] font-semibold text-ink-muted">
                        {formatClock(shift.start_time)}–{formatClock(shift.end_time)}
                      </span>
                    </div>

                    {isi.length === 0 ? (
                      <p className={cn("mt-1.5 text-[11px] font-semibold", kurang ? "text-coral" : "text-ink-muted")}>
                        Belum ada host
                      </p>
                    ) : (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {isi.map((item) => (
                          <li
                            key={item.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              item.status === "published"
                                ? "bg-primary-soft text-primary"
                                : "bg-surface text-ink-muted",
                            )}
                            title={item.status === "published" ? "Terpublish" : "Masih draft"}
                          >
                            <UserRound className="size-3" aria-hidden />
                            {item.hostName.split(" ")[0]}
                          </li>
                        ))}
                        {kurang ? (
                          <li className="inline-flex items-center rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral">
                            kurang {shift.min_hosts - isi.length}
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line pt-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-muted">
                <CalendarOff className="size-3.5" aria-hidden />
                Libur hari ini
              </p>

              {izin.length === 0 && tanpaJadwal.length === 0 ? (
                <p className="text-[11px] text-ink-muted">Semua host bertugas.</p>
              ) : (
                <ul className="flex flex-wrap gap-1">
                  {izin.map((item) => (
                    <li key={`${item.hostId}-izin`}>
                      <Badge tone="warning" className="text-[11px]">
                        {item.hostName.split(" ")[0]} · {item.type === "urgent" ? "izin" : "libur"}
                      </Badge>
                    </li>
                  ))}
                  {tanpaJadwal.map((host) => (
                    <li
                      key={`${host.id}-kosong`}
                      className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                    >
                      {host.name.split(" ")[0]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

        return hrefFor ? (
          <a key={date} href={hrefFor(date)} className="block h-full">
            {konten}
          </a>
        ) : (
          <div key={date}>{konten}</div>
        );
      })}
    </div>
  );
}
