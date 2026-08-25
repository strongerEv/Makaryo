"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removeAvatar, uploadAvatar } from "@/lib/storage/avatar";

export type FormState = { error?: string; success?: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  phone: z.string().trim().max(20, "Nomor HP terlalu panjang.").optional(),
  address: z.string().trim().max(300, "Alamat terlalu panjang.").optional(),
  birthDate: z.string().trim().optional(),
});

export async function updateOwnProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireActiveProfile();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    address: formData.get("address") ?? undefined,
    birthDate: formData.get("birthDate") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const supabase = await createClient();
  let avatarPath = profile.avatar_url;

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    try {
      avatarPath = await uploadAvatar(supabase, profile.id, file);
      if (profile.avatar_url && profile.avatar_url !== avatarPath) {
        await removeAvatar(supabase, profile.avatar_url);
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Gagal mengunggah foto." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      birth_date: parsed.data.birthDate || null,
      avatar_url: avatarPath,
    })
    .eq("id", profile.id);

  if (error) return { error: "Gagal menyimpan perubahan. Coba lagi." };

  revalidatePath("/profil");
  return { success: "Perubahan tersimpan." };
}

export async function changeOwnPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireActiveProfile();

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };
  if (password !== confirmation) return { error: "Konfirmasi kata sandi tidak sama." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("different")
        ? "Kata sandi baru harus berbeda dari kata sandi lama."
        : "Gagal mengubah kata sandi. Coba lagi.",
    };
  }

  return { success: "Kata sandi berhasil diubah." };
}
