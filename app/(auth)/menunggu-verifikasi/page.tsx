import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Ban, Clock3, ShieldX } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentProfile, homePathFor } from "@/lib/auth/session";
import { StatusWatcher } from "./status-watcher";

export const metadata: Metadata = { title: "Menunggu verifikasi" };

const CONTENT = {
  pending: {
    icon: Clock3,
    tone: "bg-amber-soft text-[#9a6a12]",
    title: "Akun kamu sedang diperiksa",
    body: "Admin akan memverifikasi pendaftaranmu. Halaman ini otomatis terbuka begitu akunmu disetujui — tidak perlu masuk ulang.",
  },
  rejected: {
    icon: ShieldX,
    tone: "bg-coral-soft text-[#c73f35]",
    title: "Pendaftaran ditolak",
    body: "Admin belum menyetujui akun ini. Hubungi admin bila kamu merasa ini keliru.",
  },
  suspended: {
    icon: Ban,
    tone: "bg-coral-soft text-[#c73f35]",
    title: "Akun dinonaktifkan",
    body: "Akses akun ini sedang dinonaktifkan admin. Hubungi admin untuk mengaktifkannya kembali.",
  },
} as const;

export default async function PendingVerificationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.account_status === "active") redirect(homePathFor(profile));

  const status = profile.account_status as keyof typeof CONTENT;
  const { icon: Icon, tone, title, body } = CONTENT[status];

  return (
    <Card className="text-center">
      <span className={`mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full ${tone}`}>
        <Icon className="size-7" aria-hidden />
      </span>

      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>

      {profile.account_note ? (
        <Alert tone="warning" className="mt-4 text-left">
          <span className="font-semibold">Catatan admin:</span> {profile.account_note}
        </Alert>
      ) : null}

      <dl className="mt-5 space-y-2 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3.5 text-left text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Nama</dt>
          <dd className="truncate font-semibold text-ink">{profile.full_name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Email</dt>
          <dd className="truncate font-semibold text-ink">{profile.email}</dd>
        </div>
      </dl>

      <form action={signOutAction} className="mt-5">
        <Button type="submit" variant="outline" block>
          Keluar
        </Button>
      </form>

      {status === "pending" ? <StatusWatcher userId={profile.id} /> : null}
    </Card>
  );
}
