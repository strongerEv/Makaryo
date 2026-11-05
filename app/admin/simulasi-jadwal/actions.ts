"use server";

import { requireAdmin } from "@/lib/auth/session";
import { sandboxSchema } from "@/lib/scheduling/sandbox";
import { createClient } from "@/lib/supabase/server";

export type SaveSandboxResult = { ok: true; savedAt: string } | { ok: false; error: string };

/** Batas aman ukuran dokumen; ribuan penugasan pun masih jauh di bawahnya. */
const MAX_BYTES = 1_500_000;

/**
 * Menyimpan seluruh dokumen simulasi.
 *
 * Disimpan utuh, bukan per perubahan: simulasi memang dimaksudkan untuk
 * diotak-atik cepat di browser, dan satu dokumen membuatnya mustahil
 * tercampur dengan data jadwal yang asli.
 */
export async function saveSandboxAction(payload: string): Promise<SaveSandboxResult> {
  const admin = await requireAdmin();

  if (payload.length > MAX_BYTES) {
    return { ok: false, error: "Simulasi terlalu besar untuk disimpan. Kosongkan rentang lama dulu." };
  }

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { ok: false, error: "Data simulasi tidak terbaca." };
  }

  const parsed = sandboxSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "Ada isian simulasi yang tidak valid, perubahan terakhir belum tersimpan." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_sandboxes")
    .upsert({ id: 1, data: parsed.data, updated_by: admin.id }, { onConflict: "id" })
    .select("updated_at")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "Tabel simulasi belum ada. Jalankan migrasi 0018 di Supabase."
          : "Gagal menyimpan simulasi.",
    };
  }

  return { ok: true, savedAt: data.updated_at as string };
}
