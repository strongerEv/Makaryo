"use client";

import { Clock3, ImageOff, MapPin, StickyNote, Timer } from "lucide-react";

import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Modal } from "@/components/ui/modal";
import { formatDuration } from "@/lib/attendance/status";
import type { AttendanceStatus } from "@/lib/types/database";
import { formatClock, formatDate, formatTime } from "@/lib/utils/datetime";

/**
 * Bentuk data absensi yang sudah siap tampil: path foto sudah ditukar dengan
 * signed URL di server, sehingga komponen ini tidak perlu menyentuh Storage.
 */
export type AttendanceDetail = {
  id: string;
  hostName: string;
  workDate: string;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workedMinutes: number;
  autoClosed: boolean;
  note: string | null;
  clockInAt: string | null;
  clockInPhotoUrl: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutAt: string | null;
  clockOutPhotoUrl: string | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
};

export function AttendanceDetailSheet({
  detail,
  open,
  onClose,
}: {
  detail: AttendanceDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!detail) return null;

  const shiftRange =
    detail.shiftStart && detail.shiftEnd
      ? `${formatClock(detail.shiftStart)} – ${formatClock(detail.shiftEnd)}`
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail.hostName}
      description={formatDate(detail.workDate)}
      className="sm:max-w-[620px]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceStatusBadge status={detail.status} lateMinutes={detail.lateMinutes} />
          {detail.autoClosed ? (
            <span className="rounded-full bg-amber-soft px-3 py-1 text-[12px] font-semibold text-[#9a6a12]">
              Ditutup otomatis
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact icon={Clock3} label="Shift" value={detail.shiftName ?? "Tanpa jadwal"} hint={shiftRange} />
          <Fact
            icon={Timer}
            label="Durasi kerja"
            value={detail.workedMinutes > 0 ? formatDuration(detail.workedMinutes) : "Belum selesai"}
          />
          <Fact
            icon={Clock3}
            label="Keterlambatan"
            value={detail.lateMinutes > 0 ? `${detail.lateMinutes} menit` : "Tepat waktu"}
          />
        </dl>

        <div className="grid grid-cols-2 gap-3">
          <PhotoPanel
            label="Clock in"
            time={detail.clockInAt}
            photoUrl={detail.clockInPhotoUrl}
            lat={detail.clockInLat}
            lng={detail.clockInLng}
          />
          <PhotoPanel
            label="Clock out"
            time={detail.clockOutAt}
            photoUrl={detail.clockOutPhotoUrl}
            lat={detail.clockOutLat}
            lng={detail.clockOutLng}
          />
        </div>

        {detail.note ? (
          <div className="flex gap-2.5 rounded-[var(--radius-md)] bg-surface-muted p-4">
            <StickyNote className="mt-px size-4 shrink-0 text-ink-muted" aria-hidden />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-ink-muted">Catatan</p>
              <p className="mt-0.5 text-[13px] leading-relaxed break-words text-ink">{detail.note}</p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-muted px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-[13px] leading-snug font-bold break-words text-ink">{value}</dd>
      {hint ? <dd className="tabular text-[11px] text-ink-muted">{hint}</dd> : null}
    </div>
  );
}

function PhotoPanel({
  label,
  time,
  photoUrl,
  lat,
  lng,
}: {
  label: string;
  time: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const adaLokasi = lat !== null && lng !== null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
      <div className="border-b border-line px-3 py-2 sm:px-3.5 sm:py-2.5">
        <span className="block text-[12px] font-bold text-ink">{label}</span>
        <span className="tabular block text-[12px] text-ink-muted">{time ? formatTime(time) : "belum"}</span>
      </div>

      {photoUrl ? (
        <a href={photoUrl} target="_blank" rel="noreferrer" title="Buka foto ukuran penuh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={`Foto ${label.toLowerCase()}`}
            className="aspect-square w-full bg-surface-muted object-cover"
          />
        </a>
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-surface-muted text-ink-muted">
          <ImageOff className="size-6" aria-hidden />
          <span className="text-[12px]">Tanpa foto</span>
        </div>
      )}

      {adaLokasi ? (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-soft sm:px-3.5"
        >
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          Lihat lokasi
        </a>
      ) : (
        <p className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] text-ink-muted sm:px-3.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          Tanpa lokasi
        </p>
      )}
    </div>
  );
}
