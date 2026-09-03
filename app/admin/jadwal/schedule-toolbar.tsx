"use client";

import { Send, Sparkles } from "lucide-react";
import { useActionState } from "react";

import {
  generateDraftAction,
  publishScheduleAction,
  resetScheduleAction,
  type ActionState,
} from "@/app/admin/jadwal/actions";
import { ResetScheduleDialog } from "@/app/admin/jadwal/reset-schedule-dialog";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function ScheduleToolbar({ month, draftCount }: { month: string; draftCount: number }) {
  const [generateState, generate] = useActionState(generateDraftAction, INITIAL);
  const [publishState, publish] = useActionState(publishScheduleAction, INITIAL);
  const [resetState, reset] = useActionState(resetScheduleAction, INITIAL);

  // Galat reset tampil di dalam dialognya sendiri supaya terbaca saat formulir
  // masih terbuka; di sini cukup pesan berhasilnya.
  const error = generateState.error ?? publishState.error;
  const success = generateState.success ?? publishState.success ?? resetState.success;

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex flex-wrap gap-2">
        <form action={generate}>
          <input type="hidden" name="bulan" value={month} />
          <SubmitButton variant="soft" pendingLabel="Menyusun…">
            <Sparkles className="size-4" aria-hidden />
            Generate draft
          </SubmitButton>
        </form>

        <form action={publish}>
          <input type="hidden" name="bulan" value={month} />
          <SubmitButton pendingLabel="Mem-publish…" disabled={draftCount === 0}>
            <Send className="size-4" aria-hidden />
            Publish {draftCount > 0 ? `(${draftCount})` : ""}
          </SubmitButton>
        </form>

        <ResetScheduleDialog defaultMonth={month} state={resetState} formAction={reset} />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
    </div>
  );
}
