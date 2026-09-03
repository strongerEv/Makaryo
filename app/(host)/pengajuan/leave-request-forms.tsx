"use client";

import { useActionState } from "react";

import { submitLeaveRequestAction, type ActionState } from "@/app/(host)/pengajuan/actions";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { WeeklyOffPicker, type DateAvailability } from "@/components/leave/weekly-off-picker";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function LeaveRequestForms({
  weeklyOffOpen,
  weeklyOffMin,
  weeklyOffMax,
  weeklyOffDates,
  weeklyOffAvailability,
  weeklyOffQuota,
  urgentMin,
}: {
  weeklyOffOpen: boolean;
  weeklyOffMin?: string;
  weeklyOffMax?: string;
  weeklyOffDates?: string[];
  weeklyOffAvailability?: Record<string, DateAvailability>;
  weeklyOffQuota?: number;
  urgentMin: string;
}) {
  const [weeklyState, submitWeekly] = useActionState(submitLeaveRequestAction, INITIAL);
  const [urgentState, submitUrgent] = useActionState(submitLeaveRequestAction, INITIAL);

  return (
    <>
      <Card>
        <CardHeader
          title="Ajukan libur mingguan"
          description="Jatah libur rutin untuk periode penjadwalan berikutnya."
        />

        {weeklyState.error ? <Alert tone="error" className="mb-3">{weeklyState.error}</Alert> : null}
        {weeklyState.success ? <Alert tone="success" className="mb-3">{weeklyState.success}</Alert> : null}

        <form action={submitWeekly} className="space-y-4">
          <input type="hidden" name="type" value="weekly_off" />

          {weeklyOffOpen && weeklyOffDates && weeklyOffDates.length > 0 ? (
            <Field label="Pilih tanggal libur" required>
              <WeeklyOffPicker
                dates={weeklyOffDates}
                availability={weeklyOffAvailability ?? {}}
                quota={weeklyOffQuota ?? 1}
              />
            </Field>
          ) : (
            <Field label="Tanggal libur" htmlFor="weekly-date" required>
              <Input
                id="weekly-date"
                name="requestedDate"
                type="date"
                required
                min={weeklyOffMin}
                max={weeklyOffMax}
                disabled={!weeklyOffOpen}
              />
            </Field>
          )}

          <SubmitButton block disabled={!weeklyOffOpen} pendingLabel="Mengirim…">
            Ajukan libur mingguan
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Ajukan izin mendadak"
          description="Untuk kebutuhan mendesak di luar jatah libur rutin."
        />

        {urgentState.error ? <Alert tone="error" className="mb-3">{urgentState.error}</Alert> : null}
        {urgentState.success ? <Alert tone="success" className="mb-3">{urgentState.success}</Alert> : null}

        <form action={submitUrgent} className="space-y-4">
          <input type="hidden" name="type" value="urgent" />
          <Field label="Tanggal izin" htmlFor="urgent-date" required hint="Minimal H-3 dari hari ini.">
            <Input id="urgent-date" name="requestedDate" type="date" required min={urgentMin} />
          </Field>
          <Field label="Alasan" htmlFor="urgent-reason" required>
            <Textarea
              id="urgent-reason"
              name="reason"
              rows={3}
              required
              minLength={5}
              placeholder="Contoh: mengantar keluarga berobat."
            />
          </Field>
          <SubmitButton block variant="outline" pendingLabel="Mengirim…">
            Ajukan izin
          </SubmitButton>
        </form>
      </Card>
    </>
  );
}
