import { describe, expect, it } from "vitest";

import { generateSchedule } from "@/lib/scheduling/engine";
import {
  analyzeRange,
  buildDefaultSandbox,
  generateSandbox,
  hasOverlap,
  mondayOf,
  parseSandbox,
  recapRange,
  type SandboxState,
} from "@/lib/scheduling/sandbox";
import { eachDate } from "@/lib/utils/period";

const DUA_SHIFT = [
  { name: "Pagi", start_time: "06:00:00", end_time: "13:00:00", break_start: null, break_end: null, min_hosts: 1, sort_order: 1 },
  { name: "Sore", start_time: "13:00:00", end_time: "21:00:00", break_start: null, break_end: null, min_hosts: 1, sort_order: 2 },
];

const TIGA_HOST = [
  { id: "p-andi", full_name: "Andi", weekly_day_off_quota: 1 },
  { id: "p-budi", full_name: "Budi", weekly_day_off_quota: 1 },
  { id: "p-citra", full_name: "Citra", weekly_day_off_quota: 1 },
];

function sandbox(): SandboxState {
  return buildDefaultSandbox({ shifts: DUA_SHIFT, hosts: TIGA_HOST, today: "2026-11-11" });
}

describe("opsi tambahan mesin penjadwalan", () => {
  const shifts = [
    { id: "pagi", name: "Pagi", startTime: "06:00", endTime: "13:00", minHosts: 1, sortOrder: 1 },
    { id: "sore", name: "Sore", startTime: "13:00", endTime: "21:00", minHosts: 1, sortOrder: 2 },
  ];

  it("maxShiftsPerDay mencegah satu host memegang dua shift yang tidak bertumpuk", () => {
    const { assignments } = generateSchedule({
      startDate: "2026-03-02",
      endDate: "2026-03-08",
      hosts: [
        { id: "a", weeklyDayOffQuota: 0 },
        { id: "b", weeklyDayOffQuota: 0 },
      ],
      shifts,
      maxShiftsPerDay: 1,
    });

    const perHari = new Map<string, number>();
    assignments.forEach((row) => {
      const key = `${row.hostId}|${row.workDate}`;
      perHari.set(key, (perHari.get(key) ?? 0) + 1);
    });
    expect(Math.max(...perHari.values())).toBe(1);
  });

  it("tanpa maxShiftsPerDay, perilaku lama tetap: satu host boleh pagi dan sore", () => {
    const { assignments, warnings } = generateSchedule({
      startDate: "2026-03-02",
      endDate: "2026-03-02",
      hosts: [{ id: "a", weeklyDayOffQuota: 0 }],
      shifts,
    });
    expect(warnings).toHaveLength(0);
    expect(assignments).toHaveLength(2);
  });

  it("host berprioritas tinggi didahulukan, sisanya untuk prioritas rendah", () => {
    const { assignments } = generateSchedule({
      startDate: "2026-03-02",
      endDate: "2026-03-02",
      hosts: [
        { id: "freelance", weeklyDayOffQuota: 0, priority: 1 },
        { id: "tetap", weeklyDayOffQuota: 0, priority: 0 },
      ],
      shifts: [shifts[0]],
    });
    expect(assignments.map((row) => row.hostId)).toEqual(["tetap"]);
  });

  it("group meratakan giliran antar lini", () => {
    const { assignments } = generateSchedule({
      startDate: "2026-03-02",
      endDate: "2026-03-15",
      hosts: [
        { id: "a", weeklyDayOffQuota: 0 },
        { id: "b", weeklyDayOffQuota: 0 },
      ],
      shifts: [
        { id: "t", name: "Tumbler", startTime: "06:00", endTime: "13:00", minHosts: 1, sortOrder: 1, group: "tumbler" },
        { id: "c", name: "Celana", startTime: "06:00", endTime: "13:00", minHosts: 1, sortOrder: 2, group: "celana" },
      ],
      maxShiftsPerDay: 1,
    });

    for (const host of ["a", "b"]) {
      const tumbler = assignments.filter((row) => row.hostId === host && row.shiftId === "t").length;
      const celana = assignments.filter((row) => row.hostId === host && row.shiftId === "c").length;
      expect(Math.abs(tumbler - celana)).toBeLessThanOrEqual(1);
    }
  });
});

