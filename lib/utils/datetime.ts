/**
 * Seluruh timestamp disimpan UTC di database dan hanya dikonversi ke WIB di lapisan tampilan.
 */
export const TIMEZONE = "Asia/Jakarta";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateShortFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined, fallback = "—") {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatDateShort(value: string | Date | null | undefined, fallback = "—") {
  const date = toDate(value);
  return date ? dateShortFormatter.format(date) : fallback;
}

export function formatDateTime(value: string | Date | null | undefined, fallback = "—") {
  const date = toDate(value);
  return date ? `${dateTimeFormatter.format(date)} WIB` : fallback;
}

export function formatTime(value: string | Date | null | undefined, fallback = "—") {
  const date = toDate(value);
  return date ? `${timeFormatter.format(date)} WIB` : fallback;
}

/** Memotong "06:00:00" menjadi "06.00" untuk tampilan jam shift. */
export function formatClock(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const [hour, minute] = value.split(":");
  if (hour === undefined || minute === undefined) return fallback;
  return `${hour.padStart(2, "0")}.${minute}`;
}

/** Tanggal hari ini menurut WIB dalam format YYYY-MM-DD. */
export function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Sapaan yang menyesuaikan waktu WIB. */
export function greeting(now: Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(now),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}
