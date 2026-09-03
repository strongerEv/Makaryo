"use client";

import { useActionState } from "react";

import { toggleWeeklyOffWindowAction, type ActionState } from "@/app/admin/approval/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AppSettings } from "@/lib/types/database";
import { monthLabel, recentMonths } from "@/lib/utils/period";

const INITIAL: ActionState = {};

/** Bulan yang masuk akal untuk dibuka: bulan ini dan tiga bulan ke depan. */
function upcomingMonths() {
  const [current] = recentMonths(1);
  const [year, month] = current.value.split("-").map(Number);

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: monthLabel(value) };
  });
}

export function WeeklyOffWindowForm({ settings }: { settings: AppSettings | null }) {
  const [state, submit] = useActionState(toggleWeeklyOffWindowAction, INITIAL);
  const open = Boolean(settings?.weekly_off_request_open);
  const period = settings?.weekly_off_request_period
    ? String(settings.weekly_off_request_period).slice(0, 7)
    : upcomingMonths()[1]?.value;

  return (
    <div className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3">
        <span className="text-[13px] font-semibold text-ink">Status saat ini</span>
        <Badge tone={open ? "success" : "neutral"}>{open ? "Dibuka" : "Ditutup"}</Badge>
      </div>

      {open ? (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-muted">
            Sedang dibuka untuk {period ? monthLabel(period) : "periode berjalan"}. Tutup bila jadwal sudah disusun.
          </p>

          <form action={submit} className="space-y-3">
            <input type="hidden" name="open" value="true" />
            <input type="hidden" name="period" value={period} />
            <Field
              label="Kuota per tanggal"
              htmlFor="kuota-tanggal-aktif"
              hint="Berapa host yang boleh libur di tanggal yang sama. Tanggal yang sudah penuh tidak bisa dipilih host lain."
            >
              <Input
                id="kuota-tanggal-aktif"
                name="quotaPerDate"
                type="number"
                min={1}
                max={20}
                defaultValue={settings?.weekly_off_quota_per_date ?? 1}
              />
            </Field>
            <SubmitButton block variant="soft" pendingLabel="Menyimpan…">
              Simpan kuota
            </SubmitButton>
          </form>

          <form action={submit}>
            <input type="hidden" name="open" value="false" />
            <SubmitButton block variant="outline" pendingLabel="Menutup…">
              Tutup pengajuan
            </SubmitButton>
          </form>
        </div>
      ) : (
        <form action={submit} className="space-y-3">
          <input type="hidden" name="open" value="true" />
          <Field label="Periode yang dibuka" htmlFor="weekly-period" required>
            <Select id="weekly-period" name="period" defaultValue={period}>
              {upcomingMonths().map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Kuota per tanggal"
            htmlFor="kuota-tanggal"
            hint="Berapa host yang boleh libur di tanggal yang sama."
          >
            <Input
              id="kuota-tanggal"
              name="quotaPerDate"
              type="number"
              min={1}
              max={20}
              defaultValue={settings?.weekly_off_quota_per_date ?? 1}
            />
          </Field>
          <SubmitButton block pendingLabel="Membuka…">
            Buka pengajuan libur
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
