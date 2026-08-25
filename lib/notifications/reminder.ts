/** Tahap pengingat: H-1 jam, H-30 menit, dan H-15 menit sebelum shift dimulai. */
export const REMINDER_OFFSETS = [60, 30, 15];

/**
 * Tahap pengingat yang sudah terlampaui pada sisa waktu tertentu.
 * Kosong bila shift sudah dimulai atau masih terlalu jauh.
 */
export function crossedReminderStages(minutesUntil: number): number[] {
  if (minutesUntil < 0 || minutesUntil > REMINDER_OFFSETS[0]) return [];
  return REMINDER_OFFSETS.filter((offset) => minutesUntil <= offset);
}

/** Keterangan sisa waktu yang ditampilkan di notifikasi. */
export function reminderLabel(minutesUntil: number): string {
  const remaining = Math.max(1, Math.round(minutesUntil));
  return remaining >= 55 ? "1 jam lagi" : `${remaining} menit lagi`;
}
