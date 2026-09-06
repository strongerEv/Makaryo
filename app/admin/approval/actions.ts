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
  const quotaRaw = Number(formData.get("quotaPerDate"));
  const quota = Number.isInteger(quotaRaw) && quotaRaw >= 1 && quotaRaw <= 20 ? quotaRaw : null;

  if (open && !/^\d{4}-\d{2}$/.test(period)) {
    return { error: "Pilih periode bulan yang dibuka." };
  }

  if (formData.has("quotaPerDate") && quota === null) {
    return { error: "Kuota per tanggal harus antara 1 sampai 20 host." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      weekly_off_request_open: open,
      weekly_off_request_period: open ? `${period}-01` : null,
      ...(quota === null ? {} : { weekly_off_quota_per_date: quota }),
    })
    .eq("id", 1);

  if (error) return { error: "Gagal menyimpan pengaturan pengajuan." };

  await logAudit({
    actorId: admin.id,
    entity: "settings",
    action: "update",
    after: {
      weekly_off_request_open: open,
      weekly_off_request_period: open ? period : null,
      ...(quota === null ? {} : { weekly_off_quota_per_date: quota }),
    },
  });

  revalidateApproval();
  revalidatePath("/pengajuan");

  return {
    success: open
      ? `Pengajuan libur mingguan dibuka untuk ${monthLabel(period)}.`
      : "Pengajuan libur mingguan ditutup.",
  };
}

/**
 * Menyetujui atau menolak pengajuan tukar shift.
 *
 * Saat disetujui, host pada kedua penugasan benar-benar ditukar — jadi jadwal
 * yang dilihat kedua host langsung berubah tanpa admin menyunting manual.
 */
export async function reviewSwapRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: "Keputusan tidak valid." };

  const { requestId, decision, note } = parsed.data;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("shift_swap_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Pengajuan tidak ditemukan." };
  if (request.status !== "pending") return { error: "Pengajuan ini sudah diproses sebelumnya." };

  if (decision === "approved") {
    const { data: rows } = await supabase
      .from("schedule_assignments")
      .select("id, host_id, work_date, shifts(name)")
      .in("id", [request.requester_assignment_id, request.target_assignment_id]);

    const milikPengaju = (rows ?? []).find((row) => row.id === request.requester_assignment_id);
    const milikTujuan = (rows ?? []).find((row) => row.id === request.target_assignment_id);

    if (!milikPengaju || !milikTujuan) {
      return { error: "Jadwalnya sudah berubah — salah satu shift tidak ada lagi. Tolak pengajuan ini." };
    }

    // Host masih harus sesuai catatan pengajuan; kalau sudah digeser admin lain,
    // penukaran dibatalkan agar tidak memindahkan orang yang salah.
    if (milikPengaju.host_id !== request.requester_id || milikTujuan.host_id !== request.target_id) {
      return { error: "Jadwalnya sudah berubah sejak pengajuan dibuat. Minta host mengajukan ulang." };
    }

    // Penukaran dijalankan satu pernyataan di database supaya kedua penugasan
    // berubah bersamaan — tidak mungkin berhenti di tengah dan menyisakan dua
    // shift yang dimiliki orang yang sama.
    const { error: swapError } = await supabase.rpc("swap_assignment_hosts", {
      first_assignment: milikPengaju.id as string,
      second_assignment: milikTujuan.id as string,
    });

    if (swapError) return { error: "Gagal menukar jadwalnya. Coba lagi." };
  }

  const { error } = await supabase
    .from("shift_swap_requests")
    .update({
      status: decision,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq("id", requestId);

  if (error) return { error: "Gagal menyimpan keputusan." };

  await logAudit({
    actorId: admin.id,
    entity: "schedule",
    action: decision === "approved" ? "approve" : "reject",
    entityId: requestId,
    targetUserId: request.requester_id,
    after: {
      swap: true,
      requester_assignment: request.requester_assignment_id,
      target_assignment: request.target_assignment_id,
      note: note || null,
    },
  });

  await notifyUsers({
    userIds: [request.requester_id, request.target_id],
    type: "approval",
    title: decision === "approved" ? "Tukar shift disetujui" : "Tukar shift ditolak",
    body:
      decision === "approved"
        ? "Jadwalmu sudah diperbarui sesuai penukaran."
        : `Pengajuan tukar shift ditolak admin.${note ? ` Catatan: ${note}` : ""}`,
    link: "/jadwal",
  });

  revalidateApproval();
  revalidatePath("/tukar-shift");
  revalidatePath("/jadwal");
  revalidatePath("/admin/jadwal");

  return {
    success: decision === "approved" ? "Tukar shift disetujui dan jadwalnya sudah ditukar." : "Pengajuan ditolak.",
  };
}
