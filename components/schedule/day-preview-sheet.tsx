"use client";

import Link from "next/link";
import { CalendarCheck, CalendarX2, Pencil, Settings2 } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LEAVE_TYPE_LABEL, type LeaveType } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatClock, formatDate } from "@/lib/utils/datetime";

export type DayPreviewEntry = {
  id: string;
  /** Hanya diisi di sisi admin; host sudah tahu jadwal itu miliknya. */
  hostName?: string;
  shiftName: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  tone?: string;
  status?: "draft" | "published" | "cancelled";
};

export type DayPreviewLeave = {
  id: string;
  hostName: string;
  type: LeaveType;
};

const TONES: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  coral: "bg-coral-soft text-[#c73f35]",
  amber: "bg-amber-soft text-[#9a6a12]",
  emerald: "bg-emerald-soft text-[#1f8a51]",
  sky: "bg-sky-soft text-[#1c6fa8]",
};

/**
 * Isi satu hari, muncul begitu tanggalnya diklik di kalender.
 *
 * Sebelumnya mengklik tanggal hanya memindahkan pilihan, dan isinya baru
 * terbaca setelah menggulir jauh ke bawah ke editor harian — di ponsel itu
 * berarti kehilangan kalendernya dari layar. Pratinjau ini menjawab pertanyaan
 * yang paling sering muncul ("hari itu siapa saja?") tanpa berpindah tempat,
 * dan menyediakan jalan ke editor bagi yang memang mau mengubah.
 */
export function DayPreviewSheet({
  date,
  entries,
  leaves = [],
  open,
  onClose,
  onEdit,
  manageHref,
}: {
  date: string | null;
  entries: DayPreviewEntry[];
  leaves?: DayPreviewLeave[];
  open: boolean;
  onClose: () => void;
  /** Diisi admin: membuka editor satu penugasan langsung dari pratinjau. */
  onEdit?: (entryId: string) => void;
  /** Diisi admin: tautan ke editor harian lengkap untuk tanggal ini. */
  manageHref?: string;
}) {
  if (!date) return null;

  const urut = [...entries].sort(
    (a, b) => (a.shiftStart ?? "").localeCompare(b.shiftStart ?? "") || a.shiftName.localeCompare(b.shiftName),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatDate(date)}
      description={
        urut.length === 0
          ? "Tidak ada shift pada tanggal ini."
          : `${urut.length} shift terjadwal${leaves.length > 0 ? `, ${leaves.length} libur` : ""}.`
      }
      className="sm:max-w-[520px]"
    >
      <div className="space-y-4">
        {urut.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] bg-surface-muted px-4 py-8 text-center">
            <CalendarX2 className="size-6 text-ink-muted" aria-hidden />
            <p className="text-[13px] text-ink-muted">Belum ada yang dijadwalkan hari ini.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {urut.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3"
              >
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
                    TONES[entry.tone ?? "primary"] ?? TONES.primary,
                  )}
                >
                  {entry.shiftName}
                </span>

                <span className="min-w-0 flex-1">
                  {entry.hostName ? (
                    <span className="block truncate text-[13px] font-bold text-ink">{entry.hostName}</span>
                  ) : null}
                  <span className="tabular block text-[12px] text-ink-muted">
                    {entry.shiftStart && entry.shiftEnd
                      ? `${formatClock(entry.shiftStart)} – ${formatClock(entry.shiftEnd)}`
                      : "Jam belum diatur"}
                    {entry.status === "draft" ? " · masih draft" : ""}
                  </span>
                </span>

                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(entry.id)}
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                  >
                    <Pencil className="size-4" aria-hidden />
                    <span className="sr-only">Ubah {entry.shiftName}</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {leaves.length > 0 ? (
          <div className="rounded-[var(--radius-md)] bg-surface-muted p-3.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">
              <CalendarCheck className="size-3.5" aria-hidden />
              Libur
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {leaves.map((leave) => (
                <li
                  key={leave.id}
                  className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-ink"
                >
                  {leave.hostName}
                  <span className="text-ink-muted"> · {LEAVE_TYPE_LABEL[leave.type]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass({ variant: "ghost" })}>
            Tutup
          </button>
          {manageHref ? (
            <Link href={manageHref} onClick={onClose} className={buttonClass({ variant: "primary" })}>
              <Settings2 className="size-4" aria-hidden />
              Kelola hari ini
            </Link>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
