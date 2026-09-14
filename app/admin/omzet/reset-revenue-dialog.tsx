"use client";

import { Eraser } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { resetRevenueAction, type ActionState } from "@/app/admin/omzet/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { ConfirmField } from "@/components/ui/confirm-field";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency } from "@/lib/utils/format";
import { monthOptions } from "@/lib/utils/period";

const INITIAL: ActionState = {};

/** Isi tiap bulan, supaya dampaknya terbaca sebelum tombolnya ditekan. */
export type RevenueMonthCount = { reports: number; amount: number };

/**
 * Membersihkan laporan omzet satu bulan sekaligus.
 *
 * Jumlah laporan dan totalnya ditampilkan per bulan sebelum apa pun terjadi.
 * Tanpa itu, memilih bulan yang kebetulan kosong terasa seperti fiturnya rusak,
 * dan memilih bulan yang penuh data asli terasa aman padahal tidak.
 */
export function ResetRevenueDialog({
  defaultMonth,
  counts,
  hosts,
}: {
  defaultMonth: string;
  counts: Record<string, RevenueMonthCount>;
  hosts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [state, reset] = useActionState(resetRevenueAction, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const isi = counts[month] ?? { reports: 0, amount: 0 };
  const months = monthOptions({ back: 12, forward: 1, include: defaultMonth });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "outline" })}>
        <Eraser className="size-4" aria-hidden />
        Reset omzet
      </button>

      {state.success ? (
        <Alert tone="success" className="mt-2">
          {state.success}
        </Alert>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset laporan omzet"
        description="Menghapus laporan omzet satu bulan beserta foto buktinya. Tidak bisa dibatalkan."
      >
        <form action={reset} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Bulan yang direset" htmlFor="reset-omzet-bulan" required>
            <Select
              id="reset-omzet-bulan"
              name="bulan"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {months.map((item) => {
                const jumlah = counts[item.value] ?? { reports: 0, amount: 0 };
                return (
                  <option key={item.value} value={item.value}>
                    {item.label} ·{" "}
                    {jumlah.reports === 0
                      ? "kosong"
                      : `${jumlah.reports} laporan, ${formatCurrency(jumlah.amount)}`}
                  </option>
                );
              })}
            </Select>
          </Field>

          <Field
            label="Host"
            htmlFor="reset-omzet-host"
            hint="Pilih satu host bila hanya data percobaannya yang mau dibuang."
          >
            <Select id="reset-omzet-host" name="host" defaultValue="all">
              <option value="all">Semua host</option>
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.name}
                </option>
              ))}
            </Select>
          </Field>

          {isi.reports === 0 ? (
            <Alert tone="info">Bulan ini belum punya laporan omzet, jadi tidak ada yang bisa dihapus.</Alert>
          ) : (
            <Alert tone="warning">
              {isi.reports} laporan senilai {formatCurrency(isi.amount)} akan hilang permanen bila kamu memilih
              semua host.
            </Alert>
          )}

          <ConfirmField id="reset-omzet-konfirmasi" disabled={isi.reports === 0} />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" disabled={isi.reports === 0} pendingLabel="Menghapus…">
              Reset omzet
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
