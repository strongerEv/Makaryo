"use client";

import { CheckSquare, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import { removeAssignmentsAction, type ActionState } from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

import {
  AssignmentEditorSheet,
  type EditorHost,
  type EditorShift,
  type EditorTarget,
} from "@/components/schedule/assignment-editor-sheet";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";
import { LeaveDaySheet } from "@/components/schedule/leave-day-editor";
import {
  WeekBoard,
  type WeekAssignment,
  type WeekHost,
  type WeekLeave,
} from "@/components/schedule/week-board";
import type { Shift } from "@/lib/types/database";

/** Penugasan yang cukup untuk membuka editor dari tampilan mana pun. */
export type BoardAssignment = {
  id: string;
  hostId: string;
  hostName: string;
  shiftId: string;
  workDate: string;
  status: "draft" | "published" | "cancelled";
};

type SharedProps = {
  assignments: BoardAssignment[];
  shifts: Shift[];
  hosts: EditorHost[];
  hrefByDate: Record<string, string>;
  selectedDate: string;
};

/**
 * Papan mingguan yang bisa disunting: klik chip host untuk mengubah, atau
 * tombol tambah pada shift untuk menambah host di hari itu.
 */
const INITIAL: ActionState = {};

/**
 * Mode tandai untuk kalender dan papan mingguan.
 *
 * Menghapus jadwal satu per satu terlalu lambat untuk membongkar sebulan, dan
 * reset per bulan kadang terlalu kasar. Di antara keduanya: centang beberapa
 * entri langsung di kalender, lalu hapus sekaligus.
 */
function useMarking(idsTerlihat: string[]) {
  const [menandai, setMenandai] = useState(false);
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [state, hapus] = useActionState(removeAssignmentsAction, INITIAL);

  // Setelah penghapusan, id yang sudah hilang tidak boleh tersisa di pilihan.
  useEffect(() => {
    setTerpilih((sebelum) => sebelum.filter((id) => idsTerlihat.includes(id)));
  }, [idsTerlihat]);

  useEffect(() => {
    if (state.success) {
      setTerpilih([]);
      setMenandai(false);
    }
  }, [state.success]);

  const toggle = (id: string) =>
    setTerpilih((sebelum) =>
      sebelum.includes(id) ? sebelum.filter((item) => item !== id) : [...sebelum, id],
    );

  /** Menandai seluruh entri satu hari; menekan lagi membatalkannya. */
  const toggleBanyak = (ids: string[]) =>
    setTerpilih((sebelum) => {
      const semuaSudah = ids.length > 0 && ids.every((id) => sebelum.includes(id));
      return semuaSudah
        ? sebelum.filter((id) => !ids.includes(id))
        : [...new Set([...sebelum, ...ids])];
    });

  return {
    menandai,
    setMenandai,
    terpilih,
    toggle,
    toggleBanyak,
    state,
    hapus,
    keluar: () => {
      setMenandai(false);
      setTerpilih([]);
    },
  };
}

function MarkingBar({
  tandai,
  idsTerlihat,
  label,
}: {
  tandai: ReturnType<typeof useMarking>;
  idsTerlihat: string[];
  label: string;
}) {
  const semuaTerpilih = idsTerlihat.length > 0 && tandai.terpilih.length === idsTerlihat.length;

  return (
    <div className="mb-3 space-y-2">
      {tandai.state.error ? <Alert tone="error">{tandai.state.error}</Alert> : null}
      {tandai.state.success ? <Alert tone="success">{tandai.state.success}</Alert> : null}

      {tandai.menandai ? (
        <form
          action={tandai.hapus}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-primary-soft px-3 py-2.5"
        >
          {tandai.terpilih.map((id) => (
            <input key={id} type="hidden" name="assignmentIds" value={id} />
          ))}

          <span className="text-[13px] font-bold text-primary">{tandai.terpilih.length} ditandai</span>

          <button
            type="button"
            onClick={() => tandai.toggleBanyak(idsTerlihat)}
            className="text-[13px] font-semibold text-primary hover:underline"
          >
            {semuaTerpilih ? "Kosongkan" : `Pilih semua ${label} (${idsTerlihat.length})`}
          </button>

          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={tandai.keluar}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-ink"
            >
              <X className="size-4" aria-hidden />
              Selesai
            </button>
            <SubmitButton
              size="sm"
              variant="danger"
              disabled={tandai.terpilih.length === 0}
              pendingLabel="Menghapus…"
            >
              <Trash2 className="size-4" aria-hidden />
              Hapus
            </SubmitButton>
          </span>
        </form>
      ) : idsTerlihat.length > 0 ? (
        <button
          type="button"
          onClick={() => tandai.setMenandai(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          <CheckSquare className="size-4" aria-hidden />
          Tandai untuk hapus banyak
        </button>
      ) : null}
    </div>
  );
}

export function EditableWeekBoard({
  dates,
  leaves,
  weekHosts,
  ...shared
}: SharedProps & {
  dates: string[];
  leaves: WeekLeave[];
  weekHosts: WeekHost[];
}) {
  const { target, bukaEdit, bukaTambah, tutup, editorShifts } = useAssignmentEditor(shared);
  const [tanggalLibur, setTanggalLibur] = useState<string | null>(null);

  const weekAssignments: WeekAssignment[] = shared.assignments;
  const idsTerlihat = useMemo(() => weekAssignments.map((row) => row.id), [weekAssignments]);
  const tandai = useMarking(idsTerlihat);

  return (
    <>
      <MarkingBar tandai={tandai} idsTerlihat={idsTerlihat} label="minggu ini" />

      <WeekBoard
        dates={dates}
        shifts={shared.shifts}
        assignments={weekAssignments}
        leaves={leaves}
        hosts={weekHosts}
        hrefByDate={shared.hrefByDate}
        selectedDate={shared.selectedDate}
        onEdit={(item) => bukaEdit(item.id)}
        onAdd={bukaTambah}
        onEditLeave={setTanggalLibur}
        markedIds={tandai.menandai ? tandai.terpilih : undefined}
        onToggleMark={tandai.menandai ? tandai.toggle : undefined}
        onToggleDay={(date) =>
          tandai.toggleBanyak(
            weekAssignments.filter((row) => row.workDate === date).map((row) => row.id),
          )
        }
      />

      {target ? (
        <AssignmentEditorSheet
          target={target}
          shifts={editorShifts}
          hosts={shared.hosts}
          onClose={tutup}
        />
      ) : null}

      {tanggalLibur ? (
        <LeaveDaySheet
          date={tanggalLibur}
          hosts={shared.hosts}
          leaves={leaves
            .filter((row) => row.date === tanggalLibur)
            .map((row) => ({ id: row.id, hostId: row.hostId, hostName: row.hostName, type: row.type }))}
          onClose={() => setTanggalLibur(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Kalender bulanan yang bisa disunting: klik entri jadwal untuk mengubah host,
 * shift, atau tanggalnya.
 */
export function EditableMonthCalendar({
  month,
  items,
  ...shared
}: SharedProps & {
  month: string;
  items: Record<string, CalendarItem[]>;
}) {
  const { target, bukaEdit, tutup, editorShifts } = useAssignmentEditor(shared);

  const idsTerlihat = useMemo(() => shared.assignments.map((row) => row.id), [shared.assignments]);
  const tandai = useMarking(idsTerlihat);

  return (
    <>
      <MarkingBar tandai={tandai} idsTerlihat={idsTerlihat} label="bulan ini" />

      <MonthCalendar
        month={month}
        items={items}
        hrefByDate={shared.hrefByDate}
        selectedDate={shared.selectedDate}
        emptyLabel="Kosong"
        onSelectItem={bukaEdit}
        markedIds={tandai.menandai ? tandai.terpilih : undefined}
        onToggleMark={tandai.menandai ? tandai.toggle : undefined}
        onToggleDay={(date) =>
          tandai.toggleBanyak(
            shared.assignments.filter((row) => row.workDate === date).map((row) => row.id),
          )
        }
      />

      {target ? (
        <AssignmentEditorSheet
          target={target}
          shifts={editorShifts}
          hosts={shared.hosts}
          onClose={tutup}
        />
      ) : null}
    </>
  );
}

function useAssignmentEditor({ assignments, shifts }: Pick<SharedProps, "assignments" | "shifts">) {
  const [target, setTarget] = useState<EditorTarget | null>(null);

  const editorShifts: EditorShift[] = shifts.map((shift) => ({
    id: shift.id,
    name: shift.name,
    startTime: shift.start_time,
    endTime: shift.end_time,
  }));

  const bukaEdit = (assignmentId: string) => {
    const item = assignments.find((row) => row.id === assignmentId);
    if (!item) return;
    setTarget({
      id: item.id,
      hostId: item.hostId,
      shiftId: item.shiftId,
      workDate: item.workDate,
      hostName: item.hostName,
      status: item.status,
    });
  };

  const bukaTambah = (workDate: string, shiftId: string) =>
    setTarget({ id: null, hostId: "", shiftId, workDate });

  return { target, bukaEdit, bukaTambah, tutup: () => setTarget(null), editorShifts };
}
