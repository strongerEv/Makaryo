import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/time";
import { evaluateClockIn, workedMinutesBetween } from "@/lib/attendance/status";
import { generateSchedule, type SchedulingShift } from "@/lib/scheduling/engine";
import { createRandom } from "@/lib/demo/random";
import type { AttendanceStatus, LeaveStatus, LeaveType } from "@/lib/types/database";
import { addDays } from "@/lib/utils/period";

export type DemoHost = {
  id: string;
  weeklyDayOffQuota: number;
};

export type DemoAssignment = {
  hostId: string;
  shiftId: string;
  workDate: string;
};

export type DemoAttendance = {
  hostId: string;
  workDate: string;
  shiftId: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workedMinutes: number;
};

export type DemoRevenue = {
  hostId: string;
  shiftId: string;
  workDate: string;
  amount: number;
};

export type DemoLeave = {
  hostId: string;
  type: LeaveType;
  requestedDate: string;
  reason: string | null;
  status: LeaveStatus;
  reviewNote: string | null;
};

export type DemoDataset = {
  assignments: DemoAssignment[];
  attendances: DemoAttendance[];
  revenues: DemoRevenue[];
  leaves: DemoLeave[];
};

const ALASAN_IZIN = [
  "Mengantar keluarga berobat.",
  "Ada acara keluarga di luar kota.",
  "Kurang enak badan sejak semalam.",
  "Mengurus dokumen kependudukan.",
];

/**
 * Menyusun satu periode data simulasi yang saling konsisten:
 * jadwal dibuat mesin penjadwalan yang sama dengan yang dipakai admin,
 * absensi hanya muncul untuk tanggal yang sudah lewat, dan omzet hanya
 * ada pada shift yang benar-benar dihadiri.
 */
export function buildDemoDataset({
  hosts,
  shifts,
  startDate,
  endDate,
  today,
  lateToleranceMinutes = 0,
  seed = 20260826,
}: {
  hosts: DemoHost[];
  shifts: SchedulingShift[];
  startDate: string;
  endDate: string;
  today: string;
  lateToleranceMinutes?: number;
  seed?: number;
}): DemoDataset {
  const random = createRandom(seed);
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));

  const { assignments } = generateSchedule({ startDate, endDate, hosts, shifts });

  const attendances: DemoAttendance[] = [];
  const revenues: DemoRevenue[] = [];

  for (const assignment of assignments) {
    // Absensi hanya untuk hari yang sudah lewat — hari ini dan seterusnya
    // dibiarkan kosong supaya tombol clock in tetap bisa dicoba.
    if (assignment.workDate >= today) continue;

    const shift = shiftById.get(assignment.shiftId);
    if (!shift) continue;

    const scheduledStart = shiftStartInstant(assignment.workDate, shift.startTime);
    const scheduledEnd = shiftEndInstant(assignment.workDate, shift.startTime, shift.endTime);

    if (random.chance(0.05)) {
      attendances.push({
        hostId: assignment.hostId,
        workDate: assignment.workDate,
        shiftId: assignment.shiftId,
        clockInAt: null,
        clockOutAt: null,
        status: "absent",
        lateMinutes: 0,
        workedMinutes: 0,
      });
      continue;
    }

    const telat = random.chance(0.18);
    const geser = telat ? random.int(6, 40) : -random.int(0, 12);
    const clockIn = new Date(scheduledStart.getTime() + geser * 60_000);
    const clockOut = new Date(scheduledEnd.getTime() + random.int(-8, 20) * 60_000);

    const { status, lateMinutes } = evaluateClockIn({
      clockInAt: clockIn,
      workDate: assignment.workDate,
      shiftStartTime: shift.startTime,
      toleranceMinutes: lateToleranceMinutes,
    });

    attendances.push({
      hostId: assignment.hostId,
      workDate: assignment.workDate,
      shiftId: assignment.shiftId,
      clockInAt: clockIn.toISOString(),
      clockOutAt: clockOut.toISOString(),
      status,
      lateMinutes,
      workedMinutes: workedMinutesBetween(clockIn, clockOut),
    });

    // Sebagian besar shift yang dihadiri punya laporan omzet.
    if (random.chance(0.85)) {
      revenues.push({
        hostId: assignment.hostId,
        shiftId: assignment.shiftId,
        workDate: assignment.workDate,
        amount: random.int(2, 26) * 100_000,
      });
    }
  }

  const leaves = buildLeaves(hosts, today, random);

  return { assignments, attendances, revenues, leaves };
}

function buildLeaves(hosts: DemoHost[], today: string, random: ReturnType<typeof createRandom>): DemoLeave[] {
  const leaves: DemoLeave[] = [];
  if (hosts.length === 0) return leaves;

  const daftar: { host: DemoHost; offset: number; status: LeaveStatus }[] = [
    { host: hosts[0], offset: 5, status: "pending" },
    { host: hosts[Math.min(1, hosts.length - 1)], offset: 8, status: "pending" },
    { host: hosts[Math.min(2, hosts.length - 1)], offset: -6, status: "approved" },
    { host: hosts[Math.min(3, hosts.length - 1)], offset: -11, status: "rejected" },
  ];

  daftar.forEach(({ host, offset, status }, index) => {
    const type: LeaveType = index % 2 === 0 ? "urgent" : "weekly_off";
    leaves.push({
      hostId: host.id,
      type,
      requestedDate: addDays(today, offset),
      reason: type === "urgent" ? random.pick(ALASAN_IZIN) : null,
      status,
      reviewNote: status === "rejected" ? "Shift hari itu sudah kekurangan host." : null,
    });
  });

  // Satu host boleh punya beberapa pengajuan, tetapi tidak pada tanggal yang sama.
  const unik = new Map<string, DemoLeave>();
  for (const leave of leaves) {
    unik.set(`${leave.hostId}|${leave.type}|${leave.requestedDate}`, leave);
  }

  return [...unik.values()];
}

/** Nama dan nomor HP untuk akun host contoh. */
export const DEMO_HOSTS = [
  { name: "Ayu Pratiwi", phone: "081234567801" },
  { name: "Bagas Nugroho", phone: "081234567802" },
  { name: "Citra Maharani", phone: "081234567803" },
  { name: "Dimas Saputra", phone: "081234567804" },
  { name: "Elsa Kurniawan", phone: "081234567805" },
  { name: "Fajar Ramadhan", phone: "081234567806" },
] as const;

/** Calon host contoh yang menunggu verifikasi, untuk mencoba alur approval. */
export const DEMO_PENDING = [
  { name: "Gita Larasati", phone: "081234567807" },
  { name: "Hendra Wijaya", phone: "081234567808" },
] as const;

export const DEMO_EMAIL_DOMAIN = "demo.makaryo.test";
export const DEMO_PASSWORD = "demo12345";

export function demoEmail(index: number) {
  return `host${index + 1}@${DEMO_EMAIL_DOMAIN}`;
}
