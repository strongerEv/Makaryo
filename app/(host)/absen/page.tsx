import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";

import { DailySummaryCard, type MonthSummary } from "@/components/attendance/daily-summary-card";
import { PageHeader } from "@/components/layout/page-header";
import { toAttendanceDetail } from "@/lib/attendance/detail";
import { dailyMotivation } from "@/lib/attendance/motivation";
import { requireHost } from "@/lib/auth/session";
import { LiveSync } from "@/lib/realtime/live-sync";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Shift } from "@/lib/types/database";
import { greeting, todayInJakarta } from "@/lib/utils/datetime";
import { currentMonth, monthRange } from "@/lib/utils/period";
import { AttendancePanel, type TodayShift } from "./attendance-panel";

export const metadata: Metadata = { title: "Absen" };

export default async function AttendancePage() {
  const profile = await requireHost();
  const supabase = await createClient();
  const workDate = todayInJakarta();
  const { start: monthStart, end: monthEnd } = monthRange(currentMonth());

  const [
    { data: assignmentRows },
    { data: attendanceRows },
    { data: monthAttendanceRows },
    { count: scheduledCount },
  ] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, work_date, shift_id, shifts(id, name, start_time, end_time)")
      .eq("host_id", profile.id)
      .eq("work_date", workDate)
      .eq("status", "published"),
    supabase.from("attendances").select("*").eq("host_id", profile.id).eq("work_date", workDate),
    supabase
      .from("attendances")
      .select("work_date, status, worked_minutes")
      .eq("host_id", profile.id)
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd),
    supabase
      .from("schedule_assignments")
      .select("id", { count: "exact", head: true })
      .eq("host_id", profile.id)
      .eq("status", "published")
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd),
  ]);

  const attendances = (attendanceRows ?? []) as Attendance[];
  const photos = await signPhotoUrls(
    supabase,
    "attendance",
    attendances.flatMap((item) => [item.clock_in_photo, item.clock_out_photo]),
  );

  const shifts: TodayShift[] = (assignmentRows ?? []).map((row) => {
    const shift = row.shifts as unknown as Pick<Shift, "id" | "name" | "start_time" | "end_time">;
    const attendance = attendances.find((item) => item.assignment_id === row.id) ?? null;
    const shiftName = shift?.name ?? "Shift";
    const startTime = shift?.start_time ?? "";
    const endTime = shift?.end_time ?? "";

    return {
      assignmentId: row.id as string,
      shiftName,
      startTime,
      endTime,
      attendance,
      detail: attendance
        ? toAttendanceDetail({
            attendance,
            hostName: profile.full_name,
            shiftName,
            shiftStart: startTime,
            shiftEnd: endTime,
            photos,
          })
        : null,
    };
  });

  const unscheduled = attendances.find((item) => item.assignment_id === null) ?? null;

  const monthRows = (monthAttendanceRows ?? []) as Pick<
    Attendance,
    "work_date" | "status" | "worked_minutes"
  >[];

  const summary: MonthSummary = {
    presentDays: new Set(monthRows.map((row) => row.work_date)).size,
    scheduledDays: scheduledCount ?? 0,
    onTime: monthRows.filter((row) => row.status === "on_time").length,
    late: monthRows.filter((row) => row.status === "late").length,
    workedMinutes: monthRows.reduce((sum, row) => sum + row.worked_minutes, 0),
  };

  const belumSelesai = shifts.filter((shift) => !shift.attendance?.clock_out_at).length;
  const todayLabel =
    shifts.length === 0
      ? "Tidak ada jadwal untukmu hari ini."
      : belumSelesai === 0
        ? `Semua shift hari ini sudah selesai. Kerja bagus!`
        : `Kamu punya ${shifts.length} shift hari ini · ${belumSelesai} belum selesai.`;

  return (
    <>
      <LiveSync tables={["attendances", "schedule_assignments"]} />

      <PageHeader
        title="Absen"
        description="Ambil selfie saat mulai dan selesai shift. Lokasi tercatat otomatis."
        action={
          <Link
            href="/absen/riwayat"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            <History className="size-4" aria-hidden />
            Riwayat
          </Link>
        }
      />

      <DailySummaryCard
        greeting={greeting()}
        hostName={profile.full_name}
        workDate={workDate}
        motivation={dailyMotivation(workDate)}
        summary={summary}
        todayLabel={todayLabel}
      />

      <AttendancePanel
        shifts={shifts}
        unscheduled={unscheduled}
        unscheduledDetail={
          unscheduled
            ? toAttendanceDetail({ attendance: unscheduled, hostName: profile.full_name, photos })
            : null
        }
      />
    </>
  );
}
