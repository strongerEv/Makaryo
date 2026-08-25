"use client";

import { useActionState } from "react";

import { submitRevenueAction, type ActionState } from "@/app/(host)/omzet/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile, Shift } from "@/lib/types/database";

const INITIAL: ActionState = {};

/** Dipakai host untuk dirinya sendiri, dan admin untuk melaporkan atas nama host. */
export function RevenueForm({
  shifts,
  defaultDate,
  hosts,
}: {
  shifts: Shift[];
  defaultDate: string;
  hosts?: Profile[];
}) {
  const [state, formAction] = useActionState(submitRevenueAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      {hosts ? (
        <Field label="Host" htmlFor="revenue-host" required>
          <Select id="revenue-host" name="hostId" required defaultValue="">
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
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor="revenue-date" required>
          <Input id="revenue-date" name="workDate" type="date" required defaultValue={defaultDate} />
        </Field>
        <Field label="Shift" htmlFor="revenue-shift" required>
          <Select id="revenue-shift" name="shiftId" required defaultValue="">
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

      <Field label="Nominal omzet (Rp)" htmlFor="revenue-amount" required>
        <Input
          id="revenue-amount"
          name="amount"
          type="number"
          min={0}
          step={1000}
          required
          inputMode="numeric"
          placeholder="0"
        />
      </Field>

      <Field label="Foto bukti" htmlFor="revenue-proof" hint="JPG, PNG, atau WebP. Maksimal 5 MB.">
        <Input id="revenue-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" className="py-2.5" />
      </Field>

      <Field label="Catatan" htmlFor="revenue-note">
        <Textarea id="revenue-note" name="note" rows={2} placeholder="Opsional" />
      </Field>

      <SubmitButton block pendingLabel="Menyimpan…">
        Simpan laporan
      </SubmitButton>
    </form>
  );
}
