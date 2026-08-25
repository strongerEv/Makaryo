import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <Card>
      <h1 className="text-xl font-bold text-ink">Buat akun</h1>
      <p className="mt-1 mb-5 text-[13px] text-ink-muted">
        Setelah mendaftar, akunmu akan diperiksa admin terlebih dahulu sebelum bisa dipakai.
      </p>

      <RegisterForm />

      <p className="mt-5 text-center text-[13px] text-ink-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </Card>
  );
}
