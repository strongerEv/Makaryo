import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatDuration } from "@/lib/attendance/status";
import { ATTENDANCE_STATUS_LABEL, type AttendanceStatus } from "@/lib/types/database";
import { formatDate, formatTime } from "@/lib/utils/datetime";
import { monthLabel, monthRange } from "@/lib/utils/period";

export type ReportFilter = {
  month: string;
  hostId: string | "all";
};

export type AttendanceReportRow = {
  hostId: string;
  date: string;
  hostName: string;
  clockIn: string;
  clockOut: string;
  /** Label siap tampil, mis. "Tepat waktu". */
  status: string;
  /** Nilai mentahnya, dipakai menghitung rekap — label bisa berubah kapan saja. */
  statusKey: AttendanceStatus;
  lateMinutes: number;
  duration: string;
  workedMinutes: number;
  note: string;
};

export type AttendanceTotals = {
  records: number;
  onTime: number;
  late: number;
  absent: number;
  lateMinutes: number;
  workedMinutes: number;
};

export type HostAttendanceGroup = {
  hostId: string;
  hostName: string;
  rows: AttendanceReportRow[];
  totals: AttendanceTotals;
};

export function sumAttendance(rows: AttendanceReportRow[]): AttendanceTotals {
  return {
    records: rows.length,
    onTime: rows.filter((row) => row.statusKey === "on_time").length,
    late: rows.filter((row) => row.statusKey === "late").length,
    absent: rows.filter((row) => row.statusKey === "absent").length,
    lateMinutes: rows.reduce((sum, row) => sum + row.lateMinutes, 0),
    workedMinutes: rows.reduce((sum, row) => sum + row.workedMinutes, 0),
  };
}

/**
 * Memecah baris absensi menjadi satu kelompok per host.
 *
 * Laporan lama menumpuk semua orang dalam satu tabel dengan kolom nama, jadi
 * untuk melihat catatan satu orang harus disaring sendiri dulu. Dipecah di sini
 * supaya PDF maupun Excel memakai pengelompokan dan urutan yang sama persis.
 *
 * Dikelompokkan lewat id, bukan nama: dua host bisa bernama sama, dan menggabung
 * catatan mereka jadi satu tabel lebih buruk daripada dua tabel berjudul sama.
 */
export function groupAttendanceByHost(rows: AttendanceReportRow[]): HostAttendanceGroup[] {
  const kelompok = new Map<string, AttendanceReportRow[]>();

  for (const row of rows) {
    const daftar = kelompok.get(row.hostId);
    if (daftar) daftar.push(row);
    else kelompok.set(row.hostId, [row]);
  }

  return [...kelompok.entries()]
    .map(([hostId, daftar]) => ({
      hostId,
      hostName: daftar[0].hostName,
      rows: daftar,
      totals: sumAttendance(daftar),
    }))
    .sort((a, b) => a.hostName.localeCompare(b.hostName, "id"));
}

export type RevenueReportRow = {
  date: string;
  hostName: string;
  shiftName: string;
  amount: number;
  note: string;
};

export type ReportMeta = {
  title: string;
  periodLabel: string;
  hostLabel: string;
  generatedAt: string;
};

async function resolveHostLabel(supabase: SupabaseClient, hostId: string | "all") {
  if (hostId === "all") return "Semua host";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", hostId).single();
  return (data?.full_name as string) ?? "Host";
}

export async function fetchAttendanceReport(supabase: SupabaseClient, filter: ReportFilter) {
  const { start, end } = monthRange(filter.month);

  let query = supabase
    .from("attendances")
    .select("*, profiles!attendances_host_id_fkey(full_name)")
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: true });

  if (filter.hostId !== "all") query = query.eq("host_id", filter.hostId);

  const { data } = await query;

  const rows: AttendanceReportRow[] = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    return {
      hostId: row.host_id as string,
      date: formatDate(row.work_date as string),
      hostName: profile?.full_name ?? "Host",
      clockIn: row.clock_in_at ? formatTime(row.clock_in_at as string) : "—",
      clockOut: row.clock_out_at ? formatTime(row.clock_out_at as string) : "—",
      status: ATTENDANCE_STATUS_LABEL[row.status as AttendanceStatus],
      statusKey: row.status as AttendanceStatus,
      lateMinutes: (row.late_minutes as number) ?? 0,
      duration: formatDuration((row.worked_minutes as number) ?? 0),
      workedMinutes: (row.worked_minutes as number) ?? 0,
      note: (row.note as string) ?? "",
    };
  });

  const meta: ReportMeta = {
    title: "Laporan Absensi",
    periodLabel: monthLabel(filter.month),
    hostLabel: await resolveHostLabel(supabase, filter.hostId),
    generatedAt: formatDate(new Date()),
  };

  return { rows, meta };
}

export async function fetchRevenueReport(supabase: SupabaseClient, filter: ReportFilter) {
  const { start, end } = monthRange(filter.month);

  let query = supabase
    .from("revenue_reports")
    .select("*, shifts(name), profiles!revenue_reports_host_id_fkey(full_name)")
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: true });

  if (filter.hostId !== "all") query = query.eq("host_id", filter.hostId);

  const { data } = await query;

  const rows: RevenueReportRow[] = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    const shift = row.shifts as unknown as { name: string } | null;
    return {
      date: formatDate(row.work_date as string),
      hostName: profile?.full_name ?? "Host",
      shiftName: shift?.name ?? "—",
      amount: Number(row.amount ?? 0),
      note: (row.note as string) ?? "",
    };
  });

  const meta: ReportMeta = {
    title: "Laporan Omzet",
    periodLabel: monthLabel(filter.month),
    hostLabel: await resolveHostLabel(supabase, filter.hostId),
    generatedAt: formatDate(new Date()),
  };

  return { rows, meta };
}
