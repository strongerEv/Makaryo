import type { AttendanceDetail } from "@/components/attendance/attendance-detail-sheet";
import type { Attendance } from "@/lib/types/database";

/**
 * Mengubah satu baris absensi menjadi bentuk siap tampil untuk pratinjau.
 *
 * `photos` adalah peta path Storage → signed URL yang sudah disiapkan di
 * server, supaya komponen klien tidak perlu memegang kredensial apa pun.
 */
export function toAttendanceDetail({
  attendance,
  hostName,
  shiftName = null,
  shiftStart = null,
  shiftEnd = null,
  photos = {},
}: {
  attendance: Attendance;
  hostName: string;
  shiftName?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  photos?: Record<string, string>;
}): AttendanceDetail {
  const signed = (path: string | null) => (path ? (photos[path] ?? null) : null);

  return {
    id: attendance.id,
    hostName,
    workDate: attendance.work_date,
    shiftName,
    shiftStart,
    shiftEnd,
    status: attendance.status,
    lateMinutes: attendance.late_minutes,
    workedMinutes: attendance.worked_minutes,
    autoClosed: attendance.auto_closed,
    note: attendance.note,
    clockInAt: attendance.clock_in_at,
    clockInPhotoUrl: signed(attendance.clock_in_photo),
    clockInLat: attendance.clock_in_lat,
    clockInLng: attendance.clock_in_lng,
    clockOutAt: attendance.clock_out_at,
    clockOutPhotoUrl: signed(attendance.clock_out_photo),
    clockOutLat: attendance.clock_out_lat,
    clockOutLng: attendance.clock_out_lng,
  };
}
