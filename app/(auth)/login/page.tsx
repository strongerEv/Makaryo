import Link from "next/link";
import type { Metadata } from "next";

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
    <Card>
      <h1 className="text-xl font-bold text-ink">Masuk</h1>
      <p className="mt-1 mb-5 text-[13px] text-ink-muted">
        Gunakan email dan kata sandi yang terdaftar.
      </p>

      <LoginForm linkError={error === "tautan-tidak-valid" ? "Tautan sudah kedaluwarsa atau tidak valid." : undefined} />

      <p className="mt-5 text-center text-[13px] text-ink-muted">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-primary hover:underline">
          Daftar di sini
        </Link>
      </p>
    </Card>
  );
}
