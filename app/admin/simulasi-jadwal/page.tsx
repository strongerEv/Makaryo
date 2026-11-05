import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/session";
import {
  buildDefaultSandbox,
  parseSandbox,
  type SourceHost,
  type SourceShift,
} from "@/lib/scheduling/sandbox";
import { createClient } from "@/lib/supabase/server";
import { todayInJakarta } from "@/lib/utils/datetime";

import { SandboxApp } from "./sandbox-app";

export const metadata: Metadata = { title: "Simulasi Jadwal (Beta)" };

export default async function ScheduleSandboxPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayInJakarta();

  const [{ data: shiftRows }, { data: hostRows }, { data: sandboxRow, error: sandboxError }] = await Promise.all([
    supabase
      .from("shifts")
      .select("name, start_time, end_time, break_start, break_end, min_hosts, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, weekly_day_off_quota")
      .eq("role", "host")
      .eq("account_status", "active")
      .eq("employment_status", "active")
      .order("full_name"),
    supabase.from("schedule_sandboxes").select("data, updated_at").eq("id", 1).maybeSingle(),
  ]);

  const sourceShifts = (shiftRows ?? []) as SourceShift[];
  const sourceHosts = (hostRows ?? []) as SourceHost[];

  // Tabel belum ada = migrasi 0018 belum dijalankan. Halaman tetap bisa
  // dipakai, hanya saja hasilnya tidak tersimpan.
  const storageReady = !sandboxError;
  const saved = sandboxRow ? parseSandbox(sandboxRow.data) : null;
  const initial = saved ?? buildDefaultSandbox({ shifts: sourceShifts, hosts: sourceHosts, today });

  return (
    <>
      <PageHeader
        title="Simulasi Jadwal"
        badge={<Badge tone="warning">BETA</Badge>}
        description="Ruang coba-coba jadwal multi lini bisnis. Hanya admin yang bisa melihat, dan tidak mengubah jadwal asli."
      />

      <SandboxApp
        initial={initial}
        initialSavedAt={saved ? (sandboxRow?.updated_at as string) : null}
        storageReady={storageReady}
        sourceShifts={sourceShifts}
        sourceHosts={sourceHosts}
        today={today}
      />
    </>
  );
}
