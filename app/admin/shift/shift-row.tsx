"use client";

import { useActionState } from "react";

import { toggleShiftAction, type ActionState } from "@/app/admin/shift/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Shift } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatClock } from "@/lib/utils/datetime";
import { ShiftDialog } from "./shift-dialog";

const INITIAL: ActionState = {};

const DOTS: Record<string, string> = {
  primary: "bg-primary",
  coral: "bg-coral",
  amber: "bg-amber",
  emerald: "bg-emerald",
  sky: "bg-sky",
};

export function ShiftRow({ shift }: { shift: Shift }) {
  const [state, toggle] = useActionState(toggleShiftAction, INITIAL);
  const crossesMidnight = shift.end_time <= shift.start_time;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className={cn("size-2.5 shrink-0 rounded-full", DOTS[shift.color] ?? DOTS.primary)} aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          {shift.name}
          {!shift.is_active ? <Badge tone="neutral">Nonaktif</Badge> : null}
          {crossesMidnight ? <Badge tone="info">Lewat tengah malam</Badge> : null}
        </p>
        <p className="tabular mt-0.5 text-[12px] text-ink-muted">
          {formatClock(shift.start_time)} – {formatClock(shift.end_time)} · minimal {shift.min_hosts} host
        </p>
      </div>

      <div className="flex items-center gap-1">
        <ShiftDialog mode="edit" shift={shift} />
        <form action={toggle}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <input type="hidden" name="isActive" value={shift.is_active ? "false" : "true"} />
          <SubmitButton size="sm" variant={shift.is_active ? "outline" : "soft"} pendingLabel="Menyimpan…">
            {shift.is_active ? "Nonaktifkan" : "Aktifkan"}
          </SubmitButton>
        </form>
      </div>

      {state.error ? (
        <Alert tone="error" className="w-full">
          {state.error}
        </Alert>
      ) : null}
    </div>
  );
}
