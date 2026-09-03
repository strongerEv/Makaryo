import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarX2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";
import { MonthNav } from "@/components/schedule/month-nav";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Shift } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatClock, formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { addDays, currentMonth, eachDate, monthRange, weekStart } from "@/lib/utils/period";
import { LiveSync } from "@/lib/realtime/live-sync";

export const metadata: Metadata = { title: "Jadwal" };

type Mode = "bulan" | "minggu" | "hari";

type AssignmentRow = {
  id: string;
  work_date: string;
  shifts: Pick<Shift, "id" | "name" | "start_time" | "end_time" | "color"> | null;
};

const MODES: { value: Mode; label: string }[] = [
  { value: "bulan", label: "Bulanan" },
  { value: "minggu", label: "Mingguan" },
  { value: "hari", label: "Harian" },
];

export default async function HostSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; mode?: Mode; tanggal?: string }>;
}) {
  const profile = await requireHost();
  const params = await searchParams;
  const month = params.bulan ?? currentMonth();
  const mode: Mode = params.mode ?? "bulan";
  const anchor = params.tanggal ?? todayInJakarta();

  const { start, end } = monthRange(month);
  const supabase = await createClient();

  const { data } = await supabase
    .from("schedule_assignments")
    .select("id, work_date, shifts(id, name, start_time, end_time, color)")
    .eq("host_id", profile.id)
    .eq("status", "published")
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date");

  const assignments = (data ?? []) as unknown as AssignmentRow[];

  const byDate: Record<string, CalendarItem[]> = {};
  assignments.forEach((row) => {
    const list = byDate[row.work_date] ?? (byDate[row.work_date] = []);
    list.push({
      id: row.id,
      label: row.shifts?.name ?? "Shift",
      tone: row.shifts?.color ?? "primary",
    });
  });

  const weekDates = eachDate(weekStart(anchor), addDays(weekStart(anchor), 6));
  const modeHref = (value: Mode) =>
    `/jadwal?bulan=${month}&mode=${value}&tanggal=${anchor}`;

  return (
    <>
      <LiveSync tables={["schedule_assignments", "leave_requests"]} />

      <PageHeader title="Jadwal saya" description="Shift yang sudah dipublish admin." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="tablist">
          {MODES.map((item) => (
            <Link
              key={item.value}
              href={modeHref(item.value)}
              role="tab"
              aria-selected={mode === item.value}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                mode === item.value ? "bg-primary text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <MonthNav month={month} basePath="/jadwal" extraParams={{ mode, tanggal: anchor }} />
      </div>

      {mode === "bulan" ? (
        <Card>
          <MonthCalendar month={month} items={byDate} />
          <p className="mt-4 text-[12px] text-ink-muted">
            Tanggal tanpa shift berarti kamu libur. Jadwal dapat berubah bila admin mem-publish revisi.
          </p>
        </Card>
      ) : null}

      {mode === "minggu" ? (
        <Card className="p-0">
          <div className="p-5">
            <CardHeader
              className="mb-0"
              title="Minggu ini"
              description={`${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`}
            />
          </div>
          <ul className="divide-y divide-line">
            {weekDates.map((date) => (
              <DayRow key={date} date={date} assignments={assignments.filter((row) => row.work_date === date)} />
            ))}
          </ul>
        </Card>
      ) : null}

      {mode === "hari" ? (
        <Card className="p-0">
          <div className="p-5">
            <CardHeader className="mb-0" title={formatDate(anchor)} description="Jadwal harianmu." />
          </div>
          <ul className="divide-y divide-line">
            <DayRow date={anchor} assignments={assignments.filter((row) => row.work_date === anchor)} />
          </ul>
        </Card>
      ) : null}

      {assignments.length === 0 ? (
        <Card className="mt-4 p-0">
          <EmptyState
            icon={CalendarX2}
            title="Belum ada jadwal terbit bulan ini"
            description="Jadwal akan muncul setelah admin mem-publish periode ini."
          />
        </Card>
      ) : null}
    </>
  );
}

function DayRow({ date, assignments }: { date: string; assignments: AssignmentRow[] }) {
  const isToday = date === todayInJakarta();

  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-28 shrink-0">
        <p className={cn("text-[13px] font-bold", isToday ? "text-primary" : "text-ink")}>
          {new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long" }).format(new Date(`${date}T00:00:00Z`))}
        </p>
        <p className="tabular text-[12px] text-ink-muted">{formatDate(date)}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {assignments.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-semibold text-ink-muted">
            <CalendarDays className="size-3.5" aria-hidden />
            Libur
          </span>
        ) : (
          assignments.map((row) => (
            <span
              key={row.id}
              className="tabular inline-flex items-center rounded-full bg-primary-soft px-3 py-1.5 text-[12px] font-semibold text-primary"
            >
              {row.shifts?.name} · {formatClock(row.shifts?.start_time)}–{formatClock(row.shifts?.end_time)}
            </span>
          ))
        )}
      </div>
    </li>
  );
}
