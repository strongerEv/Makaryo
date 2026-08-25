import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Ban, Clock3, ShieldX, UserRoundX } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentProfile, homePathFor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
  missing: {
    icon: UserRoundX,
    tone: "bg-coral-soft text-[#c73f35]",
    title: "Data profil belum terbentuk",
    body: "Akun ini terdaftar, tetapi data profilnya belum ada di database. Biasanya ini terjadi bila akunnya dibuat sebelum setup database dijalankan. Hubungi admin, lalu keluar dan masuk kembali.",
  },
} as const;

export default async function PendingVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (profile?.account_status === "active") redirect(homePathFor(profile));

  // Pengguna yang sudah masuk tetapi belum punya baris profil ditahan di sini juga.
  // Memantulkannya ke /login hanya akan berputar, karena middleware mengembalikannya lagi.
  const status: keyof typeof CONTENT = profile ? profile.account_status : "missing";
  const { icon: Icon, tone, title, body } = CONTENT[status];

  return (
    <Card className="text-center">
      <span className={`mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full ${tone}`}>
        <Icon className="size-7" aria-hidden />
      </span>

      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>

      {profile?.account_note ? (
        <Alert tone="warning" className="mt-4 text-left">
          <span className="font-semibold">Catatan admin:</span> {profile.account_note}
        </Alert>
      ) : null}

      <dl className="mt-5 space-y-2 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3.5 text-left text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Nama</dt>
          <dd className="truncate font-semibold text-ink">{profile?.full_name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Email</dt>
          <dd className="truncate font-semibold text-ink">{profile?.email ?? user.email ?? "—"}</dd>
        </div>
      </dl>

      <form action={signOutAction} className="mt-5">
        <Button type="submit" variant="outline" block>
          Keluar
        </Button>
      </form>

      {status === "pending" ? <StatusWatcher userId={user.id} /> : null}
    </Card>
  );
}
