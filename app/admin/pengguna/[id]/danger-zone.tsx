"use client";

import { useActionState, useState } from "react";

import {
  deleteUserAction,
  setAccountStatusAction,
  type ActionState,
} from "@/app/admin/pengguna/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types/database";

const INITIAL: ActionState = {};

export function DangerZone({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const [statusState, changeStatus] = useActionState(setAccountStatusAction, INITIAL);
  const [deleteState, deleteUser] = useActionState(deleteUserAction, INITIAL);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isSelf) {
    return (
      <Card>
        <CardHeader title="Pengaturan akun" />
        <p className="text-[13px] text-ink-muted">
          Ini akunmu sendiri. Penonaktifan dan penghapusan hanya bisa dilakukan admin lain.
        </p>
      </Card>
    );
  }

  const isSuspended = user.account_status === "suspended" || user.account_status === "rejected";

  return (
    <Card className="border-coral/30">
      <CardHeader
        title="Zona berbahaya"
        description="Nonaktifkan bila hanya ingin mencabut akses. Hapus permanen tidak bisa dibatalkan."
      />

      {statusState.error ? <Alert tone="error" className="mb-3">{statusState.error}</Alert> : null}
      {statusState.success ? <Alert tone="success" className="mb-3">{statusState.success}</Alert> : null}
      {deleteState.error ? <Alert tone="error" className="mb-3">{deleteState.error}</Alert> : null}

      <div className="flex flex-col gap-2">
        {isSuspended ? (
          <form action={changeStatus}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="status" value="active" />
            <SubmitButton variant="success" block pendingLabel="Mengaktifkan…">
              Aktifkan kembali akun
            </SubmitButton>
          </form>
        ) : (
          <button type="button" onClick={() => setSuspendOpen(true)} className={buttonClass({ variant: "outline", block: true })}>
            Nonaktifkan akun
          </button>
        )}

        <button type="button" onClick={() => setDeleteOpen(true)} className={buttonClass({ variant: "danger", block: true })}>
          Hapus permanen
        </button>
      </div>

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title={`Nonaktifkan ${user.full_name}`}
        description="Pengguna tidak bisa masuk, tetapi seluruh riwayatnya tetap tersimpan."
      >
        <form
          action={(formData) => {
            changeStatus(formData);
            setSuspendOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="status" value="suspended" />
          <Field label="Alasan (ditampilkan ke pengguna)" htmlFor="suspend-note">
            <Textarea id="suspend-note" name="note" rows={3} placeholder="Contoh: sedang dalam proses evaluasi." />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSuspendOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menonaktifkan…">
              Nonaktifkan
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus akun permanen"
        description="Akun beserta datanya hilang selamanya. Tindakan ini tidak bisa dibatalkan."
      >
        <form action={deleteUser} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <Alert tone="warning">
            Akun yang sudah punya riwayat absensi, jadwal, atau omzet tidak bisa dihapus — nonaktifkan saja.
          </Alert>
          <Field
            label={`Ketik "${user.full_name}" untuk konfirmasi`}
            htmlFor="delete-confirmation"
            required
          >
            <Input id="delete-confirmation" name="confirmation" required autoComplete="off" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menghapus…">
              Hapus permanen
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
