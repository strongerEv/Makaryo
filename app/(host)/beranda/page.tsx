import type { Metadata } from "next";
import { CalendarDays, ClipboardList, Clock3, LogIn, ScanFace, Wallet } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ModuleCard } from "@/components/ui/module-card";
import { StatCard } from "@/components/ui/stat-card";
import { formatDuration } from "@/lib/attendance/status";
import { getMonthlyAttendanceStats, getMonthlyRevenueTotal } from "@/lib/attendance/stats";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Shift } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { formatClock, formatTime, greeting, todayInJakarta } from "@/lib/utils/datetime";

export const metadata: Metadata = { title: "Beranda" };

type TodayAssignment = {
  id: string;
  shifts: Pick<Shift, "id" | "name" | "start_time" | "end_time"> | null;
};

export default async function HostHomePage() {
  const profile = await requireHost();
  const supabase = await createClient();
  const workDate = todayInJakarta();

  const [{ data: assignmentRows }, { data: attendanceRows }, stats, revenueTotal] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, shifts(id, name, start_time, end_time)")
      .eq("host_id", profile.id)
      .eq("work_date", workDate)
      .eq("status", "published"),
    supabase.from("attendances").select("*").eq("host_id", profile.id).eq("work_date", workDate),
    getMonthlyAttendanceStats(supabase, profile.id),
    getMonthlyRevenueTotal(supabase, profile.id),
  ]);

  const assignments = (assignmentRows ?? []) as unknown as TodayAssignment[];
  const attendances = (attendanceRows ?? []) as Attendance[];
  const nextShift = assignments[0] ?? null;
  const todayAttendance = attendances.find((item) => item.assignment_id === nextShift?.id) ?? attendances[0] ?? null;

  return (
    <>
      <header className="mb-5">
        <p className="text-[13px] font-medium text-ink-muted">{greeting()},</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{profile.full_name}!</h1>
      </header>

      <Card className="mb-4 border-transparent bg-primary text-white shadow-[var(--shadow-float)]">
        <p className="text-[12px] font-semibold text-white/80">Shift kamu hari ini</p>

        {nextShift ? (
          <>
            <p className="mt-1 text-lg font-bold">{nextShift.shifts?.name}</p>
            <p className="tabular mt-0.5 text-[13px] text-white/80">
              {formatClock(nextShift.shifts?.start_time)} – {formatClock(nextShift.shifts?.end_time)} WIB
            </p>

            {todayAttendance ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-white/15 px-3.5 py-2.5">
                <AttendanceStatusBadge
                  status={todayAttendance.status}
                  lateMinutes={todayAttendance.late_minutes}
                />
                <span className="tabular text-[12px] font-semibold text-white/90">
                  Masuk {formatTime(todayAttendance.clock_in_at)}
                  {todayAttendance.clock_out_at ? ` · pulang ${formatTime(todayAttendance.clock_out_at)}` : ""}
                </span>
              </div>
            ) : (
              <ButtonLink href="/absen" variant="soft" size="lg" block className="mt-4 bg-white text-primary shadow-none">
                <LogIn className="size-4" aria-hidden />
                Clock in sekarang
              </ButtonLink>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-lg font-bold">Tidak ada shift hari ini</p>
            <p className="mt-1 text-[13px] text-white/80">
              Nikmati liburmu. Jadwal berikutnya bisa dilihat di menu Jadwal.
            </p>
          </>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jam kerja bulan ini" value={formatDuration(stats.totalMinutes)} icon={Clock3} tone="primary" />
        <StatCard label="Tepat waktu" value={stats.onTime} icon={ScanFace} tone="emerald" />
        <StatCard label="Telat" value={stats.late} icon={Clock3} tone="amber" />
        <StatCard label="Omzet bulan ini" value={formatCurrency(revenueTotal)} icon={Wallet} tone="sky" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ModuleCard href="/absen" title="Absen" description="Clock in & clock out" icon={ScanFace} tone="primary" />
        <ModuleCard href="/jadwal" title="Jadwal" description="Lihat shift kamu" icon={CalendarDays} tone="coral" />
        <ModuleCard href="/omzet" title="Omzet" description="Lapor hasil shift" icon={Wallet} tone="amber" />
        <ModuleCard href="/pengajuan" title="Pengajuan" description="Izin & libur" icon={ClipboardList} tone="emerald" />
      </div>

      {assignments.length > 1 ? (
        <Card>
          <CardHeader title="Shift lain hari ini" />
          <ul className="divide-y divide-line">
            {assignments.slice(1).map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-semibold text-ink">{assignment.shifts?.name}</span>
                <span className="tabular text-[13px] font-semibold text-ink-muted">
                  {formatClock(assignment.shifts?.start_time)} – {formatClock(assignment.shifts?.end_time)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
