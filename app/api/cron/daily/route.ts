import { NextResponse, type NextRequest } from "next/server";

import { workedMinutesBetween } from "@/lib/attendance/status";
import { shiftEndInstant } from "@/lib/attendance/time";
import { isAuthorizedCron } from "@/lib/cron/auth";
import {
  createAdminClient,
  isServiceRoleConfigured,
  SERVICE_ROLE_MISSING_MESSAGE,
} from "@/lib/supabase/admin";
import type { Shift } from "@/lib/types/database";
import { todayInJakarta } from "@/lib/utils/datetime";
import { addDays } from "@/lib/utils/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Jeda sebelum shift yang lupa di-clock out ditutup otomatis. */
const AUTO_CLOSE_GRACE_MINUTES = 120;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 500 });
  }

  const admin = createAdminClient();
  const today = todayInJakarta();
  const since = addDays(today, -3);
  const now = Date.now();

  // 1. Tutup otomatis absensi yang lupa clock out.
  const { data: openAttendances } = await admin
    .from("attendances")
    .select("id, clock_in_at, work_date, schedule_assignments(shifts(start_time, end_time))")
    .is("clock_out_at", null)
    .not("clock_in_at", "is", null)
    .gte("work_date", since)
    .lte("work_date", today);

  let autoClosed = 0;

  for (const attendance of openAttendances ?? []) {
    const assignment = attendance.schedule_assignments as unknown as
      | { shifts: Pick<Shift, "start_time" | "end_time"> | null }
      | null;
    const shift = assignment?.shifts;
    if (!shift) continue;

    const endsAt = shiftEndInstant(attendance.work_date as string, shift.start_time, shift.end_time);
    if (now - endsAt.getTime() < AUTO_CLOSE_GRACE_MINUTES * 60_000) continue;

    await admin
      .from("attendances")
      .update({
        clock_out_at: endsAt.toISOString(),
        worked_minutes: workedMinutesBetween(attendance.clock_in_at as string, endsAt),
        auto_closed: true,
        note: "Clock out otomatis di jam berakhirnya shift karena host tidak clock out.",
      })
      .eq("id", attendance.id as string);

    autoClosed += 1;
  }

  // 2. Tandai tidak absen untuk jadwal terpublish yang terlewat tanpa clock in.
  const { data: pastAssignments } = await admin
    .from("schedule_assignments")
    .select("id, host_id, work_date, shifts(start_time, end_time)")
    .eq("status", "published")
    .gte("work_date", since)
    .lte("work_date", today);

  const { data: existing } = await admin
    .from("attendances")
    .select("assignment_id")
    .gte("work_date", since)
    .lte("work_date", today);

  const recorded = new Set((existing ?? []).map((row) => row.assignment_id as string).filter(Boolean));
  const absentRows: Record<string, unknown>[] = [];

  for (const assignment of pastAssignments ?? []) {
    if (recorded.has(assignment.id as string)) continue;

    const shift = assignment.shifts as unknown as Pick<Shift, "start_time" | "end_time"> | null;
    if (!shift) continue;

    const endsAt = shiftEndInstant(assignment.work_date as string, shift.start_time, shift.end_time);
    if (endsAt.getTime() > now) continue;

    absentRows.push({
      host_id: assignment.host_id as string,
      assignment_id: assignment.id as string,
      work_date: assignment.work_date as string,
      status: "absent",
      note: "Ditandai otomatis: tidak ada clock in sampai shift berakhir.",
    });
  }

  if (absentRows.length > 0) {
    await admin.from("attendances").insert(absentRows);
  }

  return NextResponse.json({ ok: true, autoClosed, markedAbsent: absentRows.length });
}
