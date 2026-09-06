"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireHost } from "@/lib/auth/session";
import { isSwapLeadTimeValid, SWAP_MIN_LEAD_DAYS } from "@/lib/leave/rules";
import { getAdminIds, notifyUsers } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";

export type ActionState = { error?: string; success?: string };

const schema = z.object({
  requesterAssignmentId: z.string().uuid("Pilih shift milikmu yang mau ditukar."),
  targetAssignmentId: z.string().uuid("Pilih shift tujuan yang mau ditukar."),
  reason: z.string().trim().max(500, "Alasan maksimal 500 karakter.").optional(),
});

/**
 * Host mengajukan tukar shift dengan host lain.
 *
 * Yang disimpan adalah kedua penugasannya, bukan sekadar tanggal — jadi saat
 * admin menyetujui, penukarannya tinggal menukar host pada dua baris itu dan
 * tidak bisa salah sasaran walau jadwalnya sempat digeser.
 */
export async function submitSwapRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireHost();

  const parsed = schema.safeParse({
    requesterAssignmentId: formData.get("requesterAssignmentId"),
    targetAssignmentId: formData.get("targetAssignmentId"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const { requesterAssignmentId, targetAssignmentId, reason } = parsed.data;
  if (requesterAssignmentId === targetAssignmentId) {
    return { error: "Pilih dua shift yang berbeda." };
  }

  const supabase = await createClient();
  const today = todayInJakarta();

  const { data: rows } = await supabase
    .from("schedule_assignments")
    .select("id, host_id, work_date, status, shifts(name), profiles(full_name)")
    .in("id", [requesterAssignmentId, targetAssignmentId]);

  const milikku = (rows ?? []).find((row) => row.id === requesterAssignmentId);
  const tujuan = (rows ?? []).find((row) => row.id === targetAssignmentId);

  if (!milikku || !tujuan) return { error: "Shift tidak ditemukan — mungkin jadwalnya sudah berubah." };
  if (milikku.host_id !== profile.id) return { error: "Kamu hanya bisa menukar shift milikmu sendiri." };
  if (tujuan.host_id === profile.id) return { error: "Pilih shift milik host lain sebagai tujuan." };

  if (milikku.status !== "published" || tujuan.status !== "published") {
    return { error: "Hanya jadwal yang sudah terbit yang bisa ditukar." };
  }

  for (const baris of [milikku, tujuan]) {
    if (!isSwapLeadTimeValid(baris.work_date as string, today)) {
      return {
        error:
          `Shift ${formatDate(baris.work_date as string)} sudah lewat batas. ` +
          `Tukar shift wajib diajukan minimal H-${SWAP_MIN_LEAD_DAYS} sebelum tanggalnya.`,
      };
    }
  }

  const { error } = await supabase.from("shift_swap_requests").insert({
    requester_id: profile.id,
    requester_assignment_id: requesterAssignmentId,
    target_id: tujuan.host_id as string,
    target_assignment_id: targetAssignmentId,
    reason: reason || null,
  });

  if (error) {
    // Indeks unik parsial menjaga satu penugasan hanya punya satu pengajuan
    // yang masih menunggu, dari sisi mana pun.
    if (error.code === "23505") {
      return { error: "Salah satu shift itu sudah ada pengajuan tukar yang menunggu persetujuan." };
    }
    return { error: "Gagal mengirim pengajuan tukar shift." };
  }

  const namaTujuan =
    (tujuan.profiles as unknown as { full_name: string } | null)?.full_name ?? "host lain";

  await notifyUsers({
    userIds: await getAdminIds(),
    type: "new_request",
    title: "Pengajuan tukar shift",
    body: `${profile.full_name} ingin tukar shift dengan ${namaTujuan}.`,
    link: "/admin/approval",
  });

  await notifyUsers({
    userIds: [tujuan.host_id as string],
    type: "new_request",
    title: "Kamu diajak tukar shift",
    body: `${profile.full_name} mengajukan tukar shift denganmu. Menunggu persetujuan admin.`,
    link: "/tukar-shift",
  });

  revalidatePath("/tukar-shift");
  revalidatePath("/admin/approval");

  return { success: "Pengajuan tukar shift terkirim. Menunggu persetujuan admin." };
}

/** Membatalkan pengajuan yang masih menunggu. */
export async function cancelSwapRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireHost();
  const id = String(formData.get("requestId") ?? "");
  if (!id) return { error: "Pengajuan tidak dikenal." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_swap_requests")
    .delete()
    .eq("id", id)
    .eq("requester_id", profile.id)
    .eq("status", "pending");

  if (error) return { error: "Gagal membatalkan pengajuan." };

  revalidatePath("/tukar-shift");
  revalidatePath("/admin/approval");
  return { success: "Pengajuan dibatalkan." };
}
