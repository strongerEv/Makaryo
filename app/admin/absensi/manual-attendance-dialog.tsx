"use client";

import { ClipboardPen } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { recordManualAttendanceAction, type ActionState } from "@/app/admin/absensi/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types/database";

const INITIAL: ActionState = {};

/** Untuk host yang lupa clock in tetapi terbukti bekerja. */
export function ManualAttendanceDialog({ hosts, defaultDate }: { hosts: Profile[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(recordManualAttendanceAction, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      {state.success ? (
        <Alert tone="success" className="mb-3">
          {state.success}
        </Alert>
      ) : null}

      <button type="button" onClick={() => setOpen(true)} className={buttonClass()}>
        <ClipboardPen className="size-4" aria-hidden />
        Catat manual
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Catat absensi manual"
        description="Dipakai bila host lupa absen padahal benar-benar bekerja. Tercatat di riwayat aktivitas."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Host" htmlFor="manual-host" required>
            <Select id="manual-host" name="hostId" required defaultValue="">
              <option value="" disabled>
                Pilih host
              </option>
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.full_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal" htmlFor="manual-date" required>
              <Input id="manual-date" name="workDate" type="date" required defaultValue={defaultDate} />
            </Field>
            <Field label="Clock in" htmlFor="manual-in" required>
              <Input id="manual-in" name="clockIn" type="time" required />
            </Field>
            <Field label="Clock out" htmlFor="manual-out" hint="Boleh dikosongkan.">
              <Input id="manual-out" name="clockOut" type="time" />
            </Field>
          </div>

          <Field label="Catatan" htmlFor="manual-note">
            <Textarea id="manual-note" name="note" rows={2} placeholder="Contoh: HP host mati, absen dicatat admin." />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton pendingLabel="Menyimpan…">Simpan absensi</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
