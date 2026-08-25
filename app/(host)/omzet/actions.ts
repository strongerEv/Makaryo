"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/session";
import { uploadPhoto } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string };

const schema = z.object({
  workDate: z.string().min(10, "Tanggal wajib diisi."),
  shiftId: z.string().uuid("Shift wajib dipilih."),
  amount: z.coerce.number().min(0, "Nominal tidak boleh negatif."),
  note: z.string().trim().max(300).optional(),
  hostId: z.string().uuid().optional(),
});

function revalidateRevenue() {
  revalidatePath("/omzet");
  revalidatePath("/beranda");
  revalidatePath("/admin/omzet");
  revalidatePath("/admin/dashboard");
}

export async function submitRevenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireActiveProfile();

  const parsed = schema.safeParse({
    workDate: formData.get("workDate"),
    shiftId: formData.get("shiftId"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? undefined,
    hostId: formData.get("hostId") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  // Host hanya boleh melaporkan omzetnya sendiri; admin boleh atas nama host lain.
  const hostId = profile.role === "admin" ? (parsed.data.hostId ?? profile.id) : profile.id;
  const supabase = await createClient();

  let proofPath: string | null = null;
  const proof = formData.get("proof");
  if (proof instanceof File && proof.size > 0) {
    try {
      proofPath = await uploadPhoto(supabase, "revenue", profile.id, proof, "bukti");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Gagal mengunggah bukti." };
    }
  }

  const { data: inserted, error } = await supabase
    .from("revenue_reports")
    .insert({
      host_id: hostId,
      shift_id: parsed.data.shiftId,
      work_date: parsed.data.workDate,
      amount: parsed.data.amount,
      proof_url: proofPath,
      note: parsed.data.note || null,
      submitted_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Gagal menyimpan laporan omzet." };

  await logAudit({
    actorId: profile.id,
    entity: "revenue",
    action: "create",
    entityId: inserted?.id ?? null,
    targetUserId: hostId,
    after: { work_date: parsed.data.workDate, amount: parsed.data.amount, shift_id: parsed.data.shiftId },
  });

  revalidateRevenue();
  return { success: "Laporan omzet tersimpan." };
}

export async function updateRevenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireActiveProfile();
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return { error: "Laporan tidak ditemukan." };

  const parsed = schema.safeParse({
    workDate: formData.get("workDate"),
    shiftId: formData.get("shiftId"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("revenue_reports").select("*").eq("id", reportId).single();
  if (!before) return { error: "Laporan tidak ditemukan." };
  if (profile.role !== "admin" && before.host_id !== profile.id) {
    return { error: "Kamu hanya bisa mengubah laporan milikmu sendiri." };
  }

  let proofPath: string | null = before.proof_url;
  const proof = formData.get("proof");
  if (proof instanceof File && proof.size > 0) {
    try {
      proofPath = await uploadPhoto(supabase, "revenue", profile.id, proof, "bukti");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Gagal mengunggah bukti." };
    }
  }

  const { error } = await supabase
    .from("revenue_reports")
    .update({
      work_date: parsed.data.workDate,
      shift_id: parsed.data.shiftId,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      proof_url: proofPath,
    })
    .eq("id", reportId);

  if (error) return { error: "Gagal menyimpan revisi." };

  // Revisi setelah submit awal wajib tercatat di audit log.
  await logAudit({
    actorId: profile.id,
    entity: "revenue",
    action: "update",
    entityId: reportId,
    targetUserId: before.host_id,
    before: { amount: before.amount, work_date: before.work_date, shift_id: before.shift_id },
    after: { amount: parsed.data.amount, work_date: parsed.data.workDate, shift_id: parsed.data.shiftId },
  });

  revalidateRevenue();
  return { success: "Revisi laporan tersimpan." };
}
