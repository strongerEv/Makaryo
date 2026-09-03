"use client";

import { CalendarX2, ChevronRight, MapPinOff } from "lucide-react";
import { useState } from "react";

import { AttendanceCorrectionDialog } from "@/app/admin/absensi/attendance-correction-dialog";
import { AttendanceDetailSheet, type AttendanceDetail } from "@/components/attendance/attendance-detail-sheet";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration } from "@/lib/attendance/status";
import type { Attendance } from "@/lib/types/database";
import { formatTimeShort } from "@/lib/utils/datetime";

export type AdminAttendanceRow = {
  detail: AttendanceDetail;
  avatarUrl: string | null;
  /** Baris mentah, dibutuhkan formulir koreksi milik admin. */
  attendance: Attendance;
};

export function AttendanceRows({ rows }: { rows: AdminAttendanceRow[] }) {
  const [dipilih, setDipilih] = useState<AttendanceDetail | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Belum ada absensi"
        description="Belum ada host yang clock in pada tanggal ini."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map(({ detail, avatarUrl, attendance }) => (
          <li key={detail.id} className="flex items-center gap-2 pr-3 sm:pr-4">
            <button
              type="button"
              onClick={() => setDipilih(detail)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-muted sm:px-5"
            >
              <Avatar name={detail.hostName} src={avatarUrl} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{detail.hostName}</span>
                <span className="tabular block text-[12px] text-ink-muted">
                  {detail.clockOutAt
                    ? `${formatTimeShort(detail.clockInAt)} → ${formatTimeShort(detail.clockOutAt)} WIB`
                    : `${formatTimeShort(detail.clockInAt)} WIB → belum clock out`}
                  {detail.workedMinutes > 0 ? ` · ${formatDuration(detail.workedMinutes)}` : ""}
                  {detail.autoClosed ? " · ditutup otomatis" : ""}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <PhotoCue label="Clock in" url={detail.clockInPhotoUrl} />
                  <PhotoCue label="Clock out" url={detail.clockOutPhotoUrl} />
                  {detail.clockInLat === null || detail.clockInLng === null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-[#9a6a12]">
                      <MapPinOff className="size-3" aria-hidden />
                      Tanpa lokasi
                    </span>
                  ) : null}
                </span>
              </span>

              <AttendanceStatusBadge status={detail.status} lateMinutes={detail.lateMinutes} />
              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
            </button>

            <AttendanceCorrectionDialog attendance={attendance} hostName={detail.hostName} />
          </li>
        ))}
      </ul>

      <AttendanceDetailSheet detail={dipilih} open={dipilih !== null} onClose={() => setDipilih(null)} />
    </>
  );
}

/** Petunjuk kecil bahwa fotonya ada; ukuran penuhnya dibuka lewat pratinjau. */
function PhotoCue({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">
        {label}: tanpa foto
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-0.5 pr-2 pl-0.5 text-[11px] font-medium text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-5 rounded-full object-cover" />
      {label}
    </span>
  );
}
