"use client";

import { Eraser } from "lucide-react";
import { useEffect, useState } from "react";

import { type ActionState } from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { monthOptions } from "@/lib/utils/period";

const SCOPES = [
  {
    value: "draft",
    title: "Hanya draft",
    description: "Jadwal yang sudah dipublish tetap aman dan masih terlihat host.",
  },
  {
    value: "semua",
    title: "Semua jadwal",
    description: "Draft dan jadwal terbit ikut dihapus. Host akan diberi tahu.",
  },
] as const;

/**
 * Membongkar jadwal satu bulan supaya bisa disusun ulang dari nol.
 *
 * Status aksinya dipegang toolbar, supaya pesan hasilnya muncul di area yang
 * sama dengan generate dan publish — bukan terjepit di sebelah tombol.
 */
export function ResetScheduleDialog({
  defaultMonth,
  state,
  formAction,
}: {
  defaultMonth: string;
  state: ActionState;
  formAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"draft" | "semua">("draft");

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  // Jadwal biasanya disusun untuk bulan depan, jadi daftarnya harus melihat ke
  // depan juga — dan bulan yang sedang dibuka wajib ada supaya reset tidak
  // diam-diam mengenai bulan lain.
  const months = monthOptions({ back: 12, forward: 3, include: defaultMonth });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass({ variant: "outline" })}
      >
        <Eraser className="size-4" aria-hidden />
        Reset jadwal
      </button>


      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset jadwal"
        description="Hapus penugasan satu bulan supaya jadwalnya bisa disusun ulang dari awal."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Bulan yang direset" htmlFor="reset-bulan" required>
            <Select id="reset-bulan" name="bulan" defaultValue={defaultMonth}>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Cakupan</legend>
            <div className="grid gap-2">
              {SCOPES.map((item) => (
                <label
                  key={item.value}
                  className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors ${
                    scope === item.value
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="cakupan"
                    value={item.value}
                    checked={scope === item.value}
                    onChange={() => setScope(item.value)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink">{item.title}</span>
                    <span className="block text-[12px] leading-snug text-ink-muted">{item.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {scope === "semua" ? (
            <Alert tone="warning">
              Jadwal terbit ikut hilang dari aplikasi host. Absensi dan omzet yang sudah tercatat tetap
              tersimpan.
            </Alert>
          ) : null}

          <Field label="Ketik HAPUS untuk konfirmasi" htmlFor="reset-jadwal-konfirmasi" required>
            <Input
              id="reset-jadwal-konfirmasi"
              name="confirmation"
              required
              autoComplete="off"
              placeholder="HAPUS"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menghapus…">
              Reset jadwal
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
