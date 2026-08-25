import type { Metadata } from "next";
import { CalendarX2, Clock3, ScanFace, Timer, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { formatDuration } from "@/lib/attendance/status";
import { requireAdmin } from "@/lib/auth/session";
import { signAvatarUrls } from "@/lib/storage/avatar";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Profile } from "@/lib/types/database";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { AttendanceCorrectionDialog } from "./attendance-correction-dialog";
import { ManualAttendanceDialog } from "./manual-attendance-dialog";

export const metadata: Metadata = { title: "Absensi" };

type Row = Attendance & { host: Profile | null };

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string; host?: string }>;
}) {
  await requireAdmin();
  const { tanggal = todayInJakarta(), host = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("attendances")
    .select("*, host:profiles!attendances_host_id_fkey(*)")
    .eq("work_date", tanggal)
    .order("clock_in_at", { ascending: true });

  if (host !== "all") query = query.eq("host_id", host);

  const [{ data: attendanceRows }, { data: hostRows }, { count: scheduledCount }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "host")
      .eq("account_status", "active")
      .order("full_name"),
    supabase
      .from("schedule_assignments")
      .select("id", { count: "exact", head: true })
      .eq("work_date", tanggal)
      .eq("status", "published"),
  ]);

  const rows = (attendanceRows ?? []) as Row[];
  const hosts = (hostRows ?? []) as Profile[];

  const photos = await signPhotoUrls(
    supabase,
    "attendance",
    rows.flatMap((row) => [row.clock_in_photo, row.clock_out_photo]),
  );
  const avatars = await signAvatarUrls(
    supabase,
    rows.map((row) => row.host?.avatar_url ?? null),
  );

  const clockedIn = rows.filter((row) => row.clock_in_at).length;
  const lateCount = rows.filter((row) => row.status === "late").length;
  const totalMinutes = rows.reduce((sum, row) => sum + row.worked_minutes, 0);

  return (
    <>
      <PageHeader
        title="Absensi"
        description={`Monitor kehadiran ${formatDate(tanggal)}.`}
        action={<ManualAttendanceDialog hosts={hosts} defaultDate={tanggal} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sudah clock in" value={clockedIn} icon={UserCheck} tone="emerald" />
        <StatCard
          label="Terjadwal hari ini"
          value={scheduledCount ?? 0}
          icon={ScanFace}
          tone="primary"
          hint={`${Math.max(0, (scheduledCount ?? 0) - clockedIn)} belum absen`}
        />
        <StatCard label="Telat" value={lateCount} icon={Clock3} tone="amber" />
        <StatCard label="Total jam kerja" value={formatDuration(totalMinutes)} icon={Timer} tone="sky" />
      </div>

      <Card className="p-0">
        <form className="grid gap-3 border-b border-line p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:p-5" action="/admin/absensi">
          <Field label="Tanggal" htmlFor="tanggal">
            <Input id="tanggal" name="tanggal" type="date" defaultValue={tanggal} />
          </Field>
          <Field label="Host" htmlFor="host">
            <Select id="host" name="host" defaultValue={host}>
              <option value="all">Semua host</option>
              {hosts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="outline" block className="sm:w-auto">
              Terapkan
            </Button>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Belum ada absensi"
            description="Belum ada host yang clock in pada tanggal ini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar
                    name={row.host?.full_name ?? "Host"}
                    src={row.host?.avatar_url ? (avatars[row.host.avatar_url] ?? null) : null}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{row.host?.full_name ?? "Host"}</p>
                    <p className="tabular text-[12px] text-ink-muted">
                      {formatTimeRange(row)}
                      {row.worked_minutes > 0 ? ` · ${formatDuration(row.worked_minutes)}` : ""}
                      {row.auto_closed ? " · ditutup otomatis" : ""}
                    </p>
                  </div>
                  <AttendanceStatusBadge status={row.status} lateMinutes={row.late_minutes} />
                  <AttendanceCorrectionDialog attendance={row} hostName={row.host?.full_name ?? "Host"} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <PhotoThumb label="Clock in" url={row.clock_in_photo ? photos[row.clock_in_photo] : undefined} />
                  <PhotoThumb label="Clock out" url={row.clock_out_photo ? photos[row.clock_out_photo] : undefined} />
                  <LocationChip lat={row.clock_in_lat} lng={row.clock_in_lng} />
                  {row.note ? (
                    <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[12px] text-ink-muted">
                      {row.note}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function formatTimeRange(row: Attendance) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
  const start = row.clock_in_at ? formatter.format(new Date(row.clock_in_at)) : "—";
  const end = row.clock_out_at ? formatter.format(new Date(row.clock_out_at)) : "belum";
  return `${start} → ${end} WIB`;
}

function PhotoThumb({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-[12px] text-ink-muted">
        {label}: tanpa foto
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pr-3 pl-1 text-[12px] font-medium text-ink transition-colors hover:bg-primary-soft"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Foto ${label}`} className="size-7 rounded-full object-cover" />
      {label}
    </a>
  );
}

function LocationChip({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat === null || lng === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-soft px-3 py-1.5 text-[12px] font-medium text-[#9a6a12]">
        Lokasi tidak tersedia
      </span>
    );
  }

  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full bg-sky-soft px-3 py-1.5 text-[12px] font-medium text-[#1c6fa8] hover:underline"
    >
      Lihat lokasi
    </a>
  );
}
