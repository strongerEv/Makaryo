"use client";

import { useActionState } from "react";

import { updateUserAction, type ActionState } from "@/app/admin/pengguna/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types/database";

const INITIAL: ActionState = {};

export function EditUserForm({ user }: { user: Profile }) {
  const [state, formAction] = useActionState(updateUserAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <input type="hidden" name="userId" value={user.id} />

      <Field label="Nama lengkap" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" defaultValue={user.full_name} required minLength={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nomor HP aktif" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={user.phone ?? ""} />
        </Field>
        <Field label="Tanggal lahir" htmlFor="birthDate">
          <Input id="birthDate" name="birthDate" type="date" defaultValue={user.birth_date ?? ""} />
        </Field>
      </div>

      <Field label="Alamat domisili" htmlFor="address">
        <Textarea id="address" name="address" rows={2} defaultValue={user.address ?? ""} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal join" htmlFor="joinDate">
          <Input id="joinDate" name="joinDate" type="date" defaultValue={user.join_date ?? ""} />
        </Field>
        <Field label="Nomor rekening" htmlFor="bankAccount" hint="Opsional, untuk kebutuhan payroll.">
          <Input id="bankAccount" name="bankAccount" defaultValue={user.bank_account ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status kepegawaian" htmlFor="employmentStatus" required>
          <Select id="employmentStatus" name="employmentStatus" defaultValue={user.employment_status}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="long_leave">Cuti panjang</option>
          </Select>
        </Field>
        <Field
          label="Jatah libur mingguan"
          htmlFor="weeklyDayOffQuota"
          hint="Dipakai mesin penjadwalan. Default 1x per minggu."
        >
          <Input
            id="weeklyDayOffQuota"
            name="weeklyDayOffQuota"
            type="number"
            min={0}
            max={7}
            defaultValue={user.weekly_day_off_quota}
          />
        </Field>
      </div>

      <SubmitButton pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
    </form>
  );
}
