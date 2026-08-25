import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Clock3, Inbox, ScanFace, UserCheck, Users, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AttendanceRateChart, type AttendancePoint } from "@/components/charts/attendance-rate-chart";
import { RevenueTrendChart, type RevenuePoint } from "@/components/charts/revenue-trend-chart";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, AttendanceStatus, Profile, Shift } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { formatClock, formatDate, formatTime, greeting, todayInJakarta } from "@/lib/utils/datetime";
import { addDays, eachDate } from "@/lib/utils/period";

export const metadata: Metadata = { title: "Dashboard" };

type AssignmentRow = {
  id: string;
  host_id: string;
  shift_id: string;
  profiles: Pick<Profile, "full_name"> | null;
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const today = todayInJakarta();
  const weekStartDate = addDays(today, -6);

  const [
    { data: shiftRows },
    { data: assignmentRows },
    { data: attendanceRows },
    { data: todayRevenue },
    { count: pendingLeaves },
    { count: pendingUsers },
    { count: draftAssignments },
    { count: activeHosts },
    { data: weekRevenue },
    { data: weekAttendance },
  ] = await Promise.all([
    supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("schedule_assignments")
      .select("id, host_id, shift_id, profiles!schedule_assignments_host_id_fkey(full_name)")
      .eq("work_date", today)
      .eq("status", "published"),
    supabase.from("attendances").select("*").eq("work_date", today),
    supabase.from("revenue_reports").select("amount").eq("work_date", today),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
    supabase.from("schedule_assignments").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "host")
      .eq("account_status", "active")
      .eq("employment_status", "active"),
    supabase
      .from("revenue_reports")
      .select("work_date, amount")
      .gte("work_date", weekStartDate)
      .lte("work_date", today),
    supabase
      .from("attendances")
      .select("work_date, status")
      .gte("work_date", weekStartDate)
      .lte("work_date", today),
  ]);

  const shifts = (shiftRows ?? []) as Shift[];
  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[];
  const attendances = (attendanceRows ?? []) as Attendance[];

  const clockedIn = attendances.filter((row) => row.clock_in_at).length;
  const revenueToday = (todayRevenue ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const revenuePerDay = new Map<string, number>();
  (weekRevenue ?? []).forEach((row) => {
    const date = row.work_date as string;
    revenuePerDay.set(date, (revenuePerDay.get(date) ?? 0) + Number(row.amount ?? 0));
  });

  const attendancePerDay = new Map<string, { onTime: number; total: number }>();
  (weekAttendance ?? []).forEach((row) => {
    const date = row.work_date as string;
    const entry = attendancePerDay.get(date) ?? { onTime: 0, total: 0 };
    entry.total += 1;
    if ((row.status as AttendanceStatus) === "on_time") entry.onTime += 1;
    attendancePerDay.set(date, entry);
  });

  const weekDates = eachDate(weekStartDate, today);
  const dayLabel = (date: string) =>
    new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T00:00:00Z`));

  const revenueChart: RevenuePoint[] = weekDates.map((date) => ({
    label: dayLabel(date),
    amount: revenuePerDay.get(date) ?? 0,
  }));

  const attendanceChart: AttendancePoint[] = weekDates.map((date) => {
    const entry = attendancePerDay.get(date) ?? { onTime: 0, total: 0 };
    return {
      label: dayLabel(date),
      rate: entry.total > 0 ? Math.round((entry.onTime / entry.total) * 100) : 0,
      onTime: entry.onTime,
      total: entry.total,
    };
  });

  const actionItems = [
    {
      count: pendingUsers ?? 0,
      label: "pendaftar menunggu verifikasi",
      href: "/admin/pengguna?status=pending",
      icon: Users,
    },
    {
      count: pendingLeaves ?? 0,
      label: "pengajuan izin menunggu approval",
      href: "/admin/approval",
      icon: Inbox,
    },
    {
      count: draftAssignments ?? 0,
      label: "penugasan draft belum dipublish",
      href: "/admin/jadwal",
      icon: CalendarClock,
    },
  ].filter((item) => item.count > 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${admin.full_name.split(" ")[0]}`}
        description={formatDate(today)}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Sedang / sudah shift"
          value={`${clockedIn}/${assignments.length}`}
          icon={UserCheck}
          tone="emerald"
          hint="Sudah clock in hari ini"
        />
        <StatCard label="Host aktif" value={activeHosts ?? 0} icon={Users} tone="primary" />
        <StatCard
          label="Telat hari ini"
          value={attendances.filter((row) => row.status === "late").length}
          icon={Clock3}
          tone="amber"
        />
        <StatCard label="Omzet hari ini" value={formatCurrency(revenueToday)} icon={Wallet} tone="sky" />
      </div>

      {actionItems.length > 0 ? (
        <Card className="mb-4 border-amber/40 bg-amber-soft">
          <CardHeader className="mb-3" title="Perlu tindakan" />
          <ul className="space-y-2">
            {actionItems.map(({ count, label, href, icon: Icon }) => (
              <li key={href} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                  <Icon className="size-4 text-[#9a6a12]" aria-hidden />
                  {count} {label}
                </span>
                <ButtonLink href={href} size="sm" variant="soft">
                  Tinjau
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Tren omzet 7 hari terakhir" description="Total omzet seluruh host per hari." />
          <RevenueTrendChart data={revenueChart} />
        </Card>

        <Card>
          <CardHeader
            title="Kedisiplinan 7 hari terakhir"
            description="Persentase absensi yang tercatat tepat waktu."
          />
          <AttendanceRateChart data={attendanceChart} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Shift hari ini"
            description="Perbandingan host terjadwal dengan kebutuhan minimum."
            action={
              <Link href="/admin/jadwal" className="text-[13px] font-semibold text-primary hover:underline">
                Kelola
              </Link>
            }
          />
          {shifts.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">Belum ada shift aktif.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shifts.map((shift) => {
                const assigned = assignments.filter((row) => row.shift_id === shift.id);
                return (
                  <li key={shift.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{shift.name}</p>
                      <p className="tabular text-[12px] text-ink-muted">
                        {formatClock(shift.start_time)} – {formatClock(shift.end_time)}
                        {assigned.length > 0
                          ? ` · ${assigned.map((row) => row.profiles?.full_name?.split(" ")[0] ?? "?").join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={assigned.length < shift.min_hosts ? "danger" : "success"}>
                      {assigned.length}/{shift.min_hosts}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Kehadiran hari ini"
            description="Status real-time host yang sudah mencatat absensi."
            action={
              <Link href="/admin/absensi" className="text-[13px] font-semibold text-primary hover:underline">
                Lihat semua
              </Link>
            }
          />
          {attendances.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-center text-[13px] text-ink-muted">
              <ScanFace className="size-4" aria-hidden />
              Belum ada yang clock in hari ini.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {attendances.slice(0, 6).map((row) => {
                const assignment = assignments.find((item) => item.host_id === row.host_id);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {assignment?.profiles?.full_name ?? "Host"}
                      </p>
                      <p className="tabular text-[12px] text-ink-muted">
                        Masuk {formatTime(row.clock_in_at)}
                        {row.clock_out_at ? ` · pulang ${formatTime(row.clock_out_at)}` : ""}
                      </p>
                    </div>
                    <AttendanceStatusBadge status={row.status} lateMinutes={row.late_minutes} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
