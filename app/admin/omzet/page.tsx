import type { Metadata } from "next";
import { Receipt, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { RevenueTrendChart, type RevenuePoint } from "@/components/charts/revenue-trend-chart";
import { RevenueForm } from "@/components/revenue/revenue-form";
import { RevenueList, type RevenueRow } from "@/components/revenue/revenue-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Shift } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { todayInJakarta } from "@/lib/utils/datetime";
import { currentMonth, eachDate, monthRange, recentMonths } from "@/lib/utils/period";
import { LiveSync } from "@/lib/realtime/live-sync";

export const metadata: Metadata = { title: "Omzet" };

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; host?: string }>;
}) {
  await requireAdmin();
  const { bulan = currentMonth(), host = "all" } = await searchParams;
  const { start, end } = monthRange(bulan);
  const supabase = await createClient();

  let query = supabase
    .from("revenue_reports")
    .select("*, shifts(name), profiles!revenue_reports_host_id_fkey(full_name)")
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: false });

  if (host !== "all") query = query.eq("host_id", host);

  const [{ data: reportRows }, { data: hostRows }, { data: shiftRows }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "host")
      .eq("account_status", "active")
      .order("full_name"),
    supabase.from("shifts").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const reports = (reportRows ?? []) as unknown as RevenueRow[];
  const hosts = (hostRows ?? []) as Profile[];
  const shifts = (shiftRows ?? []) as Shift[];

  const proofs = await signPhotoUrls(
    supabase,
    "revenue",
    reports.map((row) => row.proof_url),
  );

  const total = reports.reduce((sum, row) => sum + Number(row.amount), 0);
  const perDay = new Map<string, number>();
  reports.forEach((row) => {
    perDay.set(row.work_date, (perDay.get(row.work_date) ?? 0) + Number(row.amount));
  });

  const chartData: RevenuePoint[] = eachDate(start, end).map((date) => ({
    label: String(Number(date.slice(8, 10))),
    amount: perDay.get(date) ?? 0,
  }));

  const bestDay = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <LiveSync tables={["revenue_reports"]} />

      <PageHeader title="Omzet" description="Rekap laporan omzet seluruh host." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total periode" value={formatCurrency(total)} icon={Wallet} tone="sky" />
        <StatCard label="Jumlah laporan" value={reports.length} icon={Receipt} tone="primary" />
        <StatCard
          label="Rata-rata per laporan"
          value={formatCurrency(reports.length > 0 ? total / reports.length : 0)}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Hari tertinggi"
          value={bestDay ? formatCurrency(bestDay[1]) : "Rp0"}
          hint={bestDay ? `Tanggal ${Number(bestDay[0].slice(8, 10))}` : undefined}
          icon={TrendingUp}
          tone="amber"
        />
      </div>

      <Card className="mb-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <CardHeader className="mb-0" title="Tren omzet harian" description="Total omzet seluruh laporan per tanggal." />
          <form action="/admin/omzet" className="flex flex-wrap items-end gap-3">
            <Field label="Periode" htmlFor="bulan" className="min-w-[180px]">
              <Select id="bulan" name="bulan" defaultValue={bulan}>
                {recentMonths().map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Host" htmlFor="host" className="min-w-[180px]">
              <Select id="host" name="host" defaultValue={host}>
                <option value="all">Semua host</option>
                {hosts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="outline">
              Terapkan
            </Button>
          </form>
        </div>

        <RevenueTrendChart data={chartData} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="p-0">
          <div className="p-5">
            <CardHeader className="mb-0" title="Daftar laporan" description="Klik ikon pensil untuk merevisi." />
          </div>

          {reports.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Belum ada laporan omzet"
              description="Laporan dari host akan muncul di sini."
            />
          ) : (
            <RevenueList reports={reports} proofs={proofs} shifts={shifts} canEdit showHost />
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Input omzet atas nama host" description="Dipakai bila host tidak sempat melapor sendiri." />
          <RevenueForm shifts={shifts} defaultDate={todayInJakarta()} hosts={hosts} />
        </Card>
      </div>
    </>
  );
}
