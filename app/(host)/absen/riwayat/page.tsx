import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarX2, Clock3, ScanFace, Timer } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { MonthFilterForm } from "@/components/ui/month-filter-form";
import { formatDuration } from "@/lib/attendance/status";
import { requireHost } from "@/lib/auth/session";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Attendance } from "@/lib/types/database";
import { formatDate, formatTime } from "@/lib/utils/datetime";
import { currentMonth, monthRange } from "@/lib/utils/period";

export const metadata: Metadata = { title: "Riwayat Absensi" };

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const profile = await requireHost();
  const { bulan = currentMonth() } = await searchParams;
  const { start, end } = monthRange(bulan);
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendances")
    .select("*")
    .eq("host_id", profile.id)
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: false });

  const attendances = (data ?? []) as Attendance[];
  const photos = await signPhotoUrls(
    supabase,
    "attendance",
    attendances.map((item) => item.clock_in_photo),
  );

  const totalMinutes = attendances.reduce((sum, item) => sum + item.worked_minutes, 0);
  const onTime = attendances.filter((item) => item.status === "on_time").length;
  const late = attendances.filter((item) => item.status === "late").length;
  const absent = attendances.filter((item) => item.status === "absent").length;

  return (
    <>
      <Link
        href="/absen"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke absen
      </Link>

      <PageHeader title="Riwayat absensi" description="Rekap kehadiranmu per bulan." />

      <MonthFilterForm action="/absen/riwayat" value={bulan} className="mb-4" />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total jam kerja" value={formatDuration(totalMinutes)} icon={Timer} tone="primary" />
        <StatCard label="Tepat waktu" value={onTime} icon={ScanFace} tone="emerald" />
        <StatCard label="Telat" value={late} icon={Clock3} tone="amber" />
        <StatCard label="Tidak absen" value={absent} icon={CalendarX2} tone="coral" />
      </div>

      <Card className="p-0">
        {attendances.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Belum ada absensi bulan ini"
            description="Catatan absensi akan muncul di sini setelah kamu clock in."
          />
        ) : (
          <ul className="divide-y divide-line">
            {attendances.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                {item.clock_in_photo && photos[item.clock_in_photo] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[item.clock_in_photo]}
                    alt=""
                    className="size-12 shrink-0 rounded-[14px] object-cover"
                  />
                ) : (
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-ink-muted">
                    <ScanFace className="size-5" aria-hidden />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{formatDate(item.work_date)}</p>
                  <p className="tabular text-[12px] text-ink-muted">
                    {formatTime(item.clock_in_at)} → {item.clock_out_at ? formatTime(item.clock_out_at) : "belum"}
                    {item.worked_minutes > 0 ? ` · ${formatDuration(item.worked_minutes)}` : ""}
                    {item.auto_closed ? " · ditutup otomatis" : ""}
                  </p>
                </div>

                <AttendanceStatusBadge status={item.status} lateMinutes={item.late_minutes} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
