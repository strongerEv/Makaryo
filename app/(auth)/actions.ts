"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { homePathFor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

const emailSchema = z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid.");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(9, "Nomor HP minimal 9 digit.")
    .regex(/^[0-9+\-\s]+$/, "Nomor HP hanya boleh berisi angka."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email atau kata sandi salah.";
  if (normalized.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk email kamu.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  }
  // Pendaftaran mandiri dimatikan di pengaturan Supabase — pesan aslinya berbahasa
  // Inggris dan tidak memberi tahu pendaftar apa yang harus dilakukan.
  if (
    normalized.includes("signups not allowed") ||
    normalized.includes("signup is disabled") ||
    normalized.includes("signups are disabled") ||
    normalized.includes("email signups are disabled")
  ) {
    return "Pendaftaran mandiri sedang ditutup. Hubungi admin untuk dibuatkan akun.";
  }
  if (normalized.includes("password should be at least")) return "Kata sandi minimal 8 karakter.";
  if (normalized.includes("new password should be different")) {
    return "Kata sandi baru harus berbeda dari kata sandi lama.";
  }
  return message;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", data.user.id)
    .single();

  redirect(homePathFor(profile ?? { role: "host", account_status: "pending" }));
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
    },
  });
  if (error) return { error: translateAuthError(error.message) };

  // Bila konfirmasi email diaktifkan di Supabase, sesi belum terbentuk.
  if (!data.session) {
    return {
      success:
        "Pendaftaran terkirim. Cek email kamu untuk konfirmasi, lalu masuk — akunmu akan menunggu verifikasi admin.",
    };
  }

  redirect("/menunggu-verifikasi");
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: translateAuthError(error.message) };

  return {
    success: "Kalau email tersebut terdaftar, tautan untuk mengatur ulang kata sandi sudah kami kirim.",
  };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };
  if (password !== confirmation) return { error: "Konfirmasi kata sandi tidak sama." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tautan reset sudah kedaluwarsa. Silakan minta tautan baru." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translateAuthError(error.message) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  redirect(homePathFor(profile ?? { role: "host", account_status: "pending" }));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
