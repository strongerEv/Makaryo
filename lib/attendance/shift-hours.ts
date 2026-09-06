/** Mengubah "HH:MM" atau "HH:MM:SS" menjadi menit sejak tengah malam. */
export function timeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

/**
 * Rentang shift dalam menit. Shift yang melewati tengah malam dihitung sebagai
 * durasi yang menembus hari berikutnya, bukan angka negatif.
 */
export function shiftSpanMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return 0;
  return end > start ? end - start : end + 24 * 60 - start;
}

/** Lama istirahat dalam menit; nol bila salah satu jamnya belum diisi. */
export function breakMinutes(breakStart: string | null, breakEnd: string | null) {
  const start = timeToMinutes(breakStart);
  const end = timeToMinutes(breakEnd);
  if (start === null || end === null) return 0;
  return Math.max(0, end > start ? end - start : end + 24 * 60 - start);
}

/**
 * Jam live bersih: rentang shift dikurangi istirahatnya.
 *
 * Inilah angka yang dipakai host dan admin untuk menilai beban kerja — bukan
 * selisih jam mulai dan selesai, karena istirahat tidak dihitung sebagai live.
 */
export function liveMinutes({
  startTime,
  endTime,
  breakStart = null,
  breakEnd = null,
}: {
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}) {
  const span = shiftSpanMinutes(startTime, endTime);
  return Math.max(0, span - breakMinutes(breakStart, breakEnd));
}

/** Format ringkas untuk lencana "Total live", misal `7 jam` atau `6,5 jam`. */
export function formatLiveHours(minutes: number) {
  if (minutes <= 0) return "0 jam";
  const hours = minutes / 60;
  const teks = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  return `${teks} jam`;
}
