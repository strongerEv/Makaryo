import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type Profile } from "@/lib/types/database";

/** Profil pengguna yang sedang masuk, atau null bila belum masuk. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (data as Profile | null) ?? null;
});

/** Memastikan ada pengguna aktif. Mengalihkan bila belum masuk atau belum diverifikasi. */
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.account_status !== "active") redirect("/menunggu-verifikasi");
  return profile;
}

/** Admin maupun super admin — keduanya boleh membuka area admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (!isAdminRole(profile.role)) redirect("/beranda");
  return profile;
}

/**
 * Hanya super admin.
 *
 * Dipakai aksi yang menggeser peran pengguna. Admin biasa boleh menambah dan
 * mengelola host, tetapi tidak boleh mengangkat siapa pun jadi admin — termasuk
 * dirinya sendiri.
 */
export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "super_admin") redirect("/admin/dashboard");
  return profile;
}

export async function requireHost(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "host") redirect("/admin/dashboard");
  return profile;
}

/** Halaman beranda sesuai peran dan status akun. */
export function homePathFor(profile: Pick<Profile, "role" | "account_status">) {
  if (profile.account_status !== "active") return "/menunggu-verifikasi";
  return isAdminRole(profile.role) ? "/admin/dashboard" : "/beranda";
}
