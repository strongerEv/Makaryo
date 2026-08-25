import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

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

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "admin") redirect("/beranda");
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
  return profile.role === "admin" ? "/admin/dashboard" : "/beranda";
}
