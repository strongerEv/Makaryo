import type { Metadata } from "next";
import { AlertTriangle, CalendarCheck, CalendarClock, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";
import { MonthNav } from "@/components/schedule/month-nav";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SchedulePeriod, Shift } from "@/lib/types/database";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { currentMonth, monthRange } from "@/lib/utils/period";
import { DayEditor } from "./day-editor";
import { ScheduleToolbar } from "./schedule-toolbar";

export const metadata: Metadata = { title: "Jadwal" };

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

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tanggal?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const month = params.bulan ?? currentMonth();
  const { start, end } = monthRange(month);
  const today = todayInJakarta();
  const selectedDate = params.tanggal && params.tanggal >= start && params.tanggal <= end
    ? params.tanggal
    : today >= start && today <= end
      ? today
      : start;

  const supabase = await createClient();

  const [{ data: assignmentRows }, { data: shiftRows }, { data: hostRows }, { data: periodRow }] =
    await Promise.all([
      supabase
        .from("schedule_assignments")
        .select(
          "id, host_id, shift_id, work_date, status, source, profiles!schedule_assignments_host_id_fkey(id, full_name), shifts(id, name, start_time, end_time, color)",
        )
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date"),
      supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "host")
        .eq("account_status", "active")
        .eq("employment_status", "active")
        .order("full_name"),
      supabase
        .from("schedule_periods")
        .select("*")
        .eq("start_date", start)
        .eq("end_date", end)
        .maybeSingle(),
    ]);

  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[];
  const shifts = (shiftRows ?? []) as Shift[];
  const hosts = (hostRows ?? []) as Profile[];
  const period = periodRow as SchedulePeriod | null;

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CardHeader className="mb-0" title="Kalender bulanan" description="Klik tanggal untuk mengelola shift hari itu." />
            <MonthNav month={month} basePath="/admin/jadwal" extraParams={{ tanggal: selectedDate }} />
          </div>
          <MonthCalendar
            month={month}
            items={items}
            selectedDate={selectedDate}
            hrefFor={(date) => `/admin/jadwal?bulan=${month}&tanggal=${date}`}
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
    </>
  );
}
