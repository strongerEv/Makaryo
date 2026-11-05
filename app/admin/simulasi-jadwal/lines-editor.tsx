"use client";

import { Copy, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { liveMinutes } from "@/lib/attendance/shift-hours";
import {
  SANDBOX_COLORS,
  copyShiftsForLine,
  newId,
  type SandboxColor,
  type SandboxLine,
  type SandboxShift,
  type SandboxState,
  type SourceShift,
} from "@/lib/scheduling/sandbox";
import { cn } from "@/lib/utils/cn";

import { useConfirm } from "./confirm-dialog";
import type { UpdateSandbox } from "./sandbox-app";
import { LINE_TONE, hours } from "./ui";

export function LinesEditor({
  state,
  update,
  sourceShifts,
}: {
  state: SandboxState;
  update: UpdateSandbox;
  sourceShifts: SourceShift[];
}) {
  const { ask, dialog } = useConfirm();

  const updateLine = (id: string, patch: Partial<SandboxLine>) =>
    update((prev) => ({ ...prev, lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) }));

  const updateShift = (id: string, patch: Partial<SandboxShift>) =>
    update((prev) => ({
      ...prev,
      shifts: prev.shifts.map((shift) => (shift.id === id ? { ...shift, ...patch } : shift)),
    }));

  /** Membuang shift beserta penugasannya. */
  const dropShifts = (prev: SandboxState, ids: Set<string>): SandboxState => ({
    ...prev,
    shifts: prev.shifts.filter((shift) => !ids.has(shift.id)),
    assignments: prev.assignments.filter((row) => !ids.has(row.shiftId)),
  });

  const addLine = () => {
    const used = new Set(state.lines.map((line) => line.color));
    const color = SANDBOX_COLORS.find((item) => !used.has(item)) ?? "primary";
    const line: SandboxLine = { id: newId("line"), name: `Lini ${state.lines.length + 1}`, color };
    update((prev) => ({
      ...prev,
      lines: [...prev.lines, line],
      shifts: [...prev.shifts, ...copyShiftsForLine(line.id, sourceShifts)],
    }));
  };

  const removeLine = (line: SandboxLine) =>
    ask({
      title: `Hapus lini ${line.name}?`,
      description: "Semua shift dan penugasan lini ini di simulasi ikut terhapus.",
      confirmLabel: "Hapus lini",
      onConfirm: () =>
        update((prev) => {
          const ids = new Set(prev.shifts.filter((shift) => shift.lineId === line.id).map((shift) => shift.id));
          const next = dropShifts(prev, ids);
          return { ...next, lines: next.lines.filter((item) => item.id !== line.id) };
        }),
    });

  const resyncLine = (line: SandboxLine) =>
    ask({
      title: `Samakan shift ${line.name} dengan Pengaturan Shift?`,
      description:
        "Shift lini ini diganti salinan terbaru dari Pengaturan Shift. Penugasan pada shift lama di lini ini ikut terhapus.",
      confirmLabel: "Samakan",
      onConfirm: () =>
        update((prev) => {
          const ids = new Set(prev.shifts.filter((shift) => shift.lineId === line.id).map((shift) => shift.id));
          const next = dropShifts(prev, ids);
          return { ...next, shifts: [...next.shifts, ...copyShiftsForLine(line.id, sourceShifts)] };
        }),
    });

  const copyFromLine = (target: SandboxLine, source: SandboxLine) =>
    ask({
      title: `Salin shift ${source.name} ke ${target.name}?`,
      description: "Shift lini tujuan diganti dengan salinan shift lini sumber. Penugasannya di lini tujuan ikut terhapus.",
      confirmLabel: "Salin",
      onConfirm: () =>
        update((prev) => {
          const ids = new Set(prev.shifts.filter((shift) => shift.lineId === target.id).map((shift) => shift.id));
          const copies = prev.shifts
            .filter((shift) => shift.lineId === source.id)
            .map((shift) => ({ ...shift, id: newId("shift"), lineId: target.id }));
          const next = dropShifts(prev, ids);
          return { ...next, shifts: [...next.shifts, ...copies] };
        }),
    });

  const addShift = (lineId: string) =>
    update((prev) => {
      const milik = prev.shifts.filter((shift) => shift.lineId === lineId);
      const terakhir = [...milik].sort((a, b) => a.sortOrder - b.sortOrder).at(-1);
      return {
        ...prev,
        shifts: [
          ...prev.shifts,
          {
            id: newId("shift"),
            lineId,
            name: `Shift ${milik.length + 1}`,
            startTime: terakhir?.endTime ?? "06:00",
            endTime: "21:00",
            breakStart: null,
            breakEnd: null,
            minHosts: 1,
            sortOrder: (terakhir?.sortOrder ?? 0) + 1,
          },
        ],
      };
    });

  const removeShift = (shift: SandboxShift) => {
    const count = state.assignments.filter((row) => row.shiftId === shift.id).length;
    const run = () => update((prev) => dropShifts(prev, new Set([shift.id])));
    if (count === 0) return run();
    ask({
      title: `Hapus ${shift.name}?`,
      description: `${count} penugasan di shift ini (seluruh tanggal) ikut terhapus dari simulasi.`,
      confirmLabel: "Hapus shift",
      onConfirm: run,
    });
  };

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Shift awal disalin dari <span className="font-semibold">Pengaturan Shift</span>. Mengubahnya di sini hanya
        berlaku untuk simulasi — pengaturan shift yang asli tidak berubah.
      </Alert>

      <div className="grid gap-4 xl:grid-cols-2">
        {state.lines.map((line) => {
          const lineShifts = state.shifts
            .filter((shift) => shift.lineId === line.id)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.startTime.localeCompare(b.startTime));
          const others = state.lines.filter((item) => item.id !== line.id);
          const totalLive = lineShifts.reduce(
            (sum, shift) =>
              sum +
              liveMinutes({
                startTime: shift.startTime,
                endTime: shift.endTime,
                breakStart: shift.breakStart,
                breakEnd: shift.breakEnd,
              }),
            0,
          );

          return (
            <Card key={line.id} className={cn("border-t-4", LINE_TONE[line.color].border)}>
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                <Field label="Nama lini" htmlFor={`line-${line.id}`}>
                  <Input
                    id={`line-${line.id}`}
                    value={line.name}
                    maxLength={40}
                    onChange={(event) => updateLine(line.id, { name: event.target.value })}
                    onBlur={(event) => !event.target.value.trim() && updateLine(line.id, { name: "Lini" })}
                  />
                </Field>
                <Field label="Warna" htmlFor={`color-${line.id}`}>
                  <Select
                    id={`color-${line.id}`}
                    value={line.color}
                    onChange={(event) => updateLine(line.id, { color: event.target.value as SandboxColor })}
                  >
                    {SANDBOX_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {LINE_TONE[color].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <p className="mb-2 text-[12px] font-semibold text-ink-muted">
                {lineShifts.length} shift · total live {hours(totalLive)} jam per hari
              </p>

              <div className="space-y-3">
                {lineShifts.map((shift) => (
                  <ShiftRow
                    key={shift.id}
                    shift={shift}
                    onChange={(patch) => updateShift(shift.id, patch)}
                    onRemove={() => removeShift(shift)}
                  />
                ))}
                {lineShifts.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] bg-surface-muted p-3 text-center text-[13px] text-ink-muted">
                    Lini ini belum punya shift.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => addShift(line.id)} className={buttonClass({ variant: "soft", size: "sm" })}>
                  <Plus className="size-4" aria-hidden />
                  Tambah shift
                </button>
                <button type="button" onClick={() => resyncLine(line)} className={buttonClass({ variant: "outline", size: "sm" })}>
                  <RefreshCw className="size-4" aria-hidden />
                  Samakan dengan Pengaturan Shift
                </button>
                {others.length > 0 ? (
                  <Select
                    aria-label={`Salin shift dari lini lain ke ${line.name}`}
                    value=""
                    onChange={(event) => {
                      const source = others.find((item) => item.id === event.target.value);
                      if (source) copyFromLine(line, source);
                    }}
                    className="h-9 w-auto rounded-full text-[13px]"
                  >
                    <option value="">Salin dari lini…</option>
                    {others.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
                {state.lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(line)}
                    className={buttonClass({ variant: "ghost", size: "sm", className: "ml-auto text-coral hover:text-coral" })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Hapus lini
                  </button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      <button type="button" onClick={addLine} className={buttonClass({ variant: "outline" })} disabled={state.lines.length >= 10}>
        <Copy className="size-4" aria-hidden />
        Tambah lini bisnis
      </button>

      {dialog}
    </div>
  );
}

function ShiftRow({
  shift,
  onChange,
  onRemove,
}: {
  shift: SandboxShift;
  onChange: (patch: Partial<SandboxShift>) => void;
  onRemove: () => void;
}) {
  const live = liveMinutes({
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakStart: shift.breakStart,
    breakEnd: shift.breakEnd,
  });
  const id = (key: string) => `${shift.id}-${key}`;

  return (
    <div className="rounded-[var(--radius-md)] border border-line p-3">
      <div className="mb-2 flex items-end gap-2">
        <Field label="Nama shift" htmlFor={id("name")} className="min-w-0 flex-1">
          <Input
            id={id("name")}
            value={shift.name}
            maxLength={40}
            onChange={(event) => onChange({ name: event.target.value })}
            onBlur={(event) => !event.target.value.trim() && onChange({ name: "Shift" })}
          />
        </Field>
        <Field label="Min. host" htmlFor={id("min")} className="w-[92px]">
          <Input
            id={id("min")}
            type="number"
            min={0}
            max={20}
            value={shift.minHosts}
            onChange={(event) => onChange({ minHosts: clampInt(event.target.value, 0, 20) })}
          />
        </Field>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-coral-soft hover:text-coral"
          aria-label={`Hapus ${shift.name}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Mulai" htmlFor={id("start")}>
          <Input
            id={id("start")}
            type="time"
            value={shift.startTime}
            onChange={(event) => event.target.value && onChange({ startTime: event.target.value })}
          />
        </Field>
        <Field label="Selesai" htmlFor={id("end")}>
          <Input
            id={id("end")}
            type="time"
            value={shift.endTime}
            onChange={(event) => event.target.value && onChange({ endTime: event.target.value })}
          />
        </Field>
        <Field label="Istirahat mulai" htmlFor={id("bs")}>
          <Input
            id={id("bs")}
            type="time"
            value={shift.breakStart ?? ""}
            onChange={(event) => onChange({ breakStart: event.target.value || null })}
          />
        </Field>
        <Field label="Istirahat selesai" htmlFor={id("be")}>
          <Input
            id={id("be")}
            type="time"
            value={shift.breakEnd ?? ""}
            onChange={(event) => onChange({ breakEnd: event.target.value || null })}
          />
        </Field>
      </div>

      <p className="mt-2 text-[12px] text-ink-muted">
        Live {hours(live)} jam{shift.endTime <= shift.startTime ? " · selesai keesokan hari" : ""}
      </p>
    </div>
  );
}

export function clampInt(value: string, min: number, max: number) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
