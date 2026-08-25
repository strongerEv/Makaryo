"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { createUserAction, type ActionState } from "@/app/admin/pengguna/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createUserAction, INITIAL);

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
        <UserPlus className="size-4" aria-hidden />
        Tambah pengguna
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah pengguna"
        description="Akun yang dibuat admin langsung aktif tanpa perlu verifikasi."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Nama lengkap" htmlFor="new-fullName" required>
            <Input id="new-fullName" name="fullName" required minLength={3} placeholder="Nama sesuai KTP" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="new-email" required>
              <Input id="new-email" name="email" type="email" required placeholder="nama@email.com" />
            </Field>
            <Field label="Nomor HP" htmlFor="new-phone">
              <Input id="new-phone" name="phone" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" />
            </Field>
          </div>

          <Field label="Kata sandi awal" htmlFor="new-password" required hint="Minimal 8 karakter. Beritahukan ke pengguna agar segera diganti.">
            <Input id="new-password" name="password" type="text" required minLength={8} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Peran" htmlFor="new-role" required>
              <Select id="new-role" name="role" defaultValue="host">
                <option value="host">Host</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Field label="Tanggal join" htmlFor="new-joinDate">
              <Input id="new-joinDate" name="joinDate" type="date" />
            </Field>
            <Field label="Jatah libur / minggu" htmlFor="new-quota">
              <Input id="new-quota" name="weeklyDayOffQuota" type="number" min={0} max={7} defaultValue={1} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton pendingLabel="Membuat akun…">Buat akun</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
