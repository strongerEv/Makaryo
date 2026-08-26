import type { Metadata } from "next";
import { CalendarDays, ClipboardList, ScanFace, Users, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD } from "@/lib/demo/dataset";
import { getDemoSummary } from "@/lib/demo/seed";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { DemoDataPanel } from "./demo-data-panel";

export const metadata: Metadata = { title: "Data Contoh" };

export default async function DemoDataPage() {
  await requireAdmin();

  const siap = isServiceRoleConfigured();
  const ringkasan = siap
    ? await getDemoSummary()
    : { hosts: 0, assignments: 0, attendances: 0, revenues: 0, leaves: 0 };

  return (
    <>
      <PageHeader
        title="Data Contoh"
        description="Isi aplikasi dengan data simulasi sebulan penuh untuk mencoba semua fitur, lalu hapus kembali kapan saja."
      />

      {!siap ? (
        <Alert tone="error" className="mb-4">
          Kunci server Supabase belum terpasang, jadi fitur ini belum bisa dipakai. Lihat halaman Diagnostik.
        </Alert>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Host contoh" value={ringkasan.hosts} icon={Users} tone="primary" />
        <StatCard label="Penugasan jadwal" value={ringkasan.assignments} icon={CalendarDays} tone="coral" />
        <StatCard label="Catatan absensi" value={ringkasan.attendances} icon={ScanFace} tone="emerald" />
        <StatCard label="Laporan omzet" value={ringkasan.revenues} icon={Wallet} tone="sky" />
        <StatCard label="Pengajuan izin" value={ringkasan.leaves} icon={ClipboardList} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DemoDataPanel adaData={ringkasan.hosts > 0} disabled={!siap} />

        <Card className="self-start">
          <CardHeader title="Isi datanya apa saja" />
          <ul className="space-y-2.5 text-[13px] text-ink-muted">
            <li>
              <span className="font-semibold text-ink">6 host aktif</span> dengan nama dan nomor HP, plus{" "}
              <span className="font-semibold text-ink">2 pendaftar</span> yang menunggu verifikasi — supaya alur
              approval bisa dicoba.
            </li>
            <li>
              <span className="font-semibold text-ink">Jadwal sebulan penuh</span> yang disusun mesin penjadwalan
              yang sama dengan tombol Generate draft, lalu langsung dipublish.
            </li>
            <li>
              <span className="font-semibold text-ink">Absensi hari-hari yang sudah lewat</span> — campuran tepat
              waktu, telat, dan tidak absen. Hari ini sengaja dikosongkan agar tombol clock in tetap bisa dicoba.
            </li>
            <li>
              <span className="font-semibold text-ink">Laporan omzet</span> pada shift yang dihadiri, sehingga
              grafik tren dan laporan export ada isinya.
            </li>
            <li>
              <span className="font-semibold text-ink">Pengajuan izin</span> dalam tiga status: menunggu,
              disetujui, dan ditolak.
            </li>
          </ul>

          <div className="mt-4 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3 text-[12px] text-ink-muted">
            <p className="font-semibold text-ink">Akun host contoh bisa dipakai masuk</p>
            <p className="mt-1">
              Emailnya <code className="rounded bg-surface px-1 py-0.5">host1@{DEMO_EMAIL_DOMAIN}</code> sampai{" "}
              <code className="rounded bg-surface px-1 py-0.5">host6@{DEMO_EMAIL_DOMAIN}</code>, kata sandinya{" "}
              <code className="rounded bg-surface px-1 py-0.5">{DEMO_PASSWORD}</code>. Pakai jendela penyamaran
              supaya tidak mengganggu sesi adminmu.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
