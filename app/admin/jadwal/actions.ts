"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/time";
import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notifications/notify";
import { generateSchedule } from "@/lib/scheduling/engine";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Shift } from "@/lib/types/database";
import { monthLabel, monthRange } from "@/lib/utils/period";

export type ActionState = { error?: string; success?: string };

const assignSchema = z.object({
  hostId: z.string().uuid("Host wajib dipilih."),
  shiftId: z.string().uuid("Shift wajib dipilih."),
  workDate: z.string().min(10, "Tanggal wajib diisi."),
});

function revalidateSchedule() {
  revalidatePath("/admin/jadwal");
  revalidatePath("/admin/dashboard");
  revalidatePath("/jadwal");
  revalidatePath("/beranda");
}

function overlaps(
  a: { workDate: string; startTime: string; endTime: string },
  b: { workDate: string; startTime: string; endTime: string },
) {
  const aStart = shiftStartInstant(a.workDate, a.startTime).getTime();
  const aEnd = shiftEndInstant(a.workDate, a.startTime, a.endTime).getTime();
  const bStart = shiftStartInstant(b.workDate, b.startTime).getTime();
  const bEnd = shiftEndInstant(b.workDate, b.startTime, b.endTime).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export async function assignHostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = assignSchema.safeParse({
    hostId: formData.get("hostId"),
    shiftId: formData.get("shiftId"),
    workDate: formData.get("workDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const { hostId, shiftId, workDate } = parsed.data;
  const supabase = await createClient();

  const { data: shift } = await supabase.from("shifts").select("*").eq("id", shiftId).single();
  if (!shift) return { error: "Shift tidak ditemukan." };

  // Anti-bentrok: bandingkan rentang jam dengan penugasan lain di hari yang sama.
  const { data: sameDay } = await supabase
    .from("schedule_assignments")
    .select("id, work_date, shifts(name, start_time, end_time)")
    .eq("host_id", hostId)
    .eq("work_date", workDate);

  const conflict = (sameDay ?? []).find((row) => {
    const other = row.shifts as unknown as Pick<Shift, "name" | "start_time" | "end_time"> | null;
    if (!other) return false;
    return overlaps(
      { workDate, startTime: (shift as Shift).start_time, endTime: (shift as Shift).end_time },
      { workDate: row.work_date as string, startTime: other.start_time, endTime: other.end_time },
    );
  });

  if (conflict) {
    const other = conflict.shifts as unknown as { name: string };
    return { error: `Host ini sudah dijadwalkan di ${other.name} pada jam yang bertumpuk.` };
  }

  const { data: inserted, error } = await supabase
    .from("schedule_assignments")
    .insert({ host_id: hostId, shift_id: shiftId, work_date: workDate, status: "draft", source: "manual" })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Host ini sudah ada di shift tersebut."
          : "Gagal menambahkan host ke shift.",
    };
  }

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "create",
    entityId: inserted?.id ?? null,
    targetUserId: hostId,
    after: { work_date: workDate, shift_id: shiftId },
  });

  revalidateSchedule();
  return { success: "Host ditambahkan ke shift." };
}

export async function removeAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return { error: "Penugasan tidak ditemukan." };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("schedule_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();

  if (!before) return { error: "Penugasan tidak ditemukan." };

  const { error } = await supabase.from("schedule_assignments").delete().eq("id", assignmentId);
  if (error) return { error: "Gagal menghapus penugasan." };

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "delete",
    entityId: assignmentId,
    targetUserId: before.host_id,
    before: { work_date: before.work_date, shift_id: before.shift_id, status: before.status },
  });

  revalidateSchedule();
  return { success: "Penugasan dihapus." };
}

