import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AuditEntity = "user" | "shift" | "settings" | "schedule" | "leave_request" | "revenue" | "attendance";
type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "publish";

type AuditInput = {
  actorId: string;
  entity: AuditEntity;
  action: AuditAction;
  entityId?: string | null;
  targetUserId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/**
 * Mencatat aktivitas yang berdampak ke pengguna, jadwal, absensi, atau omzet.
 * Kegagalan pencatatan tidak boleh menggagalkan aksi utama — cukup dicatat di log server.
 */
export async function logAudit(input: AuditInput) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: input.actorId,
      entity: input.entity,
      action: input.action,
      entity_id: input.entityId ?? null,
      target_user_id: input.targetUserId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Gagal menulis audit log", error);
  }
}
