"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { resetDemoAction, seedDemoAction, type ActionState } from "@/app/admin/data-contoh/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function DemoDataPanel({ adaData, disabled }: { adaData: boolean; disabled: boolean }) {
  const [seedState, seed] = useActionState(seedDemoAction, INITIAL);
  const [resetState, reset] = useActionState(resetDemoAction, INITIAL);
  const [resetOpen, setResetOpen] = useState(false);

  const error = seedState.error ?? resetState.error;
  const success = seedState.success ?? resetState.success;

  return (
    <Card className="self-start">
      <CardHeader
        title="Kelola data simulasi"
        description="Aman dipakai berulang. Data asli tidak pernah ikut terhapus."
      />

      {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
      {success ? <Alert tone="success" className="mb-3">{success}</Alert> : null}

      {adaData ? (
        <Alert tone="info" className="mb-3">
          Saat ini sudah ada data contoh di aplikasi. Mengisi lagi akan menambah host baru, bukan menggantikan
          yang lama — sebaiknya hapus dulu bila ingin mulai bersih.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <form action={seed}>
          <SubmitButton block disabled={disabled} pendingLabel="Menyiapkan data…">
            <Sparkles className="size-4" aria-hidden />
            Isi data contoh
          </SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => setResetOpen(true)}
          disabled={disabled || !adaData}
          className={buttonClass({ variant: "danger", block: true })}
        >
          <Trash2 className="size-4" aria-hidden />
          Hapus semua data contoh
        </button>
      </div>

      <p className="mt-3 text-[12px] text-ink-muted">
        Pengisian memakan waktu beberapa detik karena membuat akun, jadwal sebulan, dan ratusan baris catatan.
      </p>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Hapus semua data contoh"
        description="Seluruh akun contoh beserta jadwal, absensi, omzet, dan pengajuannya akan dihapus permanen."
      >
        <form
          action={(formData) => {
            reset(formData);
            setResetOpen(false);
          }}
          className="space-y-4"
        >
          <Alert tone="warning">
            Data asli — akun admin, host sungguhan, shift, dan pengaturan — tidak ikut terhapus.
          </Alert>

          <Field label='Ketik HAPUS untuk konfirmasi' htmlFor="reset-confirmation" required>
            <Input id="reset-confirmation" name="confirmation" required autoComplete="off" placeholder="HAPUS" />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menghapus…">
              Hapus data contoh
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