export async function generateDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const month = String(formData.get("bulan") ?? "");
  if (!month) return { error: "Periode tidak dikenal." };

  const { start, end } = monthRange(month);
  const supabase = await createClient();

  const [{ data: hostRows }, { data: shiftRows }, { data: leaveRows }, { data: existingRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, weekly_day_off_quota")
        .eq("role", "host")
        .eq("account_status", "active")
        .eq("employment_status", "active"),
      supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("leave_requests")
        .select("host_id, requested_date")
        .eq("status", "approved")
        .gte("requested_date", start)
        .lte("requested_date", end),
      supabase
        .from("schedule_assignments")
        .select("id, host_id, shift_id, work_date, status, source")
        .gte("work_date", start)
        .lte("work_date", end),
    ]);

  const hosts = (hostRows ?? []) as Pick<Profile, "id" | "weekly_day_off_quota">[];
  const shifts = (shiftRows ?? []) as Shift[];

  if (hosts.length === 0) return { error: "Belum ada host aktif untuk dijadwalkan." };
  if (shifts.length === 0) return { error: "Belum ada shift aktif. Atur shift terlebih dahulu." };

  const existing = existingRows ?? [];
  const published = existing.filter((row) => row.status === "published");
  const drafts = existing.filter((row) => row.status !== "published");

  // Draft lama digantikan; penugasan yang sudah dipublish tetap dipertahankan.
  if (drafts.length > 0) {
    await supabase
      .from("schedule_assignments")
      .delete()
      .in(
        "id",
        drafts.map((row) => row.id as string),
      );
  }

  const { assignments, warnings } = generateSchedule({
    startDate: start,
    endDate: end,
    hosts: hosts.map((host) => ({ id: host.id, weeklyDayOffQuota: host.weekly_day_off_quota })),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      minHosts: shift.min_hosts,
      sortOrder: shift.sort_order,
    })),
    approvedLeaves: (leaveRows ?? []).map((row) => ({
      hostId: row.host_id as string,
      date: row.requested_date as string,
    })),
    existingAssignments: published.map((row) => ({
      hostId: row.host_id as string,
      shiftId: row.shift_id as string,
      workDate: row.work_date as string,
    })),
  });

  // Satu periode per rentang tanggal — generate ulang menimpa draft sebelumnya.
  const { data: period } = await supabase
    .from("schedule_periods")
    .upsert(
      {
        start_date: start,
        end_date: end,
        status: "draft",
        generated_at: new Date().toISOString(),
        warnings,
      },
      { onConflict: "start_date,end_date" },
    )
    .select("id")
    .single();

  const periodId = (period?.id as string | undefined) ?? null;

  if (assignments.length > 0) {
    const { error } = await supabase.from("schedule_assignments").insert(
      assignments.map((item) => ({
        period_id: periodId,
        host_id: item.hostId,
        shift_id: item.shiftId,
        work_date: item.workDate,
        status: "draft" as const,
        source: "auto" as const,
      })),
    );
    if (error) return { error: "Gagal menyimpan draft jadwal." };
  }

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "create",
    entityId: periodId,
    after: { period: month, assignments: assignments.length, warnings: warnings.length },
  });

  revalidateSchedule();

  return {
    success:
      warnings.length === 0
        ? `Draft ${monthLabel(month)} dibuat: ${assignments.length} penugasan.`
        : `Draft ${monthLabel(month)} dibuat: ${assignments.length} penugasan, ${warnings.length} shift masih kurang host.`,
  };
}

export async function publishScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const month = String(formData.get("bulan") ?? "");
  if (!month) return { error: "Periode tidak dikenal." };

  const { start, end } = monthRange(month);
  const supabase = await createClient();

  const { data: drafts } = await supabase
    .from("schedule_assignments")
    .select("id, host_id")
    .gte("work_date", start)
    .lte("work_date", end)
    .eq("status", "draft");

  if (!drafts || drafts.length === 0) {
    return { error: "Tidak ada draft yang perlu dipublish untuk periode ini." };
  }

  const { error } = await supabase
    .from("schedule_assignments")
    .update({ status: "published" })
    .gte("work_date", start)
    .lte("work_date", end)
    .eq("status", "draft");

  if (error) return { error: "Gagal mem-publish jadwal." };

  await supabase
    .from("schedule_periods")
    .update({ status: "published", published_at: new Date().toISOString(), published_by: admin.id })
    .eq("start_date", start)
    .eq("end_date", end);

  const hostIds = [...new Set(drafts.map((row) => row.host_id as string))];

  await notifyUsers({
    userIds: hostIds,
    type: "schedule_published",
    title: "Jadwal baru terbit",
    body: `Jadwal ${monthLabel(month)} sudah dipublish. Cek shift kamu.`,
    link: "/jadwal",
  });

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "publish",
    after: { period: month, assignments: drafts.length, hosts: hostIds.length },
  });

  revalidateSchedule();
  return { success: `Jadwal ${monthLabel(month)} dipublish ke ${hostIds.length} host.` };
}

