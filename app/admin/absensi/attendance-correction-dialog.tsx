"use client";

import { Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { correctAttendanceAction, type ActionState } from "@/app/admin/absensi/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Attendance } from "@/lib/types/database";

const INITIAL: ActionState = {};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toTimeInput(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "";
}

export function AttendanceCorrectionDialog({
  attendance,
  hostName,
}: {
  attendance: Attendance;
  hostName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(correctAttendanceAction, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass({ variant: "ghost", size: "sm" })}
      >
        <Pencil className="size-4" aria-hidden />
        Koreksi
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Koreksi absensi ${hostName}`}
        description="Perubahan jam akan menghitung ulang status keterlambatan dan durasi kerja."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          <input type="hidden" name="attendanceId" value={attendance.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clock in" htmlFor={`fix-in-${attendance.id}`} required>
              <Input
                id={`fix-in-${attendance.id}`}
                name="clockIn"
                type="time"
                required
                defaultValue={toTimeInput(attendance.clock_in_at)}
              />
            </Field>
            <Field label="Clock out" htmlFor={`fix-out-${attendance.id}`} hint="Kosongkan bila belum selesai.">
              <Input
                id={`fix-out-${attendance.id}`}
                name="clockOut"
                type="time"
                defaultValue={toTimeInput(attendance.clock_out_at)}
              />
            </Field>
          </div>

          <Field label="Catatan koreksi" htmlFor={`fix-note-${attendance.id}`}>
            <Textarea
              id={`fix-note-${attendance.id}`}
              name="note"
              rows={2}
              defaultValue={attendance.note ?? ""}
              placeholder="Alasan koreksi"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton pendingLabel="Menyimpan…">Simpan koreksi</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
