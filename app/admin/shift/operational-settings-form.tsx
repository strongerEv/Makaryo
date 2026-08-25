"use client";

import { useActionState } from "react";

import { updateSettingsAction, type ActionState } from "@/app/admin/shift/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AppSettings } from "@/lib/types/database";

const INITIAL: ActionState = {};

export function OperationalSettingsForm({ settings }: { settings: AppSettings | null }) {
  const [state, formAction] = useActionState(updateSettingsAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Operasional mulai" htmlFor="operationalStart" required>
          <Input
            id="operationalStart"
            name="operationalStart"
            type="time"
            required
            defaultValue={settings?.operational_start?.slice(0, 5) ?? "06:00"}
          />
        </Field>
        <Field label="Operasional selesai" htmlFor="operationalEnd" required>
          <Input
            id="operationalEnd"
            name="operationalEnd"
            type="time"
            required
            defaultValue={settings?.operational_end?.slice(0, 5) ?? "21:00"}
          />
        </Field>
      </div>

      <Field
        label="Toleransi telat (menit)"
        htmlFor="lateToleranceMinutes"
        hint="Clock in setelah jam mulai shift + toleransi dihitung telat."
        required
      >
        <Input
          id="lateToleranceMinutes"
          name="lateToleranceMinutes"
          type="number"
          min={0}
          max={120}
          required
          defaultValue={settings?.late_tolerance_minutes ?? 0}
        />
      </Field>

      <SubmitButton pendingLabel="Menyimpan…">Simpan pengaturan</SubmitButton>
    </form>
  );
}
