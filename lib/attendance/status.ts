import type { AttendanceStatus } from "@/lib/types/database";
import { shiftStartInstant } from "@/lib/attendance/time";

export type ClockInEvaluation = {
  status: AttendanceStatus;
  lateMinutes: number;
};

/**
 * Menentukan status clock in terhadap jam mulai shift terjadwal.
 * Absen tanpa jadwal (shiftStartTime kosong) selalu dianggap tepat waktu.
 */
export function evaluateClockIn({
  clockInAt,
  workDate,
  shiftStartTime,
  toleranceMinutes = 0,
}: {
  clockInAt: Date;
  workDate: string;
  shiftStartTime?: string | null;
  toleranceMinutes?: number;
}): ClockInEvaluation {
  if (!shiftStartTime) return { status: "on_time", lateMinutes: 0 };

  const scheduled = shiftStartInstant(workDate, shiftStartTime);
  const toleranceMs = Math.max(0, toleranceMinutes) * 60_000;
  const diffMs = clockInAt.getTime() - scheduled.getTime() - toleranceMs;

  if (diffMs <= 0) return { status: "on_time", lateMinutes: 0 };

  return {
    status: "late",
    lateMinutes: Math.ceil(diffMs / 60_000),
  };
}

export function workedMinutesBetween(clockInAt: Date | string, clockOutAt: Date | string) {
  const start = clockInAt instanceof Date ? clockInAt : new Date(clockInAt);
  const end = clockOutAt instanceof Date ? clockOutAt : new Date(clockOutAt);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 jam";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} menit`;
  if (rest === 0) return `${hours} jam`;
  return `${hours} jam ${rest} menit`;
}
