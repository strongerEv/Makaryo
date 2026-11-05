"use client";

import { Plus, Trash2, UserPlus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import {
  DEFAULT_FREELANCE_RATE,
  HOST_KINDS,
  HOST_KIND_LABEL,
  newId,
  type HostKind,
  type PayBasis,
  type SandboxHost,
  type SandboxState,
  type SourceHost,
} from "@/lib/scheduling/sandbox";
import { cn } from "@/lib/utils/cn";

import { useConfirm } from "./confirm-dialog";
import { clampInt } from "./lines-editor";
import type { UpdateSandbox } from "./sandbox-app";

export function HostsEditor({
  state,
  update,
  sourceHosts,
}: {
  state: SandboxState;
  update: UpdateSandbox;
  sourceHosts: SourceHost[];
}) {
  const { ask, dialog } = useConfirm();

  const updateHost = (id: string, patch: Partial<SandboxHost>) =>
    update((prev) => ({ ...prev, hosts: prev.hosts.map((host) => (host.id === id ? { ...host, ...patch } : host)) }));

  const addFreelance = () => {
    const nomor = state.hosts.filter((host) => host.kind === "freelance").length + 1;
    update((prev) => ({
      ...prev,
      hosts: [
        ...prev.hosts,
        {
          id: newId("host"),
          name: `Freelance ${nomor}`,
          profileId: null,
          kind: "freelance",
          weeklyDayOffQuota: 2,
          hourlyRate: DEFAULT_FREELANCE_RATE,
          active: true,
        },
      ],
    }));
  };

  const usedProfiles = new Set(state.hosts.map((host) => host.profileId).filter(Boolean));
  const availableAccounts = sourceHosts.filter((host) => !usedProfiles.has(host.id));

  const addAccount = (profileId: string) => {
    const source = sourceHosts.find((host) => host.id === profileId);
    if (!source) return;
    update((prev) => ({
      ...prev,
      hosts: [
        ...prev.hosts,
        {
          id: newId("host"),
          name: source.full_name,
          profileId: source.id,
          kind: "tetap",
          weeklyDayOffQuota: Math.max(0, Math.min(7, source.weekly_day_off_quota ?? 1)),
          hourlyRate: 0,
          active: true,
        },
      ],
    }));
  };

  const removeHost = (host: SandboxHost) => {
    const count = state.assignments.filter((row) => row.hostId === host.id).length;
    const run = () =>
      update((prev) => ({
        ...prev,
        hosts: prev.hosts.filter((item) => item.id !== host.id),
        assignments: prev.assignments.filter((row) => row.hostId !== host.id),
        leaves: prev.leaves.filter((leave) => leave.hostId !== host.id),
      }));
    if (count === 0) return run();
    ask({
      title: `Keluarkan ${host.name} dari simulasi?`,
      description: `${count} penugasan miliknya di simulasi ikut terhapus. Akun aslinya tidak tersentuh.`,
      confirmLabel: "Keluarkan",
      onConfirm: run,
    });
  };

  const setRules = (patch: Partial<SandboxState["rules"]>) =>
    update((prev) => ({ ...prev, rules: { ...prev.rules, ...patch } }));

  // Hitungan cepat per minggu: berapa slot yang harus diisi dan berapa
  // hari-orang yang tersedia, supaya kecukupan orang terlihat sebelum generate.
  const slotsPerWeek = 7 * state.shifts.reduce((sum, shift) => sum + shift.minHosts, 0);
  const active = state.hosts.filter((host) => host.active);
  const daysAvailable = active.reduce((sum, host) => sum + Math.max(0, 7 - host.weeklyDayOffQuota), 0);
  const perDay = state.rules.maxShiftsPerDay;
  const capacity = perDay > 0 ? daysAvailable * perDay : null;
  const cukup = capacity === null ? true : capacity >= slotsPerWeek;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Hitungan cepat per minggu"
          description="Sebelum generate: apakah jumlah orang cukup untuk semua slot?"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Slot yang harus diisi" value={slotsPerWeek} hint={`${state.shifts.length} shift × min. host × 7 hari`} />
          <Metric label="Hari kerja tersedia" value={daysAvailable} hint={`${active.length} peserta aktif, dikurangi jatah libur`} />
          <Metric
            label="Kapasitas"
            value={capacity === null ? "Tanpa batas" : capacity}
            hint={perDay > 0 ? `hari kerja × maks. ${perDay} shift/hari` : "shift per hari tidak dibatasi"}
            tone={cukup ? "ok" : "bad"}
          />
        </div>
        {!cukup ? (
          <Alert tone="warning" className="mt-3">
            Kapasitas kurang {slotsPerWeek - (capacity ?? 0)} slot per minggu. Tambah peserta, kurangi jatah libur,
            kurangi shift/min. host, atau izinkan lebih dari 1 shift per hari.
          </Alert>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Aturan simulasi" description="Dipakai saat generate dan saat menghitung rekap." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Maks. shift per orang per hari" htmlFor="rule-max">
            <Select
              id="rule-max"
              value={state.rules.maxShiftsPerDay}
              onChange={(event) => setRules({ maxShiftsPerDay: Number(event.target.value) })}
            >
              <option value={1}>1 shift</option>
              <option value={2}>2 shift</option>
              <option value={3}>3 shift</option>
              <option value={0}>Tanpa batas</option>
            </Select>
          </Field>
          <Field
            label="Urutan pengisian"
            htmlFor="rule-priority"
            hint={state.rules.prioritizePermanent ? "Freelance menutup slot yang masih kurang." : undefined}
          >
            <Select
              id="rule-priority"
              value={state.rules.prioritizePermanent ? "tetap" : "setara"}
              onChange={(event) => setRules({ prioritizePermanent: event.target.value === "tetap" })}
            >
              <option value="tetap">Host tetap dulu</option>
              <option value="setara">Tetap & freelance setara</option>
            </Select>
          </Field>
          <Field label="Jam yang dibayar" htmlFor="rule-pay">
            <Select
              id="rule-pay"
              value={state.rules.payBasis}
              onChange={(event) => setRules({ payBasis: event.target.value as PayBasis })}
            >
              <option value="live">Jam live bersih (tanpa istirahat)</option>
              <option value="shift">Rentang shift penuh</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Peserta"
          description="Jatah libur menentukan berapa hari kerja per minggu. Tarif dipakai untuk perkiraan bayaran di Rekap."
        />

        <div className="space-y-3">
          {state.hosts.map((host) => (
            <div
              key={host.id}
              className={cn(
                "rounded-[var(--radius-md)] border border-line p-3",
                !host.active && "bg-surface-muted/70",
              )}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={host.kind === "tetap" ? "primary" : "warning"}>{HOST_KIND_LABEL[host.kind]}</Badge>
                {host.profileId ? <Badge tone="neutral">Akun host</Badge> : <Badge tone="neutral">Nama sementara</Badge>}
                <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={host.active}
                    onChange={(event) => updateHost(host.id, { active: event.target.checked })}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  Ikut dijadwalkan
                </label>
                <button
                  type="button"
                  onClick={() => removeHost(host)}
                  className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-coral-soft hover:text-coral"
                  aria-label={`Keluarkan ${host.name}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                <Field label="Nama" htmlFor={`${host.id}-name`} className="col-span-2 lg:col-span-1">
                  <Input
                    id={`${host.id}-name`}
                    value={host.name}
                    maxLength={60}
                    onChange={(event) => updateHost(host.id, { name: event.target.value })}
                    onBlur={(event) => !event.target.value.trim() && updateHost(host.id, { name: "Peserta" })}
                  />
                </Field>
                <Field label="Jenis" htmlFor={`${host.id}-kind`}>
                  <Select
                    id={`${host.id}-kind`}
                    className="pl-3 pr-8"
                    value={host.kind}
                    onChange={(event) => {
                      const kind = event.target.value as HostKind;
                      updateHost(host.id, {
                        kind,
                        // Tarif awal freelance diisi otomatis bila sebelumnya kosong.
                        hourlyRate: kind === "freelance" && host.hourlyRate === 0 ? DEFAULT_FREELANCE_RATE : host.hourlyRate,
                      });
                    }}
                  >
                    {HOST_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {HOST_KIND_LABEL[kind]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Libur / minggu" htmlFor={`${host.id}-off`}>
                  <Input
                    id={`${host.id}-off`}
                    type="number"
                    min={0}
                    max={6}
                    value={host.weeklyDayOffQuota}
                    onChange={(event) => updateHost(host.id, { weeklyDayOffQuota: clampInt(event.target.value, 0, 6) })}
                  />
                </Field>
                <Field
                  label="Tarif per jam (Rp)"
                  htmlFor={`${host.id}-rate`}
                  className="col-span-2 lg:col-span-1"
                  hint={host.kind === "tetap" && host.hourlyRate === 0 ? "Kosong = gaji bulanan, diurus admin" : undefined}
                >
                  <Input
                    id={`${host.id}-rate`}
                    type="number"
                    min={0}
                    step={500}
                    inputMode="numeric"
                    value={host.hourlyRate}
                    onChange={(event) => updateHost(host.id, { hourlyRate: clampInt(event.target.value, 0, 10_000_000) })}
                  />
                </Field>
              </div>
            </div>
          ))}

          {state.hosts.length === 0 ? (
            <p className="rounded-[var(--radius-md)] bg-surface-muted p-4 text-center text-[13px] text-ink-muted">
              Belum ada peserta.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={addFreelance} className={buttonClass({ variant: "soft" })} disabled={state.hosts.length >= 60}>
            <Plus className="size-4" aria-hidden />
            Tambah freelance
          </button>
          {availableAccounts.length > 0 ? (
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-ink-muted" aria-hidden />
              <Select
                aria-label="Tambah host dari akun"
                value=""
                onChange={(event) => addAccount(event.target.value)}
                className="w-auto"
              >
                <option value="">Tambah dari akun host…</option>
                {availableAccounts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.full_name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </Card>

      {dialog}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] p-3.5",
        tone === "bad" ? "bg-coral-soft" : tone === "ok" ? "bg-emerald-soft" : "bg-surface-muted",
      )}
    >
      <p className="text-[12px] font-semibold text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}
