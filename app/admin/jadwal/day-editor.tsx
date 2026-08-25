"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useActionState } from "react";

import { assignHostAction, removeAssignmentAction, type ActionState } from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile, Shift } from "@/lib/types/database";
import { formatClock, formatDate } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

export type DayAssignment = {
  id: string;
  hostId: string;
  hostName: string;
  shiftId: string;
  status: "draft" | "published" | "cancelled";
  source: "auto" | "manual";
};

export function DayEditor({
  date,
  shifts,
  hosts,
  assignments,
}: {
  date: string;
  shifts: Shift[];
  hosts: Profile[];
  assignments: DayAssignment[];
}) {
  const [assignState, assign] = useActionState(assignHostAction, INITIAL);
  const [removeState, remove] = useActionState(removeAssignmentAction, INITIAL);

  const error = assignState.error ?? removeState.error;

  return (
    <Card className="self-start">
      <CardHeader title={formatDate(date)} description="Tambah atau keluarkan host dari shift hari ini." />

      {error ? (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      ) : null}

      {shifts.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-muted">
          Belum ada shift aktif. Atur shift terlebih dahulu.
        </p>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => {
            const assigned = assignments.filter((item) => item.shiftId === shift.id);
            const available = hosts.filter((host) => !assigned.some((item) => item.hostId === host.id));
            const shortage = assigned.length < shift.min_hosts;

            return (
              <div key={shift.id} className="rounded-[var(--radius-md)] border border-line p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink">{shift.name}</p>
                    <p className="tabular text-[12px] text-ink-muted">
                      {formatClock(shift.start_time)} – {formatClock(shift.end_time)}
                    </p>
                  </div>
                  <Badge tone={shortage ? "danger" : "success"}>
                    {assigned.length}/{shift.min_hosts} host
                  </Badge>
                </div>

                {assigned.length > 0 ? (
                  <ul className="mb-2.5 space-y-1.5">
                    {assigned.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-[12px] bg-surface-muted px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{item.hostName}</span>
                          <span className="text-[11px] text-ink-muted">
                            {item.status === "published" ? "Terpublish" : "Draft"} ·{" "}
                            {item.source === "auto" ? "otomatis" : "manual"}
                          </span>
                        </span>
                        <form action={remove}>
                          <input type="hidden" name="assignmentId" value={item.id} />
                          <SubmitButton size="sm" variant="ghost" pendingLabel="…">
                            <UserMinus className="size-4" aria-hidden />
                            <span className="sr-only">Keluarkan {item.hostName}</span>
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-2.5 text-[12px] text-ink-muted">Belum ada host di shift ini.</p>
                )}

                <form action={assign} className="flex gap-2">
                  <input type="hidden" name="workDate" value={date} />
                  <input type="hidden" name="shiftId" value={shift.id} />
                  <Select name="hostId" defaultValue="" aria-label={`Tambah host ke ${shift.name}`} required>
                    <option value="" disabled>
                      Pilih host…
                    </option>
                    {available.map((host) => (
                      <option key={host.id} value={host.id}>
                        {host.full_name}
                      </option>
                    ))}
                  </Select>
                  <SubmitButton size="md" variant="soft" pendingLabel="…">
                    <UserPlus className="size-4" aria-hidden />
                    <span className="sr-only">Tambah host</span>
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
