"use server";

import { revalidatePath } from "next/cache";

import { resetDemoData, seedDemoData } from "@/lib/demo/seed";
import { requireAdmin } from "@/lib/auth/session";
import { isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from "@/lib/supabase/admin";

export type ActionState = { error?: string; success?: string };

function revalidateSemua() {
  for (const path of [
    "/admin/data-contoh",
    "/admin/dashboard",
    "/admin/pengguna",
    "/admin/jadwal",
    "/admin/absensi",
    "/admin/omzet",
    "/admin/approval",
  ]) {
    revalidatePath(path);
  }
}

export async function seedDemoAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!isServiceRoleConfigured()) return { error: SERVICE_ROLE_MISSING_MESSAGE };

  try {
    const hasil = await seedDemoData(admin.id);
    revalidateSemua();

    return {
      success:
        `Data contoh dibuat: ${hasil.hosts} host aktif, ${hasil.pending} pendaftar menunggu verifikasi, ` +
        `${hasil.assignments} penugasan jadwal, ${hasil.attendances} catatan absensi, ` +
        `${hasil.revenues} laporan omzet, dan ${hasil.leaves} pengajuan izin.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Gagal membuat data contoh. Coba lagi.",
    };
  }
}

export async function resetDemoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!isServiceRoleConfigured()) return { error: SERVICE_ROLE_MISSING_MESSAGE };

  const konfirmasi = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (konfirmasi !== "HAPUS") {
    return { error: 'Ketik HAPUS pada kotak konfirmasi untuk melanjutkan.' };
  }

  try {
    const { deleted } = await resetDemoData(admin.id);
    revalidateSemua();

    return {
      success:
        deleted > 0
          ? `${deleted} akun contoh dihapus beserta seluruh jadwal, absensi, omzet, dan pengajuannya.`
          : "Tidak ada data contoh yang perlu dihapus.",
    };
  } catch {
    return { error: "Gagal menghapus data contoh. Coba lagi." };
  }
}
