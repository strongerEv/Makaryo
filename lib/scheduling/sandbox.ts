/**
 * Simulasi Jadwal (Beta) — ruang coba-coba penjadwalan multi lini bisnis.
 *
 * Seluruh isinya hidup di satu dokumen JSON milik admin dan tidak pernah
 * menyentuh tabel jadwal, shift, atau absensi yang asli. Modul ini murni:
 * tanpa akses database, sehingga bisa dipakai di browser maupun di server dan
 * diuji langsung.
 */
import { z } from "zod";

import { liveMinutes, shiftSpanMinutes } from "@/lib/attendance/shift-hours";
import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/time";
import { generateSchedule, type SchedulingAssignment } from "@/lib/scheduling/engine";
import { addDays, eachDate } from "@/lib/utils/period";

// ------------------------------------------------------------------ skema --

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idString = z.string().min(1).max(64);

export const SANDBOX_COLORS = ["primary", "coral", "amber", "emerald", "sky"] as const;
export type SandboxColor = (typeof SANDBOX_COLORS)[number];

const colorSchema = z.enum(SANDBOX_COLORS).catch("primary");

const lineSchema = z.object({
  id: idString,
  name: z.string().trim().min(1).max(40),
  color: colorSchema,
});

const shiftSchema = z.object({
  id: idString,
  lineId: idString,
  name: z.string().trim().min(1).max(40),
  startTime: timeString,
  endTime: timeString,
  breakStart: timeString.nullable(),
  breakEnd: timeString.nullable(),
  minHosts: z.number().int().min(0).max(20),
  sortOrder: z.number().int(),
});

export const HOST_KINDS = ["tetap", "freelance"] as const;
export type HostKind = (typeof HOST_KINDS)[number];

const hostSchema = z.object({
  id: idString,
  name: z.string().trim().min(1).max(60),
  /** Akun asli bila peserta diambil dari Kelola Pengguna; kosong untuk nama sementara. */
  profileId: z.string().nullable(),
  kind: z.enum(HOST_KINDS),
  weeklyDayOffQuota: z.number().int().min(0).max(7),
  hourlyRate: z.number().min(0).max(10_000_000),
  /** Peserta nonaktif tidak ikut di-generate, tapi datanya tetap tersimpan. */
  active: z.boolean(),
});

const assignmentSchema = z.object({
  id: idString,
  hostId: idString,
  shiftId: idString,
  workDate: dateString,
  source: z.enum(["auto", "manual"]),
});

const leaveSchema = z.object({
  id: idString,
  hostId: idString,
  date: dateString,
});

export const PAY_BASES = ["live", "shift"] as const;
export type PayBasis = (typeof PAY_BASES)[number];

const rulesSchema = z.object({
  /** 0 = tanpa batas. */
  maxShiftsPerDay: z.number().int().min(0).max(5),
  prioritizePermanent: z.boolean(),
  /** Jam yang dibayar: jam live bersih (tanpa istirahat) atau rentang shift penuh. */
  payBasis: z.enum(PAY_BASES),
});

export const RANGE_DAYS = [7, 14, 28] as const;

export const sandboxSchema = z.object({
  version: z.literal(1),
  lines: z.array(lineSchema).min(1).max(10),
  shifts: z.array(shiftSchema).max(60),
  hosts: z.array(hostSchema).max(60),
  assignments: z.array(assignmentSchema).max(8000),
  leaves: z.array(leaveSchema).max(2000),
  rules: rulesSchema,
  view: z.object({
    startDate: dateString,
    days: z.number().int().min(1).max(42),
  }),
});

export type SandboxLine = z.infer<typeof lineSchema>;
export type SandboxShift = z.infer<typeof shiftSchema>;
export type SandboxHost = z.infer<typeof hostSchema>;
export type SandboxAssignment = z.infer<typeof assignmentSchema>;
export type SandboxLeave = z.infer<typeof leaveSchema>;
export type SandboxRules = z.infer<typeof rulesSchema>;
export type SandboxState = z.infer<typeof sandboxSchema>;

export const HOST_KIND_LABEL: Record<HostKind, string> = {
  tetap: "Tetap",
  freelance: "Freelance",
};

/** Tarif awal freelance yang disepakati: Rp10.000 per jam. */
export const DEFAULT_FREELANCE_RATE = 10_000;

// --------------------------------------------------------------- bawaan --

/** Shift asli dari Pengaturan Shift, cukup kolom yang disalin ke simulasi. */
export type SourceShift = {
  name: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  min_hosts: number;
  sort_order: number;
};

