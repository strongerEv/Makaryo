"use client";

import { useState } from "react";

import {
  AssignmentEditorSheet,
  type EditorHost,
  type EditorShift,
  type EditorTarget,
} from "@/components/schedule/assignment-editor-sheet";
import { MonthCalendar, type CalendarItem } from "@/components/schedule/month-calendar";
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

  const weekAssignments: WeekAssignment[] = shared.assignments;

  return (
    <>
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

  return (
    <>
      <MonthCalendar
        month={month}
        items={items}
        hrefByDate={shared.hrefByDate}
        selectedDate={shared.selectedDate}
        emptyLabel="Kosong"
        onSelectItem={bukaEdit}
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
