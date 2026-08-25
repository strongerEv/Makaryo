import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Clock3, Inbox, ScanFace, Users, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ModuleCard } from "@/components/ui/module-card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Shift } from "@/lib/types/database";
import { formatClock, formatDate, greeting } from "@/lib/utils/datetime";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ count: pendingCount }, { count: activeHostCount }, { data: shiftRows }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "host")
      .eq("account_status", "active")
      .eq("employment_status", "active"),
    supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const shifts = (shiftRows ?? []) as Shift[];
  const pending = pendingCount ?? 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${admin.full_name.split(" ")[0]}`}
        description={formatDate(new Date())}
      />

      {pending > 0 ? (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-amber/40 bg-amber-soft">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber/25 text-[#9a6a12]">
              <Inbox className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {pending} pendaftar menunggu verifikasi
              </p>
              <p className="text-[12px] text-[#9a6a12]">Setujui atau tolak agar mereka bisa mulai bekerja.</p>
            </div>
          </div>
          <ButtonLink href="/admin/pengguna?status=pending" size="sm">
            Tinjau sekarang
          </ButtonLink>
        </Card>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Host aktif"
          value={activeHostCount ?? 0}
          icon={Users}
          tone="emerald"
          hint="Siap dijadwalkan"
        />
        <StatCard label="Menunggu verifikasi" value={pending} icon={Inbox} tone="amber" />
        <StatCard label="Shift aktif" value={shifts.length} icon={Clock3} tone="primary" />
        <StatCard label="Omzet hari ini" value="Rp0" icon={Wallet} tone="sky" hint="Terisi setelah modul omzet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Shift hari ini"
            description="Kebutuhan personel per shift menurut pengaturan yang berlaku."
            action={
              <Link href="/admin/shift" className="text-[13px] font-semibold text-primary hover:underline">
                Atur
              </Link>
            }
          />
          {shifts.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">
              Belum ada shift aktif. Buat shift terlebih dahulu di Pengaturan Shift.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {shifts.map((shift) => (
                <li key={shift.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{shift.name}</p>
                    <p className="tabular text-[12px] text-ink-muted">
                      {formatClock(shift.start_time)} – {formatClock(shift.end_time)}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-ink-muted">
                    butuh {shift.min_hosts} host
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3 self-start">
          <ModuleCard
            href="/admin/pengguna"
            title="Kelola Pengguna"
            description="Verifikasi & data host"
            icon={Users}
            tone="primary"
          />
          <ModuleCard
            href="/admin/jadwal"
            title="Jadwal"
            description="Susun & publish"
            icon={CalendarDays}
            tone="coral"
          />
          <ModuleCard
            href="/admin/absensi"
            title="Absensi"
            description="Monitor kehadiran"
            icon={ScanFace}
            tone="amber"
          />
          <ModuleCard
            href="/admin/shift"
            title="Pengaturan Shift"
            description="Jam & minimum host"
            icon={Clock3}
            tone="emerald"
          />
        </div>
      </div>
    </>
  );
}
