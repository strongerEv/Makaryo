import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type PhotoBucket = "attendance" | "revenue";

/** Mengunggah foto ke folder milik pengguna di bucket privat. Mengembalikan path. */
export async function uploadPhoto(
  supabase: SupabaseClient,
  bucket: PhotoBucket,
  ownerId: string,
  file: File,
  prefix: string,
) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format foto harus JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${ownerId}/${prefix}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Gagal mengunggah foto.");

  return path;
}

export async function signPhotoUrl(
  supabase: SupabaseClient,
  bucket: PhotoBucket,
  path: string | null | undefined,
) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function signPhotoUrls(
  supabase: SupabaseClient,
  bucket: PhotoBucket,
  paths: (string | null)[],
) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return {} as Record<string, string>;

  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  const map: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  });
  return map;
}
