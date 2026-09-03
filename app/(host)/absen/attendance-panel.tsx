"use client";

import { useRouter } from "next/navigation";
import { CalendarX2, ChevronRight, LogIn, LogOut } from "lucide-react";
import { useState } from "react";

import { clockInAction, clockOutAction } from "@/app/(host)/absen/actions";
import { CameraCapture, type CapturePayload } from "@/components/attendance/camera-capture";
import { AttendanceDetailSheet, type AttendanceDetail } from "@/components/attendance/attendance-detail-sheet";
import { Alert } from "@/components/ui/alert";
import { AttendanceStatusBadge } from "@/components/ui/attendance-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration } from "@/lib/attendance/status";
import type { Attendance } from "@/lib/types/database";
import { formatClock, formatTime } from "@/lib/utils/datetime";

export type TodayShift = {
  assignmentId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  attendance: Attendance | null;
  /** Sudah berisi signed URL foto; null bila belum ada absensi. */
  detail: AttendanceDetail | null;
};

type CaptureTarget =
  | { kind: "in"; assignmentId: string | null; label: string }
  | { kind: "out"; attendanceId: string; label: string };

export function AttendancePanel({
  shifts,
  unscheduled,
  unscheduledDetail,
}: {
  shifts: TodayShift[];
  unscheduled: Attendance | null;
  unscheduledDetail: AttendanceDetail | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<CaptureTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<AttendanceDetail | null>(null);

  const handleSubmit = async ({ photo, latitude, longitude }: CapturePayload) => {
    if (!target) return { error: "Aksi tidak dikenal." };

    const formData = new FormData();
    formData.append("photo", new File([photo], "absen.jpg", { type: "image/jpeg" }));
    if (latitude !== null) formData.append("latitude", String(latitude));
    if (longitude !== null) formData.append("longitude", String(longitude));

    if (target.kind === "in") {
      if (target.assignmentId) formData.append("assignmentId", target.assignmentId);
      const result = await clockInAction(formData);
      if (result.error) return { error: result.error };
      setMessage(result.success ?? null);
    } else {
      formData.append("attendanceId", target.attendanceId);
      const result = await clockOutAction(formData);
      if (result.error) return { error: result.error };
      setMessage(result.success ?? null);
    }

    router.refresh();
  };

  return (
    <>
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <div className="space-y-3">
        {shifts.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={CalendarX2}
              title="Tidak ada jadwal hari ini"
              description="Kamu tetap bisa mencatat absensi tanpa jadwal bila memang diminta bekerja."
            />
          </Card>
        ) : (
          shifts.map((shift) => (
            <ShiftAttendanceCard
              key={shift.assignmentId}
              shift={shift}
              onPreview={shift.detail ? () => setPreview(shift.detail) : undefined}
              onClockIn={() =>
                setTarget({ kind: "in", assignmentId: shift.assignmentId, label: shift.shiftName })
              }
              onClockOut={(attendanceId) =>
                setTarget({ kind: "out", attendanceId, label: shift.shiftName })
              }
            />
          ))
        )}

        <Card>
          <p className="text-sm font-semibold text-ink">Absen tanpa jadwal</p>
          <p className="mt-1 text-[13px] text-ink-muted">
            Dipakai bila kamu bekerja di luar jadwal yang terbit. Admin tetap melihat catatannya.
          </p>

          {unscheduled ? (
            <div className="mt-3 space-y-2">
              <AttendanceTimeline
                attendance={unscheduled}
                onPreview={unscheduledDetail ? () => setPreview(unscheduledDetail) : undefined}
              />
              {!unscheduled.clock_out_at ? (
                <Button
                  variant="outline"
                  block
                  onClick={() =>
                    setTarget({ kind: "out", attendanceId: unscheduled.id, label: "Absen tanpa jadwal" })
                  }
                >
                  <LogOut className="size-4" aria-hidden />
                  Clock out
                </Button>
              ) : null}
            </div>
          ) : (
            <Button
              variant="outline"
              block
              className="mt-3"
              onClick={() => setTarget({ kind: "in", assignmentId: null, label: "Absen tanpa jadwal" })}
            >
              <LogIn className="size-4" aria-hidden />
              Clock in tanpa jadwal
            </Button>
          )}
        </Card>
      </div>

      <AttendanceDetailSheet
        detail={preview}
        open={preview !== null}
        onClose={() => setPreview(null)}
      />

      <CameraCapture
        open={target !== null}
        title={target?.kind === "out" ? `Clock out — ${target.label}` : `Clock in — ${target?.label ?? ""}`}
        description="Pastikan wajahmu terlihat jelas. Foto dan lokasi tersimpan sebagai bukti kehadiran."
        submitLabel={target?.kind === "out" ? "Kirim clock out" : "Kirim clock in"}
        onClose={() => setTarget(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

function ShiftAttendanceCard({
  shift,
  onPreview,
  onClockIn,
  onClockOut,
}: {
  shift: TodayShift;
  onPreview?: () => void;
  onClockIn: () => void;
  onClockOut: (attendanceId: string) => void;
}) {
  const attendance = shift.attendance;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-ink">{shift.shiftName}</p>
          <p className="tabular mt-0.5 text-[13px] text-ink-muted">
            {formatClock(shift.startTime)} – {formatClock(shift.endTime)}
          </p>
        </div>
        {attendance ? <AttendanceStatusBadge status={attendance.status} lateMinutes={attendance.late_minutes} /> : null}
      </div>

      {attendance ? (
        <AttendanceTimeline attendance={attendance} className="mt-4" onPreview={onPreview} />
      ) : null}

      <div className="mt-4">
        {!attendance ? (
          <Button block onClick={onClockIn}>
            <LogIn className="size-4" aria-hidden />
            Clock in sekarang
          </Button>
        ) : !attendance.clock_out_at ? (
          <Button block variant="danger" onClick={() => onClockOut(attendance.id)}>
            <LogOut className="size-4" aria-hidden />
            Clock out
          </Button>
        ) : (
          <p className="rounded-[var(--radius-md)] bg-emerald-soft px-4 py-3 text-center text-[13px] font-semibold text-[#1f8a51]">
            Shift selesai · {formatDuration(attendance.worked_minutes)}
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Ringkasan jam absen. Bila `onPreview` diberikan, seluruh kotaknya jadi tombol
 * yang membuka pratinjau berisi foto dan lokasi.
 */
function AttendanceTimeline({
  attendance,
  className,
  onPreview,
}: {
  attendance: Attendance;
  className?: string;
  onPreview?: () => void;
}) {
  const isi = (
    <>
      <span className="grid flex-1 grid-cols-2 gap-3 text-left">
        <span>
          <span className="block text-[11px] font-semibold text-ink-muted">Clock in</span>
          <span className="tabular block text-sm font-bold text-ink">{formatTime(attendance.clock_in_at)}</span>
        </span>
        <span>
          <span className="block text-[11px] font-semibold text-ink-muted">Clock out</span>
          <span className="tabular block text-sm font-bold text-ink">
            {attendance.clock_out_at ? formatTime(attendance.clock_out_at) : "Belum"}
          </span>
        </span>
      </span>
      {onPreview ? (
        <span className="inline-flex items-center gap-1 self-center text-[12px] font-semibold text-primary">
          Detail
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      ) : null}
    </>
  );

  const kelas = `flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3 ${className ?? ""}`;

  if (!onPreview) return <div className={kelas}>{isi}</div>;

  return (
    <button type="button" onClick={onPreview} className={`${kelas} text-left transition-colors hover:bg-primary-soft`}>
      {isi}
    </button>
  );
}
