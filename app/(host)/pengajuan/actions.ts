"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireHost } from "@/lib/auth/session";
import { getAdminIds, notifyUsers } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";
import { LEAVE_TYPE_LABEL } from "@/lib/types/database";
import { formatDate, todayInJakarta } from "@/lib/utils/datetime";
import { addDays, monthRange } from "@/lib/utils/period";

export type ActionState = { error?: string; success?: string };

/** Izin mendadak wajib diajukan minimal H-3. */
const URGENT_MIN_LEAD_DAYS = 3;

const schema = z.object({
  type: z.enum(["weekly_off", "urgent"]),
  requestedDate: z.string().min(10, "Tanggal wajib diisi."),
  reason: z.string().trim().max(300).optional(),
});

export async function submitLeaveRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireHost();

  const parsed = schema.safeParse({
    type: formData.get("type"),
    requestedDate: formData.get("requestedDate"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const { type, requestedDate, reason } = parsed.data;
  const today = todayInJakarta();
  const supabase = await createClient();

  if (type === "urgent") {
    if (!reason || reason.length < 5) return { error: "Alasan izin wajib diisi minimal 5 karakter." };
    if (requestedDate < addDays(today, URGENT_MIN_LEAD_DAYS)) {
      return { error: `Izin mendadak wajib diajukan minimal H-${URGENT_MIN_LEAD_DAYS} sebelum tanggalnya.` };
    }
  }

  if (type === "weekly_off") {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("weekly_off_request_open, weekly_off_request_period")
      .eq("id", 1)
      .single();

    if (!settings?.weekly_off_request_open) {
      return { error: "Pengajuan libur mingguan sedang ditutup admin." };
    }

    if (settings.weekly_off_request_period) {
      const { start, end } = monthRange(String(settings.weekly_off_request_period).slice(0, 7));
      if (requestedDate < start || requestedDate > end) {
        return { error: `Tanggal harus berada di periode ${formatDate(start)} – ${formatDate(end)}.` };
      }
    }
  }

  const { error } = await supabase.from("leave_requests").insert({
    host_id: profile.id,
    type,
    requested_date: requestedDate,
    reason: reason || null,
    status: "pending",
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Kamu sudah mengajukan untuk tanggal tersebut."
          : "Gagal mengirim pengajuan. Coba lagi.",
    };
  }

  const adminIds = await getAdminIds();
  await notifyUsers({
    userIds: adminIds,
    type: "new_request",
    title: "Pengajuan baru masuk",
    body: `${profile.full_name} mengajukan ${LEAVE_TYPE_LABEL[type].toLowerCase()} untuk ${formatDate(requestedDate)}.`,
    link: "/admin/approval",
  });

  revalidatePath("/pengajuan");
  revalidatePath("/admin/approval");
  return { success: "Pengajuan terkirim dan menunggu persetujuan admin." };
}

export async function cancelLeaveRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireHost();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { error: "Pengajuan tidak ditemukan." };

  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").delete().eq("id", requestId).eq("status", "pending");

  if (error) return { error: "Gagal membatalkan pengajuan." };

  revalidatePath("/pengajuan");
  revalidatePath("/admin/approval");
  return { success: "Pengajuan dibatalkan." };
}
