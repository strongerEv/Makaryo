import type { Metadata } from "next";
import { CalendarDays, ClipboardList, Clock3, ScanFace, Wallet } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { ModuleCard } from "@/components/ui/module-card";
import { StatCard } from "@/components/ui/stat-card";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatClock, greeting } from "@/lib/utils/datetime";
import type { Shift } from "@/lib/types/database";

export const metadata: Metadata = { title: "Beranda" };

export default async function HostHomePage() {
  const profile = await requireHost();
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const activeShifts = (shifts ?? []) as Shift[];

  return (
    <>
      <header className="mb-5">
        <p className="text-[13px] font-medium text-ink-muted">{greeting()},</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{profile.full_name}!</h1>
      </header>

      <Card className="mb-4 bg-primary text-white shadow-[var(--shadow-float)]">
        <p className="text-[12px] font-semibold text-white/80">Shift kamu hari ini</p>
        <p className="mt-1 text-lg font-bold">Belum ada jadwal terbit</p>
        <p className="mt-1 text-[13px] text-white/80">
          Jadwal akan muncul di sini setelah admin mem-publish jadwal periode ini.
        </p>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jam kerja bulan ini" value="0 jam" icon={Clock3} tone="primary" />
        <StatCard label="Tepat waktu" value="0" icon={ScanFace} tone="emerald" />
        <StatCard label="Telat" value="0" icon={Clock3} tone="amber" />
        <StatCard label="Omzet bulan ini" value="Rp0" icon={Wallet} tone="sky" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ModuleCard href="/absen" title="Absen" description="Clock in & clock out" icon={ScanFace} tone="primary" />
        <ModuleCard href="/jadwal" title="Jadwal" description="Lihat shift kamu" icon={CalendarDays} tone="coral" />
        <ModuleCard href="/omzet" title="Omzet" description="Lapor hasil shift" icon={Wallet} tone="amber" />
        <ModuleCard
          href="/pengajuan"
          title="Pengajuan"
          description="Izin & libur"
          icon={ClipboardList}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader title="Shift operasional" description="Pembagian shift yang berlaku saat ini." />
        {activeShifts.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-muted">
            Admin belum mengatur shift.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {activeShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-semibold text-ink">{shift.name}</span>
                <span className="tabular text-[13px] font-semibold text-ink-muted">
                  {formatClock(shift.start_time)} – {formatClock(shift.end_time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
