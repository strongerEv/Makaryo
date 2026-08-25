import type { Metadata } from "next";

import { signOutAction } from "@/app/(auth)/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmploymentStatusBadge } from "@/components/ui/badge";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signAvatarUrl } from "@/lib/storage/avatar";
import { formatDate } from "@/lib/utils/datetime";
import { InstallGuide } from "@/components/pwa/install-guide";
import { NotificationSettings } from "@/components/pwa/notification-settings";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const profile = await requireHost();
  const supabase = await createClient();
  const avatarUrl = await signAvatarUrl(supabase, profile.avatar_url);

  return (
    <>
      <PageHeader title="Profil saya" description="Data diri dan pengaturan akun kamu." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Data diri" description="Ubah data pribadi kamu di sini." />
          <ProfileForm profile={profile} avatarUrl={avatarUrl} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Data kepegawaian" description="Hanya admin yang dapat mengubah bagian ini." />
            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Status kepegawaian</dt>
                <dd>
                  <EmploymentStatusBadge status={profile.employment_status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Tanggal join</dt>
                <dd className="font-semibold text-ink">{formatDate(profile.join_date)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Jatah libur mingguan</dt>
                <dd className="font-semibold text-ink">{profile.weekly_day_off_quota}x per minggu</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Email</dt>
                <dd className="truncate font-semibold text-ink">{profile.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Nomor rekening</dt>
                <dd className="font-semibold text-ink">{profile.bank_account ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Notifikasi"
              description="Pengingat jam kerja, hasil approval, dan jadwal baru."
            />
            <NotificationSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
          </Card>

          <Card>
            <CardHeader title="Pasang aplikasi" description="Agar notifikasi berjalan optimal." />
            <InstallGuide />
          </Card>

          <Card>
            <CardHeader title="Ganti kata sandi" />
            <ChangePasswordForm />
          </Card>

          <form action={signOutAction}>
            <Button type="submit" variant="outline" block>
              Keluar dari akun
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
