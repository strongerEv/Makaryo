import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024;

/** Menandatangani satu path avatar. Mengembalikan null bila path kosong atau gagal. */
export async function signAvatarUrl(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/** Menandatangani banyak path sekaligus, dikembalikan sebagai peta path → URL. */
export async function signAvatarUrls(supabase: SupabaseClient, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return {} as Record<string, string>;

  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  const map: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  });
  return map;
}

/** Memvalidasi lalu mengunggah avatar ke folder milik pengguna. Mengembalikan path baru. */
export async function uploadAvatar(supabase: SupabaseClient, userId: string, file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format foto harus JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Ukuran foto maksimal 3 MB.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error("Gagal mengunggah foto profil.");

  return path;
}

export async function removeAvatar(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
