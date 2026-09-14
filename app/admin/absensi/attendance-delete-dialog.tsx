"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { deleteAttendanceAction, type ActionState } from "@/app/admin/absensi/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { ConfirmField } from "@/components/ui/confirm-field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Attendance } from "@/lib/types/database";
import { formatDate, formatTimeShort } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

/**
 * Menghapus satu catatan absensi.
 *
 * Terpisah dari dialog koreksi karena keduanya menjawab masalah yang berbeda:
 * koreksi untuk jam yang salah, penghapusan untuk baris yang memang tidak
 * seharusnya ada. Fotonya ikut terhapus, jadi konfirmasinya harus diketik.
 */
export function AttendanceDeleteDialog({
  attendance,
  hostName,
}: {
  attendance: Attendance;
  hostName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, hapus] = useActionState(deleteAttendanceAction, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonClass({ variant: "ghost", size: "sm" })} text-coral hover:bg-coral-soft`}
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">Hapus absensi {hostName}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hapus catatan absensi"
        description="Baris absensi beserta foto clock in dan clock out-nya hilang permanen."
        className="sm:max-w-[440px]"
      >
        <form action={hapus} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          <input type="hidden" name="attendanceId" value={attendance.id} />

          <div className="rounded-[var(--radius-md)] bg-surface-muted p-3.5">
            <p className="text-sm font-bold text-ink">{hostName}</p>
            <p className="tabular mt-0.5 text-[12px] text-ink-muted">
              {formatDate(attendance.work_date)} ·{" "}
              {attendance.clock_out_at
                ? `${formatTimeShort(attendance.clock_in_at)} → ${formatTimeShort(attendance.clock_out_at)} WIB`
                : `${formatTimeShort(attendance.clock_in_at)} WIB → belum clock out`}
            </p>
          </div>

          <ConfirmField id={`hapus-absensi-${attendance.id}`} />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menghapus…">
              <Trash2 className="size-4" aria-hidden />
              Hapus absensi
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
