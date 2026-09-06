"use client";

import { Clock } from "lucide-react";
import { useActionState, useState } from "react";

import { updateShiftHoursAction, type ActionState } from "@/app/admin/shift/actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatLiveHours, liveMinutes } from "@/lib/attendance/shift-hours";
import type { Shift } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

const INITIAL: ActionState = {};

const BARS: Record<string, string> = {
  primary: "bg-primary",
  coral: "bg-coral",
  amber: "bg-amber",
  emerald: "bg-emerald",
  sky: "bg-sky",
};

/** `HH:MM:SS` dari database dipendekkan agar cocok dengan input type="time". */
function toInput(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

/**
 * Kartu jam kerja satu shift: mulai live, istirahat, selesai istirahat, dan
 * selesai live — dengan total jam live yang ikut berubah saat jamnya diketik,
 * jadi admin langsung tahu dampak perubahannya sebelum menyimpan.
 */
export function WorkHoursCard({ shift }: { shift: Shift }) {
  const [state, save] = useActionState(updateShiftHoursAction, INITIAL);

  const [jam, setJam] = useState({
    startTime: toInput(shift.start_time),
    breakStart: toInput(shift.break_start),
    breakEnd: toInput(shift.break_end),
    endTime: toInput(shift.end_time),
  });

  const awal = {
    startTime: toInput(shift.start_time),
    breakStart: toInput(shift.break_start),
    breakEnd: toInput(shift.break_end),
    endTime: toInput(shift.end_time),
  };

  const berubah = (Object.keys(awal) as (keyof typeof awal)[]).some((key) => jam[key] !== awal[key]);

  const total =
    jam.startTime && jam.endTime
      ? formatLiveHours(
          liveMinutes({
            startTime: jam.startTime,
            endTime: jam.endTime,
            breakStart: jam.breakStart || null,
            breakEnd: jam.breakEnd || null,
          }),
        )
      : "—";

  const ubah = (key: keyof typeof jam) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setJam((sebelum) => ({ ...sebelum, [key]: event.target.value }));

  return (
    <form
      action={save}
      className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <input type="hidden" name="shiftId" value={shift.id} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={cn("h-6 w-1.5 shrink-0 rounded-full", BARS[shift.color] ?? BARS.primary)} aria-hidden />
          <Clock className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="truncate text-[15px] font-bold text-ink">{shift.name}</span>
        </span>

        <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[12px] font-semibold text-ink-muted">
          Total live: {total}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TimeField
          id={`mulai-${shift.id}`}
          name="startTime"
          label="Mulai Live"
          value={jam.startTime}
          onChange={ubah("startTime")}
          required
        />
        <TimeField
          id={`istirahat-${shift.id}`}
          name="breakStart"
          label="Istirahat"
          value={jam.breakStart}
          onChange={ubah("breakStart")}
        />
        <TimeField
          id={`selesai-istirahat-${shift.id}`}
          name="breakEnd"
          label="Selesai Istirahat"
          value={jam.breakEnd}
          onChange={ubah("breakEnd")}
        />
        <TimeField
          id={`selesai-${shift.id}`}
          name="endTime"
          label="Selesai Live"
          value={jam.endTime}
          onChange={ubah("endTime")}
          required
        />
      </div>

      {state.error ? (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      ) : null}
      {state.success && !berubah ? (
        <Alert tone="success" className="mt-3">
          {state.success}
        </Alert>
      ) : null}

      {berubah ? (
        <div className="mt-4 flex justify-end">
          <SubmitButton size="sm" pendingLabel="Menyimpan…">
            Simpan jam {shift.name}
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}

function TimeField({
  id,
  name,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="time"
        value={value}
        onChange={onChange}
        required={required}
        className="tabular h-11 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors focus:border-primary focus:outline-none"
      />
    </div>
  );
}
