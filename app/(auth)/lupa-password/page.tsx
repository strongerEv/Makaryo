import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-bold text-ink">Lupa kata sandi</h1>
      <p className="mt-1 mb-5 text-[13px] text-ink-muted">
        Masukkan emailmu. Kami kirimkan tautan untuk mengatur ulang kata sandi.
      </p>

      <ForgotPasswordForm />

      <p className="mt-5 text-center text-[13px] text-ink-muted">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </Card>
  );
}
