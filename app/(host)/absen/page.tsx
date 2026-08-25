import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Shift } from "@/lib/types/database";
import { todayInJakarta } from "@/lib/utils/datetime";
import { AttendancePanel, type TodayShift } from "./attendance-panel";

export const metadata: Metadata = { title: "Absen" };

export default async function AttendancePage() {
  const profile = await requireHost();
  const supabase = await createClient();
  const workDate = todayInJakarta();

  const [{ data: assignmentRows }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, work_date, shift_id, shifts(id, name, start_time, end_time)")
      .eq("host_id", profile.id)
      .eq("work_date", workDate)
      .eq("status", "published"),
    supabase.from("attendances").select("*").eq("host_id", profile.id).eq("work_date", workDate),
  ]);

  const attendances = (attendanceRows ?? []) as Attendance[];

  const shifts: TodayShift[] = (assignmentRows ?? []).map((row) => {
    const shift = row.shifts as unknown as Pick<Shift, "id" | "name" | "start_time" | "end_time">;
    const attendance = attendances.find((item) => item.assignment_id === row.id) ?? null;
    return {
      assignmentId: row.id as string,
      shiftName: shift?.name ?? "Shift",
      startTime: shift?.start_time ?? "",
      endTime: shift?.end_time ?? "",
      attendance,
    };
  });

  const unscheduled = attendances.find((item) => item.assignment_id === null) ?? null;

  return (
    <>
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

      <AttendancePanel shifts={shifts} unscheduled={unscheduled} />
    </>
  );
}
