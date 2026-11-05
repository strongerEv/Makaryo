"use client";

import {
  AlertTriangle,
  CalendarCheck,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Plus,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import {
  RANGE_DAYS,
  analyzeRange,
  generateSandbox,
  hasOverlap,
  mondayOf,
  newId,
  orderedShifts,
  rangeDates,
  recapRange,
  type HostIssue,
  type SandboxHost,
  type SandboxShift,
  type SandboxState,
} from "@/lib/scheduling/sandbox";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { addDays } from "@/lib/utils/period";

import type { UpdateSandbox } from "./sandbox-app";
import { LINE_TONE, clock, dayLabel, shortDate, shortNames } from "./ui";

const ISSUE_LABEL: Record<HostIssue["kind"], string> = {
  bertumpuk: "jam bertumpuk",
  "melebihi-batas": "melebihi batas shift per hari",
  "saat-izin": "dijadwalkan saat izin",
};

export function ScheduleView({
  state,
  update,
  today,
}: {
  state: SandboxState;
  update: UpdateSandbox;
  today: string;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const dates = useMemo(() => rangeDates(state.view), [state.view]);
  const shifts = useMemo(() => orderedShifts(state), [state]);
  const hostById = useMemo(() => new Map(state.hosts.map((host) => [host.id, host])), [state.hosts]);
  const names = useMemo(() => shortNames(state.hosts), [state.hosts]);
  const hostShortName = (host: SandboxHost) => names.get(host.id) ?? host.name;
  const lineById = useMemo(() => new Map(state.lines.map((line) => [line.id, line])), [state.lines]);
  const analysis = useMemo(() => analyzeRange(state, dates), [state, dates]);
  const recap = useMemo(() => recapRange(state, dates), [state, dates]);

  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];
  const inRange = state.assignments.filter((row) => row.workDate >= rangeStart && row.workDate <= rangeEnd);

  const totalSlots = dates.length * shifts.reduce((sum, shift) => sum + shift.minHosts, 0);
  const shortage = analysis.slotIssues.reduce((sum, item) => sum + (item.required - item.assigned), 0);

  const setView = (view: Partial<SandboxState["view"]>) =>
    update((prev) => ({ ...prev, view: { ...prev.view, ...view } }));

  const runGenerate = (keepManual: boolean) => {
    const hasil = generateSandbox(state, { startDate: rangeStart, endDate: rangeEnd, keepManual });
    update((prev) => ({ ...prev, assignments: hasil.assignments }));
    const kurang = hasil.warnings.length;
    setNotice(
      `${hasil.generatedCount} penugasan disusun untuk ${shortDate(rangeStart)}–${shortDate(rangeEnd)}.` +
        (kurang > 0 ? ` ${kurang} slot masih kurang orang.` : " Semua slot terisi."),
    );
    setGenerateOpen(false);
  };

  const clearRange = (onlyAuto: boolean) => {
    update((prev) => ({
      ...prev,
      assignments: prev.assignments.filter(
        (row) =>
          row.workDate < rangeStart || row.workDate > rangeEnd || (onlyAuto && row.source === "manual"),
      ),
    }));
    setNotice(onlyAuto ? "Hasil generate di rentang ini dikosongkan." : "Semua penugasan di rentang ini dikosongkan.");
    setClearOpen(false);
  };

  const cellHosts = (date: string, shiftId: string) =>
    inRange
      .filter((row) => row.workDate === date && row.shiftId === shiftId)
      .map((row) => ({ row, host: hostById.get(row.hostId) }));

  const offHosts = (date: string) => {
    const kerja = new Set(inRange.filter((row) => row.workDate === date).map((row) => row.hostId));
    const izin = new Set(state.leaves.filter((leave) => leave.date === date).map((leave) => leave.hostId));
    return {
      izin: state.hosts.filter((host) => izin.has(host.id)),
      libur: state.hosts.filter((host) => host.active && !kerja.has(host.id) && !izin.has(host.id)),
    };
  };

  const issueDates = new Set([
    ...analysis.slotIssues.map((item) => item.workDate),
    ...analysis.hostIssues.map((item) => item.workDate),
  ]);

  return (
    <div className="space-y-4">
      {/* Rentang & aksi */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView({ startDate: addDays(rangeStart, -state.view.days) })}
                aria-label="Rentang sebelumnya"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <Field label="Mulai" htmlFor="sim-mulai" className="w-[150px]">
                <Input
                  id="sim-mulai"
                  type="date"
                  value={rangeStart}
                  onChange={(event) => event.target.value && setView({ startDate: event.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={() => setView({ startDate: addDays(rangeStart, state.view.days) })}
                aria-label="Rentang berikutnya"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            <Field label="Lama" htmlFor="sim-lama" className="w-[140px]">
              <Select
                id="sim-lama"
                value={state.view.days}
                onChange={(event) => setView({ days: Number(event.target.value) })}
              >
                {RANGE_DAYS.map((days) => (
                  <option key={days} value={days}>
                    {days === 7 ? "1 minggu" : `${days / 7} minggu`}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="button"
              onClick={() => setView({ startDate: mondayOf(today) })}
              className={buttonClass({ variant: "outline", size: "md" })}
            >
              Minggu ini
            </button>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              className={buttonClass({ variant: "primary", className: "flex-1 sm:flex-none" })}
              disabled={shifts.length === 0}
            >
              <Sparkles className="size-4" aria-hidden />
              Generate
            </button>
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className={buttonClass({ variant: "outline", className: "flex-1 sm:flex-none" })}
              disabled={inRange.length === 0}
            >
              <Eraser className="size-4" aria-hidden />
              Kosongkan
            </button>
          </div>
        </div>
      </Card>

      {notice ? (
        <Alert tone="success">
          <span className="flex items-start justify-between gap-2">
            {notice}
            <button type="button" onClick={() => setNotice(null)} aria-label="Tutup pesan" className="shrink-0">
              <X className="size-4" aria-hidden />
            </button>
          </span>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Slot terisi"
          value={`${Math.max(0, totalSlots - shortage)}/${totalSlots}`}
          icon={CalendarCheck}
          tone="emerald"
        />
        <StatCard
          label="Slot kurang orang"
          value={shortage}
          icon={AlertTriangle}
          tone={shortage > 0 ? "coral" : "neutral"}
        />
        <StatCard
          label="Catatan aturan"
          value={analysis.hostIssues.length}
          hint={analysis.hostIssues.length > 0 ? "dobel, bentrok, atau saat izin" : "semua sesuai aturan"}
          icon={CalendarOff}
          tone={analysis.hostIssues.length > 0 ? "amber" : "neutral"}
        />
        <StatCard
          label="Perkiraan biaya freelance"
          value={formatCurrency(recap.freelancePay)}
          hint={`${dates.length} hari`}
          icon={Wallet}
          tone="sky"
        />
      </div>

      {analysis.hostIssues.length > 0 ? (
        <Alert tone="warning">
          {analysis.hostIssues.slice(0, 4).map((item) => (
            <span key={`${item.hostId}|${item.workDate}|${item.kind}`} className="block">
              {hostById.get(item.hostId)?.name ?? "Peserta"} · {dayLabel(item.workDate)} — {ISSUE_LABEL[item.kind]}
            </span>
          ))}
          {analysis.hostIssues.length > 4 ? <span className="block">…dan {analysis.hostIssues.length - 4} lainnya.</span> : null}
        </Alert>
      ) : null}

      {shifts.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-ink-muted">
            Belum ada shift di simulasi. Tambahkan lewat tab <span className="font-semibold">Lini &amp; Shift</span>.
          </p>
        </Card>
      ) : (
        <>
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-muted">
            {state.lines.map((line) => (
              <span key={line.id} className="inline-flex items-center gap-1.5">
                <span className={cn("inline-block size-2.5 rounded-full", LINE_TONE[line.color].dot)} aria-hidden />
                {line.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <FreelanceMark /> freelance
            </span>
            <span>Ketuk tanggal untuk mengatur manual.</span>
          </div>

          {/* Desktop: tabel penuh */}
          <Card className="hidden overflow-hidden p-0 sm:p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line">
                    <th rowSpan={2} className="w-[120px] px-4 py-2.5 align-bottom text-[12px] font-semibold text-ink-muted">
                      Tanggal
                    </th>
                    {state.lines.map((line) => {
                      const count = shifts.filter((shift) => shift.lineId === line.id).length;
                      if (count === 0) return null;
                      return (
                        <th
                          key={line.id}
                          colSpan={count}
                          className="border-l border-line px-3 pt-2.5 text-[13px] font-bold text-ink"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn("inline-block size-2.5 rounded-full", LINE_TONE[line.color].dot)} aria-hidden />
                            {line.name}
                          </span>
                        </th>
                      );
                    })}
                    <th rowSpan={2} className="border-l border-line px-3 py-2.5 align-bottom text-[12px] font-semibold text-ink-muted">
                      Libur / izin
                    </th>
                  </tr>
                  <tr className="border-b border-line">
                    {shifts.map((shift, index) => (
                      <th
                        key={shift.id}
                        className={cn(
                          "px-3 pb-2 pt-1 text-[12px] font-semibold text-ink-muted",
                          (index === 0 || shifts[index - 1].lineId !== shift.lineId) && "border-l border-line",
                        )}
                      >
                        {shift.name}
                        <span className="tabular block text-[11px] font-medium text-ink-muted/80">
                          {clock(shift.startTime)}–{clock(shift.endTime)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date) => {
                    const off = offHosts(date);
                    return (
                      <tr
                        key={date}
                        onClick={() => setOpenDate(date)}
                        className="cursor-pointer border-b border-line last:border-b-0 even:bg-surface-muted/60 hover:bg-primary-soft/40"
                      >
                        <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold text-ink">
                          <span className="flex items-center gap-1.5">
                            {dayLabel(date)}
                            {issueDates.has(date) ? (
                              <AlertTriangle className="size-3.5 text-coral" aria-label="Ada catatan" />
                            ) : null}
                          </span>
                        </th>
                        {shifts.map((shift, index) => {
                          const list = cellHosts(date, shift.id);
                          const line = lineById.get(shift.lineId);
                          const kurang = list.length < shift.minHosts;
                          return (
                            <td
                              key={shift.id}
                              className={cn(
                                "px-3 py-2 align-top",
                                (index === 0 || shifts[index - 1].lineId !== shift.lineId) && "border-l border-line",
                              )}
                            >
                              <div className="flex flex-wrap gap-1">
                                {list.map(({ row, host }) => (
                                  <HostChip key={row.id} host={host} label={host ? hostShortName(host) : "?"} tone={line ? LINE_TONE[line.color].chip : ""} />
                                ))}
                                {kurang ? (
                                  <span className="inline-flex items-center rounded-full border border-dashed border-coral/60 px-2 py-0.5 text-[11px] font-semibold text-coral">
                                    {list.length === 0 ? "Kosong" : `kurang ${shift.minHosts - list.length}`}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-l border-line px-3 py-2 align-top text-[12px] text-ink-muted">
                          {off.libur.map((host) => hostShortName(host)).join(", ") || "—"}
                          {off.izin.length > 0 ? (
                            <span className="block font-semibold text-[#9a6a12]">
                              Izin: {off.izin.map((host) => hostShortName(host)).join(", ")}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: kartu per hari */}
          <div className="space-y-3 lg:hidden">
            {dates.map((date) => {
              const off = offHosts(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setOpenDate(date)}
                  className="block w-full rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
                >
                  <span className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      {dayLabel(date)}
                      {issueDates.has(date) ? <AlertTriangle className="size-4 text-coral" aria-label="Ada catatan" /> : null}
                    </span>
                    <span className="text-[12px] font-semibold text-primary">Atur</span>
                  </span>

                  <span className="block space-y-2.5">
                    {state.lines.map((line) => {
                      const lineShifts = shifts.filter((shift) => shift.lineId === line.id);
                      if (lineShifts.length === 0) return null;
                      return (
                        <span key={line.id} className="block">
                          <span className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-ink">
                            <span className={cn("inline-block size-2 rounded-full", LINE_TONE[line.color].dot)} aria-hidden />
                            {line.name}
                          </span>
                          <span className="block space-y-1">
                            {lineShifts.map((shift) => {
                              const list = cellHosts(date, shift.id);
                              const kurang = list.length < shift.minHosts;
                              return (
                                <span key={shift.id} className="flex items-start gap-2">
                                  <span className="tabular w-[92px] shrink-0 pt-0.5 text-[11px] text-ink-muted">
                                    {shift.name}
                                    <span className="block">
                                      {clock(shift.startTime)}–{clock(shift.endTime)}
                                    </span>
                                  </span>
                                  <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                                    {list.map(({ row, host }) => (
                                      <HostChip key={row.id} host={host} label={host ? hostShortName(host) : "?"} tone={LINE_TONE[line.color].chip} />
                                    ))}
                                    {kurang ? (
                                      <span className="inline-flex items-center rounded-full border border-dashed border-coral/60 px-2 py-0.5 text-[11px] font-semibold text-coral">
                                        {list.length === 0 ? "Kosong" : `kurang ${shift.minHosts - list.length}`}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                              );
                            })}
                          </span>
                        </span>
                      );
                    })}
                  </span>

                  <span className="mt-2.5 block border-t border-line pt-2 text-[12px] text-ink-muted">
                    Libur: {off.libur.map((host) => hostShortName(host)).join(", ") || "—"}
                    {off.izin.length > 0 ? (
                      <span className="font-semibold text-[#9a6a12]">
                        {" "}
                        · Izin: {off.izin.map((host) => hostShortName(host)).join(", ")}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {openDate ? (
        <DaySheet
          date={openDate}
          state={state}
          update={update}
          shifts={shifts}
          onClose={() => setOpenDate(null)}
        />
      ) : null}

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title={`Generate ${shortDate(rangeStart)} – ${shortDate(rangeEnd)}`}
        description="Mesin penjadwalan yang sama dengan jadwal asli, ditambah aturan simulasi di tab Peserta & Aturan."
      >
        <ul className="mb-4 space-y-1.5 text-[13px] text-ink-muted">
          <li>
            • {state.hosts.filter((host) => host.active).length} peserta aktif,{" "}
            {shifts.length} shift di {state.lines.length} lini.
          </li>
          <li>
            •{" "}
            {state.rules.maxShiftsPerDay > 0
              ? `Maksimal ${state.rules.maxShiftsPerDay} shift per orang per hari.`
              : "Tanpa batas shift per hari (asal jam tidak bertumpuk)."}
          </li>
          <li>• {state.rules.prioritizePermanent ? "Host tetap diisi lebih dulu, freelance menutup kekurangan." : "Host tetap dan freelance diperlakukan setara."}</li>
          <li>• Izin yang dicatat di simulasi dihormati. Di luar rentang ini tidak ada yang berubah.</li>
        </ul>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => runGenerate(true)} className={buttonClass({ variant: "primary" })}>
            <Sparkles className="size-4" aria-hidden />
            Pertahankan yang manual
          </button>
          <button type="button" onClick={() => runGenerate(false)} className={buttonClass({ variant: "outline" })}>
            Susun ulang semuanya
          </button>
        </div>
      </Modal>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title={`Kosongkan ${shortDate(rangeStart)} – ${shortDate(rangeEnd)}?`}
        description="Hanya isi simulasi di rentang ini yang dihapus. Jadwal asli tidak tersentuh."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => clearRange(true)} className={buttonClass({ variant: "outline" })}>
            Hanya hasil generate
          </button>
          <button type="button" onClick={() => clearRange(false)} className={buttonClass({ variant: "danger" })}>
            <Eraser className="size-4" aria-hidden />
            Semua penugasan
          </button>
        </div>
      </Modal>
    </div>
  );
}

function FreelanceMark() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full bg-ink/80 text-[9px] font-bold text-white">
      F
    </span>
  );
}

function HostChip({ host, label, tone }: { host: SandboxHost | undefined; label: string; tone: string }) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", tone)}
      title={host ? `${host.name}${host.kind === "freelance" ? " (freelance)" : ""}` : "Peserta terhapus"}
    >
      <span className="truncate">{label}</span>
      {host?.kind === "freelance" ? <FreelanceMark /> : null}
    </span>
  );
}

/** Pengaturan manual satu hari: tambah/keluarkan peserta per shift, dan catat izin. */
function DaySheet({
  date,
  state,
  update,
  shifts,
  onClose,
}: {
  date: string;
  state: SandboxState;
  update: UpdateSandbox;
  shifts: SandboxShift[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const hostById = new Map(state.hosts.map((host) => [host.id, host]));
  const dayRows = state.assignments.filter((row) => row.workDate === date);
  const leaves = state.leaves.filter((leave) => leave.date === date);
  const leaveHostIds = new Set(leaves.map((leave) => leave.hostId));

  const addHost = (shiftId: string, hostId: string) => {
    if (!hostId) return;
    if (hasOverlap(state, { hostId, shiftId, workDate: date })) {
      setError(`${hostById.get(hostId)?.name ?? "Peserta"} sudah memegang shift lain di jam yang bertumpuk.`);
      return;
    }
    setError(null);
    update((prev) => ({
      ...prev,
      assignments: [...prev.assignments, { id: newId("asg"), hostId, shiftId, workDate: date, source: "manual" }],
    }));
  };

  const removeRow = (id: string) =>
    update((prev) => ({ ...prev, assignments: prev.assignments.filter((row) => row.id !== id) }));

  const addLeave = (hostId: string) => {
    if (!hostId) return;
    update((prev) => ({ ...prev, leaves: [...prev.leaves, { id: newId("izin"), hostId, date }] }));
  };

  const removeLeave = (id: string) =>
    update((prev) => ({ ...prev, leaves: prev.leaves.filter((leave) => leave.id !== id) }));

  const working = new Set(dayRows.map((row) => row.hostId));
  const libur = state.hosts.filter((host) => host.active && !working.has(host.id) && !leaveHostIds.has(host.id));

  return (
    <Modal open onClose={onClose} title={dayLabel(date)} description="Atur manual: tambah atau keluarkan peserta dari tiap shift.">
      {error ? (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-4">
        {state.lines.map((line) => {
          const lineShifts = shifts.filter((shift) => shift.lineId === line.id);
          if (lineShifts.length === 0) return null;
          return (
            <section key={line.id}>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
                <span className={cn("inline-block size-2.5 rounded-full", LINE_TONE[line.color].dot)} aria-hidden />
                {line.name}
              </h3>
              <div className="space-y-2">
                {lineShifts.map((shift) => {
                  const rows = dayRows.filter((row) => row.shiftId === shift.id);
                  const inSlot = new Set(rows.map((row) => row.hostId));
                  const kandidat = state.hosts.filter((host) => !inSlot.has(host.id));
                  return (
                    <div key={shift.id} className={cn("rounded-[var(--radius-md)] border p-3", LINE_TONE[line.color].border)}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-ink">
                          {shift.name}{" "}
                          <span className="tabular font-medium text-ink-muted">
                            {clock(shift.startTime)}–{clock(shift.endTime)}
                          </span>
                        </p>
                        <Badge tone={rows.length < shift.minHosts ? "danger" : "success"}>
                          {rows.length}/{shift.minHosts}
                        </Badge>
                      </div>

                      {rows.length > 0 ? (
                        <ul className="mb-2 space-y-1">
                          {rows.map((row) => {
                            const host = hostById.get(row.hostId);
                            return (
                              <li key={row.id} className="flex items-center gap-2 rounded-[12px] bg-surface-muted px-3 py-1.5">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-semibold text-ink">
                                    {host?.name ?? "Peserta terhapus"}
                                  </span>
                                  <span className="block text-[11px] text-ink-muted">
                                    {host?.kind === "freelance" ? "Freelance" : "Tetap"} ·{" "}
                                    {row.source === "auto" ? "otomatis" : "manual"}
                                    {leaveHostIds.has(row.hostId) ? " · sedang izin" : ""}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-coral"
                                  aria-label={`Keluarkan ${host?.name ?? "peserta"}`}
                                >
                                  <X className="size-4" aria-hidden />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}

                      <AddSelect
                        label={`Tambah ke ${line.name} ${shift.name}`}
                        placeholder="Tambah peserta…"
                        options={kandidat.map((host) => {
                          const catatan = [
                            !host.active ? "nonaktif" : null,
                            leaveHostIds.has(host.id) ? "izin" : null,
                            working.has(host.id) ? "sudah ada shift" : null,
                            hasOverlap(state, { hostId: host.id, shiftId: shift.id, workDate: date }) ? "bentrok" : null,
                          ].filter(Boolean);
                          return {
                            value: host.id,
                            label: `${host.name}${host.kind === "freelance" ? " (F)" : ""}${catatan.length ? ` — ${catatan.join(", ")}` : ""}`,
                          };
                        })}
                        onAdd={(hostId) => addHost(shift.id, hostId)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="rounded-[var(--radius-md)] border border-amber/40 bg-amber-soft/40 p-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink">
            <CalendarOff className="size-4 text-[#9a6a12]" aria-hidden />
            Izin & libur
          </h3>
          <p className="mb-2 text-[12px] text-ink-muted">
            Izin dipakai untuk mencoba &quot;bagaimana kalau ada yang berhalangan&quot;. Generate tidak akan menjadwalkan
            peserta yang izin.
          </p>
          {leaves.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {leaves.map((leave) => (
                <li key={leave.id} className="inline-flex items-center gap-1 rounded-full bg-amber-soft py-1 pl-2.5 pr-1 text-[12px] font-semibold text-[#9a6a12]">
                  {hostById.get(leave.hostId)?.name ?? "Peserta"}
                  <button
                    type="button"
                    onClick={() => removeLeave(leave.id)}
                    className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/60"
                    aria-label="Hapus izin"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <AddSelect
            label="Catat izin"
            placeholder="Catat izin untuk…"
            options={state.hosts
              .filter((host) => !leaveHostIds.has(host.id))
              .map((host) => ({ value: host.id, label: host.name }))}
            onAdd={addLeave}
          />
          <p className="mt-2 text-[12px] text-ink-muted">
            Libur (tanpa shift): {libur.map((host) => host.name).join(", ") || "—"}
          </p>
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className={buttonClass({ variant: "soft" })}>
          Selesai
        </button>
      </div>
    </Modal>
  );
}

function AddSelect({
  label,
  placeholder,
  options,
  onAdd,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Select aria-label={label} value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
        disabled={!value}
        className={buttonClass({ variant: "soft", className: "shrink-0 px-3.5" })}
        aria-label={label}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
