import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Diagnostik" };

type Check = {
  label: string;
  ok: boolean;
  detail: string;
  critical?: boolean;
};

/**
 * Halaman pemeriksaan cepat untuk admin.
 * Hanya menampilkan status terpasang atau belum — nilai kuncinya tidak pernah ditampilkan.
 */
export default async function DiagnosticsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: profileCount, error: profileError }, { count: shiftCount }, { count: notificationCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("shifts").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id", { count: "exact", head: true }),
    ]);

  const environment: Check[] = [
    {
      label: "Alamat proyek Supabase",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      detail: "NEXT_PUBLIC_SUPABASE_URL",
      critical: true,
    },
    {
      label: "Kunci publik Supabase",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      detail: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      critical: true,
    },
    {
      label: "Kunci server Supabase",
      ok: isServiceRoleConfigured(),
      detail: "SUPABASE_SERVICE_ROLE_KEY — dipakai untuk verifikasi akun, tambah host, dan cron",
      critical: true,
    },
    {
      label: "Alamat aplikasi",
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      detail: "NEXT_PUBLIC_SITE_URL — dipakai untuk tautan reset kata sandi",
    },
    {
      label: "Kunci notifikasi (publik)",
      ok: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      detail: "NEXT_PUBLIC_VAPID_PUBLIC_KEY — tanpa ini notifikasi hanya muncul di dalam aplikasi",
    },
    {
      label: "Kunci notifikasi (rahasia)",
      ok: Boolean(process.env.VAPID_PRIVATE_KEY),
      detail: "VAPID_PRIVATE_KEY",
    },
    {
      label: "Token pengaman cron",
      ok: Boolean(process.env.CRON_SECRET),
      detail: "CRON_SECRET — tanpa ini pengingat jam kerja tidak akan berjalan",
    },
  ];

  const database: Check[] = [
    {
      label: "Tabel pengguna terbaca",
      ok: !profileError,
      detail: profileError ? profileError.message : `${profileCount ?? 0} pengguna terdaftar`,
      critical: true,
    },
    {
      label: "Shift tersedia",
      ok: (shiftCount ?? 0) > 0,
      detail: `${shiftCount ?? 0} shift — minimal satu diperlukan untuk menyusun jadwal`,
    },
    {
      label: "Tabel notifikasi terbaca",
      ok: notificationCount !== null,
      detail: "Dibuat oleh migrasi 0007",
    },
  ];

  const failing = [...environment, ...database].filter((check) => !check.ok && check.critical);

  return (
    <>
      <PageHeader
        title="Diagnostik"
        description="Pemeriksaan cepat kalau ada yang tidak beres. Nilai kunci tidak pernah ditampilkan di sini."
      />

      {failing.length > 0 ? (
        <Alert tone="error" className="mb-4">
          <span className="font-semibold">{failing.length} pengaturan penting belum beres.</span> Perbaiki di
          Vercel → Settings → Environment Variables, lalu jalankan Redeploy agar nilainya terbaca.
        </Alert>
      ) : (
        <Alert tone="success" className="mb-4">
          Semua pengaturan penting sudah terpasang.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pengaturan hosting" description="Diisi di Vercel." />
          <CheckList items={environment} />
        </Card>

        <Card>
          <CardHeader title="Database" description="Dibuat oleh berkas setup Supabase." />
          <CheckList items={database} />
        </Card>
      </div>
    </>
  );
}

function CheckList({ items }: { items: Check[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.detail} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className={cn(
              "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
              item.ok ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral",
            )}
          >
            {item.ok ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">
              {item.label}
              {!item.ok && item.critical ? " — wajib diperbaiki" : ""}
            </span>
            <span className="block text-[12px] break-words text-ink-muted">{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
