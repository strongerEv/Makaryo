import type { Metadata } from "next";
import { Clock3, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, Shift } from "@/lib/types/database";
import { OperationalSettingsForm } from "./operational-settings-form";
import { ShiftDialog } from "./shift-dialog";
import { ShiftRow } from "./shift-row";
import { WorkHoursCard } from "./work-hours-card";

export const metadata: Metadata = { title: "Pengaturan Shift" };

export default async function ShiftSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: shiftRows }, { data: settingsRow }] = await Promise.all([
    supabase.from("shifts").select("*").order("sort_order").order("start_time"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
  ]);

  const shifts = (shiftRows ?? []) as Shift[];
  const settings = settingsRow as AppSettings | null;
  const nextSortOrder = shifts.length > 0 ? Math.max(...shifts.map((shift) => shift.sort_order)) + 1 : 1;

  return (
    <>
      <PageHeader
        title="Pengaturan Shift"
        description="Atur pembagian shift, jumlah host minimum, dan jam operasional."
        action={<ShiftDialog mode="create" nextSortOrder={nextSortOrder} />}
      />

      {shifts.filter((shift) => shift.is_active).length > 0 ? (
        <section className="mb-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-coral-soft text-coral">
              <Settings2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Pengaturan Jam Kerja</h2>
              <p className="text-[13px] text-ink-muted">
                Atur jam live dan istirahat tiap shift. Total live dihitung otomatis.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {shifts
              .filter((shift) => shift.is_active)
              .map((shift) => (
                <WorkHoursCard key={shift.id} shift={shift} />
              ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="p-0">
          <div className="border-b border-line p-5">
            <CardHeader
              className="mb-0"
              title="Daftar shift"
              description="Shift tidak pernah dihapus agar riwayat jadwal lama tetap valid — cukup dinonaktifkan."
            />
          </div>

          {shifts.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="Belum ada shift"
              description="Tambahkan shift pertama untuk mulai menyusun jadwal."
            />
          ) : (
            <ul className="divide-y divide-line">
              {shifts.map((shift) => (
                <li key={shift.id}>
                  <ShiftRow shift={shift} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Jam operasional & absensi"
            description="Berlaku untuk seluruh host dan dipakai saat menghitung status keterlambatan."
          />
          <OperationalSettingsForm settings={settings} />
        </Card>
      </div>
    </>
  );
}
