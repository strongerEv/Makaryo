"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInJakarta } from "@/lib/utils/datetime";
import type { Profile } from "@/lib/types/database";

export type ActionState = { error?: string; success?: string };

const optionalText = z.string().trim().max(300).optional();

const createUserSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi awal minimal 8 karakter."),
  phone: optionalText,
  role: z.enum(["host", "admin"]),
  joinDate: z.string().trim().optional(),
  weeklyDayOffQuota: z.coerce.number().int().min(0).max(7),
});

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  phone: optionalText,
  address: optionalText,
  birthDate: z.string().trim().optional(),
  joinDate: z.string().trim().optional(),
  bankAccount: optionalText,
  employmentStatus: z.enum(["active", "inactive", "long_leave"]),
  weeklyDayOffQuota: z.coerce.number().int().min(0).max(7),
});

function fail(message: string): ActionState {
  return { error: message };
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

function revalidateUserPages(userId?: string) {
  revalidatePath("/admin/pengguna");
  revalidatePath("/admin/dashboard");
  if (userId) revalidatePath(`/admin/pengguna/${userId}`);
}

/** Ringkasan profil untuk audit log — cukup kolom yang penting saja. */
function auditSnapshot(profile: Partial<Profile>) {
  return {
    full_name: profile.full_name,
    role: profile.role,
    account_status: profile.account_status,
    employment_status: profile.employment_status,
    phone: profile.phone,
    join_date: profile.join_date,
    weekly_day_off_quota: profile.weekly_day_off_quota,
  };
}

export async function approveUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return fail("Pengguna tidak ditemukan.");

  const client = createAdminClient();
  const { data: before } = await client.from("profiles").select("*").eq("id", userId).single();
  if (!before) return fail("Pengguna tidak ditemukan.");
  if (before.account_status === "active") return { success: "Akun ini memang sudah aktif." };

  const { error } = await client
    .from("profiles")
    .update({
      account_status: "active",
      account_note: null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      join_date: before.join_date ?? todayInJakarta(),
      employment_status: before.employment_status === "inactive" ? "active" : before.employment_status,
    })
    .eq("id", userId);

  if (error) return fail("Gagal menyetujui akun. Coba lagi.");

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: "approve",
    entityId: userId,
    targetUserId: userId,
    before: auditSnapshot(before),
    after: { account_status: "active" },
  });

  revalidateUserPages(userId);
  return { success: `Akun ${before.full_name} disetujui.` };
}

export async function rejectUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!userId) return fail("Pengguna tidak ditemukan.");
  if (note.length < 5) return fail("Tuliskan alasan penolakan minimal 5 karakter.");

  const client = createAdminClient();
  const { data: before } = await client.from("profiles").select("*").eq("id", userId).single();
  if (!before) return fail("Pengguna tidak ditemukan.");

  const { error } = await client
    .from("profiles")
    .update({
      account_status: "rejected",
      account_note: note,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return fail("Gagal menolak akun. Coba lagi.");

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: "reject",
    entityId: userId,
    targetUserId: userId,
    before: auditSnapshot(before),
    after: { account_status: "rejected", account_note: note },
  });

  revalidateUserPages(userId);
  return { success: `Pendaftaran ${before.full_name} ditolak.` };
}

export async function setAccountStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!userId) return fail("Pengguna tidak ditemukan.");
  if (userId === admin.id) return fail("Kamu tidak bisa mengubah status akunmu sendiri.");
  if (status !== "active" && status !== "suspended") return fail("Status tidak dikenal.");

  const client = createAdminClient();
  const { data: before } = await client.from("profiles").select("*").eq("id", userId).single();
  if (!before) return fail("Pengguna tidak ditemukan.");

  const { error } = await client
    .from("profiles")
    .update({
      account_status: status,
      account_note: status === "suspended" ? note || null : null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return fail("Gagal mengubah status akun. Coba lagi.");

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: status === "suspended" ? "suspend" : "reactivate",
    entityId: userId,
    targetUserId: userId,
    before: auditSnapshot(before),
    after: { account_status: status },
  });

  revalidateUserPages(userId);
  return {
    success:
      status === "suspended"
        ? `Akun ${before.full_name} dinonaktifkan.`
        : `Akun ${before.full_name} diaktifkan kembali.`,
  };
}

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") ?? undefined,
    role: formData.get("role") ?? "host",
    joinDate: formData.get("joinDate") ?? undefined,
    weeklyDayOffQuota: formData.get("weeklyDayOffQuota") ?? 1,
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const client = createAdminClient();
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone ?? null },
  });

  if (createError || !created.user) {
    const message = createError?.message.toLowerCase() ?? "";
    if (message.includes("already been registered") || message.includes("already registered")) {
      return fail("Email ini sudah terdaftar.");
    }
    return fail("Gagal membuat akun. Coba lagi.");
  }

  // Trigger membuat profil berstatus pending; akun buatan admin langsung diaktifkan.
  const { error: profileError } = await client
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      account_status: "active",
      account_note: null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      join_date: parsed.data.joinDate || todayInJakarta(),
      weekly_day_off_quota: parsed.data.weeklyDayOffQuota,
      employment_status: "active",
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Jangan tinggalkan akun auth tanpa profil yang benar.
    await client.auth.admin.deleteUser(created.user.id);
    return fail("Gagal menyiapkan profil pengguna. Coba lagi.");
  }

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: "create",
    entityId: created.user.id,
    targetUserId: created.user.id,
    after: { full_name: parsed.data.fullName, email: parsed.data.email, role: parsed.data.role },
  });

  revalidateUserPages(created.user.id);
  return { success: `Akun ${parsed.data.fullName} dibuat dan langsung aktif.` };
}

