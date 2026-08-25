import type { Metadata } from "next";
import { History } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog, Profile } from "@/lib/types/database";
import { formatDateTime, todayInJakarta } from "@/lib/utils/datetime";
import { addDays } from "@/lib/utils/period";

export const metadata: Metadata = { title: "Riwayat Aktivitas" };

type Row = AuditLog & {
  actor: Pick<Profile, "full_name"> | null;
  target: Pick<Profile, "full_name"> | null;
};

const ENTITY_LABEL: Record<string, string> = {
  user: "Pengguna",
  schedule: "Jadwal",
  leave_request: "Pengajuan",
  revenue: "Omzet",
  shift: "Shift",
  attendance: "Absensi",
  settings: "Pengaturan",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Menambah",
  update: "Mengubah",
  delete: "Menghapus",
  approve: "Menyetujui",
  reject: "Menolak",
  suspend: "Menonaktifkan",
  reactivate: "Mengaktifkan",
  publish: "Mem-publish",
};

const ACTION_TONE: Record<string, Tone> = {
  create: "success",
  update: "info",
  delete: "danger",
  approve: "success",
  reject: "danger",
  suspend: "danger",
  reactivate: "success",
  publish: "primary",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entitas?: string; dari?: string; sampai?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const today = todayInJakarta();
  const entity = params.entitas ?? "all";
  const from = params.dari ?? addDays(today, -30);
  const to = params.sampai ?? today;

  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "*, actor:profiles!audit_logs_actor_id_fkey(full_name), target:profiles!audit_logs_target_user_id_fkey(full_name)",
    )
    .gte("created_at", `${from}T00:00:00+07:00`)
    .lte("created_at", `${to}T23:59:59+07:00`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (entity !== "all") query = query.eq("entity", entity);

  const { data } = await query;
  const logs = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Riwayat Aktivitas"
        description="Catatan perubahan yang berdampak ke pengguna, jadwal, absensi, dan omzet."
      />

      <Card className="p-0">
        <form
          action="/admin/riwayat"
          className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:p-5"
        >
          <Field label="Kategori" htmlFor="entitas">
            <Select id="entitas" name="entitas" defaultValue={entity}>
              <option value="all">Semua kategori</option>
              {Object.entries(ENTITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dari" htmlFor="dari">
            <Input id="dari" name="dari" type="date" defaultValue={from} />
          </Field>
          <Field label="Sampai" htmlFor="sampai">
            <Input id="sampai" name="sampai" type="date" defaultValue={to} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="outline" block className="sm:w-auto">
              Terapkan
            </Button>
          </div>
        </form>

        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas tercatat"
            description="Perubahan jadwal, approval, omzet, dan pengaturan shift akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONE[log.action] ?? "neutral"}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </Badge>
                  <Badge tone="neutral">{ENTITY_LABEL[log.entity] ?? log.entity}</Badge>
                  <span className="text-[12px] text-ink-muted">{formatDateTime(log.created_at)}</span>
                </div>

                <p className="mt-1.5 text-[13px] text-ink">
                  <span className="font-semibold">{log.actor?.full_name ?? "Sistem"}</span>{" "}
                  {(ACTION_LABEL[log.action] ?? log.action).toLowerCase()}{" "}
                  {(ENTITY_LABEL[log.entity] ?? log.entity).toLowerCase()}
                  {log.target?.full_name ? (
                    <>
                      {" "}milik <span className="font-semibold">{log.target.full_name}</span>
                    </>
                  ) : null}
                  .
                </p>

                {log.before || log.after ? (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[12px] font-semibold text-primary">
                      Lihat detail perubahan
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <ChangeBlock label="Sebelum" value={log.before} />
                      <ChangeBlock label="Sesudah" value={log.after} />
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ChangeBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return null;

  return (
    <div className="overflow-x-auto rounded-[12px] bg-surface-muted px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold text-ink-muted">{label}</p>
      <pre className="text-[11px] whitespace-pre-wrap text-ink">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
