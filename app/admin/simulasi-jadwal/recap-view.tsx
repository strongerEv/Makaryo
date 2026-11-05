"use client";

import { useMemo } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { analyzeRange, orderedShifts, rangeDates, recapRange, HOST_KIND_LABEL, type SandboxState } from "@/lib/scheduling/sandbox";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

import type { UpdateSandbox } from "./sandbox-app";
import { LINE_TONE, hours, shortDate } from "./ui";

export function RecapView({ state }: { state: SandboxState; update: UpdateSandbox }) {
  const dates = useMemo(() => rangeDates(state.view), [state.view]);
  const recap = useMemo(() => recapRange(state, dates), [state, dates]);
  const analysis = useMemo(() => analyzeRange(state, dates), [state, dates]);
  const shifts = useMemo(() => orderedShifts(state), [state]);

  const rows = recap.hosts.filter((host) => host.active || host.shiftCount > 0);
  const payLabel = state.rules.payBasis === "live" ? "jam live bersih" : "rentang shift penuh";

  const lineCoverage = state.lines.map((line) => {
    const lineShifts = shifts.filter((shift) => shift.lineId === line.id);
    const needed = dates.length * lineShifts.reduce((sum, shift) => sum + shift.minHosts, 0);
    const short = analysis.slotIssues
      .filter((item) => lineShifts.some((shift) => shift.id === item.shiftId))
      .reduce((sum, item) => sum + (item.required - item.assigned), 0);
    return { line, needed, filled: needed - short };
  });

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Rentang {shortDate(dates[0])} – {shortDate(dates[dates.length - 1])} ({dates.length} hari), mengikuti tab
        Jadwal. Perkiraan bayaran = {payLabel} × tarif per jam. Peserta bertarif 0 (host tetap bergaji bulanan)
        tidak dihitung.
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lineCoverage.map(({ line, needed, filled }) => (
          <div
            key={line.id}
            className={cn("rounded-[var(--radius-card)] border border-line border-t-4 bg-surface p-4 shadow-[var(--shadow-card)]", LINE_TONE[line.color].border)}
          >
            <p className="text-[12px] font-semibold text-ink-muted">Lini {line.name}</p>
            <p className="tabular mt-1 text-2xl font-bold text-ink">
              {filled}/{needed}
            </p>
            <p className="text-[11px] text-ink-muted">slot terisi</p>
          </div>
        ))}
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
          <p className="text-[12px] font-semibold text-ink-muted">Perkiraan biaya freelance</p>
          <p className="tabular mt-1 text-2xl font-bold text-ink">{formatCurrency(recap.freelancePay)}</p>
          <p className="text-[11px] text-ink-muted">total semua bertarif: {formatCurrency(recap.totalPay)}</p>
        </div>
      </div>

      <Card className="hidden p-0 sm:p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] font-semibold text-ink-muted">
                <th className="px-4 py-3">Peserta</th>
                <th className="px-3 py-3 text-right">Hari kerja</th>
                <th className="px-3 py-3 text-right">Shift</th>
                {state.lines.map((line) => (
                  <th key={line.id} className="px-3 py-3 text-right">
                    {line.name}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Dobel</th>
                <th className="px-3 py-3 text-right">Libur</th>
                <th className="px-3 py-3 text-right">Izin</th>
                <th className="px-3 py-3 text-right">Jam dibayar</th>
                <th className="px-3 py-3 text-right">Tarif/jam</th>
                <th className="px-4 py-3 text-right">Perkiraan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((host) => (
                <tr key={host.hostId} className="border-b border-line last:border-b-0 even:bg-surface-muted/60">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-ink">{host.name}</span>{" "}
                    <Badge tone={host.kind === "tetap" ? "primary" : "warning"} className="ml-1 px-2 py-0.5 text-[11px]">
                      {HOST_KIND_LABEL[host.kind]}
                    </Badge>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right">{host.workDays}</td>
                  <td className="tabular px-3 py-2.5 text-right">{host.shiftCount}</td>
                  {state.lines.map((line) => (
                    <td key={line.id} className="tabular px-3 py-2.5 text-right">
                      {host.perLine[line.id] ?? 0}
                    </td>
                  ))}
                  <td className={cn("tabular px-3 py-2.5 text-right", host.doubleDays > 0 && "font-bold text-coral")}>
                    {host.doubleDays}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right">{host.offDays}</td>
                  <td className="tabular px-3 py-2.5 text-right">{host.leaveDays}</td>
                  <td className="tabular px-3 py-2.5 text-right">{hours(host.paidMinutes)} jam</td>
                  <td className="tabular px-3 py-2.5 text-right">{host.hourlyRate > 0 ? formatCurrency(host.hourlyRate) : "—"}</td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold text-ink">
                    {host.estimatedPay !== null ? formatCurrency(host.estimatedPay) : "Gaji bulanan"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface-muted font-bold text-ink">
                <td className="px-4 py-3" colSpan={3 + state.lines.length + 4}>
                  Total perkiraan
                </td>
                <td className="tabular px-3 py-3 text-right" />
                <td className="tabular px-4 py-3 text-right">{formatCurrency(recap.totalPay)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="space-y-3 lg:hidden">
        {rows.map((host) => (
          <Card key={host.hostId} className="p-4">
            <CardHeader
              className="mb-2"
              title={host.name}
              description={`${HOST_KIND_LABEL[host.kind]} · ${host.workDays} hari · ${host.shiftCount} shift`}
              action={
                <span className="tabular text-right text-sm font-bold text-ink">
                  {host.estimatedPay !== null ? formatCurrency(host.estimatedPay) : "Gaji bulanan"}
                </span>
              }
            />
            <dl className="grid grid-cols-3 gap-2 text-[12px]">
              {state.lines.map((line) => (
                <Stat key={line.id} label={line.name} value={host.perLine[line.id] ?? 0} />
              ))}
              <Stat label="Jam dibayar" value={`${hours(host.paidMinutes)} jam`} />
              <Stat label="Dobel" value={host.doubleDays} warn={host.doubleDays > 0} />
              <Stat label="Libur / izin" value={`${host.offDays} / ${host.leaveDays}`} />
            </dl>
          </Card>
        ))}
        <Card className="flex items-center justify-between p-4">
          <span className="text-sm font-bold text-ink">Total perkiraan</span>
          <span className="tabular text-sm font-bold text-ink">{formatCurrency(recap.totalPay)}</span>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="rounded-[12px] bg-surface-muted px-2.5 py-2">
      <dt className="truncate text-ink-muted">{label}</dt>
      <dd className={cn("tabular font-bold text-ink", warn && "text-coral")}>{value}</dd>
    </div>
  );
}
