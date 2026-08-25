"use server";

import { revalidatePath } from "next/cache";

import { evaluateClockIn, workedMinutesBetween } from "@/lib/attendance/status";
import { requireHost } from "@/lib/auth/session";
import { uploadPhoto } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import { todayInJakarta } from "@/lib/utils/datetime";

export type AttendanceResult = { error?: string; success?: string };

function readCoordinate(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function clockInAction(formData: FormData): Promise<AttendanceResult> {
  const profile = await requireHost();
  const supabase = await createClient();

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Foto absensi wajib diambil." };

  const assignmentId = String(formData.get("assignmentId") ?? "") || null;
  let workDate = todayInJakarta();
  let shiftStartTime: string | null = null;

  if (assignmentId) {
    const { data: assignment } = await supabase
      .from("schedule_assignments")
      .select("id, work_date, host_id, status, shifts(start_time)")
      .eq("id", assignmentId)
      .single();

    if (!assignment || assignment.host_id !== profile.id || assignment.status !== "published") {
      return { error: "Jadwal tidak ditemukan atau bukan milikmu." };
    }

    workDate = assignment.work_date;
    const shift = assignment.shifts as unknown as { start_time: string } | null;
    shiftStartTime = shift?.start_time ?? null;
  }

  let existingQuery = supabase
    .from("attendances")
    .select("id, clock_in_at")
    .eq("host_id", profile.id)
    .eq("work_date", workDate);

  existingQuery = assignmentId
    ? existingQuery.eq("assignment_id", assignmentId)
    : existingQuery.is("assignment_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing?.clock_in_at) return { error: "Kamu sudah clock in untuk shift ini." };

  const { data: settings } = await supabase
    .from("app_settings")
    .select("late_tolerance_minutes")
    .eq("id", 1)
    .single();

  const clockInAt = new Date();
  const { status, lateMinutes } = evaluateClockIn({
    clockInAt,
    workDate,
    shiftStartTime,
    toleranceMinutes: settings?.late_tolerance_minutes ?? 0,
  });

  let photoPath: string;
  try {
    photoPath = await uploadPhoto(supabase, "attendance", profile.id, photo, "in");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengunggah foto." };
  }

  const { error } = await supabase.from("attendances").insert({
    host_id: profile.id,
    assignment_id: assignmentId,
    work_date: workDate,
    clock_in_at: clockInAt.toISOString(),
    clock_in_photo: photoPath,
    clock_in_lat: readCoordinate(formData, "latitude"),
    clock_in_lng: readCoordinate(formData, "longitude"),
    status,
    late_minutes: lateMinutes,
    recorded_by: profile.id,
  });

  if (error) {
    return { error: "Gagal menyimpan absensi. Coba lagi." };
  }

  revalidatePath("/absen");
  revalidatePath("/beranda");
  return { success: status === "late" ? `Clock in tercatat — telat ${lateMinutes} menit.` : "Clock in tercatat." };
}

export async function clockOutAction(formData: FormData): Promise<AttendanceResult> {
  const profile = await requireHost();
  const supabase = await createClient();

  const attendanceId = String(formData.get("attendanceId") ?? "");
  if (!attendanceId) return { error: "Data absensi tidak ditemukan." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Foto absensi wajib diambil." };

  const { data: attendance } = await supabase
    .from("attendances")
    .select("id, host_id, clock_in_at, clock_out_at")
    .eq("id", attendanceId)
    .single();

  if (!attendance || attendance.host_id !== profile.id) return { error: "Data absensi tidak ditemukan." };
  if (!attendance.clock_in_at) return { error: "Kamu belum clock in untuk shift ini." };
  if (attendance.clock_out_at) return { error: "Kamu sudah clock out untuk shift ini." };

  let photoPath: string;
  try {
    photoPath = await uploadPhoto(supabase, "attendance", profile.id, photo, "out");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengunggah foto." };
  }

  const clockOutAt = new Date();
  const { error } = await supabase
    .from("attendances")
    .update({
      clock_out_at: clockOutAt.toISOString(),
      clock_out_photo: photoPath,
      clock_out_lat: readCoordinate(formData, "latitude"),
      clock_out_lng: readCoordinate(formData, "longitude"),
      worked_minutes: workedMinutesBetween(attendance.clock_in_at, clockOutAt),
      auto_closed: false,
    })
    .eq("id", attendanceId);

  if (error) return { error: "Gagal menyimpan clock out. Coba lagi." };

  revalidatePath("/absen");
  revalidatePath("/beranda");
  return { success: "Clock out tercatat. Terima kasih!" };
}
