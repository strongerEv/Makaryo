import { addDays } from "@/lib/utils/period";

/** Izin mendadak wajib diajukan minimal H-3 sebelum tanggal izinnya. */
export const URGENT_MIN_LEAD_DAYS = 3;

/** Tanggal paling awal yang boleh dipilih untuk izin mendadak. */
export function earliestUrgentLeaveDate(today: string, minLeadDays = URGENT_MIN_LEAD_DAYS) {
  return addDays(today, minLeadDays);
}

/** Apakah tanggal izin sudah memenuhi tenggat H-3. */
export function isUrgentLeadTimeValid(
  requestedDate: string,
  today: string,
  minLeadDays = URGENT_MIN_LEAD_DAYS,
) {
  return requestedDate >= earliestUrgentLeaveDate(today, minLeadDays);
}

/** Apakah tanggal libur mingguan masih bisa diambil host lain. */
export function isWeeklyOffDateAvailable(
  info: { taken: number; mine: boolean } | undefined,
  quotaPerDate: number,
) {
  if (!info) return true;
  if (info.mine) return false;
  return info.taken < Math.max(1, quotaPerDate);
}