/**
 * Menghapus jadwal satu periode bulanan.
 *
 * Dipakai bila jadwal yang tersusun perlu dibongkar dan dibuat ulang dari nol.
 * Admin memilih sendiri bulan mana yang direset, dan bisa membatasi hanya pada
 * draft supaya jadwal yang sudah dilihat host tidak ikut hilang.
 */
export async function resetScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const month = String(formData.get("bulan") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Pilih bulan yang mau direset." };

  const scope = String(formData.get("cakupan") ?? "draft") === "semua" ? "semua" : "draft";

  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "HAPUS") {
    return { error: "Ketik HAPUS pada kotak konfirmasi untuk melanjutkan." };
  }

  const { start, end } = monthRange(month);
  const supabase = await createClient();

  let existingQuery = supabase
    .from("schedule_assignments")
    .select("id, host_id, status")
    .gte("work_date", start)
    .lte("work_date", end);

  if (scope === "draft") existingQuery = existingQuery.eq("status", "draft");

  const { data: existing, error: readError } = await existingQuery;
  if (readError) return { error: "Gagal membaca jadwal periode ini." };

  const rows = existing ?? [];
  if (rows.length === 0) {
    if (scope === "draft") {
      // Bedakan "memang kosong" dari "semuanya sudah terbit", supaya admin tahu
      // cukup mengganti cakupan alih-alih mengira fiturnya rusak.
      const { count: terbit } = await supabase
        .from("schedule_assignments")
        .select("id", { count: "exact", head: true })
        .gte("work_date", start)
        .lte("work_date", end)
        .eq("status", "published");

      if ((terbit ?? 0) > 0) {
        return {
          error:
            `Tidak ada draft di ${monthLabel(month)} — ${terbit} penugasan di bulan itu sudah terbit. ` +
            'Pilih cakupan "Semua jadwal" bila memang mau menghapusnya.',
        };
      }

      return { error: `Tidak ada jadwal sama sekali di ${monthLabel(month)}.` };
    }

    return { error: `Tidak ada jadwal di ${monthLabel(month)}.` };
  }

  const { error: deleteError } = await supabase
    .from("schedule_assignments")
    .delete()
    .in(
      "id",
      rows.map((row) => row.id as string),
    );

  if (deleteError) return { error: "Gagal menghapus jadwal. Coba lagi." };

  const publishedRemoved = rows.filter((row) => row.status === "published");

  // Periode dikembalikan ke draft hanya bila tidak ada lagi jadwal terbit di dalamnya.
  const { count: sisaPublished } = await supabase
    .from("schedule_assignments")
    .select("id", { count: "exact", head: true })
    .gte("work_date", start)
    .lte("work_date", end)
    .eq("status", "published");

  if ((sisaPublished ?? 0) === 0) {
    await supabase
      .from("schedule_periods")
      .update({ status: "draft", published_at: null, published_by: null })
      .eq("start_date", start)
      .eq("end_date", end);
  }

  // Host yang jadwal terbitnya ikut terhapus perlu tahu, karena shift yang
  // sudah mereka lihat di aplikasi tiba-tiba hilang.
  if (publishedRemoved.length > 0) {
    const hostIds = [...new Set(publishedRemoved.map((row) => row.host_id as string))];
    await notifyUsers({
      userIds: hostIds,
      type: "schedule_published",
      title: "Jadwal ditarik kembali",
      body: `Jadwal ${monthLabel(month)} sedang disusun ulang admin. Cek lagi setelah terbit.`,
      link: "/jadwal",
    });
  }

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "delete",
    before: {
      period: month,
      scope,
      assignments: rows.length,
      published: publishedRemoved.length,
    },
  });

  revalidateSchedule();

  const rincian =
    publishedRemoved.length > 0
      ? ` (${publishedRemoved.length} di antaranya sudah terbit)`
      : "";

  return { success: `${rows.length} penugasan di ${monthLabel(month)} dihapus${rincian}.` };
}

