import type { Metadata } from "next";
import { Receipt, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthFilterForm } from "@/components/ui/month-filter-form";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueForm } from "@/components/revenue/revenue-form";
import { RevenueList } from "@/components/revenue/revenue-list";
import { requireHost } from "@/lib/auth/session";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { RevenueReport, Shift } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { todayInJakarta } from "@/lib/utils/datetime";
import { currentMonth, monthRange } from "@/lib/utils/period";

export const metadata: Metadata = { title: "Omzet" };

export default async function HostRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const profile = await requireHost();
  const { bulan = currentMonth() } = await searchParams;
  const { start, end } = monthRange(bulan);
  const supabase = await createClient();

  const [{ data: shiftRows }, { data: reportRows }] = await Promise.all([
    supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("revenue_reports")
      .select("*, shifts(name)")
      .eq("host_id", profile.id)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false }),
  ]);

  const shifts = (shiftRows ?? []) as Shift[];
  const reports = (reportRows ?? []) as (RevenueReport & { shifts: { name: string } | null })[];
  const proofs = await signPhotoUrls(
    supabase,
    "revenue",
    reports.map((row) => row.proof_url),
  );

  const total = reports.reduce((sum, row) => sum + Number(row.amount), 0);
  const average = reports.length > 0 ? total / reports.length : 0;

  return (
    <>
      <PageHeader title="Omzet" description="Laporkan hasil tiap shift beserta bukti." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total bulan ini" value={formatCurrency(total)} icon={Wallet} tone="sky" />
        <StatCard label="Jumlah laporan" value={reports.length} icon={Receipt} tone="primary" />
        <StatCard label="Rata-rata per shift" value={formatCurrency(average)} icon={Wallet} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="self-start">
          <CardHeader title="Input omzet" description="Isi setelah shift kamu selesai." />
          <RevenueForm shifts={shifts} defaultDate={todayInJakarta()} />
        </Card>

        <Card className="p-0">
          <div className="space-y-4 p-5">
            <CardHeader className="mb-0" title="Riwayat omzet" description="Laporan yang sudah kamu kirim." />
            <MonthFilterForm action="/omzet" value={bulan} />
          </div>

          {reports.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Belum ada laporan bulan ini"
              description="Laporan omzet yang kamu kirim akan muncul di sini."
            />
          ) : (
            <RevenueList reports={reports} proofs={proofs} shifts={shifts} canEdit />
          )}
        </Card>
      </div>
    </>
  );
}
