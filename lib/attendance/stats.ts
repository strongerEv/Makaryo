import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AttendanceStatus } from "@/lib/types/database";
import { currentMonth, monthRange } from "@/lib/utils/period";

export type AttendanceStats = {
  totalMinutes: number;
  onTime: number;
  late: number;
  absent: number;
};

/** Rekap kehadiran satu host untuk satu bulan (YYYY-MM). */
export async function getMonthlyAttendanceStats(
  supabase: SupabaseClient,
  hostId: string,
  month = currentMonth(),
): Promise<AttendanceStats> {
  const { start, end } = monthRange(month);

  const { data } = await supabase
    .from("attendances")
    .select("status, worked_minutes")
    .eq("host_id", hostId)
    .gte("work_date", start)
    .lte("work_date", end);

  const rows = (data ?? []) as { status: AttendanceStatus; worked_minutes: number }[];

  return {
    totalMinutes: rows.reduce((sum, row) => sum + (row.worked_minutes ?? 0), 0),
    onTime: rows.filter((row) => row.status === "on_time").length,
    late: rows.filter((row) => row.status === "late").length,
    absent: rows.filter((row) => row.status === "absent").length,
  };
}

/** Total omzet satu host untuk satu bulan. */
export async function getMonthlyRevenueTotal(
  supabase: SupabaseClient,
  hostId: string,
  month = currentMonth(),
) {
  const { start, end } = monthRange(month);

  const { data } = await supabase
    .from("revenue_reports")
    .select("amount")
    .eq("host_id", hostId)
    .gte("work_date", start)
    .lte("work_date", end);

  return (data ?? []).reduce((sum, row) => sum + Number((row as { amount: number }).amount ?? 0), 0);
}