export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    address: formData.get("address") ?? undefined,
    birthDate: formData.get("birthDate") ?? undefined,
    joinDate: formData.get("joinDate") ?? undefined,
    bankAccount: formData.get("bankAccount") ?? undefined,
    employmentStatus: formData.get("employmentStatus") ?? "active",
    weeklyDayOffQuota: formData.get("weeklyDayOffQuota") ?? 1,
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const client = createAdminClient();
  const { data: before } = await client.from("profiles").select("*").eq("id", parsed.data.userId).single();
  if (!before) return fail("Pengguna tidak ditemukan.");

  const payload = {
    full_name: parsed.data.fullName,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    birth_date: parsed.data.birthDate || null,
    join_date: parsed.data.joinDate || null,
    bank_account: parsed.data.bankAccount || null,
    employment_status: parsed.data.employmentStatus,
    weekly_day_off_quota: parsed.data.weeklyDayOffQuota,
  };

  const { error } = await client.from("profiles").update(payload).eq("id", parsed.data.userId);
  if (error) return fail("Gagal menyimpan perubahan. Coba lagi.");

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: "update",
    entityId: parsed.data.userId,
    targetUserId: parsed.data.userId,
    before: auditSnapshot(before),
    after: payload,
  });

  revalidateUserPages(parsed.data.userId);
  return { success: "Perubahan tersimpan." };
}

/**
 * Menghitung riwayat operasional milik pengguna.
 * Tabel yang belum dibuat di sesi berikutnya diabaikan, bukan dianggap error.
 */
async function countHistory(client: ReturnType<typeof createAdminClient>, userId: string) {
  const tables = ["attendances", "revenue_reports", "schedule_assignments"] as const;
  let total = 0;

  for (const table of tables) {
    const { count, error } = await client
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("host_id", userId);

    // 42P01 = tabel belum ada (modulnya belum dibangun).
    if (error && error.code !== "42P01" && error.code !== "PGRST205") return null;
    total += count ?? 0;
  }

  return total;
}

export async function deleteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!userId) return fail("Pengguna tidak ditemukan.");
  if (userId === admin.id) return fail("Kamu tidak bisa menghapus akunmu sendiri.");

  const client = createAdminClient();
  const { data: before } = await client.from("profiles").select("*").eq("id", userId).single();
  if (!before) return fail("Pengguna tidak ditemukan.");

  if (confirmation.toLowerCase() !== before.full_name.trim().toLowerCase()) {
    return fail("Konfirmasi tidak cocok. Ketik ulang nama pengguna persis seperti tertulis.");
  }

  const history = await countHistory(client, userId);
  if (history === null) return fail("Gagal memeriksa riwayat pengguna. Coba lagi.");
  if (history > 0) {
    return fail(
      "Pengguna ini sudah punya riwayat absensi, jadwal, atau omzet. Nonaktifkan akunnya saja agar riwayat tetap utuh.",
    );
  }

  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) return fail("Gagal menghapus akun. Coba lagi.");

  await logAudit({
    actorId: admin.id,
    entity: "user",
    action: "delete",
    entityId: userId,
    targetUserId: null,
    before: auditSnapshot(before),
  });

  revalidateUserPages();
  return { success: `Akun ${before.full_name} dihapus permanen.` };
}
