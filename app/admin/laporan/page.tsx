import type { Metadata } from "next";
import { FileSpreadsheet, FileText, Receipt } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { ExportPanel } from "./export-panel";

export const metadata: Metadata = { title: "Laporan" };

export default async function ReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "host")
    .order("full_name");

  const hosts = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Unduh rekap absensi dan omzet dalam format PDF atau Excel."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Laporan absensi"
            description="Dipisah per nama — satu halaman PDF dan satu sheet Excel untuk tiap host."
          />
          <ExportPanel endpoint="/api/export/absensi" hosts={hosts} />
        </Card>

        <Card>
          <CardHeader
            title="Laporan omzet"
            description="Berisi nominal omzet per shift beserta catatannya."
          />
          <ExportPanel endpoint="/api/export/omzet" hosts={hosts} />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Catatan format" />
        <ul className="space-y-2 text-[13px] text-ink-muted">
          <li className="flex gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
            PDF absensi memberi satu halaman per host, jadi lembarannya bisa langsung dipotong dan
            diserahkan ke orangnya. Halaman pertama berisi ringkasan seluruh tim.
          </li>
          <li className="flex gap-2">
            <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden />
            Excel absensi memberi satu sheet per nama, plus sheet Ringkasan di depan — enak dipakai
            lagi untuk perhitungan bonus.
          </li>
          <li className="flex gap-2">
            <Receipt className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
            Laporan omzet masih satu tabel gabungan dengan kolom host.
          </li>
        </ul>
      </Card>
    </>
  );
}
