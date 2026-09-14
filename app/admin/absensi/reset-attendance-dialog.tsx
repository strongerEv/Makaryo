"use client";

import { Eraser } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { resetAttendanceAction, type ActionState } from "@/app/admin/absensi/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { ConfirmField } from "@/components/ui/confirm-field";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { monthOptions } from "@/lib/utils/period";

const INITIAL: ActionState = {};

/**
 * Membersihkan catatan absensi satu bulan sekaligus.
 *
 * Jumlah barisnya ditampilkan per bulan sebelum apa pun terjadi — sama seperti
 * reset jadwal dan reset omzet, supaya admin tahu persis apa yang hilang dan
 * tidak perlu menebak apakah bulan yang dipilih memang berisi data percobaan.
 */
export function ResetAttendanceDialog({
  defaultMonth,
  counts,
  hosts,
}: {
  defaultMonth: string;
  /** Jumlah catatan absensi per bulan, dalam format YYYY-MM. */
  counts: Record<string, number>;
  hosts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [state, reset] = useActionState(resetAttendanceAction, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const isi = counts[month] ?? 0;
  const months = monthOptions({ back: 12, forward: 1, include: defaultMonth });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "outline" })}>
        <Eraser className="size-4" aria-hidden />
        Reset absensi
      </button>

      {state.success ? (
        <Alert tone="success" className="mt-2">
          {state.success}
        </Alert>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset data absensi"
        description="Menghapus catatan absensi satu bulan beserta foto-fotonya. Tidak bisa dibatalkan."
      >
        <form action={reset} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Bulan yang direset" htmlFor="reset-absensi-bulan" required>
            <Select
              id="reset-absensi-bulan"
              name="bulan"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {months.map((item) => {
                const jumlah = counts[item.value] ?? 0;
                return (
                  <option key={item.value} value={item.value}>
                    {item.label} · {jumlah === 0 ? "kosong" : `${jumlah} catatan`}
                  </option>
                );
              })}
            </Select>
          </Field>

          <Field
            label="Host"
            htmlFor="reset-absensi-host"
            hint="Pilih satu host bila hanya data percobaannya yang mau dibuang."
          >
            <Select id="reset-absensi-host" name="host" defaultValue="all">
              <option value="all">Semua host</option>
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.name}
                </option>
              ))}
            </Select>
          </Field>

          {isi === 0 ? (
            <Alert tone="info">Bulan ini belum punya catatan absensi, jadi tidak ada yang bisa dihapus.</Alert>
          ) : (
            <Alert tone="warning">
              {isi} catatan absensi akan hilang permanen bila kamu memilih semua host. Jadwal dan laporan omzet
              tidak ikut terhapus.
            </Alert>
          )}

          <ConfirmField id="reset-absensi-konfirmasi" disabled={isi === 0} />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" disabled={isi === 0} pendingLabel="Menghapus…">
              Reset absensi
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
