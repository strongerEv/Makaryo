"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftSchema = z.object({
  name: z.string().trim().min(2, "Nama shift minimal 2 karakter."),
  startTime: z.string().regex(timePattern, "Jam mulai tidak valid."),
  endTime: z.string().regex(timePattern, "Jam selesai tidak valid."),
  minHosts: z.coerce.number().int().min(0, "Minimum host tidak boleh negatif.").max(99),
  color: z.enum(["primary", "coral", "amber", "emerald", "sky"]),
  sortOrder: z.coerce.number().int().min(0).max(99),
});

const settingsSchema = z.object({
  lateToleranceMinutes: z.coerce.number().int().min(0, "Toleransi telat tidak boleh negatif.").max(120),
  operationalStart: z.string().regex(timePattern, "Jam operasional mulai tidak valid."),
  operationalEnd: z.string().regex(timePattern, "Jam operasional selesai tidak valid."),
});

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

function parseShiftForm(formData: FormData) {
  return shiftSchema.safeParse({
    name: formData.get("name"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    minHosts: formData.get("minHosts") ?? 1,
    color: formData.get("color") ?? "primary",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

export async function createShiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseShiftForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .insert({
      name: parsed.data.name,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      min_hosts: parsed.data.minHosts,
      color: parsed.data.color,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error) return { error: "Gagal membuat shift. Coba lagi." };

  await logAudit({
    actorId: admin.id,
    entity: "shift",
    action: "create",
    entityId: data?.id ?? null,
    after: { ...parsed.data },
  });

  revalidatePath("/admin/shift");
  return { success: `Shift ${parsed.data.name} dibuat.` };
}

export async function updateShiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return { error: "Shift tidak ditemukan." };

  const parsed = parseShiftForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: before } = await supabase.from("shifts").select("*").eq("id", shiftId).single();

  const { error } = await supabase
    .from("shifts")
    .update({
      name: parsed.data.name,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      min_hosts: parsed.data.minHosts,
      color: parsed.data.color,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", shiftId);

  if (error) return { error: "Gagal menyimpan perubahan shift." };

  await logAudit({
    actorId: admin.id,
    entity: "shift",
    action: "update",
    entityId: shiftId,
    before: before ?? undefined,
    after: { ...parsed.data },
  });

  revalidatePath("/admin/shift");
  return { success: "Perubahan shift tersimpan." };
}

export async function toggleShiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const shiftId = String(formData.get("shiftId") ?? "");
  const nextActive = String(formData.get("isActive") ?? "") === "true";
  if (!shiftId) return { error: "Shift tidak ditemukan." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("shifts").select("*").eq("id", shiftId).single();
  if (!before) return { error: "Shift tidak ditemukan." };

  const { error } = await supabase.from("shifts").update({ is_active: nextActive }).eq("id", shiftId);
  if (error) return { error: "Gagal mengubah status shift." };

  await logAudit({
    actorId: admin.id,
    entity: "shift",
    action: "update",
    entityId: shiftId,
    before: { is_active: before.is_active },
    after: { is_active: nextActive },
  });

  revalidatePath("/admin/shift");
  return {
    success: nextActive ? `Shift ${before.name} diaktifkan.` : `Shift ${before.name} dinonaktifkan.`,
  };
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    lateToleranceMinutes: formData.get("lateToleranceMinutes") ?? 0,
    operationalStart: formData.get("operationalStart"),
    operationalEnd: formData.get("operationalEnd"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: before } = await supabase.from("app_settings").select("*").eq("id", 1).single();

  const { error } = await supabase
    .from("app_settings")
    .update({
      late_tolerance_minutes: parsed.data.lateToleranceMinutes,
      operational_start: parsed.data.operationalStart,
      operational_end: parsed.data.operationalEnd,
    })
    .eq("id", 1);

  if (error) return { error: "Gagal menyimpan pengaturan." };

  await logAudit({
    actorId: admin.id,
    entity: "settings",
    action: "update",
    before: before ?? undefined,
    after: { ...parsed.data },
  });

  revalidatePath("/admin/shift");
  return { success: "Pengaturan tersimpan." };
}
