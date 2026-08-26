import "server-only";

import { logAudit } from "@/lib/auth/audit";
import {
  buildDemoDataset,
  DEMO_HOSTS,
  DEMO_PASSWORD,
  DEMO_PENDING,
  demoEmail,
} from "@/lib/demo/dataset";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Shift } from "@/lib/types/database";
import { todayInJakarta } from "@/lib/utils/datetime";
import { addDays, currentMonth, monthRange } from "@/lib/utils/period";

export type SeedResult = {
  hosts: number;
  pending: number;
  assignments: number;
  attendances: number;
  revenues: number;
  leaves: number;
};

export type DemoSummary = {
  hosts: number;
  assignments: number;
  attendances: number;
  revenues: number;
  leaves: number;
};

/** Ringkasan data contoh yang sedang ada di database. */
export async function getDemoSummary(): Promise<DemoSummary> {
  const admin = createAdminClient();

  const { data: profiles } = await admin.from("profiles").select("id").eq("is_demo", true);
  const ids = (profiles ?? []).map((row) => row.id as string);

  if (ids.length === 0) {
    return { hosts: 0, assignments: 0, attendances: 0, revenues: 0, leaves: 0 };
  }

  const [assignments, attendances, revenues, leaves] = await Promise.all([
    admin.from("schedule_assignments").select("id", { count: "exact", head: true }).in("host_id", ids),
    admin.from("attendances").select("id", { count: "exact", head: true }).in("host_id", ids),
    admin.from("revenue_reports").select("id", { count: "exact", head: true }).in("host_id", ids),
    admin.from("leave_requests").select("id", { count: "exact", head: true }).in("host_id", ids),
  ]);

  return {
    hosts: ids.length,
    assignments: assignments.count ?? 0,
    attendances: attendances.count ?? 0,
    revenues: revenues.count ?? 0,
    leaves: leaves.count ?? 0,
  };
}

async function createDemoUser(
  admin: ReturnType<typeof createAdminClient>,
  {
    email,
    fullName,
    phone,
    status,
    joinDate,
  }: { email: string; fullName: string; phone: string; status: "active" | "pending"; joinDate: string },
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (error || !data.user) return null;

  await admin
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      role: "host",
      account_status: status,
      employment_status: "active",
      join_date: status === "active" ? joinDate : null,
      weekly_day_off_quota: 1,
      is_demo: true,
    })
    .eq("id", data.user.id);

  return data.user.id;
}

/**
 * Mengisi database dengan satu bulan data simulasi.
 * Seluruh akun yang dibuat ditandai sebagai data contoh sehingga bisa dihapus
 * kembali tanpa menyentuh data asli.
 */
