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

/** Tukar shift wajib diajukan minimal H-1 sebelum tanggal shiftnya. */
export const SWAP_MIN_LEAD_DAYS = 1;

/** Tanggal paling awal yang boleh ditukar. */
export function earliestSwapDate(today: string, minLeadDays = SWAP_MIN_LEAD_DAYS) {
  return addDays(today, minLeadDays);
}

/**
 * Apakah sebuah shift masih boleh ditukar.
 *
 * Keduanya diperiksa — shift milik pengaju maupun shift tujuan — supaya tidak
 * ada penukaran yang menyentuh hari ini atau hari yang sudah lewat.
 */
export function isSwapLeadTimeValid(
  workDate: string,
  today: string,
  minLeadDays = SWAP_MIN_LEAD_DAYS,
) {
  return workDate >= earliestSwapDate(today, minLeadDays);
}
