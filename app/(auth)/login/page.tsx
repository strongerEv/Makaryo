import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <Card className="sm:p-7">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Selamat datang kembali</h1>
        <p className="mt-1.5 mb-6 text-[13px] leading-relaxed text-ink-muted">
          Masuk dengan email dan kata sandi yang sudah terdaftar.
        </p>

        <LoginForm
          linkError={error === "tautan-tidak-valid" ? "Tautan sudah kedaluwarsa atau tidak valid." : undefined}
        />

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">atau</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="rounded-[var(--radius-md)] bg-surface-muted p-4 text-center">
          <p className="text-[13px] font-semibold text-ink">Belum punya akun?</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
            Daftar dulu, lalu tunggu akunmu diverifikasi admin.
          </p>
          <Link
            href="/daftar"
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-primary/25 bg-surface px-4 text-[14px] font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            Buat akun host
          </Link>
        </div>
      </Card>

      <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-[12px] leading-relaxed text-ink-muted">
        <ShieldCheck className="mt-px size-4 shrink-0 text-emerald" aria-hidden />
        <span>Data absensi dan omzetmu hanya bisa dilihat olehmu dan admin.</span>
      </p>
    </>
  );
}
