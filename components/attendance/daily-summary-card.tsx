import { CalendarCheck2, Clock3, Quote, Timer } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/attendance/status";
import { formatDate } from "@/lib/utils/datetime";

export type MonthSummary = {
  /** Jumlah hari yang tercatat hadir pada bulan berjalan. */
  presentDays: number;
  scheduledDays: number;
  onTime: number;
  late: number;
  workedMinutes: number;
};

/**
 * Sapaan, ringkasan bulan berjalan, dan ucapan penyemangat harian —
 * bagian paling atas halaman absen host.
 */
export function DailySummaryCard({
  greeting,
  hostName,
  workDate,
  motivation,
  summary,
  todayLabel,
}: {
  greeting: string;
  hostName: string;
  workDate: string;
  motivation: string;
  summary: MonthSummary;
  todayLabel: string;
}) {
  const firstName = hostName.trim().split(/\s+/)[0] || hostName;

  return (
    <Card className="mb-3 overflow-hidden border-transparent bg-primary-dark p-0 text-white">
      <div className="relative bg-[radial-gradient(120%_120%_at_0%_0%,#6f5ff0_0%,#4a3cc9_55%,#3a2fa8_100%)] p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative">
          <p className="text-[13px] font-medium text-white/70">{formatDate(workDate)}</p>
          <p className="mt-0.5 text-[20px] leading-tight font-extrabold tracking-tight">
            {greeting}, {firstName}!
          </p>
          <p className="mt-1 text-[13px] text-white/75">{todayLabel}</p>

          <div className="mt-4 flex gap-2.5 rounded-[var(--radius-md)] bg-white/12 p-3.5 backdrop-blur-sm">
            <Quote className="mt-0.5 size-4 shrink-0 text-white/60" aria-hidden />
            <p className="text-[13px] leading-relaxed font-medium text-white">{motivation}</p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-line bg-surface sm:grid-cols-4 sm:divide-y-0">
        <Stat
          icon={CalendarCheck2}
          label="Hadir bulan ini"
          value={`${summary.presentDays}`}
          hint={summary.scheduledDays > 0 ? `dari ${summary.scheduledDays} jadwal` : "belum ada jadwal"}
        />
        <Stat icon={Timer} label="Jam kerja" value={formatDuration(summary.workedMinutes)} />
        <Stat icon={CalendarCheck2} label="Tepat waktu" value={`${summary.onTime}`} tone="emerald" />
        <Stat
          icon={Clock3}
          label="Telat"
          value={`${summary.late}`}
          tone={summary.late > 0 ? "amber" : undefined}
        />
      </dl>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "amber";
}) {
  const warna = tone === "emerald" ? "text-[#1f8a51]" : tone === "amber" ? "text-[#9a6a12]" : "text-ink";

  return (
    <div className="px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={`mt-0.5 text-[17px] leading-tight font-extrabold ${warna}`}>{value}</dd>
      {hint ? <dd className="text-[11px] text-ink-muted">{hint}</dd> : null}
    </div>
  );
}
