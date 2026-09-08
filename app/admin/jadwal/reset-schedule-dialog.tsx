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

/** Jumlah penugasan per bulan, dipakai untuk memberi tahu dampak reset. */
export type MonthCount = { draft: number; published: number };

type Scope = "draft" | "semua";

/**
 * Membongkar jadwal satu bulan supaya bisa disusun ulang dari nol.
 *
 * Isi tiap bulan ditampilkan sebelum tombol ditekan. Tanpa itu, memilih cakupan
 * yang kebetulan kosong terasa seperti fiturnya rusak — padahal memang tidak
 * ada yang cocok untuk dihapus.
 *
 * Status aksinya dipegang toolbar, supaya pesan hasilnya muncul di area yang
 * sama dengan generate dan publish — bukan terjepit di sebelah tombol.
 */
export function ResetScheduleDialog({
  defaultMonth,
  counts,
  state,
  formAction,
}: {
  defaultMonth: string;
  counts: Record<string, MonthCount>;
  state: ActionState;
  formAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [scope, setScope] = useState<Scope>("draft");

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const isi = counts[month] ?? { draft: 0, published: 0 };
  const total = isi.draft + isi.published;

  // Cakupan bawaan mengikuti isi bulannya: percuma menawarkan "hanya draft"
  // pada bulan yang seluruh jadwalnya sudah terbit.
  useEffect(() => {
    setScope(isi.draft > 0 ? "draft" : total > 0 ? "semua" : "draft");
  }, [isi.draft, total]);

  // Jadwal biasanya disusun untuk bulan depan, jadi daftarnya harus melihat ke
  // depan juga — dan bulan yang sedang dibuka wajib ada supaya reset tidak
  // diam-diam mengenai bulan lain.
  const months = monthOptions({ back: 12, forward: 3, include: defaultMonth });

  const scopes: { value: Scope; title: string; description: string; jumlah: number }[] = [
    {
      value: "draft",
      title: "Hanya draft",
      description: "Jadwal yang sudah terbit tetap aman dan masih terlihat host.",
      jumlah: isi.draft,
    },
    {
      value: "semua",
      title: "Semua jadwal",
      description: "Draft dan jadwal terbit ikut dihapus. Host akan diberi tahu.",
      jumlah: total,
    },
  ];

  const akanTerhapus = scope === "draft" ? isi.draft : total;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "outline" })}>
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
            <Select
              id="reset-bulan"
              name="bulan"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {months.map((item) => {
                const jumlah = counts[item.value] ?? { draft: 0, published: 0 };
                const rincian =
                  jumlah.draft + jumlah.published === 0
                    ? "kosong"
                    : [
                        jumlah.draft > 0 ? `${jumlah.draft} draft` : null,
                        jumlah.published > 0 ? `${jumlah.published} terbit` : null,
                      ]
                        .filter(Boolean)
                        .join(", ");

                return (
                  <option key={item.value} value={item.value}>
                    {item.label} · {rincian}
                  </option>
                );
              })}
            </Select>
          </Field>

          {total === 0 ? (
            <Alert tone="info">Bulan ini belum punya jadwal sama sekali, jadi tidak ada yang bisa direset.</Alert>
          ) : (
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink">Cakupan</legend>
              <div className="grid gap-2">
                {scopes.map((item) => {
                  const kosong = item.jumlah === 0;

                  return (
                    <label
                      key={item.value}
                      className={`flex gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors ${
                        kosong
                          ? "cursor-not-allowed border-line bg-surface-muted opacity-60"
                          : scope === item.value
                            ? "cursor-pointer border-primary bg-primary-soft"
                            : "cursor-pointer border-line bg-surface hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cakupan"
                        value={item.value}
                        checked={scope === item.value}
                        onChange={() => setScope(item.value)}
                        disabled={kosong}
                        className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-bold text-ink">{item.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              kosong ? "bg-surface text-ink-muted" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {kosong ? "tidak ada" : `${item.jumlah} penugasan`}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                          {item.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {scope === "semua" && isi.published > 0 ? (
            <Alert tone="warning">
              {isi.published} jadwal terbit ikut hilang dari aplikasi host. Absensi dan omzet yang sudah
              tercatat tetap tersimpan.
            </Alert>
          ) : null}

          <Field label="Ketik HAPUS untuk konfirmasi" htmlFor="reset-jadwal-konfirmasi" required>
            <Input
              id="reset-jadwal-konfirmasi"
              name="confirmation"
              required
              autoComplete="off"
              placeholder="HAPUS"
              disabled={akanTerhapus === 0}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {akanTerhapus > 0 ? (
              <span className="mr-auto text-[12px] font-semibold text-ink-muted">
                Akan menghapus {akanTerhapus} penugasan.
              </span>
            ) : null}

            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" disabled={akanTerhapus === 0} pendingLabel="Menghapus…">
              Reset jadwal
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
