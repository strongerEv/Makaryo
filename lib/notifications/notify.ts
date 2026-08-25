import "server-only";

import { sendPushToUsers, type PushPayload } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "reminder"
  | "approval"
  | "schedule_published"
  | "new_request"
  | "account";

export type NotificationInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  urgent?: boolean;
};

/**
 * Menyimpan notifikasi dalam aplikasi lalu mengirim web push.
 * Kegagalan pengiriman tidak boleh menggagalkan aksi yang memicunya.
 */
export async function notifyUsers({ userIds, type, title, body, link, urgent }: NotificationInput) {
  const targets = [...new Set(userIds)].filter(Boolean);
  if (targets.length === 0) return;

  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert(
      targets.map((userId) => ({ user_id: userId, type, title, body: body ?? null, link: link ?? null })),
    );

    const payload: PushPayload = { title, body, link, urgent, tag: type };
    await sendPushToUsers(targets, payload);
  } catch (error) {
    console.error("Gagal mengirim notifikasi", error);
  }
}

/** Seluruh admin aktif — penerima notifikasi pengajuan baru. */
export async function getAdminIds() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("account_status", "active");
    return (data ?? []).map((row) => row.id as string);
  } catch {
    return [];
  }
}