export async function seedDemoData(actorId: string): Promise<SeedResult> {
  const admin = createAdminClient();
  const today = todayInJakarta();
  const { start, end } = monthRange(currentMonth());

  const [{ data: shiftRows }, { data: settings }] = await Promise.all([
    admin.from("shifts").select("*").eq("is_active", true).order("sort_order"),
    admin.from("app_settings").select("late_tolerance_minutes").eq("id", 1).single(),
  ]);

  const shifts = (shiftRows ?? []) as Shift[];
  if (shifts.length === 0) {
    throw new Error("Belum ada shift aktif. Atur shift terlebih dahulu di Pengaturan Shift.");
  }

  const hostIds: string[] = [];
  for (const [index, host] of DEMO_HOSTS.entries()) {
    const id = await createDemoUser(admin, {
      email: demoEmail(index),
      fullName: host.name,
      phone: host.phone,
      status: "active",
      joinDate: addDays(today, -60 - index * 15),
    });
    if (id) hostIds.push(id);
  }

  if (hostIds.length === 0) {
    throw new Error("Gagal membuat akun host contoh. Periksa kunci server Supabase.");
  }

  let pendingCount = 0;
  for (const [index, host] of DEMO_PENDING.entries()) {
    const id = await createDemoUser(admin, {
      email: demoEmail(DEMO_HOSTS.length + index),
      fullName: host.name,
      phone: host.phone,
      status: "pending",
      joinDate: today,
    });
    if (id) pendingCount += 1;
  }

  const dataset = buildDemoDataset({
    hosts: hostIds.map((id) => ({ id, weeklyDayOffQuota: 1 })),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      minHosts: shift.min_hosts,
      sortOrder: shift.sort_order,
    })),
    startDate: start,
    endDate: end,
    today,
    lateToleranceMinutes: settings?.late_tolerance_minutes ?? 0,
  });

  const { data: period } = await admin
    .from("schedule_periods")
    .upsert(
      {
        start_date: start,
        end_date: end,
        status: "published",
        generated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        published_by: actorId,
        warnings: [],
      },
      { onConflict: "start_date,end_date" },
    )
    .select("id")
    .single();

  await admin.from("schedule_assignments").insert(
    dataset.assignments.map((item) => ({
      period_id: (period?.id as string | undefined) ?? null,
      host_id: item.hostId,
      shift_id: item.shiftId,
      work_date: item.workDate,
      status: "published" as const,
      source: "auto" as const,
    })),
  );

  // Absensi butuh id penugasannya, jadi jadwal dibaca ulang setelah tersimpan.
  const { data: savedAssignments } = await admin
    .from("schedule_assignments")
    .select("id, host_id, shift_id, work_date")
    .in("host_id", hostIds)
    .gte("work_date", start)
    .lte("work_date", end);

  const assignmentId = new Map(
    (savedAssignments ?? []).map((row) => [
      `${row.host_id}|${row.shift_id}|${row.work_date}`,
      row.id as string,
    ]),
  );

  await admin.from("attendances").insert(
    dataset.attendances.map((item) => ({
      host_id: item.hostId,
      assignment_id: assignmentId.get(`${item.hostId}|${item.shiftId}|${item.workDate}`) ?? null,
      work_date: item.workDate,
      clock_in_at: item.clockInAt,
      clock_out_at: item.clockOutAt,
      status: item.status,
      late_minutes: item.lateMinutes,
      worked_minutes: item.workedMinutes,
      note: "Data contoh untuk simulasi.",
      recorded_by: actorId,
    })),
  );

  await admin.from("revenue_reports").insert(
    dataset.revenues.map((item) => ({
      host_id: item.hostId,
      shift_id: item.shiftId,
      work_date: item.workDate,
      amount: item.amount,
      note: "Data contoh untuk simulasi.",
      submitted_by: actorId,
    })),
  );

  await admin.from("leave_requests").insert(
    dataset.leaves.map((item) => ({
      host_id: item.hostId,
      type: item.type,
      requested_date: item.requestedDate,
      reason: item.reason,
      status: item.status,
      review_note: item.reviewNote,
      reviewed_by: item.status === "pending" ? null : actorId,
      reviewed_at: item.status === "pending" ? null : new Date().toISOString(),
    })),
  );

  await logAudit({
    actorId,
    entity: "user",
    action: "create",
    after: {
      demo: true,
      hosts: hostIds.length,
      assignments: dataset.assignments.length,
      attendances: dataset.attendances.length,
    },
  });

  return {
    hosts: hostIds.length,
    pending: pendingCount,
    assignments: dataset.assignments.length,
    attendances: dataset.attendances.length,
    revenues: dataset.revenues.length,
    leaves: dataset.leaves.length,
  };
}

/**
 * Menghapus seluruh data contoh. Menghapus akunnya sudah cukup karena
 * absensi, jadwal, omzet, dan pengajuan ikut terhapus lewat cascade.
 */
export async function resetDemoData(actorId: string) {
  const admin = createAdminClient();

  const { data: profiles } = await admin.from("profiles").select("id").eq("is_demo", true);
  const ids = (profiles ?? []).map((row) => row.id as string);

  let deleted = 0;
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) deleted += 1;
  }

  // Periode jadwal tidak terikat ke pengguna, jadi yang sudah kosong dibersihkan sendiri.
  const { data: periods } = await admin.from("schedule_periods").select("id");
  for (const period of periods ?? []) {
    const { count } = await admin
      .from("schedule_assignments")
      .select("id", { count: "exact", head: true })
      .eq("period_id", period.id as string);

    if ((count ?? 0) === 0) {
      await admin.from("schedule_periods").delete().eq("id", period.id as string);
    }
  }

  await logAudit({
    actorId,
    entity: "user",
    action: "delete",
    after: { demo: true, dihapus: deleted },
  });

  return { deleted };
}
