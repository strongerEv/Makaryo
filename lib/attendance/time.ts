/**
 * Jam shift disimpan sebagai waktu lokal WIB (UTC+7, tanpa DST),
 * jadi konversi ke instant absolut cukup dengan menempelkan offset +07:00.
 */
const WIB_OFFSET = "+07:00";

function normalizeTime(time: string) {
  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;
}

export function shiftStartInstant(workDate: string, startTime: string) {
  return new Date(`${workDate}T${normalizeTime(startTime)}${WIB_OFFSET}`);
}

/** Shift yang jam selesainya <= jam mulai dianggap berakhir keesokan harinya. */
export function shiftEndInstant(workDate: string, startTime: string, endTime: string) {
  const start = shiftStartInstant(workDate, startTime);
  const end = new Date(`${workDate}T${normalizeTime(endTime)}${WIB_OFFSET}`);
  if (end.getTime() <= start.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export function shiftDurationMinutes(startTime: string, endTime: string) {
  const start = shiftStartInstant("2000-01-01", startTime);
  const end = shiftEndInstant("2000-01-01", startTime, endTime);
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}
