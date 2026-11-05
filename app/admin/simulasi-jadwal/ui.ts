import type { SandboxColor, SandboxHost } from "@/lib/scheduling/sandbox";
import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/utils/period";

/** Kelas warna per lini: chip lembut, titik legenda, dan garis tepi. */
export const LINE_TONE: Record<SandboxColor, { chip: string; dot: string; border: string; label: string }> = {
  primary: { chip: "bg-primary-soft text-primary", dot: "bg-primary", border: "border-primary/30", label: "Ungu" },
  coral: { chip: "bg-coral-soft text-[#c73f35]", dot: "bg-coral", border: "border-coral/30", label: "Merah" },
  amber: { chip: "bg-amber-soft text-[#9a6a12]", dot: "bg-amber", border: "border-amber/40", label: "Kuning" },
  emerald: { chip: "bg-emerald-soft text-[#1f8a51]", dot: "bg-emerald", border: "border-emerald/30", label: "Hijau" },
  sky: { chip: "bg-sky-soft text-[#1c6fa8]", dot: "bg-sky", border: "border-sky/30", label: "Biru" },
};

const bulanPendek = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" });

/** "Sen, 9 Nov" */
export function dayLabel(date: string) {
  return `${WEEKDAY_LABELS[weekdayIndex(date)]}, ${bulanPendek.format(new Date(`${date}T00:00:00Z`))}`;
}

/** "9 Nov" */
export function shortDate(date: string) {
  return bulanPendek.format(new Date(`${date}T00:00:00Z`));
}

/**
 * Nama pendek untuk chip: kata pertama, kecuali kata itu dipakai lebih dari
 * satu peserta (mis. "Freelance 1" dan "Freelance 2") — maka nama lengkapnya.
 */
export function shortNames(hosts: Pick<SandboxHost, "id" | "name">[]) {
  const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;
  const count = new Map<string, number>();
  hosts.forEach((host) => count.set(first(host.name), (count.get(first(host.name)) ?? 0) + 1));
  return new Map(hosts.map((host) => [host.id, (count.get(first(host.name)) ?? 0) > 1 ? host.name : first(host.name)]));
}

/** "07.00" dari "07:00". */
export function clock(value: string | null) {
  return value ? value.slice(0, 5).replace(":", ".") : "—";
}

export function hours(minutes: number) {
  const value = minutes / 60;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}
