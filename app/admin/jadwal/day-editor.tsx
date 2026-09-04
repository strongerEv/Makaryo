"use client";

import { CheckSquare, Pencil, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  assignHostAction,
  removeAssignmentAction,
  removeAssignmentsAction,
  type ActionState,
} from "@/app/admin/jadwal/actions";
import {
  AssignmentEditorSheet,
  type EditorTarget,
} from "@/components/schedule/assignment-editor-sheet";
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
  const [bulkState, removeMany] = useActionState(removeAssignmentsAction, INITIAL);

  const [menandai, setMenandai] = useState(false);
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [diedit, setDiedit] = useState<EditorTarget | null>(null);

  const error = assignState.error ?? removeState.error ?? bulkState.error;
  const success = bulkState.success;

  const idHariIni = useMemo(() => assignments.map((item) => item.id), [assignments]);

  // Setelah penghapusan, id yang sudah hilang tidak boleh tersisa di pilihan.
  useEffect(() => {
    setTerpilih((sebelum) => sebelum.filter((id) => idHariIni.includes(id)));
  }, [idHariIni]);

  useEffect(() => {
    if (bulkState.success) {
      setTerpilih([]);
      setMenandai(false);
    }
  }, [bulkState.success]);

  const toggle = (id: string) =>
    setTerpilih((sebelum) =>
      sebelum.includes(id) ? sebelum.filter((item) => item !== id) : [...sebelum, id],
    );

  const semuaTerpilih = idHariIni.length > 0 && terpilih.length === idHariIni.length;

  const keluarModeTandai = () => {
    setMenandai(false);
    setTerpilih([]);
  };

  return (
    <Card className="self-start">
      <CardHeader
        title={formatDate(date)}
        description="Tambah, ubah, atau keluarkan host dari shift hari ini."
        action={
          assignments.length > 0 ? (
            menandai ? (
              <button
                type="button"
                onClick={keluarModeTandai}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
              >
                <X className="size-4" aria-hidden />
                Selesai
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMenandai(true)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
              >
                <CheckSquare className="size-4" aria-hidden />
                Tandai
              </button>
            )
          ) : undefined
        }
      />

      {error ? (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" className="mb-3">
          {success}
        </Alert>
      ) : null}

      {menandai ? (
        <form action={removeMany} className="mb-3 rounded-[var(--radius-md)] bg-surface-muted p-3">
          {terpilih.map((id) => (
            <input key={id} type="hidden" name="assignmentIds" value={id} />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setTerpilih(semuaTerpilih ? [] : idHariIni)}
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              {semuaTerpilih ? "Kosongkan pilihan" : `Pilih semua (${idHariIni.length})`}
            </button>

            <span className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">{terpilih.length} ditandai</span>
              <SubmitButton size="sm" variant="danger" disabled={terpilih.length === 0} pendingLabel="Menghapus…">
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </SubmitButton>
            </span>
          </div>
        </form>
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
                        className={`flex items-center gap-2 rounded-[12px] px-3 py-2 transition-colors ${
                          menandai && terpilih.includes(item.id) ? "bg-primary-soft" : "bg-surface-muted"
                        }`}
                      >
                        {menandai ? (
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={terpilih.includes(item.id)}
                              onChange={() => toggle(item.id)}
                              className="size-4 shrink-0 accent-[var(--color-primary)]"
                              aria-label={`Tandai ${item.hostName}`}
                            />
                            <AssignmentLabel item={item} />
                          </label>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1">
                              <AssignmentLabel item={item} />
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setDiedit({
                                  id: item.id,
                                  hostId: item.hostId,
                                  shiftId: item.shiftId,
                                  workDate: date,
                                  hostName: item.hostName,
                                  status: item.status,
                                })
                              }
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-primary"
                              title="Ubah host, shift, atau tanggalnya"
                            >
                              <Pencil className="size-4" aria-hidden />
                              <span className="sr-only">Ubah penugasan {item.hostName}</span>
                            </button>

                            <form action={remove}>
                              <input type="hidden" name="assignmentId" value={item.id} />
                              <SubmitButton size="sm" variant="ghost" pendingLabel="…">
                                <UserMinus className="size-4" aria-hidden />
                                <span className="sr-only">Keluarkan {item.hostName}</span>
                              </SubmitButton>
                            </form>
                          </>
                        )}
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

      {diedit ? (
        <AssignmentEditorSheet
          target={diedit}
          shifts={shifts.map((shift) => ({
            id: shift.id,
            name: shift.name,
            startTime: shift.start_time,
            endTime: shift.end_time,
          }))}
          hosts={hosts.map((host) => ({ id: host.id, name: host.full_name }))}
          onClose={() => setDiedit(null)}
        />
      ) : null}

    </Card>
  );
}

function AssignmentLabel({ item }: { item: DayAssignment }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[13px] font-semibold text-ink">{item.hostName}</span>
      <span className="block text-[11px] text-ink-muted">
        {item.status === "published" ? "Terpublish" : "Draft"} ·{" "}
        {item.source === "auto" ? "otomatis" : "manual"}
      </span>
    </span>
  );
}