/** Host aktif dari Kelola Pengguna. */
export type SourceHost = {
  id: string;
  full_name: string;
  weekly_day_off_quota: number;
};

let counter = 0;

/** Id lokal; tidak perlu unik secara global, cukup di dalam satu dokumen. */
export function newId(prefix: string) {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${random}`;
}

function hhmm(value: string) {
  return value.slice(0, 5);
}

/** Menyalin seluruh shift dari Pengaturan Shift ke satu lini. */
export function copyShiftsForLine(lineId: string, source: SourceShift[]): SandboxShift[] {
  return [...source]
    .sort((a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time))
    .map((shift, index) => ({
      id: newId("shift"),
      lineId,
      name: shift.name,
      startTime: hhmm(shift.start_time),
      endTime: hhmm(shift.end_time),
      breakStart: shift.break_start ? hhmm(shift.break_start) : null,
      breakEnd: shift.break_end ? hhmm(shift.break_end) : null,
      minHosts: shift.min_hosts,
      sortOrder: index + 1,
    }));
}

/**
 * Isi awal simulasi: dua lini (Tumbler & Celana) yang masing-masing memakai
 * shift persis seperti Pengaturan Shift, host aktif sebagai host tetap, dan
 * dua freelance sementara bertarif Rp10.000/jam.
 */
export function buildDefaultSandbox({
  shifts,
  hosts,
  today,
}: {
  shifts: SourceShift[];
  hosts: SourceHost[];
  today: string;
}): SandboxState {
  const lines: SandboxLine[] = [
    { id: newId("line"), name: "Tumbler", color: "primary" },
    { id: newId("line"), name: "Celana", color: "coral" },
  ];

  const tetap: SandboxHost[] = hosts.map((host) => ({
    id: newId("host"),
    name: host.full_name,
    profileId: host.id,
    kind: "tetap",
    weeklyDayOffQuota: Math.max(0, Math.min(7, host.weekly_day_off_quota ?? 1)),
    hourlyRate: 0,
    active: true,
  }));

  const freelance: SandboxHost[] = [1, 2].map((nomor) => ({
    id: newId("host"),
    name: `Freelance ${nomor}`,
    profileId: null,
    kind: "freelance",
    weeklyDayOffQuota: 2,
    hourlyRate: DEFAULT_FREELANCE_RATE,
    active: true,
  }));

  return {
    version: 1,
    lines,
    shifts: lines.flatMap((line) => copyShiftsForLine(line.id, shifts)),
    hosts: [...tetap, ...freelance],
    assignments: [],
    leaves: [],
    rules: { maxShiftsPerDay: 1, prioritizePermanent: true, payBasis: "live" },
    view: { startDate: mondayOf(today), days: 7 },
  };
}

/** Senin dari minggu yang memuat tanggal itu. */
export function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

/**
 * Merapikan isian sebelum disimpan: nama yang dikosongkan saat sedang diketik
 * diberi nama pengganti, supaya penyimpanan otomatis tidak ditolak validasi.
 */
export function sanitizeSandbox(state: SandboxState): SandboxState {
  const isi = (value: string, fallback: string) => value.trim() || fallback;
  return {
    ...state,
    lines: state.lines.map((line) => ({ ...line, name: isi(line.name, "Lini") })),
    shifts: state.shifts.map((shift) => ({ ...shift, name: isi(shift.name, "Shift") })),
    hosts: state.hosts.map((host) => ({ ...host, name: isi(host.name, "Peserta") })),
  };
}

/** Membaca dokumen tersimpan; null bila rusak atau versinya tidak dikenal. */
export function parseSandbox(value: unknown): SandboxState | null {
  const parsed = sandboxSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// --------------------------------------------------------------- urutan --

/** Shift diurutkan per lini (urutan lini di daftar), lalu urutan shift-nya. */
export function orderedShifts(state: Pick<SandboxState, "lines" | "shifts">) {
  const lineIndex = new Map(state.lines.map((line, index) => [line.id, index]));
  return state.shifts
    .filter((shift) => lineIndex.has(shift.lineId))
    .sort(
      (a, b) =>
        (lineIndex.get(a.lineId) ?? 0) - (lineIndex.get(b.lineId) ?? 0) ||
        a.sortOrder - b.sortOrder ||
        a.startTime.localeCompare(b.startTime),
    );
}

export function rangeDates(view: SandboxState["view"]) {
  return eachDate(view.startDate, addDays(view.startDate, view.days - 1));
}

// ------------------------------------------------------------- generate --

export type GenerateOptions = {
  startDate: string;
  endDate: string;
  /** Penugasan manual di rentang ini dipertahankan dan ikut dihitung. */
  keepManual: boolean;
};

/**
 * Menyusun ulang satu rentang tanggal memakai mesin penjadwalan yang sama
 * dengan jadwal asli, ditambah aturan simulasi: batas shift per hari, prioritas
 * host tetap, dan rotasi merata antar lini.
 *
 * Penugasan otomatis di rentang itu diganti; di luar rentang tidak berubah.
 */
export function generateSandbox(state: SandboxState, options: GenerateOptions) {
  const { startDate, endDate, keepManual } = options;
  const inRange = (date: string) => date >= startDate && date <= endDate;

  const activeHosts = state.hosts.filter((host) => host.active);
  const activeIds = new Set(activeHosts.map((host) => host.id));
  const shifts = orderedShifts(state);
  const shiftIds = new Set(shifts.map((shift) => shift.id));

  const kept = state.assignments.filter(
    (row) => !inRange(row.workDate) || (keepManual && row.source === "manual"),
  );

  // Konteks: semua penugasan yang tidak diganti, agar beban dan rotasi minggu
  // yang terpotong rentang tetap terhitung.
  const existing: SchedulingAssignment[] = kept
    .filter((row) => activeIds.has(row.hostId) && shiftIds.has(row.shiftId))
    .filter((row) => row.workDate >= addDays(startDate, -7) && row.workDate <= addDays(endDate, 7))
    .map((row) => ({ hostId: row.hostId, shiftId: row.shiftId, workDate: row.workDate }));

  // Ditandai di dalam rentang saja, karena generateSchedule mengisi seluruh
  // tanggal antara startDate dan endDate.
  const { assignments, warnings } = generateSchedule({
    startDate,
    endDate,
    hosts: activeHosts.map((host) => ({
      id: host.id,
      weeklyDayOffQuota: host.weeklyDayOffQuota,
      priority: state.rules.prioritizePermanent ? (host.kind === "tetap" ? 0 : 1) : undefined,
    })),
    shifts: shifts.map((shift, index) => ({
      id: shift.id,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      minHosts: shift.minHosts,
      sortOrder: slotOrder(shift, index),
      group: shift.lineId,
    })),
    approvedLeaves: state.leaves
      .filter((leave) => inRange(leave.date))
      .map((leave) => ({ hostId: leave.hostId, date: leave.date })),
    existingAssignments: existing,
    maxShiftsPerDay: state.rules.maxShiftsPerDay,
  });

  const balanced = rebalanceRotation(assignments, shifts, existing, startDate);

  const generated: SandboxAssignment[] = balanced.map((row) => ({
    id: newId("asg"),
    hostId: row.hostId,
    shiftId: row.shiftId,
    workDate: row.workDate,
    source: "auto",
  }));

  return {
    assignments: [...kept, ...generated],
    warnings,
    generatedCount: generated.length,
  };
}

/**
 * Meratakan giliran shift setelah mesin memilih siapa yang bekerja tiap hari.
 *
 * Dengan prioritas host tetap, mesin mengisi slot paling awal dengan host
 * tetap, sehingga freelance selalu kebagian slot terakhir (mis. selalu sore di
 * Celana). Siapa yang bekerja hari itu sudah benar; yang perlu diatur ulang
 * hanya siapa memegang slot yang mana. Per hari, slot dibagikan ulang kepada
 * orang-orang yang sama: tiap slot jatuh ke orang yang paling jarang
 * memegang shift itu, lalu lini itu, lalu jam mulai itu.
 *
 * Hanya hari yang aman ditukar yang disentuh: setiap orang memegang tepat satu
 * slot hasil generate hari itu, tanpa penugasan lain, dan tidak ada shift yang
 * melewati tengah malam.
 */
export function rebalanceRotation(
  generated: SchedulingAssignment[],
  shifts: SandboxShift[],
  context: SchedulingAssignment[],
  startDate: string,
): SchedulingAssignment[] {
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const crossesMidnight = (shift: SandboxShift) => shift.endTime <= shift.startTime;

  const counts = new Map<string, number>();
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  const get = (key: string) => counts.get(key) ?? 0;
  const tally = (row: SchedulingAssignment) => {
    const shift = shiftById.get(row.shiftId);
    if (!shift) return;
    bump(`${row.hostId}|s|${shift.id}`);
    bump(`${row.hostId}|l|${shift.lineId}`);
    bump(`${row.hostId}|t|${shift.startTime}`);
  };

  // Riwayat sebelum rentang ikut dihitung agar rotasi bersambung.
  context.filter((row) => row.workDate < startDate).forEach(tally);

  const byDate = new Map<string, SchedulingAssignment[]>();
  generated.forEach((row) => byDate.set(row.workDate, [...(byDate.get(row.workDate) ?? []), row]));
  const contextDays = new Set(context.map((row) => `${row.hostId}|${row.workDate}`));

  const result: SchedulingAssignment[] = [];
  [...byDate.keys()].sort().forEach((workDate, dayIndex) => {
    const rows = byDate.get(workDate)!;
    const hostIds = rows.map((row) => row.hostId);
    const safe =
      new Set(hostIds).size === hostIds.length &&
      hostIds.every((id) => !contextDays.has(`${id}|${workDate}`)) &&
      rows.every((row) => {
        const shift = shiftById.get(row.shiftId);
        return shift && !crossesMidnight(shift);
      });

    if (!safe) {
      rows.forEach((row) => {
        result.push(row);
        tally(row);
      });
      return;
    }

    // Titik mulai berputar tiap hari supaya hasil seri tidak selalu jatuh ke orang yang sama.
    const urutan = [...hostIds].sort();
    const putar = urutan.map((_, index) => urutan[(index + dayIndex) % urutan.length]);
    const sisa = new Set(putar);

    const slots = rows
      .map((row) => shiftById.get(row.shiftId)!)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sortOrder - b.sortOrder);

    slots.forEach((shift) => {
      let terbaik: string | null = null;
      let skorTerbaik: number[] | null = null;
      for (const hostId of putar) {
        if (!sisa.has(hostId)) continue;
        const skor = [
          get(`${hostId}|s|${shift.id}`),
          get(`${hostId}|l|${shift.lineId}`),
          get(`${hostId}|t|${shift.startTime}`),
        ];
        if (!skorTerbaik || lebihKecil(skor, skorTerbaik)) {
          terbaik = hostId;
          skorTerbaik = skor;
        }
      }
      if (!terbaik) return;
      sisa.delete(terbaik);
      const row = { hostId: terbaik, shiftId: shift.id, workDate };
      result.push(row);
      tally(row);
    });
  });

  return result;
}

function lebihKecil(a: number[], b: number[]) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index];
  }
  return false;
}

/**
 * Urutan pengisian: shift yang mulai lebih awal diisi lebih dulu di semua
 * lini, baru shift berikutnya. Kalau satu lini diisi habis duluan, lini kedua
 * selalu kebagian sisa orang dan rotasinya jadi timpang.
 */
function slotOrder(shift: SandboxShift, index: number) {
  const [hour, minute] = shift.startTime.split(":").map(Number);
  return (hour * 60 + minute) * 100 + index;
}

// --------------------------------------------------------------- analisa --

export type SlotIssue = {
  workDate: string;
  shiftId: string;
  assigned: number;
  required: number;
};

export type HostIssue = {
  workDate: string;
  hostId: string;
  kind: "bertumpuk" | "melebihi-batas" | "saat-izin";
};

function interval(workDate: string, shift: SandboxShift) {
  return {
    start: shiftStartInstant(workDate, shift.startTime).getTime(),
    end: shiftEndInstant(workDate, shift.startTime, shift.endTime).getTime(),
  };
}

/** Apakah host bisa ditambahkan ke slot ini tanpa bentrok jam. */
export function hasOverlap(
  state: Pick<SandboxState, "assignments" | "shifts">,
  candidate: { hostId: string; shiftId: string; workDate: string },
  ignoreId?: string,
) {
  const shiftById = new Map(state.shifts.map((shift) => [shift.id, shift]));
  const target = shiftById.get(candidate.shiftId);
  if (!target) return false;
  const a = interval(candidate.workDate, target);

  return state.assignments.some((row) => {
    if (row.id === ignoreId || row.hostId !== candidate.hostId) return false;
    // Shift lewat tengah malam bisa bertumpuk dengan hari berikutnya.
    if (row.workDate < addDays(candidate.workDate, -1) || row.workDate > addDays(candidate.workDate, 1)) return false;
    const other = shiftById.get(row.shiftId);
    if (!other) return false;
    const b = interval(row.workDate, other);
    return a.start < b.end && b.start < a.end;
  });
}

/** Slot yang kurang orang dan penugasan yang melanggar aturan, untuk rentang tampilan. */
export function analyzeRange(state: SandboxState, dates: string[]) {
  const shifts = orderedShifts(state);
  const dateSet = new Set(dates);
  const rows = state.assignments.filter((row) => dateSet.has(row.workDate));

  const slotIssues: SlotIssue[] = [];
  for (const workDate of dates) {
    for (const shift of shifts) {
      const assigned = rows.filter((row) => row.workDate === workDate && row.shiftId === shift.id).length;
      if (assigned < shift.minHosts) {
        slotIssues.push({ workDate, shiftId: shift.id, assigned, required: shift.minHosts });
      }
    }
  }

  const hostIssues: HostIssue[] = [];
  const leaveKeys = new Set(state.leaves.map((leave) => `${leave.hostId}|${leave.date}`));
  const max = state.rules.maxShiftsPerDay;

  const perHostDay = new Map<string, SandboxAssignment[]>();
  rows.forEach((row) => {
    const key = `${row.hostId}|${row.workDate}`;
    perHostDay.set(key, [...(perHostDay.get(key) ?? []), row]);
  });

  perHostDay.forEach((list, key) => {
    const [hostId, workDate] = key.split("|");
    if (leaveKeys.has(key)) hostIssues.push({ hostId, workDate, kind: "saat-izin" });
    if (max > 0 && list.length > max) hostIssues.push({ hostId, workDate, kind: "melebihi-batas" });
    const bentrok = list.some((row) =>
      hasOverlap({ assignments: list, shifts: state.shifts }, row, row.id),
    );
    if (bentrok) hostIssues.push({ hostId, workDate, kind: "bertumpuk" });
  });

  return { slotIssues, hostIssues };
}

// ----------------------------------------------------------------- rekap --

export type HostRecap = {
  hostId: string;
  name: string;
  kind: HostKind;
  active: boolean;
  workDays: number;
  shiftCount: number;
  /** Hari dengan lebih dari satu shift. */
  doubleDays: number;
  leaveDays: number;
  /** Hari tanpa shift dan tanpa izin dalam rentang. */
  offDays: number;
  shiftMinutes: number;
  liveMinutes: number;
  paidMinutes: number;
  hourlyRate: number;
  /** Perkiraan bayaran per jam; null bila tarifnya 0 (mis. host tetap bergaji bulanan). */
  estimatedPay: number | null;
  perLine: Record<string, number>;
  perShift: Record<string, number>;
};

export function recapRange(state: SandboxState, dates: string[]) {
  const dateSet = new Set(dates);
  const shiftById = new Map(state.shifts.map((shift) => [shift.id, shift]));
  const rows = state.assignments.filter((row) => dateSet.has(row.workDate) && shiftById.has(row.shiftId));

  const hosts: HostRecap[] = state.hosts.map((host) => {
    const mine = rows.filter((row) => row.hostId === host.id);
    const days = new Map<string, number>();
    mine.forEach((row) => days.set(row.workDate, (days.get(row.workDate) ?? 0) + 1));

    const leaveDays = state.leaves.filter(
      (leave) => leave.hostId === host.id && dateSet.has(leave.date) && !days.has(leave.date),
    ).length;

    let shiftMinutes = 0;
    let live = 0;
    const perLine: Record<string, number> = {};
    const perShift: Record<string, number> = {};

    mine.forEach((row) => {
      const shift = shiftById.get(row.shiftId)!;
      shiftMinutes += shiftSpanMinutes(shift.startTime, shift.endTime);
      live += liveMinutes({
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakStart: shift.breakStart,
        breakEnd: shift.breakEnd,
      });
      perLine[shift.lineId] = (perLine[shift.lineId] ?? 0) + 1;
      perShift[shift.id] = (perShift[shift.id] ?? 0) + 1;
    });

    const paidMinutes = state.rules.payBasis === "live" ? live : shiftMinutes;

    return {
      hostId: host.id,
      name: host.name,
      kind: host.kind,
      active: host.active,
      workDays: days.size,
      shiftCount: mine.length,
      doubleDays: [...days.values()].filter((count) => count > 1).length,
      leaveDays,
      offDays: dates.length - days.size - leaveDays,
      shiftMinutes,
      liveMinutes: live,
      paidMinutes,
      hourlyRate: host.hourlyRate,
      estimatedPay: host.hourlyRate > 0 ? Math.round((paidMinutes / 60) * host.hourlyRate) : null,
      perLine,
      perShift,
    };
  });

  const totalPay = hosts.reduce((sum, host) => sum + (host.estimatedPay ?? 0), 0);
  const freelancePay = hosts
    .filter((host) => host.kind === "freelance")
    .reduce((sum, host) => sum + (host.estimatedPay ?? 0), 0);

  return { hosts, totalPay, freelancePay };
}
