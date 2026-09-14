"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/session";
import { removePhotos } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import { konfirmasiCocok, PESAN_KONFIRMASI } from "@/lib/utils/confirm";
import { formatCurrency } from "@/lib/utils/format";
import { monthLabel, monthRange } from "@/lib/utils/period";

export type ActionState = { error?: string; success?: string };

const schema = z.object({
  bulan: z.string().regex(/^\d{4}-\d{2}$/, "Pilih bulan yang mau direset."),
  host: z.union([z.literal("all"), z.string().uuid()]).default("all"),
});

/**
 * Menghapus seluruh laporan omzet dalam satu bulan.
 *
 * Dipakai untuk membereskan data simulasi: menghapusnya satu per satu lewat
 * daftar terlalu lambat begitu isinya puluhan baris. Bisa dipersempit ke satu
 * host, supaya membersihkan percobaan satu orang tidak ikut menghapus laporan
 * asli orang lain di bulan yang sama.
 */
export async function resetRevenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse({
    bulan: formData.get("bulan"),
    host: formData.get("host") ?? "all",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  if (!konfirmasiCocok(formData.get("confirmation"))) return { error: PESAN_KONFIRMASI };

  const { bulan, host } = parsed.data;
  const { start, end } = monthRange(bulan);
  const supabase = await createClient();

  // Penghapusan dijalankan satu perintah di database, lalu mengembalikan apa
  // yang benar-benar terhapus — termasuk path buktinya, supaya berkasnya bisa
  // ikut dibereskan tanpa perlu membaca ulang baris yang sudah tidak ada.
  const { data, error } = await supabase.rpc("reset_revenue_month", {
    period_start: start,
    period_end: end,
    target_host: host === "all" ? null : host,
  });

  if (error) {
    console.error("Gagal mereset omzet", { bulan, host, error });
    return { error: `Gagal menghapus laporan omzet: ${error.message}` };
  }

  const hasil = (data ?? [])[0] as
    | { deleted_total: number; deleted_amount: number | string; proof_paths: string[] | null }
    | undefined;

  const terhapus = hasil?.deleted_total ?? 0;
  if (terhapus === 0) {
    return { error: `Tidak ada laporan omzet di ${monthLabel(bulan)} yang cocok untuk dihapus.` };
  }

  await removePhotos(supabase, "revenue", hasil?.proof_paths ?? []);

  const nominal = Number(hasil?.deleted_amount ?? 0);

  await logAudit({
    actorId: admin.id,
    entity: "revenue",
    action: "delete",
    targetUserId: host === "all" ? null : host,
    before: { period: bulan, host, reports: terhapus, amount: nominal },
  });

  revalidatePath("/admin/omzet");
  revalidatePath("/admin/dashboard");
  revalidatePath("/omzet");
  revalidatePath("/beranda");

  return {
    success: `${terhapus} laporan omzet ${monthLabel(bulan)} senilai ${formatCurrency(nominal)} dihapus.`,
  };
}
