import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarClock, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";
import { MonthNav } from "@/components/schedule/month-nav";
import { WeekBoard, type WeekAssignment, type WeekLeave } from "@/components/schedule/week-board";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { LeaveType, Profile, SchedulePeriod, Shift } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { addDays, currentMonth, eachDate, monthRange, weekStart } from "@/lib/utils/period";
import { DayEditor } from "./day-editor";
import { ScheduleToolbar } from "./schedule-toolbar";

export const metadata: Metadata = { title: "Jadwal" };

type Tampilan = "bulan" | "minggu";

type AssignmentRow = {
  id: string;
  host_id: string;
  shift_id: string;
  work_date: string;
  status: "draft" | "published" | "cancelled";
  source: "auto" | "manual";
  profiles: Pick<Profile, "id" | "full_name"> | null;
  shifts: Pick<Shift, "id" | "name" | "start_time" | "end_time" | "color"> | null;
};

const TAMPILAN: { value: Tampilan; label: string }[] = [
  { value: "bulan", label: "Bulanan" },
  { value: "minggu", label: "Mingguan" },
];

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tanggal?: string; tampilan?: Tampilan }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const tampilan: Tampilan = params.tampilan === "minggu" ? "minggu" : "bulan";
  const month = params.bulan ?? currentMonth();
  const { start: monthStart, end: monthEnd } = monthRange(month);
  const today = todayInJakarta();

  const selectedDate =
    params.tanggal && params.tanggal >= monthStart && params.tanggal <= monthEnd
      ? params.tanggal
      : today >= monthStart && today <= monthEnd
        ? today
        : monthStart;

  // Tampilan mingguan boleh melewati batas bulan, jadi rentang datanya mengikuti tampilan.
  const weekDates = eachDate(weekStart(selectedDate), addDays(weekStart(selectedDate), 6));
  const rangeStart = tampilan === "minggu" ? weekDates[0] : monthStart;
  const rangeEnd = tampilan === "minggu" ? weekDates[6] : monthEnd;

  const supabase = await createClient();

  const [
    { data: assignmentRows },
    { data: shiftRows },
    { data: hostRows },
    { data: periodRow },
    { data: leaveRows },
  ] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select(
        "id, host_id, shift_id, work_date, status, source, profiles!schedule_assignments_host_id_fkey(id, full_name), shifts(id, name, start_time, end_time, color)",
      )
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd)
      .order("work_date"),
    supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "host")
      .eq("account_status", "active")
      .eq("employment_status", "active")
      .order("full_name"),
    supabase.from("schedule_periods").select("*").eq("start_date", monthStart).eq("end_date", monthEnd).maybeSingle(),
    supabase
      .from("leave_requests")
      .select("host_id, requested_date, type, profiles!leave_requests_host_id_fkey(full_name)")
      .eq("status", "approved")
      .gte("requested_date", rangeStart)
      .lte("requested_date", rangeEnd),
  ]);

  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[];
  const shifts = (shiftRows ?? []) as Shift[];
  const hosts = (hostRows ?? []) as Profile[];
  const period = periodRow as SchedulePeriod | null;

  const leaves: WeekLeave[] = (leaveRows ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    return {
      hostId: row.host_id as string,
      hostName: profile?.full_name ?? "Host",
      date: row.requested_date as string,
      type: row.type as LeaveType,
    };
  });

  const draftCount = assignments.filter((row) => row.status === "draft").length;
  const publishedCount = assignments.filter((row) => row.status === "published").length;

  const items: Record<string, CalendarItem[]> = {};
  assignments.forEach((row) => {
    const list = items[row.work_date] ?? (items[row.work_date] = []);
    list.push({
      id: row.id,
      label: `${row.shifts?.name ?? "Shift"} · ${row.profiles?.full_name?.split(" ")[0] ?? "?"}`,
      tone: row.shifts?.color ?? "primary",
      muted: row.status === "draft",
    });
  });

  const warnings = period?.warnings ?? [];
  const dayAssignments = assignments.filter((row) => row.work_date === selectedDate);

  const weekAssignments: WeekAssignment[] = assignments.map((row) => ({
    id: row.id,
    hostId: row.host_id,
    hostName: row.profiles?.full_name ?? "Host",
    shiftId: row.shift_id,
    workDate: row.work_date,
    status: row.status,
  }));

  const hrefFor = (target: { tampilan?: Tampilan; tanggal?: string; bulan?: string }) => {
    const query = new URLSearchParams({
      bulan: target.bulan ?? month,
      tanggal: target.tanggal ?? selectedDate,
      tampilan: target.tampilan ?? tampilan,
    });
    return `/admin/jadwal?${query.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Jadwal"
        description="Susun jadwal seluruh host, lalu publish agar terlihat oleh mereka."
        action={<ScheduleToolbar month={month} draftCount={draftCount} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Terpublish" value={publishedCount} icon={CalendarCheck} tone="emerald" />
        <StatCard label="Masih draft" value={draftCount} icon={CalendarClock} tone="amber" />
        <StatCard label="Host aktif" value={hosts.length} icon={Users} tone="primary" />
        <StatCard
          label="Shift kurang host"
          value={warnings.length}
          icon={AlertTriangle}
          tone={warnings.length > 0 ? "coral" : "neutral"}
        />
      </div>

      {warnings.length > 0 ? (
        <Alert tone="warning" className="mb-4">
          <span className="font-semibold">{warnings.length} shift belum memenuhi jumlah host minimum.</span>{" "}
          Contoh: {warnings.slice(0, 3).map((item) => `${item.shift_name} ${formatDate(item.work_date)} (${item.assigned}/${item.required})`).join(", ")}
          {warnings.length > 3 ? ", dan lainnya." : "."}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="tablist">
          {TAMPILAN.map((item) => (
            <Link
              key={item.value}
              href={hrefFor({ tampilan: item.value })}
              role="tab"
              aria-selected={tampilan === item.value}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                tampilan === item.value ? "bg-primary text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {tampilan === "bulan" ? (
          <MonthNav month={month} basePath="/admin/jadwal" extraParams={{ tanggal: selectedDate, tampilan }} />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={hrefFor({ tanggal: addDays(weekDates[0], -7) })}
              aria-label="Minggu sebelumnya"
              className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            <span className="min-w-[180px] text-center text-sm font-bold text-ink">
              {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
            </span>
            <Link
              href={hrefFor({ tanggal: addDays(weekDates[0], 7) })}
              aria-label="Minggu berikutnya"
              className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {tampilan === "minggu" ? (
        <div className="space-y-4">
          <WeekBoard
            dates={weekDates}
            shifts={shifts}
            assignments={weekAssignments}
            leaves={leaves}
            hosts={hosts.map((host) => ({ id: host.id, name: host.full_name }))}
            selectedDate={selectedDate}
            hrefFor={(date) => hrefFor({ tanggal: date })}
          />

          <DayEditor
            date={selectedDate}
            shifts={shifts}
            hosts={hosts}
            assignments={dayAssignments.map((row) => ({
              id: row.id,
              hostId: row.host_id,
              hostName: row.profiles?.full_name ?? "Host",
              shiftId: row.shift_id,
              status: row.status,
              source: row.source,
            }))}
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              title="Kalender bulanan"
              description="Klik tanggal untuk mengelola shift hari itu."
            />
            <MonthCalendar
              month={month}
              items={items}
              selectedDate={selectedDate}
              hrefFor={(date) => hrefFor({ tanggal: date })}
              emptyLabel="Kosong"
            />
            <p className="mt-4 text-[12px] text-ink-muted">
              Kartu pudar berarti masih draft dan belum terlihat host.
            </p>
          </Card>

          <DayEditor
            date={selectedDate}
            shifts={shifts}
            hosts={hosts}
            assignments={dayAssignments.map((row) => ({
              id: row.id,
              hostId: row.host_id,
              hostName: row.profiles?.full_name ?? "Host",
              shiftId: row.shift_id,
              status: row.status,
              source: row.source,
            }))}
          />
        </div>
      )}
    </>
  );
}
