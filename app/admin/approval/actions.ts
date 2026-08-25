"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";
import { LEAVE_TYPE_LABEL } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/datetime";
import { monthLabel } from "@/lib/utils/period";

export type ActionState = { error?: string; success?: string };

const reviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300).optional(),
});

function revalidateApproval() {
  revalidatePath("/admin/approval");
  revalidatePath("/admin/dashboard");
  revalidatePath("/pengajuan");
}

export async function reviewLeaveRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const { requestId, decision, note } = parsed.data;
  if (decision === "rejected" && (!note || note.length < 5)) {
    return { error: "Tuliskan alasan penolakan minimal 5 karakter." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("leave_requests")
    .select("*, profiles!leave_requests_host_id_fkey(full_name)")
    .eq("id", requestId)
    .single();

  if (!before) return { error: "Pengajuan tidak ditemukan." };
  if (before.status !== "pending") return { error: "Pengajuan ini sudah diproses." };

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: decision,
      review_note: note || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: "Gagal menyimpan keputusan." };

  const typeLabel = LEAVE_TYPE_LABEL[before.type as "weekly_off" | "urgent"];
  await notifyUsers({
    userIds: [before.host_id as string],
    type: "approval",
    title: decision === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak",
    body:
      decision === "approved"
        ? `${typeLabel} ${formatDate(before.requested_date as string)} disetujui.`
        : `${typeLabel} ${formatDate(before.requested_date as string)} ditolak. ${note ?? ""}`.trim(),
    link: "/pengajuan",
  });

  await logAudit({
    actorId: admin.id,
    entity: "leave_request",
    action: decision === "approved" ? "approve" : "reject",
    entityId: requestId,
    targetUserId: before.host_id as string,
    before: { status: before.status },
    after: { status: decision, review_note: note ?? null },
  });

  revalidateApproval();
  return {
    success:
      decision === "approved" ? "Pengajuan disetujui dan host diberi tahu." : "Pengajuan ditolak dan host diberi tahu.",
  };
}

export async function toggleWeeklyOffWindowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const open = String(formData.get("open") ?? "") === "true";
  const period = String(formData.get("period") ?? "").trim();

  if (open && !/^\d{4}-\d{2}$/.test(period)) {
    return { error: "Pilih periode bulan yang dibuka." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      weekly_off_request_open: open,
      weekly_off_request_period: open ? `${period}-01` : null,
    })
    .eq("id", 1);

  if (error) return { error: "Gagal menyimpan pengaturan pengajuan." };

  await logAudit({
    actorId: admin.id,
    entity: "settings",
    action: "update",
    after: { weekly_off_request_open: open, weekly_off_request_period: open ? period : null },
  });

  revalidateApproval();
  revalidatePath("/pengajuan");

  return {
    success: open
      ? `Pengajuan libur mingguan dibuka untuk ${monthLabel(period)}.`
      : "Pengajuan libur mingguan ditutup.",
  };
}
