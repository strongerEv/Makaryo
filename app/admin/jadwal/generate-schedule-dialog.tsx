"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type ActionState } from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { defaultScope, resolveGenerateRange, type GenerateScope } from "@/lib/scheduling/range";
import { monthLabel, monthWeeks } from "@/lib/utils/period";

const bulanPendek = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" });

/** "14–20 Sep", atau menyebut dua bulan bila rentangnya menyeberang. */
function rentangLabel(start: string, end: string) {
  const tanggal = (value: string) => Number(value.slice(8, 10));
  const bulan = (value: string) => bulanPendek.format(new Date(`${value}T00:00:00Z`));

  return bulan(start) === bulan(end)
    ? `${tanggal(start)}–${tanggal(end)} ${bulan(end)}`
    : `${tanggal(start)} ${bulan(start)} – ${tanggal(end)} ${bulan(end)}`;
}

/**
 * Memilih bagian mana dari bulan yang mau disusun ulang.
 *
 * Tombol generate yang dulu selalu mengambil satu bulan penuh dari tanggal 1.
 * Itu bermasalah dua arah: di tengah bulan ia menyusun ulang hari-hari yang
 * sudah lewat, dan untuk membetulkan satu minggu yang keliru ia ikut mengacak
 * tiga minggu lain yang sudah benar. Semua pilihan di sini menyebutkan tanggal
 * persisnya, supaya tidak ada yang perlu ditebak sebelum menekan tombol.
 */
export function GenerateScheduleDialog({
  month,
  today,
  state,
  formAction,
}: {
  month: string;
  /** Tanggal hari ini menurut WIB, dihitung di server agar tidak beda saat hidrasi. */
  today: string;
  state: ActionState;
  formAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<GenerateScope>(() => defaultScope(month, today));
  const [weekIndex, setWeekIndex] = useState(1);

  const weeks = useMemo(() => monthWeeks(month), [month]);

  // Minggu bawaan mengikuti minggu yang sedang berjalan; kalau bulannya bukan
  // bulan ini, minggu pertama yang dipilih.
  useEffect(() => {
    const berjalan = weeks.find((week) => today >= week.start && today <= week.end);
    setWeekIndex(berjalan?.index ?? 1);
    setScope(defaultScope(month, today));
  }, [month, today, weeks]);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const pilihan: { value: GenerateScope; title: string; description: string }[] = [
    {
      value: "sisa-bulan",
      title: "Sisa bulan ini",
      description: "Mulai dari hari ini sampai akhir bulan. Hari yang sudah lewat tidak disentuh.",
    },
    {
      value: "bulan",
      title: "Satu bulan penuh",
      description: "Seluruh tanggal di bulan ini, dari tanggal 1.",
    },
    {
      value: "minggu-ini",
      title: "Minggu berjalan",
      description: "Mulai hari ini sampai hari Minggu.",
    },
    {
      value: "minggu",
      title: "Minggu tertentu",
      description: "Untuk membetulkan satu minggu yang jadwalnya keliru, tanpa mengubah minggu lain.",
    },
  ];

  const rentangUntuk = (value: GenerateScope) =>
    resolveGenerateRange({ month, scope: value, weekIndex, today });

  const tersedia = pilihan.filter((item) => rentangUntuk(item.value) !== null);
  const terpilih = rentangUntuk(scope);

  // Pilihan yang tidak masuk akal untuk bulan ini disembunyikan, jadi cakupan
  // yang tersorot bisa saja sudah tidak ada di daftar.
  useEffect(() => {
    if (tersedia.length > 0 && !tersedia.some((item) => item.value === scope)) {
      setScope(tersedia[0].value);
    }
  }, [scope, tersedia]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "soft" })}>
        <Sparkles className="size-4" aria-hidden />
        Generate draft
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Generate jadwal ${monthLabel(month)}`}
        description="Pilih bagian mana yang disusun ulang. Di luar rentang itu tidak ada yang berubah."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}

          <input type="hidden" name="bulan" value={month} />

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Cakupan</legend>
            <div className="grid gap-2">
              {tersedia.map((item) => {
                const rentang = rentangUntuk(item.value);
                const aktif = scope === item.value;

                return (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors ${
                      aktif ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cakupan"
                      value={item.value}
                      checked={aktif}
                      onChange={() => setScope(item.value)}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-bold text-ink">{item.title}</span>
                        {rentang ? (
                          <span className="tabular rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {rentangLabel(rentang.start, rentang.end)} · {rentang.days} hari
                          </span>
                        ) : null}
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

          {scope === "minggu" ? (
            <Field label="Minggu ke berapa" htmlFor="generate-minggu" required>
              <Select
                id="generate-minggu"
                name="minggu"
                value={weekIndex}
                onChange={(event) => setWeekIndex(Number(event.target.value))}
              >
                {weeks.map((week) => (
                  <option key={week.index} value={week.index}>
                    Minggu {week.index} · {rentangLabel(week.start, week.end)}
                    {today >= week.start && today <= week.end ? " (berjalan)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            // Nomor minggu tetap ikut terkirim agar server memakai nilai yang
            // sama persis dengan yang terlihat di layar bila cakupannya berubah.
            <input type="hidden" name="minggu" value={weekIndex} />
          )}

          <Alert tone="info">
            Draft lama di dalam rentang ini diganti. Jadwal yang sudah dipublish tetap dipertahankan, dan
            libur yang sudah disetujui tetap dihormati.
          </Alert>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Di layar sempit ringkasannya mengambil barisnya sendiri, supaya tombol
                Batal dan Susun draft tidak terpisah ke dua baris. */}
            {terpilih ? (
              <span className="tabular w-full text-[12px] font-semibold text-ink-muted sm:mr-auto sm:w-auto">
                Menyusun {rentangLabel(terpilih.start, terpilih.end)}.
              </span>
            ) : null}

            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="soft" disabled={!terpilih} pendingLabel="Menyusun…">
              <Sparkles className="size-4" aria-hidden />
              Susun draft
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
