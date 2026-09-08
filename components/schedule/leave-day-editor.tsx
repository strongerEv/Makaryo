"use client";

import { CalendarOff, Plus, X } from "lucide-react";
import { useActionState } from "react";

import { addLeaveAction, removeLeaveAction, type ActionState } from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { LeaveType } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

const TYPE_LABEL: Record<LeaveType, string> = {
  weekly_off: "Libur mingguan",
  urgent: "Izin",
};

export type DayLeave = {
  id: string;
  hostId: string;
  hostName: string;
  type: LeaveType;
};

export type LeaveHost = {
  id: string;
  name: string;
};

/**
 * Pengelola kolom libur satu hari.
 *
 * Sebelumnya libur hanya bisa muncul dari generate otomatis atau pengajuan
 * host; di sini admin bisa menandai dan mencabutnya langsung dari papan jadwal.
 */
export function LeaveDayEditor({
  date,
  hosts,
  leaves,
}: {
  date: string;
  hosts: LeaveHost[];
  leaves: DayLeave[];
}) {
  const [addState, add] = useActionState(addLeaveAction, INITIAL);
  const [removeState, remove] = useActionState(removeLeaveAction, INITIAL);

  const galat = addState.error ?? removeState.error;
  const tersedia = hosts.filter((host) => !leaves.some((leave) => leave.hostId === host.id));

  return (
    <div className="space-y-2.5">
      {galat ? <Alert tone="error">{galat}</Alert> : null}

      {leaves.length === 0 ? (
        <p className="text-[12px] text-ink-muted">Belum ada yang ditandai libur hari ini.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {leaves.map((leave) => (
            <li key={leave.id}>
              <form action={remove} className="contents">
                <input type="hidden" name="leaveId" value={leave.id} />
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft py-0.5 pr-0.5 pl-2.5 text-[12px] font-semibold text-[#1f8a51]">
                  {leave.hostName}
                  <span className="text-[10px] font-medium opacity-70">{TYPE_LABEL[leave.type]}</span>
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    className="size-6 rounded-full p-0 text-[#1f8a51] hover:bg-emerald/20"
                    pendingLabel="…"
                  >
                    <X className="size-3.5" aria-hidden />
                    <span className="sr-only">Cabut libur {leave.hostName}</span>
                  </SubmitButton>
                </span>
              </form>
            </li>
          ))}
        </ul>
      )}

      {tersedia.length > 0 ? (
        <form action={add} className="flex flex-wrap gap-2">
          <input type="hidden" name="workDate" value={date} />

          <Select
            name="hostId"
            defaultValue=""
            required
            aria-label={`Tandai host libur pada ${formatDate(date)}`}
            className="w-full sm:min-w-[150px] sm:flex-1"
          >
            <option value="" disabled>
              Pilih host…
            </option>
            {tersedia.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </Select>

          <Select name="type" defaultValue="weekly_off" aria-label="Jenis libur" className="w-full sm:w-[168px] sm:shrink-0">
            <option value="weekly_off">Libur mingguan</option>
            <option value="urgent">Izin</option>
          </Select>

          <SubmitButton size="md" variant="soft" pendingLabel="…">
            <Plus className="size-4" aria-hidden />
            <span className="sr-only">Tandai libur</span>
          </SubmitButton>
        </form>
      ) : (
        <p className="text-[12px] text-ink-muted">Semua host sudah ditandai libur pada tanggal ini.</p>
      )}
    </div>
  );
}

/** Versi dialog, dipakai tombol "+ Libur" di papan mingguan. */
export function LeaveDaySheet({
  date,
  hosts,
  leaves,
  onClose,
}: {
  date: string;
  hosts: LeaveHost[];
  leaves: DayLeave[];
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Atur libur" description={formatDate(date)}>
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
        <CalendarOff className="size-4" aria-hidden />
        Host yang libur hari ini
      </div>
      <LeaveDayEditor date={date} hosts={hosts} leaves={leaves} />
    </Modal>
  );
}
