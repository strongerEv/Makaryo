import type { Metadata } from "next";
import { FileSpreadsheet, FileText } from "lucide-react";

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
            description="Berisi jam clock in/out, status kehadiran, keterlambatan, dan durasi kerja."
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
            PDF cocok untuk arsip dan lampiran — sudah berisi ringkasan total di baris terakhir.
          </li>
          <li className="flex gap-2">
            <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden />
            Excel cocok bila datanya masih ingin diolah lagi, misalnya untuk perhitungan bonus.
          </li>
        </ul>
      </Card>
    </>
  );
}
