import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-bold text-ink">Atur ulang kata sandi</h1>
      <p className="mt-1 mb-5 text-[13px] text-ink-muted">
        Buat kata sandi baru untuk akunmu.
      </p>
      <ResetPasswordForm />
    </Card>
  );
}
