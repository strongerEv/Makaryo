"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";

import {
  generateDraftAction,
  publishScheduleAction,
  resetScheduleAction,
  type ActionState,
} from "@/app/admin/jadwal/actions";
import { GenerateScheduleDialog } from "@/app/admin/jadwal/generate-schedule-dialog";
import { ResetScheduleDialog, type MonthCount } from "@/app/admin/jadwal/reset-schedule-dialog";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function ScheduleToolbar({
  month,
  today,
  draftCount,
  monthCounts,
}: {
  month: string;
  /** Hari ini menurut WIB, dihitung di server agar tidak berbeda saat hidrasi. */
  today: string;
  draftCount: number;
  /** Isi tiap bulan, supaya dialog reset bisa menunjukkan dampaknya lebih dulu. */
  monthCounts: Record<string, MonthCount>;
}) {
  const [generateState, generate] = useActionState(generateDraftAction, INITIAL);
  const [publishState, publish] = useActionState(publishScheduleAction, INITIAL);
  const [resetState, reset] = useActionState(resetScheduleAction, INITIAL);

  // Galat generate dan reset tampil di dalam dialognya masing-masing supaya
  // terbaca saat formulirnya masih terbuka; di sini cukup pesan berhasilnya.
  const error = publishState.error;
  const success = generateState.success ?? publishState.success ?? resetState.success;

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex flex-wrap gap-2">
        <GenerateScheduleDialog
          month={month}
          today={today}
          state={generateState}
          formAction={generate}
        />

        <form action={publish}>
          <input type="hidden" name="bulan" value={month} />
          <SubmitButton pendingLabel="Mem-publish…" disabled={draftCount === 0}>
            <Send className="size-4" aria-hidden />
            Publish {draftCount > 0 ? `(${draftCount})` : ""}
          </SubmitButton>
        </form>

        <ResetScheduleDialog
          defaultMonth={month}
          counts={monthCounts}
          state={resetState}
          formAction={reset}
        />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
    </div>
  );
}
