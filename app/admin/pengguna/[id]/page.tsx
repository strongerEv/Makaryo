import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck, Clock3, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AccountStatusBadge, Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { signAvatarUrl } from "@/lib/storage/avatar";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { ROLE_LABEL } from "@/lib/types/database";
import { formatDate, formatDateTime } from "@/lib/utils/datetime";
import { DangerZone } from "./danger-zone";
import { EditUserForm } from "./edit-user-form";

export const metadata: Metadata = { title: "Detail Pengguna" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!data) notFound();

  const user = data as Profile;
  const avatarUrl = await signAvatarUrl(supabase, user.avatar_url);
  const isSelf = user.id === admin.id;

  return (
    <>
      <Link
        href="/admin/pengguna"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar pengguna
      </Link>

      <PageHeader title={user.full_name} description={user.email} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
        <Avatar name={user.full_name} src={avatarUrl} size="lg" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={user.role === "admin" ? "primary" : "neutral"}>{ROLE_LABEL[user.role]}</Badge>
          <AccountStatusBadge status={user.account_status} />
          <span className="text-[12px] text-ink-muted">
            Terdaftar {formatDate(user.created_at)}
            {user.reviewed_at ? ` · diverifikasi ${formatDateTime(user.reviewed_at)}` : ""}
          </span>
        </div>
      </div>

      {user.account_note ? (
        <Alert tone="warning" className="mb-5">
          <span className="font-semibold">Catatan akun:</span> {user.account_note}
        </Alert>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jam kerja bulan ini" value="0 jam" icon={Clock3} tone="primary" hint="Terisi setelah modul absensi" />
        <StatCard label="Tepat waktu" value="0" icon={CalendarCheck} tone="emerald" hint="Terisi setelah modul absensi" />
        <StatCard label="Telat" value="0" icon={Clock3} tone="amber" hint="Terisi setelah modul absensi" />
        <StatCard label="Omzet bulan ini" value="Rp0" icon={Wallet} tone="sky" hint="Terisi setelah modul omzet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Data pengguna" description="Data pribadi dan kepegawaian." />
          <EditUserForm user={user} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Ringkasan" />
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Nomor HP</dt>
                <dd className="font-semibold text-ink">{user.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Tanggal lahir</dt>
                <dd className="font-semibold text-ink">{formatDate(user.birth_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Alamat</dt>
                <dd className="max-w-[60%] text-right font-semibold text-ink">{user.address ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Nomor rekening</dt>
                <dd className="font-semibold text-ink">{user.bank_account ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <DangerZone user={user} isSelf={isSelf} />
        </div>
      </div>
    </>
  );
}
