import type { Metadata } from "next";
import { Clock3, ScanFace, Timer, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { toAttendanceDetail } from "@/lib/attendance/detail";
import { formatDuration } from "@/lib/attendance/status";
import { requireAdmin } from "@/lib/auth/session";
import { LiveSync } from "@/lib/realtime/live-sync";
import { signAvatarUrls } from "@/lib/storage/avatar";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Profile, Shift } from "@/lib/types/database";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { AttendanceRows, type AdminAttendanceRow } from "./attendance-rows";
import { ManualAttendanceDialog } from "./manual-attendance-dialog";

export const metadata: Metadata = { title: "Absensi" };

type ShiftInfo = Pick<Shift, "name" | "start_time" | "end_time">;
type Row = Attendance & {
  host: Profile | null;
  assignment: { shifts: ShiftInfo | null } | null;
};

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
    .select(
      "*, host:profiles!attendances_host_id_fkey(*), assignment:schedule_assignments(shifts(name, start_time, end_time))",
    )
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

  const listRows: AdminAttendanceRow[] = rows.map((row) => {
    const shift = row.assignment?.shifts ?? null;
    return {
      detail: toAttendanceDetail({
        attendance: row,
        hostName: row.host?.full_name ?? "Host",
        shiftName: shift?.name ?? null,
        shiftStart: shift?.start_time ?? null,
        shiftEnd: shift?.end_time ?? null,
        photos,
      }),
      avatarUrl: row.host?.avatar_url ? (avatars[row.host.avatar_url] ?? null) : null,
      attendance: row,
    };
  });

  const clockedIn = rows.filter((row) => row.clock_in_at).length;
  const lateCount = rows.filter((row) => row.status === "late").length;
  const totalMinutes = rows.reduce((sum, row) => sum + row.worked_minutes, 0);

  return (
    <>
      <LiveSync tables={["attendances", "schedule_assignments"]} />

      <PageHeader
        title="Absensi"
        description={`Monitor kehadiran ${formatDate(tanggal)}. Ketuk satu baris untuk melihat foto dan lokasinya.`}
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

        <AttendanceRows rows={listRows} />
      </Card>
    </>
  );
}



