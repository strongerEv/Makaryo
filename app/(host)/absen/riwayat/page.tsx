import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarX2, Clock3, ScanFace, Timer } from "lucide-react";

import { AttendanceHistoryList } from "@/components/attendance/attendance-history-list";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { MonthFilterForm } from "@/components/ui/month-filter-form";
import { toAttendanceDetail } from "@/lib/attendance/detail";
import { formatDuration } from "@/lib/attendance/status";
import { requireHost } from "@/lib/auth/session";
import { LiveSync } from "@/lib/realtime/live-sync";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Attendance } from "@/lib/types/database";
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
    attendances.flatMap((item) => [item.clock_in_photo, item.clock_out_photo]),
  );

  const details = attendances.map((attendance) =>
    toAttendanceDetail({ attendance, hostName: profile.full_name, photos }),
  );

  const totalMinutes = attendances.reduce((sum, item) => sum + item.worked_minutes, 0);
  const onTime = attendances.filter((item) => item.status === "on_time").length;
  const late = attendances.filter((item) => item.status === "late").length;
  const absent = attendances.filter((item) => item.status === "absent").length;

  return (
    <>
      <LiveSync tables={["attendances"]} />

      <Link
        href="/absen"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke absen
      </Link>

      <PageHeader
        title="Riwayat absensi"
        description="Rekap kehadiranmu per bulan. Ketuk salah satu baris untuk melihat foto dan lokasinya."
      />

      <MonthFilterForm action="/absen/riwayat" value={bulan} className="mb-4" />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total jam kerja" value={formatDuration(totalMinutes)} icon={Timer} tone="primary" />
        <StatCard label="Tepat waktu" value={onTime} icon={ScanFace} tone="emerald" />
        <StatCard label="Telat" value={late} icon={Clock3} tone="amber" />
        <StatCard label="Tidak absen" value={absent} icon={CalendarX2} tone="coral" />
      </div>

      <Card className="p-0">
        <AttendanceHistoryList items={details} />
      </Card>
    </>
  );
}
