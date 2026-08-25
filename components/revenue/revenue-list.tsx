"use client";

import { Pencil, Receipt } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { updateRevenueAction, type ActionState } from "@/app/(host)/omzet/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RevenueReport, Shift } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

export type RevenueRow = RevenueReport & {
  shifts: { name: string } | null;
  profiles?: { full_name: string } | null;
};

export function RevenueList({
  reports,
  proofs,
  shifts,
  canEdit,
  showHost,
}: {
  reports: RevenueRow[];
  proofs: Record<string, string>;
  shifts: Shift[];
  canEdit?: boolean;
  showHost?: boolean;
}) {
  const [editing, setEditing] = useState<RevenueRow | null>(null);
  const [state, update] = useActionState(updateRevenueAction, INITIAL);

  useEffect(() => {
    if (state.success) setEditing(null);
  }, [state.success]);

  return (
    <>
      {state.success ? (
        <Alert tone="success" className="mx-5 mb-3">
          {state.success}
        </Alert>
      ) : null}

      <ul className="divide-y divide-line">
        {reports.map((report) => (
          <li key={report.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            {report.proof_url && proofs[report.proof_url] ? (
              <a href={proofs[report.proof_url]} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofs[report.proof_url]}
                  alt="Bukti omzet"
                  className="size-12 rounded-[14px] object-cover"
                />
              </a>
            ) : (
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-ink-muted">
                <Receipt className="size-5" aria-hidden />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="tabular truncate text-sm font-bold text-ink">{formatCurrency(report.amount)}</p>
              <p className="truncate text-[12px] text-ink-muted">
                {showHost && report.profiles?.full_name ? `${report.profiles.full_name} · ` : ""}
                {formatDate(report.work_date)}
                {report.shifts?.name ? ` · ${report.shifts.name}` : ""}
                {report.note ? ` · ${report.note}` : ""}
              </p>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditing(report)}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                <Pencil className="size-4" aria-hidden />
                <span className="sr-only">Ubah laporan</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Revisi laporan omzet"
        description="Revisi setelah submit awal tercatat di riwayat aktivitas."
      >
        {editing ? (
          <form action={update} className="space-y-4">
            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            <input type="hidden" name="reportId" value={editing.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal" htmlFor="edit-date" required>
                <Input id="edit-date" name="workDate" type="date" required defaultValue={editing.work_date} />
              </Field>
              <Field label="Shift" htmlFor="edit-shift" required>
                <Select id="edit-shift" name="shiftId" required defaultValue={editing.shift_id ?? ""}>
                  <option value="" disabled>
                    Pilih shift
                  </option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Nominal omzet (Rp)" htmlFor="edit-amount" required>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                min={0}
                step={1000}
                required
                defaultValue={Number(editing.amount)}
              />
            </Field>

            <Field label="Ganti foto bukti" htmlFor="edit-proof" hint="Kosongkan bila tidak diganti.">
              <Input id="edit-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" className="py-2.5" />
            </Field>

            <Field label="Catatan" htmlFor="edit-note">
              <Textarea id="edit-note" name="note" rows={2} defaultValue={editing.note ?? ""} />
            </Field>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={buttonClass({ variant: "ghost" })}>
                Batal
              </button>
              <SubmitButton pendingLabel="Menyimpan…">Simpan revisi</SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