/**
 * Menghapus beberapa penugasan sekaligus dari satu hari.
 *
 * Dipakai oleh mode tandai di editor harian: admin mencentang beberapa nama
 * lalu menghapusnya dalam satu langkah, jauh lebih cepat daripada satu per satu.
 */
export async function removeAssignmentsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const ids = formData
    .getAll("assignmentIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (ids.length === 0) return { error: "Tandai dulu penugasan yang mau dihapus." };

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("schedule_assignments")
    .select("id, host_id, work_date, shift_id, status")
    .in("id", ids);

  if (readError) return { error: "Gagal membaca penugasan yang ditandai." };

  const rows = before ?? [];
  if (rows.length === 0) return { error: "Penugasan tidak ditemukan — mungkin sudah dihapus." };

  const { error } = await supabase
    .from("schedule_assignments")
    .delete()
    .in(
      "id",
      rows.map((row) => row.id as string),
    );

  if (error) return { error: "Gagal menghapus penugasan." };

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "delete",
    before: {
      assignments: rows.length,
      work_dates: [...new Set(rows.map((row) => row.work_date as string))],
      published: rows.filter((row) => row.status === "published").length,
    },
  });

  // Host yang jadwal terbitnya dicabut perlu tahu, karena shift itu sudah
  // muncul di aplikasi mereka.
  const publishedHosts = [
    ...new Set(rows.filter((row) => row.status === "published").map((row) => row.host_id as string)),
  ];

  if (publishedHosts.length > 0) {
    await notifyUsers({
      userIds: publishedHosts,
      type: "schedule_published",
      title: "Jadwal kamu berubah",
      body: "Ada shift yang dicabut admin. Cek jadwal terbarumu.",
      link: "/jadwal",
    });
  }

  revalidateSchedule();
  return { success: `${rows.length} penugasan dihapus.` };
}

/**
 * Memindahkan satu penugasan ke shift lain di hari yang sama.
 *
 * Ini bentuk "edit" yang paling sering dibutuhkan: hostnya benar, shiftnya yang
 * keliru. Pemeriksaan bentrok jamnya sama dengan saat menambah host baru.
 */
export async function moveAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!assignmentId || !shiftId) return { error: "Pilih shift tujuan terlebih dahulu." };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("schedule_assignments")
    .select("id, host_id, work_date, shift_id, status")
    .eq("id", assignmentId)
    .single();

  if (!current) return { error: "Penugasan tidak ditemukan." };
  if (current.shift_id === shiftId) return { error: "Penugasan sudah berada di shift itu." };

  const { data: shift } = await supabase.from("shifts").select("*").eq("id", shiftId).single();
  if (!shift) return { error: "Shift tujuan tidak ditemukan." };

  const workDate = current.work_date as string;

  const { data: sameDay } = await supabase
    .from("schedule_assignments")
    .select("id, work_date, shifts(name, start_time, end_time)")
    .eq("host_id", current.host_id as string)
    .eq("work_date", workDate)
    .neq("id", assignmentId);

  const conflict = (sameDay ?? []).find((row) => {
    const other = row.shifts as unknown as Pick<Shift, "name" | "start_time" | "end_time"> | null;
    if (!other) return false;
    return overlaps(
      { workDate, startTime: (shift as Shift).start_time, endTime: (shift as Shift).end_time },
      { workDate: row.work_date as string, startTime: other.start_time, endTime: other.end_time },
    );
  });

  if (conflict) {
    const other = conflict.shifts as unknown as { name: string };
    return { error: `Host ini sudah dijadwalkan di ${other.name} pada jam yang bertumpuk.` };
  }

  const { error } = await supabase
    .from("schedule_assignments")
    .update({ shift_id: shiftId, source: "manual" })
    .eq("id", assignmentId);

  if (error) return { error: "Gagal memindahkan penugasan." };

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: "update",
    entityId: assignmentId,
    targetUserId: current.host_id as string,
    before: { shift_id: current.shift_id, work_date: workDate },
    after: { shift_id: shiftId, work_date: workDate },
  });

  revalidateSchedule();
  return { success: `Penugasan dipindah ke ${(shift as Shift).name}.` };
}
