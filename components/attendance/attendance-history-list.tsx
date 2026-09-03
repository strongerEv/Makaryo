"use client";

import { CalendarX2, ChevronRight, ScanFace } from "lucide-react";
import { useState } from "react";

import { AttendanceDetailSheet, type AttendanceDetail } from "@/components/attendance/attendance-detail-sheet";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration } from "@/lib/attendance/status";
import { formatDateShort, formatTimeShort } from "@/lib/utils/datetime";

/** Daftar riwayat absensi host; tiap baris bisa diklik untuk melihat detailnya. */
export function AttendanceHistoryList({ items }: { items: AttendanceDetail[] }) {
  const [dipilih, setDipilih] = useState<AttendanceDetail | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Belum ada absensi bulan ini"
        description="Catatan absensi akan muncul di sini setelah kamu clock in."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setDipilih(item)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5"
            >
              {item.clockInPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.clockInPhotoUrl}
                  alt=""
                  className="size-12 shrink-0 rounded-[14px] object-cover"
                />
              ) : (
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-ink-muted">
                  <ScanFace className="size-5" aria-hidden />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {formatDateShort(item.workDate)}
                  </span>
                  <AttendanceStatusBadge status={item.status} lateMinutes={item.lateMinutes} />
                </span>
                <span className="tabular mt-0.5 block text-[12px] text-ink-muted">
                  {item.clockOutAt
                    ? `${formatTimeShort(item.clockInAt)} → ${formatTimeShort(item.clockOutAt)} WIB`
                    : `${formatTimeShort(item.clockInAt)} WIB → belum clock out`}
                  {item.workedMinutes > 0 ? ` · ${formatDuration(item.workedMinutes)}` : ""}
                  {item.autoClosed ? " · ditutup otomatis" : ""}
                </span>
              </span>

              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <AttendanceDetailSheet detail={dipilih} open={dipilih !== null} onClose={() => setDipilih(null)} />
    </>
  );
}