describe("simulasi jadwal beta", () => {
  it("isi awal: dua lini dengan shift yang sama persis seperti Pengaturan Shift", () => {
    const state = sandbox();
    expect(state.lines.map((line) => line.name)).toEqual(["Tumbler", "Celana"]);
    expect(state.shifts).toHaveLength(4);
    for (const line of state.lines) {
      const milik = state.shifts.filter((shift) => shift.lineId === line.id);
      expect(milik.map((shift) => [shift.name, shift.startTime, shift.endTime])).toEqual([
        ["Pagi", "06:00", "13:00"],
        ["Sore", "13:00", "21:00"],
      ]);
    }
    expect(state.hosts.filter((host) => host.kind === "tetap")).toHaveLength(3);
    const freelance = state.hosts.filter((host) => host.kind === "freelance");
    expect(freelance).toHaveLength(2);
    expect(freelance.every((host) => host.hourlyRate === 10_000 && host.weeklyDayOffQuota === 2)).toBe(true);
    expect(state.view.startDate).toBe("2026-11-09");
  });

  it("5 orang cukup untuk 2 lini × 2 shift: tanpa slot kosong, tanpa dobel, 1 orang libur per hari", () => {
    const state = sandbox();
    const dates = eachDate("2026-11-09", "2026-11-22");
    const hasil = generateSandbox(state, { startDate: dates[0], endDate: dates.at(-1)!, keepManual: true });
    const next = { ...state, assignments: hasil.assignments };

    expect(hasil.warnings).toHaveLength(0);

    const { slotIssues, hostIssues } = analyzeRange(next, dates);
    expect(slotIssues).toHaveLength(0);
    expect(hostIssues).toHaveLength(0);

    for (const date of dates) {
      const kerja = new Set(next.assignments.filter((row) => row.workDate === date).map((row) => row.hostId));
      expect(kerja.size).toBe(4);
    }

    const recap = recapRange(next, dates);
    for (const host of recap.hosts) {
      expect(host.doubleDays).toBe(0);
      expect(host.workDays).toBe(host.kind === "tetap" ? 12 : 10);
    }

    // Freelance tidak boleh terus-terusan kebagian shift sore, dan pagi/sore
    // tiap orang tetap seimbang walau host tetap diprioritaskan.
    const pagiIds = new Set(next.shifts.filter((shift) => shift.startTime === "06:00").map((shift) => shift.id));
    for (const host of next.hosts) {
      const milik = next.assignments.filter((row) => row.hostId === host.id);
      const pagi = milik.filter((row) => pagiIds.has(row.shiftId)).length;
      expect(Math.abs(pagi - (milik.length - pagi))).toBeLessThanOrEqual(2);
    }
  });

  it("generate ulang mempertahankan penugasan manual dan tidak menyentuh di luar rentang", () => {
    const state = sandbox();
    const [andi] = state.hosts;
    const pagiTumbler = state.shifts[0];

    const manual = { id: "m1", hostId: andi.id, shiftId: pagiTumbler.id, workDate: "2026-11-10", source: "manual" as const };
    const luar = { id: "o1", hostId: andi.id, shiftId: pagiTumbler.id, workDate: "2026-11-30", source: "auto" as const };
    const awal = { ...state, assignments: [manual, luar] };

    const hasil = generateSandbox(awal, { startDate: "2026-11-09", endDate: "2026-11-15", keepManual: true });
    expect(hasil.assignments).toContainEqual(manual);
    expect(hasil.assignments).toContainEqual(luar);
    expect(
      hasil.assignments.filter((row) => row.workDate === "2026-11-10" && row.shiftId === pagiTumbler.id),
    ).toHaveLength(1);

    const tanpaManual = generateSandbox(awal, { startDate: "2026-11-09", endDate: "2026-11-15", keepManual: false });
    expect(tanpaManual.assignments.find((row) => row.id === "m1")).toBeUndefined();
    expect(tanpaManual.assignments).toContainEqual(luar);
  });

  it("izin dihormati saat generate", () => {
    const state = sandbox();
    const [andi] = state.hosts;
    const awal = { ...state, leaves: [{ id: "l1", hostId: andi.id, date: "2026-11-11" }] };
    const hasil = generateSandbox(awal, { startDate: "2026-11-09", endDate: "2026-11-15", keepManual: true });
    expect(hasil.assignments.some((row) => row.hostId === andi.id && row.workDate === "2026-11-11")).toBe(false);
  });

  it("peserta nonaktif tidak ikut dijadwalkan", () => {
    const state = sandbox();
    const hosts = state.hosts.map((host, index) => (index === 0 ? { ...host, active: false } : host));
    const hasil = generateSandbox({ ...state, hosts }, { startDate: "2026-11-09", endDate: "2026-11-15", keepManual: true });
    expect(hasil.assignments.some((row) => row.hostId === state.hosts[0].id)).toBe(false);
  });

  it("rekap menghitung perkiraan bayaran dari jam live dan tarif per jam", () => {
    const state = sandbox();
    const freelance = state.hosts.find((host) => host.kind === "freelance")!;
    const [pagi, sore] = state.shifts;
    const next: SandboxState = {
      ...state,
      shifts: state.shifts.map((shift) =>
        shift.id === sore.id ? { ...shift, breakStart: "17:00", breakEnd: "18:00" } : shift,
      ),
      assignments: [
        { id: "a1", hostId: freelance.id, shiftId: pagi.id, workDate: "2026-11-09", source: "manual" },
        { id: "a2", hostId: freelance.id, shiftId: sore.id, workDate: "2026-11-10", source: "manual" },
      ],
    };
    const dates = eachDate("2026-11-09", "2026-11-15");

    const live = recapRange(next, dates).hosts.find((host) => host.hostId === freelance.id)!;
    expect(live.liveMinutes).toBe((7 + 7) * 60);
    expect(live.estimatedPay).toBe(14 * 10_000);

    const penuh = recapRange({ ...next, rules: { ...next.rules, payBasis: "shift" } }, dates).hosts.find(
      (host) => host.hostId === freelance.id,
    )!;
    expect(penuh.estimatedPay).toBe(15 * 10_000);

    const tetap = recapRange(next, dates).hosts.find((host) => host.kind === "tetap")!;
    expect(tetap.estimatedPay).toBeNull();
  });

  it("deteksi bentrok jam dan pelanggaran batas harian", () => {
    const state = sandbox();
    const [andi] = state.hosts;
    const [tumblerPagi, tumblerSore, celanaPagi] = state.shifts;

    const awal = {
      ...state,
      assignments: [{ id: "x", hostId: andi.id, shiftId: tumblerPagi.id, workDate: "2026-11-09", source: "manual" as const }],
    };
    expect(hasOverlap(awal, { hostId: andi.id, shiftId: celanaPagi.id, workDate: "2026-11-09" })).toBe(true);
    expect(hasOverlap(awal, { hostId: andi.id, shiftId: tumblerSore.id, workDate: "2026-11-09" })).toBe(false);

    const dobel = {
      ...awal,
      assignments: [
        ...awal.assignments,
        { id: "y", hostId: andi.id, shiftId: tumblerSore.id, workDate: "2026-11-09", source: "manual" as const },
      ],
    };
    const { hostIssues } = analyzeRange(dobel, ["2026-11-09"]);
    expect(hostIssues).toEqual([{ hostId: andi.id, workDate: "2026-11-09", kind: "melebihi-batas" }]);
  });

  it("dokumen tersimpan divalidasi ulang saat dibaca", () => {
    const state = sandbox();
    expect(parseSandbox(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(parseSandbox({ version: 2 })).toBeNull();
    expect(parseSandbox(null)).toBeNull();
  });

  it("mondayOf mengembalikan Senin di minggu yang sama", () => {
    expect(mondayOf("2026-11-09")).toBe("2026-11-09");
    expect(mondayOf("2026-11-15")).toBe("2026-11-09");
    expect(mondayOf("2026-11-11")).toBe("2026-11-09");
  });
});
