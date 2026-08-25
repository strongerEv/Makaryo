"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { evaluateClockIn, workedMinutesBetween } from "@/lib/attendance/status";
import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const manualSchema = z.object({
  hostId: z.string().uuid("Host wajib dipilih."),
  workDate: z.string().min(10, "Tanggal wajib diisi."),
  clockIn: z.string().regex(timePattern, "Jam clock in tidak valid."),
  clockOut: z.string().regex(timePattern, "Jam clock out tidak valid.").optional().or(z.literal("")),
  note: z.string().trim().max(300).optional(),
});

const correctionSchema = z.object({
  attendanceId: z.string().uuid(),
  clockIn: z.string().regex(timePattern, "Jam clock in tidak valid."),
  clockOut: z.string().regex(timePattern, "Jam clock out tidak valid.").optional().or(z.literal("")),
  note: z.string().trim().max(300).optional(),
});

/** Menggabungkan tanggal kerja dan jam WIB menjadi instant UTC. */
function toInstant(workDate: string, time: string) {
  return new Date(`${workDate}T${time}:00+07:00`);
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

function revalidateAttendance() {
  revalidatePath("/admin/absensi");
  revalidatePath("/admin/dashboard");
}

export async function recordManualAttendanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = manualSchema.safeParse({
    hostId: formData.get("hostId"),
    workDate: formData.get("workDate"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") ?? "",
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { hostId, workDate, clockIn, clockOut, note } = parsed.data;

  const { data: assignment } = await supabase
    .from("schedule_assignments")
    .select("id, shifts(start_time)")
    .eq("host_id", hostId)
    .eq("work_date", workDate)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  const shift = assignment?.shifts as unknown as { start_time: string } | null;
  const clockInAt = toInstant(workDate, clockIn);
  const clockOutAt = clockOut ? toInstant(workDate, clockOut) : null;

  if (clockOutAt && clockOutAt.getTime() <= clockInAt.getTime()) {
    clockOutAt.setUTCDate(clockOutAt.getUTCDate() + 1);
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("late_tolerance_minutes")
    .eq("id", 1)
    .single();

  const { status, lateMinutes } = evaluateClockIn({
    clockInAt,
    workDate,
    shiftStartTime: shift?.start_time ?? null,
    toleranceMinutes: settings?.late_tolerance_minutes ?? 0,
  });

  const { data: inserted, error } = await supabase
    .from("attendances")
    .insert({
      host_id: hostId,
      assignment_id: assignment?.id ?? null,
      work_date: workDate,
      clock_in_at: clockInAt.toISOString(),
      clock_out_at: clockOutAt?.toISOString() ?? null,
      status,
      late_minutes: lateMinutes,
      worked_minutes: clockOutAt ? workedMinutesBetween(clockInAt, clockOutAt) : 0,
      note: note || "Dicatat manual oleh admin.",
      recorded_by: admin.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Host ini sudah punya catatan absensi untuk tanggal tersebut."
          : "Gagal menyimpan absensi manual.",
    };
  }

  await logAudit({
    actorId: admin.id,
    entity: "attendance",
    action: "create",
    entityId: inserted?.id ?? null,
    targetUserId: hostId,
    after: { work_date: workDate, clock_in: clockIn, clock_out: clockOut || null, status },
  });

  revalidateAttendance();
  return { success: "Absensi manual tersimpan." };
}

export async function correctAttendanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = correctionSchema.safeParse({
    attendanceId: formData.get("attendanceId"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") ?? "",
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("attendances")
    .select("*")
    .eq("id", parsed.data.attendanceId)
    .single();

  if (!before) return { error: "Data absensi tidak ditemukan." };

  const clockInAt = toInstant(before.work_date, parsed.data.clockIn);
  const clockOutAt = parsed.data.clockOut ? toInstant(before.work_date, parsed.data.clockOut) : null;
  if (clockOutAt && clockOutAt.getTime() <= clockInAt.getTime()) {
    clockOutAt.setUTCDate(clockOutAt.getUTCDate() + 1);
  }

  const { data: assignment } = before.assignment_id
    ? await supabase
        .from("schedule_assignments")
        .select("shifts(start_time)")
        .eq("id", before.assignment_id)
        .maybeSingle()
    : { data: null };

  const shift = assignment?.shifts as unknown as { start_time: string } | null;

  const { data: settings } = await supabase
    .from("app_settings")
    .select("late_tolerance_minutes")
    .eq("id", 1)
    .single();

  const { status, lateMinutes } = evaluateClockIn({
    clockInAt,
    workDate: before.work_date,
    shiftStartTime: shift?.start_time ?? null,
    toleranceMinutes: settings?.late_tolerance_minutes ?? 0,
  });

  const { error } = await supabase
    .from("attendances")
    .update({
      clock_in_at: clockInAt.toISOString(),
      clock_out_at: clockOutAt?.toISOString() ?? null,
      status,
      late_minutes: lateMinutes,
      worked_minutes: clockOutAt ? workedMinutesBetween(clockInAt, clockOutAt) : 0,
      auto_closed: false,
      note: parsed.data.note || before.note,
    })
    .eq("id", parsed.data.attendanceId);

  if (error) return { error: "Gagal menyimpan koreksi." };

  await logAudit({
    actorId: admin.id,
    entity: "attendance",
    action: "update",
    entityId: parsed.data.attendanceId,
    targetUserId: before.host_id,
    before: {
      clock_in_at: before.clock_in_at,
      clock_out_at: before.clock_out_at,
      status: before.status,
    },
    after: { clock_in_at: clockInAt.toISOString(), clock_out_at: clockOutAt?.toISOString() ?? null, status },
  });

  revalidateAttendance();
  return { success: "Koreksi absensi tersimpan." };
}
